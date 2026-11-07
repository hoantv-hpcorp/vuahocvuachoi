import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { z } from "zod";

loadEnvConfig(process.cwd());

const imageSchema = z.object({
  role: z.enum(["SNAPSHOT", "FIGURE", "OPTION", "SOLUTION_SNAPSHOT", "SOLUTION_FIGURE"]),
  seq: z.number().int().positive(),
  storageKey: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  sha256: z.string().optional(),
});

const optionSchema = z.object({
  type: z.enum(["text", "image"]),
  text: z.string().optional(),
  storageKey: z.string().optional(),
});

const questionSchema = z.object({
  number: z.number().int().positive(),
  topic: z.string().min(1),
  type: z.enum(["MCQ", "FILL"]),
  contentText: z.string().min(1),
  options: z.array(optionSchema).nullable(),
  correctAnswer: z.string().min(1),
  solutionText: z.string().optional(),
  points: z.number().int().nonnegative(),
  needsReview: z.boolean().default(false),
  images: z.array(imageSchema).default([]),
});

const datasetSchema = z.object({
  sourceFile: z.string().optional(),
  exams: z.array(z.object({
    round: z.string().min(1),
    examNo: z.number().int().positive(),
    sourceFile: z.string().optional(),
    questions: z.array(questionSchema).min(1),
  })).min(1),
});

type Dataset = z.infer<typeof datasetSchema>;

function arg(name: string, fallback?: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const datasetPath = path.resolve(arg("file", "../extractor/output/out/dataset.json")!);
const imageRoot = path.resolve(arg("images", "../extractor/output/out/images")!);
const source = arg("source", "TIMO")!;
const grade = Number(arg("grade", "2"));
const yearText = arg("year");
const year = yearText ? Number(yearText) : null;
const validateOnly = process.argv.includes("--validate-only");

function loadDataset(): Dataset {
  const parsed = datasetSchema.parse(JSON.parse(readFileSync(datasetPath, "utf8")));
  const errors: string[] = [];
  const examCodes = new Set<string>();

  for (const exam of parsed.exams) {
    const code = `${source.toLowerCase()}-g${grade}-${exam.round.toLowerCase()}-${String(exam.examNo).padStart(2, "0")}`;
    if (examCodes.has(code)) errors.push(`Duplicate exam: ${code}`);
    examCodes.add(code);

    const numbers = new Set<number>();
    for (const question of exam.questions) {
      if (numbers.has(question.number)) errors.push(`${code}: duplicate question ${question.number}`);
      numbers.add(question.number);
      if (question.type === "MCQ" && (!question.options || question.options.length < 2)) {
        errors.push(`${code} question ${question.number}: MCQ has fewer than two options`);
      }
      for (const image of question.images) {
        const localPath = path.join(imageRoot, ...image.storageKey.split("/"));
        if (!existsSync(localPath)) errors.push(`${code} question ${question.number}: missing ${image.storageKey}`);
      }
    }
  }

  if (errors.length) throw new Error(`Dataset validation failed:\n${errors.slice(0, 50).join("\n")}`);
  return parsed;
}

async function importDataset(dataset: Dataset) {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Set DIRECT_URL or DATABASE_URL before importing");

  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("../generated/prisma/client"),
  ]);
  const { createClient } = await import("@supabase/supabase-js");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_EXAM_BUCKET ?? "exam-assets";
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before importing figures");
  }
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  try {
    const imageByKey = new Map<string, (typeof dataset.exams)[number]["questions"][number]["images"][number]>();
    for (const exam of dataset.exams) {
      for (const question of exam.questions) {
        for (const image of question.images) imageByKey.set(image.storageKey, image);
      }
    }
    const images = [...imageByKey.values()];
    let uploadedCount = 0;
    const workerCount = Math.min(12, images.length);
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = uploadedCount;
        if (index >= images.length) return;
        uploadedCount += 1;
        const image = images[index];
        const localPath = path.join(imageRoot, ...image.storageKey.split("/"));
        const contentType = image.storageKey.toLowerCase().endsWith(".png") ? "image/png" :
          image.storageKey.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg";
        const { error } = await supabase.storage.from(bucket).upload(image.storageKey, readFileSync(localPath), {
          contentType,
          upsert: true,
        });
        if (error) throw new Error(`Supabase Storage upload failed for ${image.storageKey}: ${error.message}`);
        if (uploadedCount % 100 === 0) console.log(`Uploaded ${uploadedCount}/${images.length} figures…`);
      }
    }));
    console.log(`Uploaded ${images.length} unique figures to Supabase Storage bucket "${bucket}".`);

    for (const examData of dataset.exams) {
      const round = examData.round.toUpperCase();
      const code = `${source.toLowerCase()}-g${grade}-${round.toLowerCase()}-${String(examData.examNo).padStart(2, "0")}`;
      await prisma.$transaction(async (tx) => {
        const exam = await tx.exam.upsert({
          where: { code },
          update: {
            source, grade, year, round, examNo: examData.examNo, published: true,
            title: `${source} - Vòng ${round} - Đề ${examData.examNo}`,
            sourceFile: examData.sourceFile ?? dataset.sourceFile,
          },
          create: {
            code, source, grade, year, round, examNo: examData.examNo, published: true,
            title: `${source} - Vòng ${round} - Đề ${examData.examNo}`,
            sourceFile: examData.sourceFile ?? dataset.sourceFile,
          },
        });

        for (const data of examData.questions) {
          const question = await tx.question.upsert({
            where: { examId_number: { examId: exam.id, number: data.number } },
            update: {
              topic: data.topic, type: data.type, contentText: data.contentText,
              correctAnswer: data.correctAnswer, solutionText: data.solutionText,
              points: data.points, needsReview: data.needsReview,
            },
            create: {
              examId: exam.id, number: data.number, topic: data.topic, type: data.type,
              contentText: data.contentText, correctAnswer: data.correctAnswer,
              solutionText: data.solutionText, points: data.points, needsReview: data.needsReview,
            },
          });

          await tx.questionOption.deleteMany({ where: { questionId: question.id } });
          await tx.questionImage.deleteMany({ where: { questionId: question.id } });
          const imageIds = new Map<string, string>();
          for (const image of data.images) {
            const created = await tx.questionImage.create({ data: { questionId: question.id, ...image } });
            imageIds.set(image.storageKey, created.id);
          }
          for (const [index, option] of (data.options ?? []).entries()) {
            await tx.questionOption.create({
              data: {
                questionId: question.id,
                position: index + 1,
                text: option.text,
                imageId: option.storageKey ? imageIds.get(option.storageKey) : undefined,
              },
            });
          }
        }
      }, { timeout: 120_000 });
      console.log(`Imported ${code} (${examData.questions.length} questions)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const dataset = loadDataset();
  const questionCount = dataset.exams.reduce((total, exam) => total + exam.questions.length, 0);
  console.log(`Validated ${dataset.exams.length} exams and ${questionCount} questions.`);
  if (!validateOnly) await importDataset(dataset);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
