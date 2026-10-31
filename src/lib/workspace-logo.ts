/** Uploaded logos win; Evenkore has an assigned local asset. */
export function workspaceLogoSrc(logoUrl?: string | null, agencySlug?: string) {
  return (
    logoUrl || (agencySlug === "evenkore" ? "/brand/evenkore-symbol.svg" : null)
  );
}
