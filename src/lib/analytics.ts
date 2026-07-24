// GA4 lightweight wrapper. The gtag script is injected via __root.tsx head().
export const GA_MEASUREMENT_ID = "G-VGZ9TCVJQ3";

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { gtag?: GtagFn }).gtag ?? null;
}

export function trackEvent(
  event: string,
  params: Record<string, unknown> = {},
) {
  const gtag = getGtag();
  if (!gtag) return;
  gtag("event", event, params);
}

export function trackPageview(path: string, title?: string) {
  const gtag = getGtag();
  if (!gtag) return;
  gtag("event", "page_view", {
    page_path: path,
    page_title: title ?? (typeof document !== "undefined" ? document.title : ""),
    page_location:
      typeof window !== "undefined" ? window.location.href : undefined,
  });
}
