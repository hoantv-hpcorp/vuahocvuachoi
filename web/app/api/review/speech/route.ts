import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { createClient } from "@supabase/supabase-js";
import { cachedSpeechChunk } from "@/lib/speech-cache";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Keep each request small enough for the model's text and audio token limits.
function splitText(text: string): string[] {
  const chunks: string[] = [];
  let chunk = "";
  for (const word of text.match(/\S+\s*/gu) ?? []) {
    if (chunk && Buffer.byteLength(chunk + word, "utf8") > 4500) {
      chunks.push(chunk);
      chunk = "";
    }
    for (const character of word) {
      if (Buffer.byteLength(chunk + character, "utf8") > 4500) {
        chunks.push(chunk);
        chunk = "";
      }
      chunk += character;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, questionId, kind } = body ?? {};
    if (typeof attemptId !== "string" || typeof questionId !== "string" || (kind !== "EXPLAIN" && kind !== "SOLVE")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const user = await currentUser();
    const answer = await prisma.attemptAnswer.findFirst({
      where: { attemptId, questionId, attempt: { profile: { userId: user.id }, status: { in: ["SUBMITTED", "REVIEWED"] } } },
      select: { id: true },
    });
    if (!answer) return NextResponse.json({ error: "Unavailable" }, { status: 404 });
    const explanation = await prisma.aiExplanation.findUnique({ where: { questionId_kind_language: { questionId, kind, language: "vi" } }, select: { content: true } });
    if (!explanation?.content || Buffer.byteLength(explanation.content, "utf8") > 50000) return NextResponse.json({ error: "Unavailable" }, { status: 400 });
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Storage configuration missing");
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const bucketName = process.env.SUPABASE_SPEECH_BUCKET ?? process.env.SUPABASE_EXAM_BUCKET ?? "exam-assets";
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucketName);
    if (bucketError || !bucket || bucket.public) throw new Error("Speech cache requires a private bucket");
    const storage = supabase.storage.from(bucketName);
    const audio: string[] = [];
    for (const text of splitText(explanation.content)) {
      const wav = await cachedSpeechChunk(storage, text, async () => {
      const project = process.env.GOOGLE_CLOUD_PROJECT;
      if (!project || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)) throw new Error("Google Cloud project is not configured");
      const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
      const client = await auth.getClient();
      const result = await client.request<{
        candidates?: { finishReason?: string; content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
      }>({
        url: `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/gemini-3.8-flash-tts:generateContent`,
        method: "POST",
        data: {
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { voice: "Mako" } } },
        },
        signal: request.signal,
      });
      const candidate = result.data.candidates?.[0];
      const part = candidate?.content?.parts?.find(item => item.inlineData?.data)?.inlineData;
      if (candidate?.finishReason !== "STOP" || !part?.data || !part.mimeType?.startsWith("audio/wav")) throw new Error("Incomplete speech response");
      return Buffer.from(part.data, "base64");
      });
      audio.push(wav.toString("base64"));
    }
    return NextResponse.json({ audio }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Speech synthesis unavailable", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Speech unavailable" }, { status: 500 });
  }
}
