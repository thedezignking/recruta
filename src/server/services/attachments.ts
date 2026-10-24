import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { attachmentUploadSchema } from "@/lib/validation";

const ATTACHMENT_BUCKET = "hiring-request-attachments";

function safeFileName(fileName: string) {
  const extension = fileName.toLowerCase().endsWith(".docx") ? ".docx" : ".pdf";
  const stem = fileName
    .slice(0, -extension.length)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${stem || "attachment"}${extension}`;
}

export async function createAttachmentUpload(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  input: unknown,
) {
  const payload = attachmentUploadSchema.parse(input);
  const expectedExtension =
    payload.contentType === "application/pdf" ? ".pdf" : ".docx";
  if (!payload.fileName.toLowerCase().endsWith(expectedExtension))
    throw new ApiError(
      422,
      "ATTACHMENT_EXTENSION_MISMATCH",
      `The file name must end in ${expectedExtension}.`,
    );

  const { data: hiringRequest, error: requestError } = await supabase
    .from("hiring_requests")
    .select("id,agency_id,status")
    .eq("id", requestId)
    .single();
  if (requestError || !hiringRequest)
    throw new ApiError(
      404,
      "HIRING_REQUEST_NOT_FOUND",
      "The hiring request was not found.",
    );
  if (
    !["draft", "clarification_requested", "submitted", "under_review"].includes(
      hiringRequest.status,
    )
  )
    throw new ApiError(
      409,
      "ATTACHMENTS_LOCKED",
      "Attachments cannot be changed in this request state.",
    );

  const { count } = await supabase
    .from("hiring_request_attachments")
    .select("id", { count: "exact", head: true })
    .eq("hiring_request_id", requestId);
  if ((count ?? 0) >= 5)
    throw new ApiError(
      409,
      "ATTACHMENT_LIMIT_REACHED",
      "A hiring request can have up to five attachments.",
    );

  const fileName = safeFileName(payload.fileName);
  const storagePath = `${hiringRequest.agency_id}/${requestId}/${randomUUID()}-${fileName}`;
  const { data: attachment, error: insertError } = await supabase
    .from("hiring_request_attachments")
    .insert({
      agency_id: hiringRequest.agency_id,
      hiring_request_id: requestId,
      file_name: payload.fileName,
      storage_path: storagePath,
      content_type: payload.contentType,
      size_bytes: payload.sizeBytes,
      uploaded_by: userId,
    })
    .select("id,file_name,content_type,size_bytes,created_at")
    .single();
  if (insertError || !attachment)
    throw new ApiError(
      400,
      "ATTACHMENT_CREATE_FAILED",
      "The attachment record could not be created.",
    );

  const { data: signed, error: signError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (signError || !signed) {
    await supabase
      .from("hiring_request_attachments")
      .delete()
      .eq("id", attachment.id);
    throw new ApiError(
      500,
      "UPLOAD_URL_FAILED",
      "A secure upload URL could not be created.",
    );
  }

  return {
    attachment,
    upload: {
      path: signed.path,
      token: signed.token,
      signedUrl: signed.signedUrl,
    },
  };
}

export async function createAttachmentDownload(
  supabase: SupabaseClient,
  requestId: string,
  attachmentId: string,
) {
  const { data: attachment, error } = await supabase
    .from("hiring_request_attachments")
    .select("id,file_name,storage_path,content_type,size_bytes")
    .eq("hiring_request_id", requestId)
    .eq("id", attachmentId)
    .single();
  if (error || !attachment)
    throw new ApiError(
      404,
      "ATTACHMENT_NOT_FOUND",
      "The attachment was not found.",
    );

  const { data: signed, error: signError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(attachment.storage_path, 60, {
      download: attachment.file_name,
    });
  if (signError || !signed)
    throw new ApiError(
      500,
      "DOWNLOAD_URL_FAILED",
      "A secure download URL could not be created.",
    );
  return {
    attachment: {
      id: attachment.id,
      fileName: attachment.file_name,
      contentType: attachment.content_type,
      sizeBytes: attachment.size_bytes,
    },
    downloadUrl: signed.signedUrl,
    expiresIn: 60,
  };
}
