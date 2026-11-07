"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { gradeAnswer } from "@/lib/grading";

export async function startAttempt(form: FormData) {
  const [user, jar] = await Promise.all([currentUser(), cookies()]);
  const profileId = jar.get("selected_profile")?.value ?? "";
  const examId = String(form.get("examId") ?? "");
  const attempt = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM profiles WHERE id = ${profileId} FOR UPDATE`;
    const profile = await tx.profile.findFirst({ where: { id: profileId, userId: user.id } });
    if (!profile) throw new Error("Profile not found");
    const exam = await tx.exam.findFirst({ where: { id: examId, grade: profile.grade, published: true }, select: { id: true, _count: { select: { questions: true } } } });
    if (!exam || !exam._count.questions) throw new Error("Exam not found or empty");
    return (await tx.attempt.findFirst({ where: { profileId, examId, status: "IN_PROGRESS" }, select: { id: true } })) ?? tx.attempt.create({ data: { profileId, examId }, select: { id: true } });
  });
  redirect(`/practice?attempt=${encodeURIComponent(attempt.id)}`);
}

export async function saveAnswer(attemptId: string, questionId: string, rawAnswer: string) {
  const user = await currentUser();
  if (typeof rawAnswer !== "string" || rawAnswer.length > 1000) throw new Error("Invalid answer");
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM attempts WHERE id = ${attemptId} FOR UPDATE`;
    const attempt = await tx.attempt.findFirst({ where: { id: attemptId, status: "IN_PROGRESS", profile: { userId: user.id } }, select: { examId: true } });
    if (!attempt) throw new Error("Attempt unavailable");
    const question = await tx.question.findFirst({ where: { id: questionId, examId: attempt.examId }, select: { type: true, options: { select: { position: true } } } });
    if (!question || (question.type === "MCQ" && rawAnswer !== "" && !question.options.some(o => String.fromCharCode(64 + o.position) === rawAnswer))) throw new Error("Invalid question or answer");
    await tx.attemptAnswer.upsert({ where: { attemptId_questionId: { attemptId, questionId } }, create: { attemptId, questionId, rawAnswer, answeredAt: rawAnswer.trim() ? new Date() : null }, update: { rawAnswer, answeredAt: rawAnswer.trim() ? new Date() : null } });
  });
}

export async function submitAttempt(attemptId: string) {
  const user = await currentUser();
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM attempts WHERE id = ${attemptId} FOR UPDATE`;
    const attempt = await tx.attempt.findFirst({ where: { id: attemptId, profile: { userId: user.id } }, select: { status: true, examId: true, answers: { select: { questionId: true, rawAnswer: true } } } });
    if (!attempt) throw new Error("Attempt unavailable");
    if (attempt.status !== "IN_PROGRESS") return;
    const questions = await tx.question.findMany({ where: { examId: attempt.examId }, select: { id: true, correctAnswer: true, points: true } });
    const now = new Date();
    const answers = new Map(attempt.answers.map(answer => [answer.questionId, answer.rawAnswer]));
    const missing = questions.filter(q => !answers.has(q.id));
    if (missing.length) {
      await tx.attemptAnswer.createMany({ data: missing.map(q => ({ attemptId, questionId: q.id })) });
    }
    const groups = new Map<string, { points: number; correct: boolean; ids: string[] }>();
    for (const q of questions) {
      const correct = gradeAnswer(answers.get(q.id) ?? null, q.correctAnswer);
      const key = `${q.points}:${correct}`;
      const group = groups.get(key) ?? { points: q.points, correct, ids: [] };
      group.ids.push(q.id);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      await tx.attemptAnswer.updateMany({ where: { attemptId, questionId: { in: group.ids } }, data: { systemCorrect: group.correct, pointsPossible: group.points, gradedAt: now } });
    }
    await tx.attempt.update({ where: { id: attemptId }, data: { status: "SUBMITTED", submittedAt: now } });
  });
}
