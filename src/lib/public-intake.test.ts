import { describe, it, expect } from "vitest";
import {
  readApplicationForm,
  validateResumeSignature,
  validateScreeningAnswers,
} from "./public-intake";
describe("public intake validation", () => {
  it("rejects renamed non-documents and accepts PDF signatures", () => {
    expect(() =>
      validateResumeSignature(
        new TextEncoder().encode("plain text"),
        "application/pdf",
      ),
    ).toThrow();
    expect(() =>
      validateResumeSignature(
        new TextEncoder().encode("%PDF-1.7 synthetic"),
        "application/pdf",
      ),
    ).not.toThrow();
  });
  it("does not accept an arbitrary ZIP as a DOCX", () => {
    expect(() =>
      validateResumeSignature(
        new Uint8Array([80, 75, 3, 4, 0]),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toThrow();
  });
  const yes = {
    id: "yes",
    question_type: "yes_no",
    is_required: true,
    options: [],
  };
  const choice = {
    id: "choice",
    question_type: "single_select",
    is_required: true,
    options: ["A", "B"],
  };
  it("accepts an explicit false answer but not an unanswered yes/no", () => {
    expect(() =>
      validateScreeningAnswers([yes], [{ questionId: "yes", answer: false }]),
    ).not.toThrow();
    expect(() =>
      validateScreeningAnswers([yes], [{ questionId: "yes", answer: "" }]),
    ).toThrow();
  });
  it("validates selections and rejects duplicate or unknown question IDs", () => {
    expect(() =>
      validateScreeningAnswers(
        [choice],
        [{ questionId: "choice", answer: "C" }],
      ),
    ).toThrow();
    expect(() =>
      validateScreeningAnswers(
        [yes],
        [
          { questionId: "yes", answer: true },
          { questionId: "yes", answer: false },
        ],
      ),
    ).toThrow();
    expect(() =>
      validateScreeningAnswers([yes], [{ questionId: "forged", answer: true }]),
    ).toThrow();
  });
  it("allows missing optional values without manufacturing boolean answers", () => {
    expect(() =>
      validateScreeningAnswers(
        [{ ...yes, is_required: false }],
        [{ questionId: "yes", answer: "" }],
      ),
    ).not.toThrow();
  });
  it("bounds chunked uploads without trusting Content-Length", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array(11 * 1024 * 1024));
        c.close();
      },
    });
    const r = new Request("http://localhost/upload", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit);
    await expect(readApplicationForm(r)).rejects.toMatchObject({ status: 413 });
  });
});
