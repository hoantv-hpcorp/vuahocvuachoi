"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { questionTextWithoutChoices } from "@/lib/question-text";
import { finishReview, getExplanation, setOverride } from "./actions";

type Question = { id: string; number: number; topic: string; type: "MCQ" | "FILL"; contentText: string; correctAnswer: string; images: string[]; options: { position: number; text: string | null; image: string | null }[]; answer: string | null; systemCorrect: boolean; overrideCorrect: boolean | null; points: number };
type Kind = "EXPLAIN" | "SOLVE";
function Explanation({ attemptId, questionId, number }: { attemptId: string; questionId: string; number: number }) {
  const [active, setActive] = useState<Kind | null>(null);
  const [contents, setContents] = useState<Partial<Record<Kind, string>>>({});
  const [loading, setLoading] = useState<Kind | null>(null);
  const [error, setError] = useState("");
  const [speechState, setSpeechState] = useState<"idle" | "loading" | "playing">("idle");
  const [speechError, setSpeechError] = useState("");
  const playback = useRef<{ controller: AbortController; audio?: HTMLAudioElement; url?: string } | null>(null);
  const stopSpeech = () => {
    const current = playback.current;
    playback.current = null;
    current?.controller.abort();
    current?.audio?.pause();
    if (current?.url) URL.revokeObjectURL(current.url);
    setSpeechState("idle");
  };
  useEffect(() => {
    const stop = () => stopSpeech();
    window.addEventListener("timo-speech-start", stop);
    return () => { window.removeEventListener("timo-speech-start", stop); const current = playback.current; current?.controller.abort(); current?.audio?.pause(); if (current?.url) URL.revokeObjectURL(current.url); };
  }, []);
  const speak = async () => {
    if (speechState !== "idle") { stopSpeech(); return; }
    if (!active || !contents[active]) return;
    window.dispatchEvent(new Event("timo-speech-start"));
    setSpeechError("");
    const current: { controller: AbortController; audio?: HTMLAudioElement; url?: string } = { controller: new AbortController() };
    playback.current = current;
    setSpeechState("loading");
    try {
      const response = await fetch("/api/review/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId, questionId, kind: active }), signal: current.controller.signal });
      if (!response.ok) throw new Error("Speech unavailable");
      const data: { audio: string[] } = await response.json();
      if (!data.audio.length) throw new Error("Empty speech");
      for (const encoded of data.audio) {
        if (current.controller.signal.aborted) return;
        const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
        current.url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
        const audio = new Audio(current.url);
        current.audio = audio;
        setSpeechState("playing");
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("Audio failed"));
          current.controller.signal.addEventListener("abort", () => resolve(), { once: true });
          void audio.play().catch(reject);
        });
        URL.revokeObjectURL(current.url);
        current.url = undefined;
      }
      if (playback.current === current) stopSpeech();
    } catch {
      if (!current.controller.signal.aborted) { stopSpeech(); setSpeechError("Chưa nghe được lời giải thích. Con hãy thử lại nhé."); }
    }
  };
  const open = async (kind: Kind) => {
    stopSpeech(); setSpeechError("");
    if (loading) return;
    if (active === kind && !error) { setActive(null); return; }
    setActive(kind); setError("");
    if (contents[kind]) return;
    setLoading(kind);
    try { const content = await getExplanation(attemptId, questionId, kind); setContents(previous => ({ ...previous, [kind]: content })); }
    catch { setError("Chưa xem được lời giải thích. Con hãy thử lại nhé."); }
    finally { setLoading(null); }
  };
  return <>
    <div className="ai-tools" role="group" aria-label={`Trợ giúp câu ${number}`}>
      <button type="button" className="tool-btn" aria-expanded={active === "EXPLAIN"} disabled={!!loading} onClick={() => void open("EXPLAIN")}>Giải thích đề</button>
      <button type="button" className="tool-btn" aria-expanded={active === "SOLVE"} disabled={!!loading} onClick={() => void open("SOLVE")}>Cách giải</button>
    </div>
    {active && <div className="ai-panel open" aria-live="polite"><div className="ai-panel-inner"><div className="ai-panel-heading"><span className="ai-tag">AI cùng con tìm hiểu · Hãy cùng người lớn kiểm tra nhé</span>{!loading && !error && contents[active] && <button type="button" className="ai-speech" onClick={() => void speak()} aria-label={speechState === "idle" ? "Nghe giải thích" : "Dừng đọc"} title={speechState === "idle" ? "Nghe giải thích" : "Dừng đọc"}>{speechState === "loading" ? <span aria-hidden="true">…</span> : speechState === "playing" ? <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg> : <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></svg>}</button>}</div><div className="ai-body">{loading ? "Đang chuẩn bị cho con…" : error || contents[active]}</div>{speechError && <div role="status">{speechError}</div>}{error && <button type="button" className="tool-btn" onClick={() => void open(active)}>Thử lại</button>}</div></div>}
  </>;
}
export function Review({ attemptId, title, questions }: { attemptId: string; title: string; questions: Question[] }) {
  const router = useRouter();
  // Server action responses can supply newly signed URLs for the same assets.
  // Keep figures mounted with their original URLs throughout this review.
  const [figureUrls] = useState(() => new Map(questions.map(q => [q.id, { images: q.images, options: q.options.map(o => o.image) }])));
  const [marks, setMarks] = useState(() => Object.fromEntries(questions.map(q => [q.id, q.overrideCorrect ?? q.systemCorrect])) as Record<string, boolean>);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pendingRef = useRef(false);
  useEffect(() => {
    const leave = () => { const data = new FormData(); data.set("attemptId", attemptId); navigator.sendBeacon("/api/review/finish", data); };
    const warn = (event: BeforeUnloadEvent) => { if (pendingRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("pagehide", leave); window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("pagehide", leave); window.removeEventListener("beforeunload", warn); leave(); };
  }, [attemptId]);
  const mark = async (q: Question, value: boolean) => {
    if (pendingRef.current) return;
    const previous = marks[q.id]; pendingRef.current = true; setPending(q.id); setError(""); setMarks(m => ({ ...m, [q.id]: value }));
    try { await setOverride(attemptId, q.id, value); }
    catch { setMarks(m => ({ ...m, [q.id]: previous })); setError("Chưa lưu được thay đổi. Vui lòng thử lại."); }
    finally { pendingRef.current = false; setPending(null); }
  };
  const total = questions.reduce((sum, q) => sum + (marks[q.id] ? q.points : 0), 0);
  const possible = questions.reduce((sum, q) => sum + q.points, 0);
  const save = async () => { if (pendingRef.current) return; pendingRef.current = true; setPending("finish"); setError(""); try { await finishReview(attemptId); router.push("/exams"); } catch { setError("Chưa lưu được kết quả. Vui lòng thử lại."); pendingRef.current = false; setPending(null); } };
  const displayAnswer = (q: Question, value: string | null) => {
    if (!value?.trim()) return <em>Chưa trả lời</em>;
    const option = q.type === "MCQ" ? q.options.find(o => String.fromCharCode(64 + o.position) === value.trim().toUpperCase()) : undefined;
    return <>{value}{option?.text ? `. ${option.text}` : ""}{option?.image && <img className="option-image" src={figureUrls.get(q.id)?.options[q.options.indexOf(option)] ?? option.image} alt={`Hình đáp án ${value}`} />}</>;
  };
  return <Device><AppBar><Link href="/exams" className="btn btn-ghost" onClick={e => { if (pendingRef.current) e.preventDefault(); }}>Thoát</Link><div className="title title-sm">Cùng xem lại bài làm</div><span className="spacer"/><span className="savedot" aria-live="polite">{pending ? "Đang lưu…" : error ? "Chưa lưu" : "Đã lưu"}</span></AppBar>
    <div className="body padless-bottom"><div className="card rev-hero"><h1>Con đã rất cố gắng!</h1><p>{title} · Cùng xem lại từng câu để hiểu bài hơn nhé.</p></div><div className="rev-list">{questions.map(q => <article className={`card rev-row${marks[q.id] ? "" : " needs-review"}`} key={q.id}>
      <div className="head"><span className="rev-q-label">Câu {q.number} · {q.topic}</span><span className={`pill ${marks[q.id] ? "pill-ok" : "pill-look"}`}>{marks[q.id] ? "Đúng" : "Cùng xem lại"}</span></div>
      <div className="q question-text">{q.type === "MCQ" ? questionTextWithoutChoices(q.contentText, q.options) : q.contentText}</div>
      {(figureUrls.get(q.id)?.images ?? q.images).map((src, i) => <div className="figure" key={src}><img src={src} alt={`Hình minh họa ${i + 1} cho câu ${q.number}`} /></div>)}
      <div className="ans-line"><span>Con trả lời: <b>{displayAnswer(q, q.answer)}</b></span><span>Đáp án: <b>{displayAnswer(q, q.correctAnswer)}</b></span></div>
      <div className="rev-tools"><div className="seg" role="group" aria-label={`Đánh giá câu ${q.number}`}><button type="button" disabled={!!pending} aria-pressed={!marks[q.id]} className={!marks[q.id] ? "on-bad" : ""} onClick={() => void mark(q, false)}>Đánh dấu sai</button><button type="button" disabled={!!pending} aria-pressed={marks[q.id]} className={marks[q.id] ? "on-ok" : ""} onClick={() => void mark(q, true)}>Đánh dấu đúng</button></div><Explanation attemptId={attemptId} questionId={q.id} number={q.number} /></div>
    </article>)}</div>{error && <p role="alert">{error}</p>}</div>
    <div className="rev-footer"><div className="rev-total" aria-live="polite"><span className="lbl">Tổng điểm (tham khảo)</span><span className="val">{total} <small>/ {possible}</small></span></div><button className="btn btn-primary rev-save" disabled={!!pending} onClick={() => void save()}>Lưu kết quả</button></div>
  </Device>;
}
