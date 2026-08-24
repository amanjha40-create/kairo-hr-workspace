import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { readOrganizationSignupDraft } from "@/lib/organization-signup-draft";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Kairo — Redirecting" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: OnboardingRedirect,
});

function OnboardingRedirect() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }

    const signupDraft = readOrganizationSignupDraft();
    const target = signupDraft?.stage === "complete_onboarding" ? "/app/setup" : "/app";

    navigate({ to: target, replace: true });
  }, [loading, navigate, session]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-background shadow-[var(--shadow-soft)] p-8 text-center">
        <Logo className="h-6 mx-auto" />
        <Loader2 className="h-5 w-5 animate-spin mx-auto mt-6 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Preparing your workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re taking you to the correct setup step.
        </p>
      </div>
    </div>
  );
}
