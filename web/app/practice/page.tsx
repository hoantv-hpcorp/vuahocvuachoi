import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
export default async function PracticePage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
 const [user, jar, params] = await Promise.all([currentUser(), cookies(), searchParams]);
 const profile = await prisma.profile.findFirst({ where: { id: jar.get("selected_profile")?.value ?? "", userId: user.id }, select: { grade: true, nickname: true } });
 if (!profile) redirect("/profiles");
 const exam = await prisma.exam.findFirst({ where: { id: params.exam ?? "", grade: profile.grade, published: true }, select: { title: true } });
 if (!exam) notFound();
 return <Device><AppBar><Link href="/exams" className="btn btn-ghost">Quay lại</Link><div className="title title-sm">{exam.title}</div></AppBar><div className="body"><h1>Đã chọn đề cho {profile.nickname}</h1><p>Phần làm bài đang được chuẩn bị. Hãy quay lại sau nhé.</p><Link href="/exams" className="btn btn-soft">Chọn đề khác</Link></div></Device>;
}
