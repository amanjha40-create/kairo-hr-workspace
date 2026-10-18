export const ORGANIZATION_LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_ORGANIZATION_LOGO_BYTES = 5_000_000;

export function validateOrganizationLogo(file: File) {
  if (!ORGANIZATION_LOGO_MIME_TYPES.has(file.type)) {
    return "Choose a PNG, JPEG, or WEBP image. SVG and other file types are not supported.";
  }
  if (file.size < 1 || file.size > MAX_ORGANIZATION_LOGO_BYTES) {
    return "The logo must be larger than 0 bytes and no more than 5 MB.";
  }
  return null;
}
