import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  clearStoredAuthState,
  readAuthState,
  storeAuthSession,
  subscribeToAuthState,
  toAuthSession,
  updateStoredAuthUser,
  type AuthSession,
  type AuthStateChangeReason,
  type AuthUser,
} from "@/lib/api/auth-session";
import {
  exchangeOAuthCode,
  getOAuthAuthUrl,
  loginWithPassword,
  logoutWithRefreshToken,
} from "@/lib/api/auth";

type AuthCtx = {
  session: AuthSession | null;
  user: AuthUser | null;
  loading: boolean;
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  completeGoogleSignIn: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncCurrentUser: (user: { id: string; email: string; full_name: string | null }) => void;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  sessionExpired: false,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  completeGoogleSignIn: async () => {},
  signOut: async () => {},
  syncCurrentUser: () => {},
});

function toAuthUser(user: { id: string; email: string; full_name: string | null }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      full_name: user.full_name ?? undefined,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const initial = readAuthState();
    setSession(initial.session);
    setUser(initial.user);
    setLoading(false);

    return subscribeToAuthState((reason: AuthStateChangeReason) => {
      const next = readAuthState();
      setSession(next.session);
      setUser(next.user);
      setSessionExpired(reason === "expired");
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user,
      loading,
      sessionExpired,
      signIn: async (email: string, password: string) => {
        const tokens = await loginWithPassword(email, password);
        const nextSession = toAuthSession(tokens);
        const placeholderUser: AuthUser = {
          id: "",
          email,
          user_metadata: {},
        };
        storeAuthSession(nextSession, placeholderUser);
        setSessionExpired(false);
      },
      signInWithGoogle: async () => {
        const { auth_url } = await getOAuthAuthUrl("google");
        window.location.assign(auth_url);
      },
      completeGoogleSignIn: async (code: string) => {
        const tokens = await exchangeOAuthCode("google", code);
        storeAuthSession(toAuthSession(tokens), null);
        setSessionExpired(false);
      },
      signOut: async () => {
        const refreshToken = session?.refresh_token;
        clearStoredAuthState("logout");
        setSessionExpired(false);
        if (!refreshToken) return;

        try {
          await logoutWithRefreshToken(refreshToken);
        } catch {
          // Local sign-out already completed.
        }
      },
      syncCurrentUser: (nextUser) => {
        const mapped = toAuthUser(nextUser);
        setUser(mapped);
        updateStoredAuthUser(mapped);
      },
    }),
    [loading, session, sessionExpired, user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx);
