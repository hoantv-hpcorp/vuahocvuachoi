"use server";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export async function setOverride(attemptId: string, questionId: string, correct: boolean) {
  if (typeof correct !== "boolean") throw new Error("Invalid result");
  const user = await currentUser();
  const result = await prisma.attemptAnswer.updateMany({
    where: { attemptId, questionId, attempt: { profile: { userId: user.id }, status: { in: ["SUBMITTED", "REVIEWED"] } } },
    data: { overrideCorrect: correct },
  });
  if (result.count !== 1) throw new Error("Answer unavailable");
}

export async function finishReview(attemptId: string) {
  const user = await currentUser();
  await prisma.attempt.updateMany({ where: { id: attemptId, profile: { userId: user.id }, status: "SUBMITTED" }, data: { status: "REVIEWED", reviewedAt: new Date() } });
}

export async function getExplanation(attemptId: string, questionId: string, kind: "EXPLAIN" | "SOLVE") {
  if (kind !== "EXPLAIN" && kind !== "SOLVE") throw new Error("Invalid explanation type");
  const user = await currentUser();
  const answer = await prisma.attemptAnswer.findFirst({
    where: { attemptId, questionId, attempt: { profile: { userId: user.id }, status: { in: ["SUBMITTED", "REVIEWED"] } } },
    select: { question: { select: { id: true, contentText: true, correctAnswer: true, exam: { select: { grade: true } }, images: { where: { role: "FIGURE" }, orderBy: { seq: "asc" }, select: { storageKey: true } }, options: { orderBy: { position: "asc" }, select: { position: true, text: true, image: { select: { storageKey: true } } } } } } },
  });
  if (!answer) throw new Error("Question unavailable");
  const cached = await prisma.aiExplanation.findUnique({ where: { questionId_kind_language: { questionId, kind, language: "vi" } } });
  if (cached) return cached.content;
  if (!process.env.OPENAI_API_KEY) throw new Error("AI configuration missing");

  const q = answer.question;
  const keys = [...new Set([...q.images.map(i => i.storageKey), ...q.options.flatMap(o => o.image ? [o.image.storageKey] : [])])];
  const urls = new Map<string, string>();
  if (keys.length) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Storage configuration missing");
    const { data, error } = await createClient(url, key).storage.from(process.env.SUPABASE_EXAM_BUCKET ?? "exam-assets").createSignedUrls(keys, 300);
    if (error || !data || data.some(i => !i.signedUrl)) throw new Error("Unable to load question figures");
    data.forEach((item, index) => urls.set(keys[index], item.signedUrl!));
  }
  const content: OpenAI.Responses.ResponseInputContent[] = [
    { type: "input_text", text: `Câu hỏi:\n${q.contentText}\nCác lựa chọn:\n${q.options.map(o => `${String.fromCharCode(64 + o.position)}. ${o.text ?? "(xem hình lựa chọn)"}`).join("\n")}\nĐáp án đúng được lưu: ${q.correctAnswer}` },
    ...q.images.flatMap((image, i): OpenAI.Responses.ResponseInputContent[] => [{ type: "input_text", text: `Hình minh họa ${i + 1}:` }, { type: "input_image", image_url: urls.get(image.storageKey)!, detail: "high" }]),
    ...q.options.flatMap((option): OpenAI.Responses.ResponseInputContent[] => option.image ? [{ type: "input_text", text: `Hình của lựa chọn ${String.fromCharCode(64 + option.position)}:` }, { type: "input_image", image_url: urls.get(option.image.storageKey)!, detail: "high" }] : []),
  ];
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const client = new OpenAI();
  const request: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
    model,
    instructions: `Em là người hướng dẫn toán thân thiện. Hãy viết bằng tiếng Việt tự nhiên, ngắn gọn, phù hợp học sinh lớp ${q.exam.grade}. 
        ${kind === "EXPLAIN" ? 
            "Giải thích đề bài đang hỏi gì và ý nghĩa các dữ kiện, không trình bày các bước giải, không đưa ra đáp án."
          + "Nếu câu hỏi chỉ giải thích 1 số từ tiếng Anh sang tiếng Việt mà không phải là song ngữ thì cần giải thích kỹ từng từ trong phần đề bài tiếng Anh vì bạn nhỏ là người yếu về Tiếng Anh"
          : "Hướng dẫn từng bước giải dễ hiểu và giải thích vì sao ra đáp án. " 
          + "Dùng đáp án được lưu để kiểm tra; nếu đề hoặc hình không rõ hay mâu thuẫn với đáp án, nói thật và nhờ người lớn cùng xem, không bịa."} 
          Chỉ trả lời bằng văn bản thuần, không dùng Markdown. Đối tượng đọc là bạn nhỏ đó chứ không phải cha mẹ nên giọng văn cần nhẹ nhàng, thân thiện, không hù dọa hay trách móc. 
          Nếu đề bài có hình minh họa, hãy mô tả hình ảnh đó bằng lời để bạn nhỏ hình dung.
          Hãy gọi bạn nhỏ là "con" và không dùng tên riêng.
          `,
    input: [{ role: "user", content }],
    store: false,
    max_output_tokens: 8192,
  };
  let response = await client.responses.create(request);
  if (response.status === "incomplete" && response.incomplete_details?.reason === "max_output_tokens") {
    response = await client.responses.create({ ...request, max_output_tokens: 25000 });
  }
  const text = response.output_text.trim();
  if (!text || response.status !== "completed") {
    console.error("OpenAI explanation unavailable", {
      status: response.status,
      reason: response.incomplete_details?.reason,
      errorCode: response.error?.code,
      outputTokens: response.usage?.output_tokens,
      reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens,
      model: response.model,
      requestId: response._request_id,
    });
    throw new Error("Explanation unavailable");
  }
  // The unique key ensures concurrent requests converge on the first saved result.
  const saved = await prisma.aiExplanation.upsert({ where: { questionId_kind_language: { questionId, kind, language: "vi" } }, create: { questionId, kind, language: "vi", content: text, model }, update: {} });
  return saved.content;
}
