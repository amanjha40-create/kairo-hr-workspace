export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: number;
}

export interface AuthTokenBundle {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface StoredAuthState {
  session: AuthSession | null;
  user: AuthUser | null;
}

export type AuthStateChangeReason = "updated" | "logout" | "expired";

const STORAGE_KEY = "kairo.hr.auth.v1";
const AUTH_EVENT = "kairo:auth-state-changed";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitAuthStateChange(reason: AuthStateChangeReason) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AuthStateChangeReason>(AUTH_EVENT, { detail: reason }));
}

function readStoredState(): StoredAuthState {
  if (!canUseStorage()) {
    return { session: null, user: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { session: null, user: null };
    }

    const parsed = JSON.parse(raw) as Partial<StoredAuthState>;
    return {
      session: parsed.session ?? null,
      user: parsed.user ?? null,
    };
  } catch {
    return { session: null, user: null };
  }
}

function writeStoredState(state: StoredAuthState, reason: AuthStateChangeReason) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emitAuthStateChange(reason);
}

export function readAuthState() {
  return readStoredState();
}

export function toAuthSession(tokens: AuthTokenBundle): AuthSession {
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
}

export function storeAuthSession(
  session: AuthSession,
  user: AuthUser | null,
  reason: AuthStateChangeReason = "updated",
) {
  writeStoredState({ session, user }, reason);
}

export function updateStoredAuthUser(user: AuthUser | null) {
  const current = readStoredState();
  writeStoredState({ session: current.session, user }, "updated");
}

export function clearStoredAuthState(reason: AuthStateChangeReason = "logout") {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  emitAuthStateChange(reason);
}

export function subscribeToAuthState(callback: (reason: AuthStateChangeReason) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    callback((event as CustomEvent<AuthStateChangeReason>).detail ?? "updated");
  };

  window.addEventListener(AUTH_EVENT, handler as EventListener);
  window.addEventListener("storage", handler as EventListener);

  return () => {
    window.removeEventListener(AUTH_EVENT, handler as EventListener);
    window.removeEventListener("storage", handler as EventListener);
  };
}
