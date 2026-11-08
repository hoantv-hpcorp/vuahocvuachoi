import { NextResponse } from "next/server";
import { ExternalAccountClient, GoogleAuth } from "google-auth-library";
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
    if (chunk && Buffer.byteLength(chunk + word, "utf8") > 600) {
      chunks.push(chunk);
      chunk = "";
    }
    for (const character of word) {
      if (Buffer.byteLength(chunk + character, "utf8") > 600) {
        chunks.push(chunk);
        chunk = "";
      }
      chunk += character;
    }
    if (/[.!?]\s*$/u.test(word) && Buffer.byteLength(chunk, "utf8") >= 300) {
      chunks.push(chunk);
      chunk = "";
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, questionId, kind, index } = body ?? {};
    if (typeof attemptId !== "string" || typeof questionId !== "string" || (kind !== "EXPLAIN" && kind !== "SOLVE") || !Number.isSafeInteger(index) || index < 0) {
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
    const chunks = splitText(explanation.content);
    if (index >= chunks.length) return NextResponse.json({ error: "Unavailable" }, { status: 400 });
    const text = chunks[index];
      const wav = await cachedSpeechChunk(storage, text, async () => {
      const project = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
      if (!project || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)) throw new Error("Google Cloud project is not configured");
      const scopes = ["https://www.googleapis.com/auth/cloud-platform"];
      let client;
      if (process.env.VERCEL) {
        const { GCP_PROJECT_NUMBER, GCP_SERVICE_ACCOUNT_EMAIL, GCP_WORKLOAD_IDENTITY_POOL_ID, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID } = process.env;
        if (!GCP_PROJECT_NUMBER || !GCP_SERVICE_ACCOUNT_EMAIL || !GCP_WORKLOAD_IDENTITY_POOL_ID || !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID) {
          throw new Error("Google Cloud workload identity is not configured");
        }
        const oidcToken = request.headers.get("x-vercel-oidc-token");
        if (!oidcToken) throw new Error("Vercel OIDC token is unavailable");
        client = ExternalAccountClient.fromJSON({
          type: "external_account",
          audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
          subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
          token_url: "https://sts.googleapis.com/v1/token",
          service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
          subject_token_supplier: { getSubjectToken: async () => oidcToken },
        });
        if (!client) throw new Error("Could not initialize Google Cloud workload identity");
        client.scopes = scopes;
      } else {
        client = await new GoogleAuth({ scopes }).getClient();
      }
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
      }).catch((error: unknown) => {
        if (process.env.VERCEL) {
          try {
            const payload = request.headers.get("x-vercel-oidc-token")?.split(".")[1];
            const subject = payload && JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).sub;
            if (typeof subject === "string") console.error("Vercel OIDC subject:", subject);
          } catch {
            console.error("Could not read Vercel OIDC subject");
          }
        }
        throw error;
      });
      const candidate = result.data.candidates?.[0];
      const part = candidate?.content?.parts?.find(item => item.inlineData?.data)?.inlineData;
      if (candidate?.finishReason !== "STOP" || !part?.data || !part.mimeType?.startsWith("audio/wav")) throw new Error("Incomplete speech response");
      return Buffer.from(part.data, "base64");
      });
    return NextResponse.json({ audio: wav.toString("base64"), hasNext: index + 1 < chunks.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Speech synthesis unavailable", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Speech unavailable" }, { status: 500 });
  }
}
