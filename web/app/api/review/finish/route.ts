import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const user = await currentUser();
  const form = await request.formData();
  const attemptId = form.get("attemptId");
  if (typeof attemptId !== "string") return new Response(null, { status: 400 });
  await prisma.attempt.updateMany({ where: { id: attemptId, profile: { userId: user.id }, status: "SUBMITTED" }, data: { status: "REVIEWED", reviewedAt: new Date() } });
  return new Response(null, { status: 204 });
}
