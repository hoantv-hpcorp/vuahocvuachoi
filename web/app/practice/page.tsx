import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Device } from "@/components/Device";
import { AppBar } from "@/components/AppBar";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Practice } from "./practice";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ attempt?: string }> }) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  const attempt = await prisma.attempt.findFirst({ where: { id: params.attempt ?? "", profile: { userId: user.id } }, select: { id: true, status: true, exam: { select: { title: true, questions: { orderBy: { number: "asc" }, select: { id: true, number: true, topic: true, type: true, contentText: true, images: { where: { role: "FIGURE" }, orderBy: { seq: "asc" }, select: { storageKey: true } }, options: { orderBy: { position: "asc" }, select: { position: true, text: true, image: { select: { storageKey: true } } } } } } } }, answers: { select: { questionId: true, rawAnswer: true } } } });
  if (!attempt) notFound();
  if (attempt.status !== "IN_PROGRESS") return <Device><AppBar><Link href="/exams" className="btn btn-ghost">Về danh sách đề</Link></AppBar><div className="body"><h1>Bài đã được nộp</h1><p>Phần xem lại bài đang được chuẩn bị.</p></div></Device>;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const keys = [...new Set(attempt.exam.questions.flatMap(q => [...q.images.map(i => i.storageKey), ...q.options.flatMap(o => o.image ? [o.image.storageKey] : [])]))];
  const urls = new Map<string, string>();
  if (keys.length) {
    if (!url || !key) throw new Error("Storage configuration missing");
    const { data, error } = await createClient(url, key).storage.from(process.env.SUPABASE_EXAM_BUCKET ?? "exam-assets").createSignedUrls(keys, 86400);
    if (error || !data || data.some(i => !i.signedUrl)) throw new Error("Unable to load question figures");
    data.forEach((item, i) => urls.set(keys[i], item.signedUrl!));
  }
  const questions = attempt.exam.questions.map(q => ({ id: q.id, number: q.number, topic: q.topic, type: q.type, contentText: q.contentText, images: q.images.map(i => urls.get(i.storageKey)!), options: q.options.map(o => ({ position: o.position, text: o.text, image: o.image ? urls.get(o.image.storageKey) ?? null : null })) }));
  return <Practice attemptId={attempt.id} title={attempt.exam.title} questions={questions} initialAnswers={Object.fromEntries(attempt.answers.map(a => [a.questionId, a.rawAnswer ?? ""]))} />;
}

