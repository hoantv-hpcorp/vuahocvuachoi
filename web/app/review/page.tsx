"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { Icon } from "@/components/Icon";

type Mark = "ok" | "bad";

type ReviewItem = {
  id: number;
  label: string;
  initialMark: Mark;
  parentApproved?: boolean;
  question: string;
  figure?: ReactNode;
  answerLabel: string;
  answer: string;
  correct: string;
  ai: ReactNode;
};

const items: ReviewItem[] = [
  {
    id: 1,
    label: "Câu 1 · Trắc nghiệm",
    initialMark: "ok",
    question: "Quy luật dãy số: 2, 4, 6, …",
    figure: (
      <div className="figure">
        <svg width="300" height="80" viewBox="0 0 300 80" role="img" aria-label="Dãy số 2, 4, 6 và ô trống">
          <g fill="none" stroke="#3D2C29" strokeWidth="2.5">
            <circle cx="40" cy="40" r="22" />
            <circle cx="105" cy="40" r="22" />
            <circle cx="170" cy="40" r="22" />
          </g>
          {[
            { x: 40, value: "2" },
            { x: 105, value: "4" },
            { x: 170, value: "6" },
          ].map((n) => (
            <text
              key={n.value}
              x={n.x}
              y="48"
              textAnchor="middle"
              fill="#3D2C29"
              style={{ fontFamily: "var(--font-nunito), Nunito, sans-serif", fontSize: 20, fontWeight: 800 }}
            >
              {n.value}
            </text>
          ))}
          <path d="M198 40 h24" stroke="#A68F86" strokeWidth="3" strokeLinecap="round" />
          <path
            d="M216 33 l10 7 -10 7"
            fill="none"
            stroke="#A68F86"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="238"
            y="18"
            width="44"
            height="44"
            rx="10"
            fill="#FDEADD"
            stroke="#C2410C"
            strokeWidth="2.5"
            strokeDasharray="6 5"
          />
        </svg>
      </div>
    ),
    answerLabel: "Con chọn:",
    answer: "C. 8",
    correct: "C. 8",
    ai: "Con nhìn dãy số: 2, 4, 6… mỗi số cách số đứng trước nó 2 đơn vị. Vậy số tiếp theo là 6 + 2 = 8 nhé con!",
  },
  {
    id: 4,
    label: "Câu 4 · Tự luận",
    initialMark: "bad",
    question: "Một tuần có bao nhiêu ngày?",
    answerLabel: "Con trả lời:",
    answer: "“ 6 ”",
    correct: "“ 7 ”",
    ai: (
      <>
        Con nhìn này: mỗi ngày trong tuần con đều đi học từ Thứ Hai đến Chủ Nhật. Đếm thử xem nào: Thứ
        Hai (1), Thứ Ba (2), Thứ Tư (3), Thứ Năm (4), Thứ Sáu (5), Thứ Bảy (6), Chủ Nhật (7). Vậy một
        tuần có <b>7 ngày</b> nhé con!
      </>
    ),
  },
  {
    id: 7,
    label: "Câu 7 · Trắc nghiệm",
    initialMark: "ok",
    question: "Hình nào có 4 cạnh bằng nhau?",
    answerLabel: "Con chọn:",
    answer: "B. Hình vuông",
    correct: "B. Hình vuông",
    ai: "Hình vuông có 4 cạnh dài bằng nhau và 4 góc vuông. Hình chữ nhật chỉ có 2 cặp cạnh bằng nhau thôi con nhé.",
  },
  {
    id: 12,
    label: "Câu 12 · Tự luận",
    initialMark: "bad",
    question: "Tính: 35 + 47 = ?",
    answerLabel: "Con trả lời:",
    answer: "“ 72 ”",
    correct: "“ 82 ”",
    ai: "Con tách 47 thành 40 và 7: 35 + 40 = 75, rồi 75 + 7 = 82. Vậy 35 + 47 = 82 nhé con!",
  },
  {
    id: 15,
    label: "Câu 15 · Trắc nghiệm",
    initialMark: "ok",
    parentApproved: true,
    question: "Số liền sau của 99 là số nào?",
    answerLabel: "Con chọn:",
    answer: "A. 100",
    correct: "A. 100",
    ai: "Số liền sau của một số là số đứng ngay sau nó khi đếm: 99 rồi đến 100. Vậy số liền sau của 99 là 100.",
  },
];

function ReviewRow({ item }: { item: ReviewItem }) {
  const [open, setOpen] = useState(false);
  const [mark, setMark] = useState<Mark>(item.initialMark);
  const [showAi, setShowAi] = useState(false);

  const pillText =
    mark === "ok" ? (item.parentApproved ? "Đúng · Bố mẹ đã duyệt" : "Đúng") : "Cùng xem lại";

  return (
    <article className={`card rev-row${mark === "bad" ? " needs-review" : ""}`}>
      <div className="head">
        <div className="head-left">
          <span className="rev-q-label">{item.label}</span>
          <button type="button" className="tool-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? "Ẩn câu hỏi" : "Hiển thị câu hỏi"}
          </button>
        </div>
        <span className={`pill ${mark === "ok" ? "pill-ok" : "pill-look"}`}>{pillText}</span>
      </div>

      <div className={`q-body${open ? " open" : ""}`} aria-hidden={!open}>
        <div className="q-body-inner">
          <div className="q">{item.question}</div>
          {item.figure}
        </div>
      </div>

      <div className="ans-line">
        <span>
          {item.answerLabel} <b>{item.answer}</b>
        </span>
        <span>
          Đáp án: <b>{item.correct}</b>
        </span>
      </div>

      <div className="rev-tools">
        <div className="seg">
          <button type="button" className={mark === "bad" ? "on-bad" : ""} onClick={() => setMark("bad")}>
            Đánh dấu sai
          </button>
          <button type="button" className={mark === "ok" ? "on-ok" : ""} onClick={() => setMark("ok")}>
            Đánh dấu đúng
          </button>
        </div>
        <button type="button" className="tool-btn" aria-expanded={showAi} onClick={() => setShowAi((v) => !v)}>
          <Icon name="help" small />
          Giải thích câu hỏi
        </button>
        <button type="button" className="tool-btn" aria-expanded={showAi} onClick={() => setShowAi((v) => !v)}>
          <Icon name="bulb" small />
          Cách làm bài
        </button>
      </div>

      <div className={`ai-panel${showAi ? " open" : ""}`} aria-hidden={!showAi}>
        <div className="ai-panel-inner">
          <span className="ai-tag">
            <Icon name="sparkle" small />
            NỘI DUNG DO AI TẠO — BỐ MẸ KIỂM TRA GIÚP CON NHÉ
          </span>
          <div className="ai-body">{item.ai}</div>
        </div>
      </div>
    </article>
  );
}

export default function ReviewPage() {
  return (
    <Device>
      <AppBar>
        <div className="title title-sm">Cùng xem lại bài làm</div>
        <span className="spacer" />
        <span className="savedot">Đã lưu tự động</span>
      </AppBar>

      <div className="body padless-bottom">
        <div className="card rev-hero">
          <h2>Con đã rất cố gắng!</h2>
          <p>Cùng xem lại từng câu để hiểu bài hơn nhé — học được điều mới quan trọng hơn điểm số.</p>
        </div>

        <div className="rev-list">
          {items.map((item) => (
            <ReviewRow key={item.id} item={item} />
          ))}
        </div>
      </div>

      <div className="rev-footer">
        <div className="rev-total">
          <span className="lbl">Tổng điểm (tham khảo)</span>
          <span className="val">
            72 <small>/ 100 · tự động cập nhật khi bố mẹ duyệt lại</small>
          </span>
        </div>
        <Link href="/history" className="btn btn-primary rev-save">
          Lưu kết quả
        </Link>
        <span className="rev-note">
          Kết quả của con và quyết định của bố mẹ được lưu riêng, không mất đi khi nội dung đề thi thay
          đổi.
        </span>
      </div>
    </Device>
  );
}
