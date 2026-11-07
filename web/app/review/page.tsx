import { createClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Review } from "./review";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ attempt?: string }> }) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  const attempt = await prisma.attempt.findFirst({
    where: { id: params.attempt ?? "", profile: { userId: user.id }, status: { in: ["SUBMITTED", "REVIEWED"] } },
    select: { id: true, exam: { select: { title: true, questions: { orderBy: { number: "asc" }, select: { id: true, number: true, topic: true, type: true, contentText: true, correctAnswer: true, images: { where: { role: "FIGURE" }, orderBy: { seq: "asc" }, select: { storageKey: true } }, options: { orderBy: { position: "asc" }, select: { position: true, text: true, image: { select: { storageKey: true } } } } } } } }, answers: { select: { questionId: true, rawAnswer: true, systemCorrect: true, overrideCorrect: true, pointsPossible: true } } },
  });
  if (!attempt) {
    const open = await prisma.attempt.findFirst({ where: { id: params.attempt ?? "", profile: { userId: user.id }, status: "IN_PROGRESS" }, select: { id: true } });
    if (open) redirect(`/practice?attempt=${encodeURIComponent(open.id)}`);
    notFound();
  }
  const keys = [...new Set(attempt.exam.questions.flatMap(q => [...q.images.map(i => i.storageKey), ...q.options.flatMap(o => o.image ? [o.image.storageKey] : [])]))];
  const urls = new Map<string, string>();
  if (keys.length) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Storage configuration missing");
    const { data, error } = await createClient(url, key).storage.from(process.env.SUPABASE_EXAM_BUCKET ?? "exam-assets").createSignedUrls(keys, 86400);
    if (error || !data || data.some(i => !i.signedUrl)) throw new Error("Unable to load question figures");
    data.forEach((item, i) => urls.set(keys[i], item.signedUrl!));
  }
  const answers = new Map(attempt.answers.map(a => [a.questionId, a]));
  const questions = attempt.exam.questions.map(q => {
    const answer = answers.get(q.id);
    if (!answer || answer.systemCorrect === null || answer.pointsPossible === null) throw new Error("Attempt has not been fully graded");
    return { ...q, images: q.images.map(i => urls.get(i.storageKey)!), options: q.options.map(o => ({ ...o, image: o.image ? urls.get(o.image.storageKey) ?? null : null })), answer: answer.rawAnswer, systemCorrect: answer.systemCorrect, overrideCorrect: answer.overrideCorrect, points: answer.pointsPossible };
  });
  return <Review attemptId={attempt.id} title={attempt.exam.title} questions={questions} />;
}
