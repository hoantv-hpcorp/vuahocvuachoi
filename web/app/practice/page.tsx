"use client";

import Link from "next/link";
import { useState } from "react";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { Icon } from "@/components/Icon";

const subjects = ["LOGIC", "ARITHMETIC", "NUMBER THEORY", "GEOMETRY"];

const options = [
  { key: "A", text: "13" },
  { key: "B", text: "14" },
  { key: "C", text: "15" },
  { key: "D", text: "16" },
];

export default function PracticePage() {
  const [subject, setSubject] = useState("ARITHMETIC");
  const [selected, setSelected] = useState("C");

  return (
    <Device>
      <AppBar>
        <Link href="/exams" className="icon-btn" aria-label="Quay lại danh sách đề">
          <Icon name="chevron-left" small />
        </Link>
        <div className="title title-sm">TIMO - Vòng HEAT - Đề 1</div>
        <span className="spacer" />
        <span className="savedot">Đã lưu tự động</span>
      </AppBar>

      <div className="body">
        <div className="q-progress">
          <div className="track">
            <i style={{ width: "50%" }} />
          </div>
          <span className="count">Phần 2 / 4</span>
        </div>

        <div className="grade-filters" role="group" aria-label="Chọn phần thi">
          {subjects.map((name) => (
            <button
              key={name}
              type="button"
              className={`chip${name === subject ? " on" : ""}`}
              aria-pressed={name === subject}
              onClick={() => setSubject(name)}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="section-cap">Các câu hỏi của phần {subject} — con làm trực tiếp trên màn hình này</div>

        <div className="rev-list">
          <div className="card q-card">
            <div className="q-num">CÂU 4 · TRẮC NGHIỆM</div>
            <div className="q-text">Tính: 8 + 7 = ?</div>
            <div className="opts" role="group" aria-label="Chọn đáp án">
              {options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`opt${selected === option.key ? " sel" : ""}`}
                  aria-pressed={selected === option.key}
                  onClick={() => setSelected(option.key)}
                >
                  <span className="key">{option.key}</span>
                  {option.text}
                </button>
              ))}
            </div>
          </div>

          <div className="card q-card">
            <div className="q-num">CÂU 5 · TỰ LUẬN</div>
            <div className="q-text">Hãy đếm xem có tất cả bao nhiêu hình tròn.</div>
            <div className="figure">
              <svg width="360" height="90" viewBox="0 0 360 90" role="img" aria-label="Năm hình tròn">
                <g fill="none" stroke="#3D2C29" strokeWidth="2.5">
                  <circle cx="60" cy="45" r="26" />
                  <circle cx="150" cy="30" r="20" />
                  <circle cx="230" cy="60" r="16" />
                  <circle cx="300" cy="40" r="24" />
                  <circle cx="330" cy="68" r="12" />
                </g>
              </svg>
            </div>
            <input className="free-input" placeholder="Con gõ đáp số vào đây" />
          </div>

          <div className="card q-card">
            <div className="q-num">CÂU 6 · TỰ LUẬN</div>
            <div className="q-text">Tính: 13 - 6 = ?</div>
            <input className="free-input" placeholder="Con gõ đáp số vào đây" />
          </div>
        </div>

        <p className="practice-note">
          Con cứ thoải mái suy nghĩ — mỗi câu trả lời đều được lưu ngay, con có thể dừng lại và quay lại
          bất cứ lúc nào.
        </p>
      </div>

      <div className="q-nav">
        <Link href="/exams" className="btn btn-soft q-back">
          <Icon name="chevron-left" small />
          Quay lại
        </Link>
        <Link href="/submit" className="btn btn-primary q-next">
          Tiếp theo
          <Icon name="chevron-right" small />
        </Link>
      </div>
    </Device>
  );
}
