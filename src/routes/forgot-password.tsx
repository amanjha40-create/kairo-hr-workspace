import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, resetPassword } from "@/lib/api/auth";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

const searchSchema = z.object({
  reset_token: fallback(z.string().trim().optional(), undefined),
});

export const Route = createFileRoute("/forgot-password")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Reset your password — Kairo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const { reset_token: resetToken } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSucceeded, setResetSucceeded] = useState(false);

  const isResetMode = typeof resetToken === "string" && resetToken.length > 0;

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRequestLoading(true);
    try {
      await requestPasswordReset(email);
      setRequestSent(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send reset instructions.";
      toast.error(message);
    } finally {
      setRequestLoading(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetToken) {
      toast.error("This reset link is invalid or incomplete.");
      return;
    }
    if (newPassword.length < 12) {
      toast.error("Password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(resetToken, newPassword, confirmPassword);
      setResetSucceeded(true);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password reset successful.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reset your password.";
      toast.error(message);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <AuthShell
      title={
        isResetMode
          ? resetSucceeded
            ? "Password updated"
            : "Choose a new password"
          : requestSent
            ? "Check your inbox"
            : "Reset your password"
      }
      subtitle={
        isResetMode
          ? resetSucceeded
            ? "Your password has been reset. You can sign back in with your new password."
            : "Enter a new password to finish resetting your account."
          : requestSent
            ? "We sent a reset link to your work email."
            : "Enter your work email and we'll send a reset link."
      }
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="text-foreground font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {isResetMode ? (
        resetSucceeded ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 p-6 text-center">
              <MailCheck className="h-7 w-7 mx-auto text-foreground/80" />
              <p className="mt-3 text-sm text-muted-foreground">
                Your password was reset successfully. Return to sign in and continue to your
                workspace.
              </p>
            </div>
            <Button asChild className="w-full h-11 rounded-xl btn-premium">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-3.5">
            <div className="rounded-2xl border border-border/70 bg-foreground/[0.03] p-4 text-sm text-muted-foreground">
              Resetting access for this workspace account. This link will only work while the token
              remains valid.
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/80">New password</Label>
              <Input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="••••••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/80">Confirm password</Label>
              <Input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="••••••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={resetLoading}
              className="w-full h-11 rounded-xl btn-premium"
            >
              {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
            </Button>
          </form>
        )
      ) : (
        <>
          {requestSent ? (
            <div className="rounded-2xl border border-border/70 p-6 text-center">
              <MailCheck className="h-7 w-7 mx-auto text-foreground/80" />
              <p className="mt-3 text-sm text-muted-foreground">
                If an account exists for{" "}
                <span className="text-foreground font-medium">{email}</span>, a reset link is on its
                way.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRequestSubmit} className="space-y-3.5">
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
              <Button
                type="submit"
                disabled={requestLoading}
                className="w-full h-11 rounded-xl btn-premium"
              >
                {requestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          )}
        </>
      )}
    </AuthShell>
  );
}
