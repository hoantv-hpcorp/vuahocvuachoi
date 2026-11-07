import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { Icon } from "@/components/Icon";

export default function SubmitPage() {
  return (
    <Device>
      <AppBar>
        <Link href="/practice" className="icon-btn" aria-label="Quay lại làm bài">
          <Icon name="chevron-left" small />
        </Link>
        <div className="title title-sm">TIMO - Vòng HEAT - Đề 1</div>
        <span className="spacer" />
        <span className="savedot">Đã lưu tự động</span>
      </AppBar>

      <div className="body clip">
        <div className="q-progress">
          <div className="track">
            <i style={{ width: "100%" }} />
          </div>
          <span className="count">Câu 30 / 30</span>
        </div>

        <div className="card q-card is-muted">
          <div className="q-num">CÂU 30</div>
          <div className="q-text">Tính nhẩm: 7 + 8 = ?</div>
          <input className="free-input" defaultValue="15" readOnly tabIndex={-1} />
        </div>
      </div>

      <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="submit-title">
        <div className="modal">
          <div className="modal-icon">
            <span>
              <Icon name="check-circle" style={{ width: 34, height: 34 }} />
            </span>
          </div>
          <h2 id="submit-title">Con đã sẵn sàng nộp bài chưa?</h2>
          <div className="stats">
            <div className="stat done">
              <b>30</b>
              <span>câu đã trả lời</span>
            </div>
            <div className="stat open">
              <b>0</b>
              <span>câu còn trống</span>
            </div>
          </div>
          <p>
            Con đã hoàn thành đủ cả 30 câu, tuyệt vời! Con có thể xem lại bài làm trước khi nộp, hoặc nộp
            bài ngay.
          </p>
          <Link href="/practice" className="btn btn-soft">
            Xem lại bài làm
          </Link>
          <Link href="/review" className="btn btn-primary">
            Nộp bài
          </Link>
        </div>
      </div>
    </Device>
  );
}
