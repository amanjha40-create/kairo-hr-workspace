import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMarketingWebsiteUrl, isGoogleSsoEnabled } from "@/lib/app-config";
import { useAuth } from "@/lib/auth-context";
import type { AuthUser } from "@/lib/api/auth-session";
import { storeAuthSession, toAuthSession } from "@/lib/api/auth-session";
import {
  completeOrganizationSignup,
  sendOrganizationSignupEmailOtp,
  startOrganizationSignup,
  verifyOrganizationSignupEmail,
} from "@/lib/api/organization-signup";
import {
  clearOrganizationSignupDraft,
  readOrganizationSignupDraft,
  writeOrganizationSignupDraft,
} from "@/lib/organization-signup-draft";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your Kairo account — Hiring team signup" },
      {
        name: "description",
        content:
          "Get your hiring team on Kairo. Reusable, source-verified trust infrastructure for modern recruiters.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const marketingWebsiteUrl = getMarketingWebsiteUrl();
  const { session, signInWithGoogle, completeGoogleSignIn } = useAuth();
  const googleSsoEnabled = isGoogleSsoEnabled();
  const persistedDraft = useMemo(() => readOrganizationSignupDraft(), []);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resendAfterSeconds, setResendAfterSeconds] = useState(0);
  const [step, setStep] = useState<"form" | "verify">(
    persistedDraft?.stage === "verify_email" && persistedDraft.signupSessionId ? "verify" : "form",
  );
  const [form, setForm] = useState({
    full_name: persistedDraft?.fullName ?? "",
    work_email: persistedDraft?.workEmail ?? "",
    company_name: persistedDraft?.companyName ?? "",
    company_size: persistedDraft?.companySize ?? "",
    hiring_volume: persistedDraft?.hiringVolume ?? "",
    password: "",
  });

  useEffect(() => {
    if (!resendAfterSeconds) return;
    const timer = window.setInterval(() => {
      setResendAfterSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendAfterSeconds]);

  useEffect(() => {
    if (session) {
      navigate({ to: "/app", replace: true });
    }
  }, [navigate, session]);

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

  const onChange = (k: keyof typeof form) => (v: string) =>
    setForm((current) => ({ ...current, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }
    if (!form.company_size || !form.hiring_volume) {
      toast.error("Select your company size and hiring volume.");
      return;
    }

    setLoading(true);
    try {
      const startResponse = await startOrganizationSignup({
        full_name: form.full_name,
        work_email: form.work_email,
        password: form.password,
      });

      writeOrganizationSignupDraft({
        stage: "verify_email",
        signupSessionId: startResponse.signup_session_id,
        fullName: form.full_name,
        workEmail: form.work_email,
        companyName: form.company_name,
        companySize: form.company_size,
        hiringVolume: form.hiring_volume,
      });

      setStep("verify");
      setVerificationCode("");
      setResendAfterSeconds(startResponse.email_resend_after_seconds);

      try {
        const sendResponse = await sendOrganizationSignupEmailOtp(startResponse.signup_session_id);
        setResendAfterSeconds(sendResponse.resend_after_seconds);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "We couldn't send your verification code yet.";
        toast.error(message);
      }

      toast.success("Check your work email for the verification code.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't create your account.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const currentDraft = readOrganizationSignupDraft();
    if (!currentDraft?.signupSessionId) {
      toast.error("Your signup session expired. Please start again.");
      setStep("form");
      return;
    }
    if (verificationCode.trim().length !== 6) {
      toast.error("Enter the 6-digit verification code.");
      return;
    }

    setVerifying(true);
    try {
      await verifyOrganizationSignupEmail(currentDraft.signupSessionId, verificationCode.trim());
      const tokens = await completeOrganizationSignup(currentDraft.signupSessionId);
      const placeholderUser: AuthUser = {
        id: "",
        email: currentDraft.workEmail,
        user_metadata: {
          full_name: currentDraft.fullName || undefined,
        },
      };
      storeAuthSession(toAuthSession(tokens), placeholderUser);
      writeOrganizationSignupDraft({
        ...currentDraft,
        stage: "complete_onboarding",
        signupSessionId: undefined,
      });
      navigate({ to: "/app/setup" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't verify your email.";
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    const currentDraft = readOrganizationSignupDraft();
    if (!currentDraft?.signupSessionId) {
      toast.error("Your signup session expired. Please start again.");
      return;
    }
    setResending(true);
    try {
      const response = await sendOrganizationSignupEmailOtp(currentDraft.signupSessionId);
      setResendAfterSeconds(response.resend_after_seconds);
      toast.success("A new verification code is on the way.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't resend the code.";
      toast.error(message);
    } finally {
      setResending(false);
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

  function restartSignup() {
    clearOrganizationSignupDraft();
    setStep("form");
    setVerificationCode("");
    setResendAfterSeconds(0);
  }

  return (
    <AuthShell
      title={step === "verify" ? "Verify your work email" : "Create your hiring team account"}
      subtitle={
        step === "verify"
          ? "Enter the 6-digit code we sent to finish creating your account."
          : "Built for recruiters, HR, and talent teams. Not for candidates."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-foreground font-medium hover:underline">
            Sign in
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
            disabled={loading || oauthLoading || verifying}
          >
            {oauthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
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

      {step === "verify" ? (
        <form onSubmit={handleVerify} className="space-y-3.5">
          <div className="rounded-2xl border border-border/70 bg-foreground/[0.03] p-4 text-sm text-muted-foreground">
            We sent a verification code to{" "}
            <span className="font-medium text-foreground">
              {form.work_email || persistedDraft?.workEmail}
            </span>
            .
          </div>
          <Field label="Verification code" hint="6 digits">
            <Input
              required
              inputMode="numeric"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="h-11 rounded-xl text-center tracking-[0.35em]"
            />
          </Field>
          <Button
            type="submit"
            disabled={verifying || oauthLoading}
            className="w-full h-11 rounded-xl btn-premium"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify email"}
          </Button>
          <div className="flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={restartSignup}
              className="text-muted-foreground hover:text-foreground"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resending || resendAfterSeconds > 0}
              className="text-foreground disabled:text-muted-foreground"
            >
              {resending
                ? "Resending..."
                : resendAfterSeconds > 0
                  ? `Resend in ${resendAfterSeconds}s`
                  : "Resend code"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Full name">
            <Input
              required
              value={form.full_name}
              onChange={(e) => onChange("full_name")(e.target.value)}
              placeholder="Jane Doe"
              className="h-11 rounded-xl"
            />
          </Field>
          <Field label="Work email">
            <Input
              required
              type="email"
              value={form.work_email}
              onChange={(e) => onChange("work_email")(e.target.value)}
              placeholder="jane@company.com"
              className="h-11 rounded-xl"
            />
          </Field>
          <Field label="Company name">
            <Input
              required
              value={form.company_name}
              onChange={(e) => onChange("company_name")(e.target.value)}
              placeholder="Acme Inc."
              className="h-11 rounded-xl"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company size">
              <Select value={form.company_size} onValueChange={onChange("company_size")}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Hiring volume / mo">
              <Select value={form.hiring_volume} onValueChange={onChange("hiring_volume")}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {["<10", "10-50", "50-200", "200-1000", "1000+"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Password" hint="12+ characters">
            <Input
              required
              type="password"
              value={form.password}
              onChange={(e) => onChange("password")(e.target.value)}
              placeholder="••••••••••••"
              className="h-11 rounded-xl"
            />
          </Field>
          <Button
            type="submit"
            disabled={loading || oauthLoading}
            className="w-full h-11 rounded-xl btn-premium"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed pt-1">
            By signing up you agree to our{" "}
            <a href={`${marketingWebsiteUrl}/terms`} className="underline">
              Terms
            </a>{" "}
            and{" "}
            <a href={`${marketingWebsiteUrl}/privacy`} className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </form>
      )}
    </AuthShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-foreground/80">{label}</Label>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12s4.2 9.3 9.3 9.3c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.7H12z"
      />
    </svg>
  );
}
