import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { ChildChip } from "@/components/ChildChip";
import { Device } from "@/components/Device";
import { Icon } from "@/components/Icon";
import { TabBar } from "@/components/TabBar";
import { prisma } from "@/lib/prisma";

const grades = [1, 2, 3, 4, 5];

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  let exams: { id: string; title: string; round: string; examNo: number; _count: { questions: number } }[] = [];
  let unavailable = false;

  try {
    exams = await prisma.exam.findMany({
      where: { grade: 2, published: true },
      select: { id: true, title: true, round: true, examNo: true, _count: { select: { questions: true } } },
      orderBy: [{ round: "asc" }, { examNo: "asc" }],
    });
  } catch (error) {
    console.error("Unable to load exams from database", error);
    unavailable = true;
  }

  return (
    <Device>
      <AppBar>
        <ChildChip />
        <span className="spacer" />
        <Link href="/profiles" className="icon-btn" aria-label="Sửa hồ sơ">
          <Icon name="edit" small />
        </Link>
      </AppBar>

      <div className="body">
        <div className="grade-filters" role="group" aria-label="Lọc theo lớp">
          {grades.map((g) => (
            <button
              key={g}
              type="button"
              className={`chip${g === 2 ? " on" : ""}`}
              aria-pressed={g === 2}
              disabled={g !== 2}
            >
              Lớp {g}
            </button>
          ))}
        </div>

        {unavailable ? (
          <p className="card" role="status">Chưa thể tải danh sách đề. Vui lòng thử lại sau khi cơ sở dữ liệu sẵn sàng.</p>
        ) : exams.length === 0 ? (
          <p className="card">Chưa có đề lớp 2 được xuất bản. Hãy nhập dữ liệu đề thi để bắt đầu.</p>
        ) : exams.map((exam) => (
          <article className="card exam-card" key={exam.id}>
            <div className="top">
              <h3>{exam.title}</h3>
              <span className="pill pill-idle">Chưa làm</span>
            </div>
            <div className="meta">
              <span><Icon name="check-circle" small />{exam._count.questions} câu</span>
              <span><Icon name="clock" small />Vòng {exam.round} · Đề {exam.examNo}</span>
            </div>
            <div className="foot">
              <span className="exam-note">Đề TIMO lớp 2</span>
              <Link href={`/practice?exam=${encodeURIComponent(exam.id)}`} className="btn btn-primary exam-cta">
                Bắt đầu
              </Link>
            </div>
          </article>
        ))}
      </div>

      <TabBar active="exams" />
    </Device>
  );
}
