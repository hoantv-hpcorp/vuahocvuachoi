"use server";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function setOverride(attemptId: string, questionId: string, correct: boolean) {
  if (typeof correct !== "boolean") throw new Error("Invalid result");
  const user = await currentUser();
  const result = await prisma.attemptAnswer.updateMany({
    where: { attemptId, questionId, attempt: { profile: { userId: user.id }, status: { in: ["SUBMITTED", "REVIEWED"] } } },
    data: { overrideCorrect: correct },
  });
  if (result.count !== 1) throw new Error("Answer unavailable");
}

export async function finishReview(attemptId: string) {
  const user = await currentUser();
  await prisma.attempt.updateMany({ where: { id: attemptId, profile: { userId: user.id }, status: "SUBMITTED" }, data: { status: "REVIEWED", reviewedAt: new Date() } });
}

