import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { agencyLogoExtension, agencyLogoFileError } from "@/lib/agency-logo";

export function agencyLogoUrl(supabase: SupabaseClient, path: string | null) {
  return path
    ? supabase.storage.from("agency-logos").getPublicUrl(path).data.publicUrl
    : null;
}

export async function saveAgencyLogo(
  supabase: SupabaseClient,
  agencyId: string,
  expected: string | null,
  file: File | null,
  requestId: string,
) {
  let path: string | null = null;
  if (file) {
    const invalid = agencyLogoFileError(file);
    if (invalid) throw new ApiError(422, "INVALID_LOGO", invalid);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = agencyLogoExtension(bytes, file.type);
    if (!extension)
      throw new ApiError(
        422,
        "INVALID_LOGO",
        "The image contents do not match its file type.",
      );
    path = `${agencyId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("agency-logos")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error)
      throw new ApiError(
        400,
        "LOGO_UPLOAD_FAILED",
        "The logo could not be uploaded. Try again.",
      );
  }
  const { error } = await supabase.rpc("update_agency_logo", {
    p_agency_id: agencyId,
    p_logo_path: path,
    p_expected_logo_path: expected,
    p_request_id: requestId,
  });
  if (error) {
    // Only remove this attempt's unique upload. Never delete another editor's logo.
    // A transport failure may arrive after commit. Keep the object in that case.
    if (path && /^[0-9A-Z]{5}$/.test(error.code))
      await supabase.storage.from("agency-logos").remove([path]);
    throw new ApiError(
      error.code === "40001" ? 409 : 400,
      "LOGO_SAVE_FAILED",
      error.code === "40001"
        ? "The logo changed. Refresh the page and try again."
        : "The logo could not be saved. Try again.",
    );
  }
  // Metadata is authoritative; failed cleanup must not undo a successful edit.
  if (expected?.startsWith(`${agencyId}/`) && expected !== path) {
    const { error: cleanupError } = await supabase.storage
      .from("agency-logos")
      .remove([expected]);
    if (cleanupError)
      console.warn("Agency logo cleanup failed", { requestId, agencyId });
  }
  return { path, url: agencyLogoUrl(supabase, path) };
}
