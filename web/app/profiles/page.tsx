import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { Icon } from "@/components/Icon";

export default function ProfilesPage() {
  return (
    <Device>
      <AppBar>
        <div className="title">Xin chào, gia đình!</div>
        <span className="spacer" />
        <a href="/auth/logout" className="btn btn-ghost appbar-btn">
          Đăng xuất
        </a>
      </AppBar>

      <div className="body">
        <p className="lead">Hôm nay con nào luyện đề?</p>

        <div className="profile-grid">
          <Link href="/exams" className="profile-card">
            <span className="edit" aria-hidden="true">
              <Icon name="edit" small />
            </span>
            <div className="avatar av-1">N</div>
            <div className="name">Bé Na</div>
            <div className="meta">Lớp 2 · 4 bài đã làm</div>
            <span className="pill pill-ok">Tiếp tục nhé</span>
          </Link>

          <Link href="/exams" className="profile-card">
            <span className="edit" aria-hidden="true">
              <Icon name="edit" small />
            </span>
            <div className="avatar av-2">B</div>
            <div className="name">Bé Bi</div>
            <div className="meta">Lớp 1 · chưa làm bài nào</div>
          </Link>

          <div className="card add-card">
            <Icon name="plus" />
            Thêm hồ sơ con mới
          </div>
        </div>

        <p className="fineprint">
          Bố mẹ có thể sửa tên và lớp, hoặc xóa hồ sơ cùng toàn bộ lịch sử bất cứ lúc nào.
        </p>
      </div>
    </Device>
  );
}
