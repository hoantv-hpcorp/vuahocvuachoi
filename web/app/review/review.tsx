"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { questionTextWithoutChoices } from "@/lib/question-text";
import { finishReview, setOverride } from "./actions";

type Question = { id: string; number: number; topic: string; type: "MCQ" | "FILL"; contentText: string; correctAnswer: string; images: string[]; options: { position: number; text: string | null; image: string | null }[]; answer: string | null; systemCorrect: boolean; overrideCorrect: boolean | null; points: number };
export function Review({ attemptId, title, questions }: { attemptId: string; title: string; questions: Question[] }) {
  const router = useRouter();
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
    return <>{value}{option?.text ? `. ${option.text}` : ""}{option?.image && <img className="option-image" src={option.image} alt={`Hình đáp án ${value}`} />}</>;
  };
  return <Device><AppBar><Link href="/exams" className="btn btn-ghost" onClick={e => { if (pendingRef.current) e.preventDefault(); }}>Thoát</Link><div className="title title-sm">Cùng xem lại bài làm</div><span className="spacer"/><span className="savedot" aria-live="polite">{pending ? "Đang lưu…" : error ? "Chưa lưu" : "Đã lưu"}</span></AppBar>
    <div className="body padless-bottom"><div className="card rev-hero"><h1>Con đã rất cố gắng!</h1><p>{title} · Cùng xem lại từng câu để hiểu bài hơn nhé.</p></div><div className="rev-list">{questions.map(q => <article className={`card rev-row${marks[q.id] ? "" : " needs-review"}`} key={q.id}>
      <div className="head"><span className="rev-q-label">Câu {q.number} · {q.topic}</span><span className={`pill ${marks[q.id] ? "pill-ok" : "pill-look"}`}>{marks[q.id] ? "Đúng" : "Cùng xem lại"}</span></div>
      <div className="q question-text">{q.type === "MCQ" ? questionTextWithoutChoices(q.contentText, q.options) : q.contentText}</div>
      {q.images.map((src, i) => <div className="figure" key={src}><img src={src} alt={`Hình minh họa ${i + 1} cho câu ${q.number}`} /></div>)}
      <div className="ans-line"><span>Con trả lời: <b>{displayAnswer(q, q.answer)}</b></span><span>Đáp án: <b>{displayAnswer(q, q.correctAnswer)}</b></span></div>
      <div className="rev-tools"><div className="seg" role="group" aria-label={`Đánh giá câu ${q.number}`}><button type="button" disabled={!!pending} aria-pressed={!marks[q.id]} className={!marks[q.id] ? "on-bad" : ""} onClick={() => void mark(q, false)}>Đánh dấu sai</button><button type="button" disabled={!!pending} aria-pressed={marks[q.id]} className={marks[q.id] ? "on-ok" : ""} onClick={() => void mark(q, true)}>Đánh dấu đúng</button></div></div>
    </article>)}</div>{error && <p role="alert">{error}</p>}</div>
    <div className="rev-footer"><div className="rev-total" aria-live="polite"><span className="lbl">Tổng điểm (tham khảo)</span><span className="val">{total} <small>/ {possible}</small></span></div><button className="btn btn-primary rev-save" disabled={!!pending} onClick={() => void save()}>Lưu kết quả</button></div>
  </Device>;
}
