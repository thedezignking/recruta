import { ApiError } from "./api";
export function validateResumeSignature(bytes: Uint8Array, type: string) {
  const pdf =
    type === "application/pdf" &&
    new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  const docx =
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 3 &&
    bytes[3] === 4 &&
    new TextDecoder().decode(bytes).includes("word/");
  if (!pdf && !docx)
    throw new ApiError(
      422,
      "INVALID_RESUME",
      "The file contents do not match a PDF or DOCX résumé.",
      { resume: ["Choose a valid PDF or DOCX file."] },
    );
}
export function validateScreeningAnswers(
  questions: {
    id: string;
    question_type: string;
    is_required: boolean;
    options: unknown;
  }[],
  answers: { questionId: string; answer: string | boolean }[],
) {
  const seen = new Set<string>();
  for (const a of answers) {
    const q = questions.find((q) => q.id === a.questionId);
    if (!q || seen.has(a.questionId))
      throw new ApiError(
        422,
        "INVALID_QUESTION",
        "The screening questions changed. Reload the form.",
      );
    seen.add(a.questionId);
    const empty = typeof a.answer === "string" && !a.answer.trim();
    if (empty && !q.is_required) continue;
    if (
      (q.question_type === "yes_no" && typeof a.answer !== "boolean") ||
      (q.question_type !== "yes_no" && typeof a.answer !== "string") ||
      (q.question_type === "single_select" &&
        (!Array.isArray(q.options) || !q.options.includes(a.answer)))
    )
      throw new ApiError(
        422,
        "INVALID_ANSWER",
        "Choose a valid answer for each screening question.",
      );
  }
  if (
    questions.some(
      (q) =>
        q.is_required &&
        !answers.some(
          (a) =>
            a.questionId === q.id &&
            (typeof a.answer === "boolean" || a.answer.trim().length > 0),
        ),
    )
  )
    throw new ApiError(
      422,
      "REQUIRED_ANSWERS_MISSING",
      "Answer every required screening question.",
    );
}
export async function readApplicationForm(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_UPLOAD", "Choose a résumé.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10 * 1024 * 1024 + 128 * 1024) {
        await reader.cancel();
        throw new ApiError(
          413,
          "UPLOAD_TOO_LARGE",
          "The application exceeds the upload limit.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return await new Response(body, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    throw new ApiError(
      400,
      "INVALID_UPLOAD",
      "The application could not be read.",
    );
  }
}
