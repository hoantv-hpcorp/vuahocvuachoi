import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { TabBar } from "@/components/TabBar";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { startAttempt } from "@/app/practice/actions";
export default async function ExamsPage() {
 const [user, jar] = await Promise.all([currentUser(), cookies()]);
 const profile = await prisma.profile.findFirst({ where: { id: jar.get("selected_profile")?.value ?? "", userId: user.id }, select: { nickname: true, grade: true } });
 if (!profile) redirect("/profiles");
 const exams = await prisma.exam.findMany({ where: { grade: profile.grade, published: true }, select: { id: true, title: true, round: true, examNo: true, _count: { select: { questions: true } } }, orderBy: [{ round: "asc" }, { examNo: "asc" }] });
 return <Device><AppBar><Link href="/profiles" className="chip on">{profile.nickname} · Lớp {profile.grade}</Link><span className="spacer" /><Link href="/profiles" className="btn btn-ghost">Đổi hồ sơ</Link></AppBar><div className="body"><h1 className="lead">Đề thi lớp {profile.grade}</h1>{exams.length === 0 ? <p className="card empty-catalog">Chưa có đề cho lớp {profile.grade}. Hãy quay lại sau nhé.</p> : exams.map(exam => <article className="card exam-card" key={exam.id}><div className="top"><h2>{exam.title}</h2></div><div className="meta"><span>{exam._count.questions} câu</span><span>Vòng {exam.round} · Đề {exam.examNo}</span></div><div className="foot"><span className="exam-note">TIMO lớp {profile.grade}</span><form action={startAttempt}><input type="hidden" name="examId" value={exam.id} /><button className="btn btn-primary exam-cta">Bắt đầu / Tiếp tục</button></form></div></article>)}</div><TabBar active="exams" /></Device>;
}

