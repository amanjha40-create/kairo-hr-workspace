import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccess } from "@/lib/access-context";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Mail, ShieldAlert, Clock, ShieldOff, LockKeyhole, TimerReset, UserX } from "lucide-react";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 flex items-center px-6 border-b border-border/60">
        <Logo className="h-5" />
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">{children}</div>
      </main>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto h-14 w-14 rounded-2xl bg-foreground/[0.05] flex items-center justify-center mb-6">
      {children}
    </div>
  );
}

export function InvitationPendingScreen() {
  const { pendingInvitation, acceptInvitation, declineInvitation } = useAccess();
  if (!pendingInvitation) return null;
  return (
    <Frame>
      <Icon><Mail className="h-6 w-6" /></Icon>
      <h1 className="text-2xl font-semibold tracking-tight">Organization invitation</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You've been invited to join a workspace on Kairo.
      </p>
      <div className="mt-6 rounded-2xl border border-border/70 bg-background p-5 text-left space-y-3">
        <Row label="Organization" value={pendingInvitation.orgName} />
        <Row label="Invited role" value={<Badge variant="secondary">{pendingInvitation.invitedRole}</Badge>} />
        <Row label="Invited by" value={pendingInvitation.invitedBy} />
      </div>
      <div className="mt-6 flex items-center gap-2 justify-center">
        <Button variant="outline" onClick={declineInvitation} className="rounded-xl">Decline</Button>
        <Button onClick={acceptInvitation} className="btn-premium rounded-xl">Accept invitation</Button>
      </div>
    </Frame>
  );
}

export function VerificationPendingBanner() {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/[0.08] px-4 md:px-8 py-2.5 text-xs flex items-center gap-2">
      <Clock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-500" />
      <span className="font-medium text-foreground">Organization verification pending.</span>
      <span className="text-muted-foreground">You have full workspace access. Some external actions may show a verification badge until review completes.</span>
    </div>
  );
}

export function OrgSuspendedScreen() {
  return (
    <Frame>
      <Icon><ShieldOff className="h-6 w-6" /></Icon>
      <h1 className="text-2xl font-semibold tracking-tight">Workspace access suspended</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This organization's access to Kairo Trust Workspace is temporarily suspended. Workspace actions are blocked until access is restored.
      </p>
      <div className="mt-6 text-xs text-muted-foreground">
        Contact your organization Owner or reach out to Kairo support.
      </div>
    </Frame>
  );
}

export function MembershipSuspendedScreen() {
  return (
    <Frame>
      <Icon><UserX className="h-6 w-6" /></Icon>
      <h1 className="text-2xl font-semibold tracking-tight">Your access is suspended</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your membership in this organization has been suspended by an administrator. Other members are unaffected.
      </p>
      <div className="mt-6 text-xs text-muted-foreground">
        Ask an Owner or Admin to restore your access.
      </div>
    </Frame>
  );
}

export function AccessDeniedScreen({ message }: { message?: string }) {
  const navigate = useNavigate();
  return (
    <Frame>
      <Icon><LockKeyhole className="h-6 w-6" /></Icon>
      <h1 className="text-2xl font-semibold tracking-tight">You don't have permission</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {message ?? "You don't have permission to view this page. Contact an Owner or Admin if you need access."}
      </p>
      <div className="mt-6">
        <Button onClick={() => navigate({ to: "/app" })} className="btn-premium rounded-xl">Back to overview</Button>
      </div>
    </Frame>
  );
}

export function SessionExpiredScreen() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <Frame>
      <Icon><TimerReset className="h-6 w-6" /></Icon>
      <h1 className="text-2xl font-semibold tracking-tight">Session expired</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your session has expired. Sign in again to continue.</p>
      <div className="mt-6">
        <Button
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          className="btn-premium rounded-xl"
        >
          Sign in again
        </Button>
      </div>
    </Frame>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export { ShieldAlert };
