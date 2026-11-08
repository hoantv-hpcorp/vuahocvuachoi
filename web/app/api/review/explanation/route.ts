import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { attemptId?: unknown; questionId?: unknown; kind?: unknown };
  try { body = await request.json(); } catch { return new Response("Invalid request", { status: 400 }); }
  const { attemptId, questionId, kind } = body ?? {};
  if (typeof attemptId !== "string" || typeof questionId !== "string" || (kind !== "EXPLAIN" && kind !== "SOLVE")) return new Response("Invalid request", { status: 400 });
  const encoder = new TextEncoder();
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => { if (!abort.signal.aborted) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); };
      try { await getExplanation(attemptId, questionId, kind, abort.signal, send); }
      catch (error) {
        if (!abort.signal.aborted) { console.error("OpenAI explanation unavailable", error); send({ type: "error" }); }
      } finally { if (!abort.signal.aborted) controller.close(); }
    },
    cancel() { abort.abort(); },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
}

async function getExplanation(attemptId: string, questionId: string, kind: "EXPLAIN" | "SOLVE", signal: AbortSignal, send: (event: object) => void) {
  if (kind !== "EXPLAIN" && kind !== "SOLVE") throw new Error("Invalid explanation type");
  const user = await currentUser();
  const answer = await prisma.attemptAnswer.findFirst({
    where: { attemptId, questionId, attempt: { profile: { userId: user.id }, status: { in: ["SUBMITTED", "REVIEWED"] } } },
    select: { question: { select: { id: true, contentText: true, correctAnswer: true, exam: { select: { grade: true } }, images: { where: { role: "FIGURE" }, orderBy: { seq: "asc" }, select: { storageKey: true } }, options: { orderBy: { position: "asc" }, select: { position: true, text: true, image: { select: { storageKey: true } } } } } } },
  });
  if (!answer) throw new Error("Question unavailable");
  const cached = await prisma.aiExplanation.findUnique({ where: { questionId_kind_language: { questionId, kind, language: "vi" } } });
  if (cached) { send({ type: "done", content: cached.content }); return; }
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
    instructions: `Bạn là người hướng dẫn toán thân thiện. Hãy viết bằng tiếng Việt tự nhiên, ngắn gọn, phù hợp học sinh lớp ${q.exam.grade}. 
        ${kind === "EXPLAIN" ? 
            "Giải thích đề bài đang hỏi gì và ý nghĩa các dữ kiện, không trình bày các bước giải, không đưa ra đáp án."
          + "Nếu câu hỏi chỉ giải thích 1 số từ tiếng Anh sang tiếng Việt mà không phải là song ngữ thì cần giải thích kỹ từng từ trong phần đề bài tiếng Anh vì bạn nhỏ là người yếu về Tiếng Anh"
          : "Hướng dẫn từng bước giải dễ hiểu và giải thích vì sao ra đáp án. " 
          + "Dùng đáp án được lưu để kiểm tra; nếu đề hoặc hình không rõ hay mâu thuẫn với đáp án, nói thật và nhờ người lớn cùng xem, không bịa."
          + "Nếu kết quả của bạn khác với kết quả đã được lưu thì nhắc nhở bạn nhỏ kiểm tra lại với bố mẹ, còn nếu đã khớp rồi thì không cần nhắc gì tới kết quả đã lưu trong câu trả lời của bạn nữa."} 
          Chỉ trả lời bằng văn bản thuần, không dùng Markdown. Đối tượng đọc là bạn nhỏ đó chứ không phải cha mẹ nên giọng văn cần nhẹ nhàng, thân thiện, không hù dọa hay trách móc. 
          Nếu đề bài có hình minh họa, hãy mô tả hình ảnh đó bằng lời để bạn nhỏ hình dung.
          Hãy gọi bạn nhỏ là "con" và không dùng tên riêng. Tự xưng là "cô chú" (lưu ý là luôn luôn là "cô chú" chứ không phải "cô" hoặc "chú").
          Đọc bằng tiếng Việt với giọng miền Bắc, tự nhiên như người Hà Nội. Giọng ấm áp, thân thiện, đọc chậm vừa phải như đang hướng dẫn một em học sinh tiểu học.
          `,
    input: [{ role: "user", content }],
    store: false,
    max_output_tokens: 8192,
  };
  const stream = await client.responses.create({ ...request, stream: true }, { signal });
  let text = "";
  let completed = false;
  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      text += event.delta;
      send({ type: "delta", text: event.delta });
    } else if (event.type === "response.completed") {
      completed = event.response.status === "completed";
    } else if (event.type === "response.failed" || event.type === "response.incomplete" || event.type === "error") {
      throw new Error("Explanation generation incomplete");
    }
  }
  text = text.trim();
  if (!completed || !text || signal.aborted) throw new Error("Explanation unavailable");
  const saved = await prisma.aiExplanation.upsert({ where: { questionId_kind_language: { questionId, kind, language: "vi" } }, create: { questionId, kind, language: "vi", content: text, model }, update: {} });
  send({ type: "done", content: saved.content });
}
