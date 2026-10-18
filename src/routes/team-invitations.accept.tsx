import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AlertTriangle, CheckCircle2, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { acceptTeamInvitationByToken, getTeamInvitationByToken } from "@/lib/api/hr-v2";
import { authHref } from "@/lib/auth-return";
import { useAuth } from "@/lib/auth-context";
import { getTeamInvitationErrorState } from "@/lib/team-invitation-acceptance";

const invitationSearch = z.object({ token: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/team-invitations/accept")({
  validateSearch: zodValidator(invitationSearch),
  head: () => ({
    meta: [
      { title: "Accept team invitation — KairoID" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: TeamInvitationAcceptancePage,
});

function TeamInvitationAcceptancePage() {
  const { session, user, loading } = useAuth();
  const { token } = Route.useSearch();
  const returnTo = `/team-invitations/accept?token=${encodeURIComponent(token)}`;
  const lookup = useQuery({
    queryKey: ["team-invitation-token", token],
    queryFn: () => getTeamInvitationByToken(token),
    enabled: token.length >= 16,
    retry: false,
  });
  const accept = useMutation({ mutationFn: () => acceptTeamInvitationByToken(token) });

  if (!token || token.length < 16) {
    return (
      <InvitationState title="Invalid invitation" body="This invitation link is incomplete." />
    );
  }
  if (lookup.isPending || loading) {
    return (
      <AuthShell title="Checking invitation" subtitle="Validating this secure invitation link.">
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthShell>
    );
  }
  if (lookup.error) {
    const state = getTeamInvitationErrorState(lookup.error);
    return <InvitationState title={state.title} body={state.body} />;
  }
  if (accept.isSuccess) {
    return (
      <AuthShell
        title="Invitation accepted"
        subtitle={`You now have ${accept.data.role} access to ${lookup.data?.organization_name}.`}
      >
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <Button
            className="btn-premium w-full rounded-xl"
            onClick={() => window.location.assign("/app")}
          >
            Open HR workspace
          </Button>
        </div>
      </AuthShell>
    );
  }

  const acceptError = accept.error ? getTeamInvitationErrorState(accept.error) : null;
  return (
    <AuthShell
      title={`Join ${lookup.data?.organization_name}`}
      subtitle={`You've been invited as ${lookup.data?.invited_role}. This link expires ${new Date(lookup.data?.expires_at ?? "").toLocaleDateString()}.`}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-border/70 bg-foreground/[0.03] p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <MailCheck className="h-4 w-4" /> Secure team invitation
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            This invitation is bound to the recipient email and can be used only once.
          </p>
        </div>
        {acceptError ? (
          <div
            className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            <div className="font-medium">{acceptError.title}</div>
            <div className="mt-1">{acceptError.body}</div>
          </div>
        ) : null}
        {session ? (
          <>
            <p className="text-xs text-muted-foreground">
              Signed in as {user?.email ?? "your KairoID account"}.
            </p>
            <Button
              className="btn-premium w-full rounded-xl"
              disabled={accept.isPending}
              onClick={() => accept.mutate()}
            >
              {accept.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Accept invitation
            </Button>
          </>
        ) : (
          <div className="grid gap-2">
            <Button className="btn-premium rounded-xl" asChild>
              <a href={authHref("/login", returnTo)}>Sign in to accept</a>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <a href={authHref("/signup", returnTo)}>Create account</a>
            </Button>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

function InvitationState({ title, body }: { title: string; body: string }) {
  const Icon = title.includes("Invalid") ? AlertTriangle : ShieldAlert;
  return (
    <AuthShell title={title} subtitle={body}>
      <div className="space-y-5 text-center">
        <Icon className="mx-auto h-12 w-12 text-muted-foreground" />
        <Button variant="outline" className="w-full rounded-xl" asChild>
          <a href="/login">Return to sign in</a>
        </Button>
      </div>
    </AuthShell>
  );
}
