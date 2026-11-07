import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";
export async function currentUser() {
  const session = await auth0.getSession();
  if (!session?.user?.sub) redirect("/auth/login");
  return prisma.user.upsert({ where: { auth0Id: session.user.sub }, create: { auth0Id: session.user.sub, email: session.user.email ?? null }, update: { email: session.user.email ?? null }, select: { id: true } });
}
