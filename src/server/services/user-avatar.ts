import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { agencyLogoExtension, agencyLogoFileError } from "@/lib/agency-logo";

export function avatarUrl(supabase: SupabaseClient, path: string | null) {
  return path
    ? supabase.storage.from("user-avatars").getPublicUrl(path).data.publicUrl
    : null;
}

export async function saveUserAvatar(
  supabase: SupabaseClient,
  userId: string,
  expected: string | null,
  file: File | null,
) {
  let path: string | null = null;
  if (file) {
    const invalid = agencyLogoFileError(file);
    if (invalid) throw new ApiError(422, "INVALID_AVATAR", invalid);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = agencyLogoExtension(bytes, file.type);
    if (!extension)
      throw new ApiError(
        422,
        "INVALID_AVATAR",
        "The image contents do not match its file type.",
      );
    path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("user-avatars")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error)
      throw new ApiError(
        400,
        "AVATAR_UPLOAD_FAILED",
        "The photo could not be uploaded. Try again.",
      );
  }
  const { error } = await supabase.rpc("update_user_avatar", {
    p_avatar_path: path,
    p_expected_avatar_path: expected,
  });
  if (error) {
    // Only remove this attempt's unique upload; keep it after a transport failure.
    if (path && /^[0-9A-Z]{5}$/.test(error.code))
      await supabase.storage.from("user-avatars").remove([path]);
    throw new ApiError(
      error.code === "40001" ? 409 : 400,
      "AVATAR_SAVE_FAILED",
      error.code === "40001"
        ? "Your photo changed. Refresh the page and try again."
        : "Your photo could not be saved. Try again.",
    );
  }
  // Metadata is authoritative; failed cleanup must not undo a successful edit.
  if (expected?.startsWith(`${userId}/`) && expected !== path) {
    const { error: cleanupError } = await supabase.storage
      .from("user-avatars")
      .remove([expected]);
    if (cleanupError) console.warn("Avatar cleanup failed", { userId });
  }
  return { path, url: avatarUrl(supabase, path) };
}
