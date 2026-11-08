"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Kind = "EXPLAIN" | "SOLVE";
export function Explanation({ attemptId, questionId, number, hint = false }: { attemptId: string; questionId: string; number: number; hint?: boolean }) {
  const [panelTarget, setPanelTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { if (hint) setPanelTarget(document.getElementById(`hint-panel-${questionId}`)); }, [hint, questionId]);
  const [active, setActive] = useState<Kind | null>(null);
  const [contents, setContents] = useState<Partial<Record<Kind, string>>>({});
  const [loading, setLoading] = useState<Kind | null>(null);
  const [partial, setPartial] = useState("");
  const explanationRequest = useRef<AbortController | null>(null);
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
    return () => { window.removeEventListener("timo-speech-start", stop); explanationRequest.current?.abort(); const current = playback.current; current?.controller.abort(); current?.audio?.pause(); if (current?.url) URL.revokeObjectURL(current.url); };
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
      const fetchChunk = async (index: number): Promise<{ audio: string; hasNext: boolean }> => {
        const response = await fetch("/api/review/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId, questionId, kind: active, index }), signal: current.controller.signal });
        if (!response.ok) throw new Error("Speech unavailable");
        return response.json();
      };
      let next: Promise<{ audio: string; hasNext: boolean }> | null = fetchChunk(0);
      let index = 0;
      while (next) {
        const data: { audio: string; hasNext: boolean } = await next;
        if (current.controller.signal.aborted) return;
        next = data.hasNext ? fetchChunk(++index) : null;
        if (next) void next.catch(() => {});
        const bytes = Uint8Array.from(atob(data.audio), character => character.charCodeAt(0));
        current.url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
        const audio = new Audio(current.url);
        current.audio = audio;
        setSpeechState("playing");
        await new Promise<void>((resolve, reject) => {
          const finish = () => { current.controller.signal.removeEventListener("abort", finish); resolve(); };
          audio.onended = finish;
          audio.onerror = () => { current.controller.signal.removeEventListener("abort", finish); reject(new Error("Audio failed")); };
          current.controller.signal.addEventListener("abort", finish, { once: true });
          void audio.play().catch(reject);
        });
        URL.revokeObjectURL(current.url);
        current.url = undefined;
        if (next && !current.controller.signal.aborted) setSpeechState("loading");
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
    setLoading(kind); setPartial("");
    const controller = new AbortController();
    explanationRequest.current = controller;
    try {
      const response = await fetch("/api/review/explanation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId, questionId, kind }), signal: controller.signal });
      if (!response.ok || !response.body) throw new Error("Explanation unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as { type: string; text?: string; content?: string };
          if (event.type === "delta" && event.text) setPartial(previous => previous + event.text);
          else if (event.type === "done" && event.content) { setContents(previous => ({ ...previous, [kind]: event.content! })); completed = true; }
          else if (event.type === "error") throw new Error("Explanation unavailable");
        }
        if (done) break;
      }
      if (!completed) throw new Error("Explanation incomplete");
    } catch {
      if (!controller.signal.aborted) { setPartial(""); setError("Chưa xem được lời giải thích. Con hãy thử lại nhé."); }
    } finally {
      if (!controller.signal.aborted) { explanationRequest.current = null; setLoading(null); }
    }
  };
  const panel = active && <div className="ai-panel open"><div className="ai-panel-inner"><div className="ai-panel-heading"><span className="ai-tag">AI cùng con tìm hiểu · Hãy cùng người lớn kiểm tra nhé</span>{!loading && !error && contents[active] && <button type="button" className="ai-speech" onClick={() => void speak()} aria-label={speechState === "idle" ? "Nghe giải thích" : "Dừng đọc"} title={speechState === "idle" ? "Nghe giải thích" : "Dừng đọc"}><span>{speechState === "idle" ? "Nghe giải thích" : "Dừng đọc"}</span>{speechState === "loading" ? <span aria-hidden="true">…</span> : speechState === "playing" ? <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg> : <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></svg>}</button>}</div>{speechState === "loading" && <div className="ai-loading" role="status"><span className="ai-loading-spinner" aria-hidden="true" />Cô chú đang chuẩn bị giọng đọc nhé…</div>}<div className="ai-body">{loading ? (partial || <span className="ai-loading" role="status"><span className="ai-loading-spinner" aria-hidden="true" />Cô chú đang đọc đề và chuẩn bị giải thích cho con nhé…</span>) : (error || contents[active])}</div>{speechError && <div role="status">{speechError}</div>}{error && <button type="button" className="tool-btn" onClick={() => void open(active)}>Thử lại</button>}</div></div>;
  return <>
    <div className="ai-tools" role="group" aria-label={`Trợ giúp câu ${number}`}>
      <button type="button" className="tool-btn" aria-expanded={active === "EXPLAIN"} disabled={!!loading} onClick={() => void open("EXPLAIN")}>{hint ? (active === "EXPLAIN" ? "Ẩn gợi ý" : "Gợi ý") : "Giải thích đề"}</button>
      {!hint && <button type="button" className="tool-btn" aria-expanded={active === "SOLVE"} disabled={!!loading} onClick={() => void open("SOLVE")}>Cách giải</button>}
    </div>
    {active && (hint ? (panelTarget && createPortal(panel, panelTarget)) : panel)}
  </>;
}
