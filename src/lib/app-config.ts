function parseBooleanFlag(value: string | undefined) {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

export function getMarketingWebsiteUrl() {
  return import.meta.env.VITE_MARKETING_WEBSITE_URL ?? "https://kairoid.com";
}

export function isGoogleSsoEnabled() {
  const configured = parseBooleanFlag(import.meta.env.VITE_GOOGLE_SSO_ENABLED);

  if (typeof configured === "boolean") {
    return configured;
  }

  return !import.meta.env.PROD;
}
