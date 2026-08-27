import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isGoogleSsoEnabled } from "@/lib/app-config";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in to Kairo" },
      { name: "description", content: "Sign in to your Kairo hiring team workspace." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, signIn, signInWithGoogle, completeGoogleSignIn } = useAuth();
  const googleSsoEnabled = isGoogleSsoEnabled();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (session) navigate({ to: "/app" });
  }, [session, navigate]);

  useEffect(() => {
    if (!googleSsoEnabled) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code || session) return;

    setOauthLoading(true);
    void completeGoogleSignIn(code)
      .then(() => {
        navigate({ to: "/app", replace: true });
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Could not complete Google sign-in.";
        toast.error(message);
      })
      .finally(() => {
        setOauthLoading(false);
      });
  }, [completeGoogleSignIn, googleSsoEnabled, navigate, session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate({ to: "/app" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign you in.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!googleSsoEnabled) return;

    setOauthLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start Google sign-in.";
      toast.error(message);
      setOauthLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Kairo workspace."
      footer={
        <>
          New to Kairo?{" "}
          <Link to="/signup" className="text-foreground font-medium hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {googleSsoEnabled ? (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-xl"
            onClick={handleGoogle}
            disabled={loading || oauthLoading}
          >
            {oauthLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12s4.2 9.3 9.3 9.3c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.7H12z"
                />
              </svg>
            )}
            Continue with Google
          </Button>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/70" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-background px-2 text-muted-foreground">or use work email</span>
            </div>
          </div>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground/80">Work email</Label>
          <Input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl"
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-foreground/80">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot?
            </Link>
          </div>
          <Input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl"
            placeholder="••••••••"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || oauthLoading}
          className="w-full h-11 rounded-xl btn-premium"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
