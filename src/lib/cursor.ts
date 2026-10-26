import { z } from "zod";
import { ApiError } from "./api";
export function decodeTimeCursor(value?: string) {
  if (!value) return null;
  try {
    return z
      .object({ at: z.iso.datetime({ offset: true }), id: z.uuid() })
      .parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
  } catch {
    throw new ApiError(
      422,
      "INVALID_CURSOR",
      "This page link is invalid. Return to the first page.",
    );
  }
}
export function encodeTimeCursor(row: { id: string; created_at: string }) {
  return Buffer.from(
    JSON.stringify({ at: row.created_at, id: row.id }),
  ).toString("base64url");
}
