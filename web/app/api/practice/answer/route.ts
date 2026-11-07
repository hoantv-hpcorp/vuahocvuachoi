import { saveAnswer } from "@/app/practice/actions";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }
  if (!body || typeof body !== "object" || !("attemptId" in body) || !("questionId" in body) || !("rawAnswer" in body) || typeof body.attemptId !== "string" || typeof body.questionId !== "string" || typeof body.rawAnswer !== "string") return new Response(null, { status: 400 });
  await saveAnswer(body.attemptId, body.questionId, body.rawAnswer);
  return new Response(null, { status: 204 });
}
