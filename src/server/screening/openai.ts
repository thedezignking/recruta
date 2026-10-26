import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  extractionOutputSchema,
  screeningOutputSchema,
  ScreeningError,
  type ScreeningSnapshot,
  type ScreeningSource,
} from "@/lib/screening";
import {
  extractionInstructions,
  screeningInstructions,
  screeningInput,
} from "./prompts";

export function createScreeningProvider(apiKey: string, model: string) {
  // Queue owns retries; automatic SDK retries could duplicate billable work.
  const client = new OpenAI({ apiKey, timeout: 90000, maxRetries: 0 });

  async function parse<T extends z.ZodType>(
    schema: T,
    name: string,
    instructions: string,
    input: OpenAI.Responses.ResponseInput,
    operationId: string,
  ) {
    try {
      const response = await client.responses.parse(
        {
          model,
          store: false,
          instructions,
          input,
          max_output_tokens: name === "resume_extraction" ? 16000 : 10000,
          text: { format: zodTextFormat(schema, name) },
        },
        { headers: { "X-Client-Request-Id": operationId } },
      );
      if (response.status !== "completed" || !response.output_parsed) {
        throw new ScreeningError("provider_incomplete_or_refused", false);
      }
      return {
        output: schema.parse(response.output_parsed) as z.infer<T>,
        responseId: response.id,
        model: response.model,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      };
    } catch (error) {
      if (error instanceof ScreeningError) throw error;
      if (error instanceof OpenAI.APIError) {
        const transient =
          !error.status ||
          error.status === 408 ||
          error.status === 409 ||
          error.status === 429 ||
          error.status >= 500;
        throw new ScreeningError(
          transient ? "provider_unavailable" : "provider_request_failed",
          transient,
        );
      }
      throw new ScreeningError("invalid_provider_output", false);
    }
  }

  return {
    async extract(
      file: Buffer,
      document: ScreeningSnapshot["document"],
      operationId: string,
    ) {
      const pdf = document.content_type === "application/pdf";
      if (
        file.length !== document.size_bytes ||
        file.length > 10 * 1024 * 1024 ||
        (pdf
          ? !file.subarray(0, 5).equals(Buffer.from("%PDF-"))
          : !file.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])))
      ) {
        throw new ScreeningError("invalid_document", false);
      }
      return parse(
        extractionOutputSchema,
        "resume_extraction",
        extractionInstructions,
        [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                filename: pdf ? "resume.pdf" : "resume.docx",
                file_data: `data:${document.content_type};base64,${file.toString("base64")}`,
              },
              {
                type: "input_text",
                text: "Transcribe the professional evidence from this résumé using the extraction contract.",
              },
            ],
          },
        ],
        operationId,
      );
    },
    async assess(
      snapshot: ScreeningSnapshot,
      sources: ScreeningSource[],
      operationId: string,
    ) {
      return parse(
        screeningOutputSchema,
        "application_screening",
        screeningInstructions,
        [{ role: "user", content: screeningInput(snapshot, sources) }],
        operationId,
      );
    },
  };
}
