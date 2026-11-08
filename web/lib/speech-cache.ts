import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const CACHE_VERSION = "v1";
const MODEL = "gemini-3.8-flash-tts";
const VOICE = "Mako";

export async function cachedSpeechChunk(
  storage: ReturnType<SupabaseClient["storage"]["from"]>,
  text: string,
  generate: () => Promise<Buffer>,
): Promise<Buffer> {
  const hash = createHash("sha256").update(JSON.stringify([CACHE_VERSION, MODEL, VOICE, text])).digest("hex");
  const path = `tts-cache/${CACHE_VERSION}/${hash}.wav`;
  const { data, error } = await storage.download(path);
  if (data) return Buffer.from(await data.arrayBuffer());
  if (!error || error.statusCode !== "404") throw new Error("Speech cache unavailable");

  const wav = await generate();
  const uploaded = await storage.upload(path, wav, { contentType: "audio/wav", upsert: false });
  // Another request may have stored the same chunk while this request was generating it.
  if (uploaded.error && uploaded.error.statusCode !== "409") throw new Error("Could not save speech cache");
  return wav;
}
