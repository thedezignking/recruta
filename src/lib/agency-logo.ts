export const agencyLogoMaxBytes = 2 * 1024 * 1024;
export const agencyLogoTypes = ["image/png", "image/jpeg", "image/webp"];

export function agencyLogoFileError(file: { size: number; type: string }) {
  if (!agencyLogoTypes.includes(file.type))
    return "Choose a PNG, JPG or WebP image.";
  if (!file.size || file.size > agencyLogoMaxBytes)
    return "Choose an image up to 2 MB.";
  return null;
}

export function agencyLogoExtension(bytes: Uint8Array, type: string) {
  if (
    type === "image/png" &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => bytes[index] === byte,
    )
  )
    return "png";
  if (
    type === "image/jpeg" &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "jpg";
  if (
    type === "image/webp" &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}
