import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { TabBar } from "@/components/TabBar";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { clearHistory } from "./actions";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ clear?: string }> }) {
  const [user, jar, params] = await Promise.all([currentUser(), cookies(), searchParams]);
  const profile = await prisma.profile.findFirst({ where: { id: jar.get("selected_profile")?.value ?? "", userId: user.id }, select: { id: true, nickname: true, grade: true } });
  if (!profile) redirect("/profiles");
  const attempts = await prisma.attempt.findMany({
    where: { profileId: profile.id, profile: { userId: user.id } },
    orderBy: { startedAt: "desc" },
    select: { id: true, status: true, startedAt: true, submittedAt: true, exam: { select: { title: true } }, answers: { select: { systemCorrect: true, overrideCorrect: true, pointsPossible: true } } },
  });
  return <Device><AppBar><Link href="/profiles" className="chip on">{profile.nickname} · Lớp {profile.grade}</Link><span className="spacer" /><Link href="/profiles" className="btn btn-ghost">Đổi hồ sơ</Link></AppBar>
    <div className="body"><h1 className="lead">Lịch sử làm bài của {profile.nickname}</h1>
      {params.clear === "1" && attempts.length > 0 ? <><h2>Xóa toàn bộ lịch sử?</h2><p>Thao tác này xóa tất cả bài làm của {profile.nickname}, kể cả bài đang làm dở. Không thể khôi phục.</p><form action={clearHistory} className="profile-form"><input type="hidden" name="profileId" value={profile.id} /><button className="btn btn-primary" type="submit">Xóa toàn bộ lịch sử</button><Link className="btn btn-soft" href="/history">Hủy</Link></form></> : <>
        {attempts.length === 0 ? <p className="card empty-catalog">Con chưa có bài làm nào. Hãy chọn một đề để bắt đầu nhé.</p> : attempts.map(attempt => {
          const date = attempt.submittedAt ?? attempt.startedAt;
          const day = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
          const month = new Intl.DateTimeFormat("vi-VN", { month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
          const open = attempt.status === "IN_PROGRESS";
          const total = attempt.answers.reduce((sum, answer) => sum + ((answer.overrideCorrect ?? answer.systemCorrect) ? answer.pointsPossible ?? 0 : 0), 0);
          const possible = attempt.answers.reduce((sum, answer) => sum + (answer.pointsPossible ?? 0), 0);
          return <Link key={attempt.id} href={`/${open ? "practice" : "review"}?attempt=${encodeURIComponent(attempt.id)}`} className="card hist-row"><div className="hist-date"><b>{day}</b><span>{month}</span></div><div className="hist-main"><h2>{attempt.exam.title}</h2><p>{open ? "Đang làm dở" : attempt.status === "SUBMITTED" ? "Đã nộp · Chưa xem lại" : "Đã xem lại"}</p></div><div className="hist-side">{!open && <div className="hist-score">{total}<small> / {possible}</small></div>}<span className={`pill ${open || attempt.status === "SUBMITTED" ? "pill-look" : "pill-ok"}`}>{open ? "Tiếp tục" : "Xem lại"}</span></div></Link>;
        })}
        {attempts.length > 0 && <Link href="/history?clear=1" className="btn btn-ghost history-clear">Xóa lịch sử của con</Link>}
        <p className="fineprint">Bố mẹ có thể xóa lịch sử hoặc hồ sơ của con bất cứ lúc nào. <Link href="/privacy">Quyền riêng tư</Link></p>
      </>}
    </div><TabBar active="history" /></Device>;
}
