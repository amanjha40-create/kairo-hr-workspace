const AUTH_RETURN_KEY = "kairoid.hr.auth.return_to";

export function safeAuthReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  return value;
}

export function captureAuthReturnPath() {
  if (typeof window === "undefined") return null;
  const fromUrl = safeAuthReturnPath(new URLSearchParams(window.location.search).get("returnTo"));
  if (fromUrl) window.sessionStorage.setItem(AUTH_RETURN_KEY, fromUrl);
  return fromUrl ?? safeAuthReturnPath(window.sessionStorage.getItem(AUTH_RETURN_KEY));
}

export function consumeAuthReturnPath() {
  if (typeof window === "undefined") return null;
  const value = safeAuthReturnPath(window.sessionStorage.getItem(AUTH_RETURN_KEY));
  window.sessionStorage.removeItem(AUTH_RETURN_KEY);
  return value;
}

export function authHref(path: "/login" | "/signup", returnTo: string) {
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
