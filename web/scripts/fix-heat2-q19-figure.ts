import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../generated/prisma/client";

loadEnvConfig(process.cwd());
const storageKey = "timo/grade2/heat/exam-02/q-19/figure-01.png";
const expectedHash = "1056a2b2fc960b0df8cb1f572e7874444b8fd1a5202d764c4a5b3997b6338297";
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function main() {
  const bytes = readFileSync(`../extractor/output/out/images/${storageKey}`);
  if (hash(bytes) !== expectedHash || bytes.readUInt32BE(16) !== 590 || bytes.readUInt32BE(20) !== 260) throw new Error("Unexpected figure file");
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!connectionString || !url || !key) throw new Error("Missing database or Supabase configuration");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const storage = createClient(url, key, { auth: { persistSession: false } }).storage.from(process.env.SUPABASE_EXAM_BUCKET ?? "exam-assets");
  try {
    const question = await prisma.question.findFirst({ where: { number: 19, exam: { code: "timo-g2-heat-02" } }, include: { images: true } });
    if (!question || !question.contentText.includes("How many rectangles") || question.correctAnswer !== "10") throw new Error("Question does not match expected exam and content");
    const conflicting = question.images.find(i => i.role === "FIGURE" && i.seq === 1 && i.storageKey !== storageKey);
    const existing = await prisma.questionImage.findUnique({ where: { storageKey } });
    if (conflicting || (existing && (existing.questionId !== question.id || existing.role !== "FIGURE" || existing.seq !== 1))) throw new Error("Conflicting image record; no changes made");
    const { error } = await storage.upload(storageKey, bytes, { contentType: "image/png", upsert: true, cacheControl: "60" });
    if (error) throw error;
    const downloaded = await storage.download(storageKey);
    if (downloaded.error || !downloaded.data || hash(new Uint8Array(await downloaded.data.arrayBuffer())) !== expectedHash) throw new Error("Storage verification failed");
    await prisma.questionImage.upsert({ where: { storageKey }, create: { questionId: question.id, role: "FIGURE", seq: 1, storageKey, width: 590, height: 260, sha256: expectedHash }, update: { width: 590, height: 260, sha256: expectedHash } });
    const verified = await prisma.questionImage.findUniqueOrThrow({ where: { storageKey } });
    if (verified.questionId !== question.id || verified.role !== "FIGURE" || verified.seq !== 1 || verified.sha256 !== expectedHash) throw new Error("Database verification failed");
    console.log("Verified HEAT exam 2 question 19 figure in Storage and database.");
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
