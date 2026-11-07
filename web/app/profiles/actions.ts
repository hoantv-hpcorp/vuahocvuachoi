"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
export async function saveProfile(data: FormData) {
 const user = await currentUser();
 const id = String(data.get("id") ?? "");
 const nickname = String(data.get("nickname") ?? "").trim();
 const gradeText = String(data.get("grade") ?? "");
 if (!nickname || nickname.length > 50 || !/^[1-5]$/.test(gradeText)) redirect(`/profiles?${id ? `edit=${encodeURIComponent(id)}&` : "new=1&"}error=invalid`);
 const values = { nickname, grade: Number(gradeText) };
 if (id) await prisma.profile.updateMany({ where: { id, userId: user.id }, data: values });
 else await prisma.profile.create({ data: { ...values, userId: user.id } });
 revalidatePath("/profiles"); redirect("/profiles");
}
export async function selectProfile(data: FormData) {
 const user = await currentUser(); const id = String(data.get("id") ?? "");
 const profile = await prisma.profile.findFirst({ where: { id, userId: user.id }, select: { id: true } });
 if (!profile) redirect("/profiles");
 (await cookies()).set("selected_profile", profile.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 });
 redirect("/exams");
}
export async function deleteProfile(data: FormData) {
 const user = await currentUser(); const id = String(data.get("id") ?? "");
 await prisma.profile.deleteMany({ where: { id, userId: user.id } });
 const jar = await cookies(); if (jar.get("selected_profile")?.value === id) jar.delete("selected_profile");
 revalidatePath("/profiles"); redirect("/profiles");
}
