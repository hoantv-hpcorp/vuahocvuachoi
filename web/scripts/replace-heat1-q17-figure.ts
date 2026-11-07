import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../generated/prisma/client";

loadEnvConfig(process.cwd());

const storageKey = "timo/grade2/heat/exam-01/q-17/figure-01.png";
const expectedHash = "bf5be7aa3f51c3906d143bfd46705e819ea65fbb06ad14a547527078aace9974";
const file = path.resolve(process.argv[2] ?? `../extractor/output/out/images/${storageKey}`);
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function main() {
  const bytes = readFileSync(file);
  if (sha256(bytes) !== expectedHash || !bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) ||
      bytes.readUInt32BE(16) !== 775 || bytes.readUInt32BE(20) !== 370) {
    throw new Error(`Expected the corrected 775x370 PNG at ${file}; refusing to upload.`);
  }

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!connectionString || !url || !key) throw new Error("Configure the database URL, Supabase URL, and service role key in web/.env.local.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const bucket = process.env.SUPABASE_EXAM_BUCKET ?? "exam-assets";
  const storage = createClient(url, key, { auth: { persistSession: false } }).storage.from(bucket);
  try {
    const image = await prisma.questionImage.findUnique({
      where: { storageKey },
      include: { question: { include: { exam: true } } },
    });
    if (!image || image.role !== "FIGURE" || image.seq !== 1 || image.question.number !== 17 ||
        image.question.exam.code !== "timo-g2-heat-01") {
      throw new Error("The existing image record does not match TIMO Grade 2 HEAT exam 1 question 17.");
    }

    const { error: uploadError } = await storage.upload(storageKey, bytes, {
      contentType: "image/png", upsert: true, cacheControl: "60",
    });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data, error: downloadError } = await storage.download(storageKey);
    if (downloadError || !data || sha256(new Uint8Array(await data.arrayBuffer())) !== expectedHash) {
      throw new Error(`Upload could not be verified: ${downloadError?.message ?? "checksum mismatch"}. Rerun the script.`);
    }

    await prisma.questionImage.update({ where: { id: image.id }, data: { width: 775, height: 370, sha256: expectedHash } });
    const updated = await prisma.questionImage.findUniqueOrThrow({ where: { id: image.id } });
    if (updated.width !== 775 || updated.height !== 370 || updated.sha256 !== expectedHash) throw new Error("Database metadata verification failed; rerun the script.");
    console.log(`Replaced and verified ${bucket}/${storageKey}. Existing cached images may take time to refresh.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
