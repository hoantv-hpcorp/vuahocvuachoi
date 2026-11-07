import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { ChildChip } from "@/components/ChildChip";
import { Device } from "@/components/Device";
import { Icon } from "@/components/Icon";
import { TabBar } from "@/components/TabBar";

const attempts = [
  {
    id: 1,
    day: "02",
    month: "Th11",
    title: "TIMO · Vòng 1 — 2023",
    note: "Đã phúc khảo · Bố mẹ duyệt 1 câu",
    score: 72,
    action: "Xem lại",
    tone: "pill-ok",
  },
  {
    id: 2,
    day: "26",
    month: "Th10",
    title: "TIMO · Vòng 2 — 2022",
    note: "Đã phúc khảo · Chưa có chỉnh sửa",
    score: 65,
    action: "Xem lại",
    tone: "pill-ok",
  },
  {
    id: 3,
    day: "19",
    month: "Th10",
    title: "TIMO · Vòng 1 — 2022",
    note: "Nộp bài xong · Chưa xem lại cùng con",
    score: 58,
    action: "Phúc khảo",
    tone: "pill-look",
  },
];

export default function HistoryPage() {
  return (
    <Device>
      <AppBar>
        <ChildChip />
        <span className="spacer" />
        <button type="button" className="icon-btn" title="Xóa lịch sử" aria-label="Xóa lịch sử">
          <Icon name="trash" small />
        </button>
      </AppBar>

      <div className="body">
        <p className="lead">Lịch sử làm bài của con</p>

        {attempts.map((attempt) => (
          <Link key={attempt.id} href="/review" className="card hist-row">
            <div className="hist-date">
              <b>{attempt.day}</b>
              <span>{attempt.month}</span>
            </div>
            <div className="hist-main">
              <h4>{attempt.title}</h4>
              <p>{attempt.note}</p>
            </div>
            <div className="hist-side">
              <div className="hist-score">
                {attempt.score}
                <small> /100</small>
              </div>
              <span className={`pill ${attempt.tone}`}>{attempt.action}</span>
            </div>
          </Link>
        ))}

        <p className="fineprint">
          Mỗi bài làm được giữ nguyên vĩnh viễn theo hồ sơ của con. Bố mẹ có thể xóa toàn bộ lịch sử của
          một con bất cứ lúc nào.
        </p>
      </div>

      <TabBar active="history" />
    </Device>
  );
}
