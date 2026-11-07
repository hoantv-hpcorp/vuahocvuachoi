"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function clearHistory(data: FormData) {
  const [user, jar] = await Promise.all([currentUser(), cookies()]);
  const profileId = String(data.get("profileId") ?? "");
  if (jar.get("selected_profile")?.value !== profileId) redirect("/profiles");
  await prisma.attempt.deleteMany({ where: { profileId, profile: { userId: user.id } } });
  revalidatePath("/history");
  revalidatePath("/exams");
  redirect("/history");
}
