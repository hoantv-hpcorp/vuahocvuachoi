"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { Explanation } from "@/components/Explanation";
import { submitAttempt } from "./actions";
import { questionTextWithoutChoices } from "@/lib/question-text";

type Question = { id: string; number: number; topic: string; type: "MCQ" | "FILL"; contentText: string; images: string[]; options: { position: number; text: string | null; image: string | null }[] };
export function Practice({ attemptId, title, questions, initialAnswers }: { attemptId: string; title: string; questions: Question[]; initialAnswers: Record<string, string> }) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [confirm, setConfirm] = useState(false);
  const [hints, setHints] = useState<boolean | null>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pending = useRef(new Map<string, string>());
  const running = useRef(false);
  const failed = useRef(false);
  const flush = async () => {
    if (running.current) return;
    running.current = true;
    failed.current = false;
    setStatus("saving");
    while (pending.current.size) {
      const [id, value] = pending.current.entries().next().value!;
      pending.current.delete(id);
      try {
        const response = await fetch("/api/practice/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId, questionId: id, rawAnswer: value }) });
        if (!response.ok || response.redirected) throw new Error("Unable to save answer");
      }
      catch { if (!pending.current.has(id)) pending.current.set(id, value); failed.current = true; break; }
    }
    running.current = false;
    setStatus(failed.current ? "error" : "saved");
  };
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (running.current || pending.current.size) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const answer = (id: string, value: string) => { setAnswers(previous => ({ ...previous, [id]: value })); pending.current.set(id, value); void flush(); };
  const submit = async () => {
    if (running.current || pending.current.size) return;
    setBusy(true);
    try { await submitAttempt(attemptId); router.push(`/review?attempt=${encodeURIComponent(attemptId)}`); } catch { setStatus("error"); } finally { setBusy(false); }
  };
  const sections = questions.reduce<{ topic: string; questions: Question[] }[]>((groups, question) => {
    const last = groups[groups.length - 1];
    if (last?.topic === question.topic) last.questions.push(question);
    else groups.push({ topic: question.topic, questions: [question] });
    return groups;
  }, []);
  const section = sections[index];
  const goToSection = (next: number) => {
    setIndex(next);
    bodyRef.current?.scrollTo({ top: 0 });
  };
  if (!section) return <Device><div className="body"><p>Đề này chưa có câu hỏi.</p><Link href="/exams">Về danh sách đề</Link></div></Device>;
  const unanswered = questions.filter(item => !(answers[item.id] ?? "").trim()).length;
  return <Device><AppBar><button type="button" className="btn btn-ghost" onClick={() => { if ((running.current || pending.current.size) && !window.confirm("Câu trả lời chưa được lưu hết. Con có muốn rời trang?")) return; router.back(); }}>Thoát</button><div className="title title-sm">{title}</div><span className="spacer" /><span aria-live="polite" className="savedot">{status === "saved" ? "Đã lưu" : status === "saving" ? "Đang lưu…" : "Chưa lưu"}</span></AppBar>
    <div className="body" ref={bodyRef}><div className="q-progress"><div className="track"><i style={{ width: `${(index + 1) / sections.length * 100}%` }} /></div><span className="count">Phần {index + 1} / {sections.length}</span></div>
      <nav className="grade-filters" aria-label="Các phần của đề thi">{sections.map((item, i) => <button type="button" key={i} className={`chip ${i === index ? "on" : ""}`} aria-current={i === index ? "step" : undefined} onClick={() => goToSection(i)}>{item.topic}</button>)}</nav>
      <section className="practice-section" aria-labelledby="practice-section-title"><h1 className="practice-section-title" id="practice-section-title">Phần {index + 1} · {section.topic}</h1><p className="practice-note">Làm lần lượt các câu trong phần này. Cuộn xuống để xem thêm nhé.</p>
      {section.questions.map(q => <div className="card q-card" key={q.id}><div className="q-heading"><div className="q-num">CÂU {q.number} · {q.type === "MCQ" ? "TRẮC NGHIỆM" : "TỰ LUẬN"}</div>{hints && <Explanation attemptId={attemptId} questionId={q.id} number={q.number} hint />}</div><div className="q-text question-text">{q.type === "MCQ" ? questionTextWithoutChoices(q.contentText, q.options) : q.contentText}</div>{q.images.map((src, i) => <div className="figure" key={src}><img src={src} alt={`Hình minh họa ${i + 1} cho câu ${q.number}`} /></div>)}
      {q.type === "MCQ" ? <div className="opts" role="radiogroup" aria-label={`Đáp án câu ${q.number}`}>{q.options.map(o => { const letter = String.fromCharCode(64 + o.position); return <button key={o.position} type="button" role="radio" aria-checked={answers[q.id] === letter} className={`opt ${answers[q.id] === letter ? "sel" : ""}`} onClick={() => answer(q.id, letter)}><span className="key">{letter}</span>{o.text}{o.image && <img className="option-image" src={o.image} alt={`Hình đáp án ${letter}`} />}</button>; })}</div> : <input className="free-input" aria-label={`Đáp án câu ${q.number}`} value={answers[q.id] ?? ""} onChange={e => answer(q.id, e.target.value)} placeholder="Nhập câu trả lời" />}{hints && <div id={`hint-panel-${q.id}`} />}</div>)}</section>
      {status === "error" && <p role="alert">Chưa lưu được câu trả lời. <button className="link-like" onClick={() => void flush()}>Thử lưu lại</button></p>}</div>
    <div className="q-nav">{index > 0 && <button className="btn btn-soft q-back" onClick={() => goToSection(index - 1)}>Phần trước</button>}{index < sections.length - 1 ? <button className="btn btn-primary q-next" onClick={() => goToSection(index + 1)}>Phần tiếp theo</button> : <button className="btn btn-primary q-next" onClick={() => setConfirm(true)}>Nộp bài</button>}</div>
    {hints === null && <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="hints-title"><div className="modal"><h2 id="hints-title">Cho phép gợi ý khi làm bài?</h2><p>Nếu cho phép, con có thể xem giải thích đề ở mỗi câu hỏi.</p><button type="button" className="btn btn-soft" onClick={() => setHints(false)}>Không</button><button type="button" className="btn btn-primary" onClick={() => setHints(true)}>Có</button></div></div>}
    {confirm && <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="submit-title"><div className="modal"><h2 id="submit-title">Con đã sẵn sàng nộp bài chưa?</h2><div className="stats"><div className="stat done"><b>{questions.length - unanswered}</b><span>câu đã trả lời</span></div><div className="stat open"><b>{unanswered}</b><span>câu còn trống</span></div></div><p>Sau khi nộp, con sẽ không thể sửa câu trả lời.</p><button className="btn btn-soft" onClick={() => setConfirm(false)}>Xem lại bài làm</button><button className="btn btn-primary" disabled={status !== "saved" || busy} onClick={() => void submit()}>{busy ? "Đang nộp…" : "Nộp bài"}</button>{status === "error" && <button className="link-like" onClick={() => void flush()}>Thử lưu lại</button>}</div></div>}
  </Device>;
}

