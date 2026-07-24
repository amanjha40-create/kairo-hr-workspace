import { clearStoredAuthState, readAuthState, storeAuthSession, type AuthSession } from "@/lib/api/auth-session";

export interface ApiErrorDetail {
  [key: string]: unknown;
}

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetail[];
  };
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor({
    status,
    code,
    message,
    details = [],
  }: {
    status: number;
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  auth?: boolean;
  body?: BodyInit | object | null;
  headers?: HeadersInit;
}

let refreshPromise: Promise<AuthSession | null> | null = null;

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function withAuthHeader(headers: Headers, accessToken: string) {
  headers.set("Authorization", `Bearer ${accessToken}`);
}

function buildHeaders(body: RequestOptions["body"], headers?: HeadersInit) {
  const resolved = new Headers(headers);
  if (body && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams)) {
    resolved.set("Content-Type", "application/json");
  }
  resolved.set("Accept", "application/json");
  return resolved;
}

function serializeBody(body: RequestOptions["body"]) {
  if (body == null || body instanceof FormData || body instanceof Blob || body instanceof URLSearchParams || typeof body === "string") {
    return body;
  }
  return JSON.stringify(body);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (response.ok) {
    return payload as T;
  }

  const envelope = (typeof payload === "object" ? payload : null) as ApiErrorEnvelope | null;
  throw new ApiError({
    status: response.status,
    code: envelope?.error?.code ?? "request_failed",
    message: envelope?.error?.message ?? response.statusText ?? "Request failed",
    details: envelope?.error?.details ?? [],
  });
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const current = readAuthState();
    if (!current.session?.refresh_token) {
      clearStoredAuthState("expired");
      return null;
    }

    try {
      const response = await fetch(buildUrl("/api/v1/auth/refresh"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh_token: current.session.refresh_token }),
      });

      const data = await parseResponse<{
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
      }>(response);

      const nextSession: AuthSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        expires_at: Date.now() + data.expires_in * 1000,
      };

      storeAuthSession(nextSession, current.user);
      return nextSession;
    } catch {
      clearStoredAuthState("expired");
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { auth = true, body, headers, ...init } = options;
  const authState = readAuthState();
  const requestHeaders = buildHeaders(body, headers);

  if (auth && authState.session?.access_token) {
    withAuthHeader(requestHeaders, authState.session.access_token);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers: requestHeaders,
    body: serializeBody(body),
  });

  if (response.status === 401 && auth && !retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, options, true);
    }
  }

  return parseResponse<T>(response);
}
