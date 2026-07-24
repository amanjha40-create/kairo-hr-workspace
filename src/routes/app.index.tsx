import { createFileRoute, Link } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PageHeader, SectionCard, EmptyState, TableSkeleton } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/lib/dashboard-context";
import { useAccess } from "@/lib/access-context";
import { VerificationPill, InvitationPill } from "@/components/app/workspace-pills";
import { PermissionDenied } from "@/components/app/access/PermissionDenied";
import { useTrustInvitationSummaryQuery } from "@/lib/queries/trust-invitations";
import { useVerificationRequestListQuery } from "@/lib/queries/verification-requests";
import {
  canReviewVerification,
  getVerificationErrorMessage,
  type VerificationInboxStatus,
} from "@/lib/employment-verifications";
import {
  Plus,
  MailPlus,
  ShieldCheck,
  Hourglass,
  Loader2,
  CheckCircle2,
  ArrowRight,
  UserPlus,
  FileText,
  Share2,
  MessageCircleWarning,
  ShieldOff,
  AlertTriangle,
  MailOpen,
  MailCheck,
  Sparkles,
  EyeOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const overviewSearch = z.object({ empty: z.string().optional() });

export const Route = createFileRoute("/app/")({
  validateSearch: zodValidator(overviewSearch),
  component: Overview,
});

function Overview() {
  const { people, requests, attention, setInviteOpen, emptyMode, setEmptyMode } =
    useDashboard();
  const { org, can } = useAccess();
  const canInvite = can("invite_candidate");
  const invitationSummaryQuery = useTrustInvitationSummaryQuery(org?.publicId);
  const verificationListQuery = useVerificationRequestListQuery(org?.publicId, {
    sort_by: "updated_at",
    sort_order: "desc",
  });
  const invitationCounts = invitationSummaryQuery.data ?? {
    active: 0,
    awaiting: 0,
    accepted: 0,
    expiring: 0,
    draft: 0,
  };
  const { empty } = Route.useSearch();
  const hasInvitationData =
    invitationCounts.active +
      invitationCounts.accepted +
      invitationCounts.draft +
      invitationCounts.expiring >
    0;
  const verificationRows = verificationListQuery.data ?? [];
  const hasVerificationData = verificationRows.length > 0;
  const isEmpty =
    emptyMode ||
    (!invitationSummaryQuery.isPending &&
      !verificationListQuery.isPending &&
      people.length === 0 &&
      !hasInvitationData &&
      !hasVerificationData);

  const activeInvitations = invitationCounts.active;
  const awaitingCandidate = invitationCounts.awaiting;
  const inVerification = people.filter(
    (p) =>
      p.workspaceVerificationStatus === "In Verification" ||
      p.workspaceVerificationStatus === "Clarification Required",
  ).length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const completedThisMonth = requests.filter(
    (r) => r.status === "Verified" && new Date(r.requestedAt) >= monthStart,
  ).length;
  const inboundOpen = verificationRows.filter((record) => canReviewVerification(record)).length;

  const kpis = [
    {
      key: "invites",
      label: "Active Trust Invitations",
      value: activeInvitations,
      icon: MailPlus,
      desc: "Awaiting candidate acceptance",
      to: "/app/invitations",
      search: undefined,
    },
    {
      key: "inbound",
      label: "Employment Verifications",
      value:
        verificationListQuery.isPending && !verificationListQuery.data ? "—" : inboundOpen,
      icon: ShieldCheck,
      desc: "Incoming from other organizations",
      to: "/app/verifications",
      search: undefined,
    },
    {
      key: "awaiting",
      label: "Awaiting Candidate",
      value: awaitingCandidate,
      icon: Hourglass,
      desc: "Needs candidate action",
      to: "/app/invitations",
      search: undefined,
    },
    {
      key: "in-verif",
      label: "In Verification",
      value: inVerification,
      icon: Loader2,
      desc: "Currently being processed",
      to: "/app/invitations",
      search: undefined,
    },
    {
      key: "completed",
      label: "Completed This Month",
      value: completedThisMonth,
      icon: CheckCircle2,
      desc: "Finalized this month",
      to: "/app/invitations",
      search: undefined,
    },
  ] as const;

  const recentInbound = verificationRows.slice(0, 6);
  void empty;

  return (
    <div>
      <PageHeader
        eyebrow="Kairo Trust Workspace"
        title="Overview"
        description="Track Trust Invitations, incoming Employment Verifications, and shared professional trust."
        actions={
          <>
            {emptyMode ? (
              <Button
                variant="outline"
                onClick={() => setEmptyMode(false)}
                className="rounded-xl"
                size="sm"
              >
                Exit empty preview
              </Button>
            ) : import.meta.env.DEV ? (
              <Button
                variant="outline"
                onClick={() => setEmptyMode(true)}
                className="rounded-xl"
                size="sm"
                title="Development only"
              >
                <EyeOff className="h-4 w-4 mr-1.5" /> Preview empty state
              </Button>
            ) : null}
            {canInvite ? (
              <Button onClick={() => setInviteOpen(true)} className="btn-premium rounded-xl">
                <Plus className="h-4 w-4 mr-1.5" /> Invite Candidate
              </Button>
            ) : null}
          </>
        }
      />
      {!canInvite ? (
        <PermissionDenied
          className="mb-4"
          message="Your role can review workspace activity, but only permitted users can create Trust Invitations."
        />
      ) : null}

      {isEmpty ? (
        <SectionCard title="Get started" description="Your workspace is ready.">
          <div className="py-16 px-6 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-foreground/[0.04] border border-border/60 flex items-center justify-center mb-5">
              <Sparkles className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Invite your first candidate
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Begin by inviting a candidate to securely share their professional information through
              a Trust Invitation.
            </p>
            {canInvite ? (
              <Button onClick={() => setInviteOpen(true)} className="btn-premium rounded-xl mt-6">
                <Plus className="h-4 w-4 mr-1.5" /> Invite Candidate
              </Button>
            ) : null}
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-8">
            {kpis.map(({ key, label, value, icon: Icon, desc, to, search }) => (
              <Link
                key={key}
                to={to}
                search={search as never}
                className="group rounded-2xl border border-border/60 bg-background p-5 shadow-[var(--shadow-soft)] hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    {label}
                  </div>
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
                  {value}
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{desc}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>

          <SectionCard
            title="Needs Your Attention"
            description="Actionable items across invitations, requests and Trust Passports"
            className="mb-6"
          >
            {attention.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing needs your attention"
                description="You're up to date. New alerts appear here as candidates and verifications progress."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {attention.map((a) => (
                  <div key={a.id} className="px-5 py-4 flex flex-wrap items-start gap-3">
                    <div className="mt-0.5">
                      <AttentionIcon reason={a.reason} />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <div className="text-sm font-medium">{a.personName}</div>
                      <div className="text-[13px] text-muted-foreground mt-0.5">{a.reason}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />{" "}
                          {a.status}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{formatDistanceToNow(new Date(a.at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to="/app/people/$id"
                        params={{ id: a.personId }}
                        className="text-xs font-medium hover:underline text-muted-foreground"
                      >
                        View person
                      </Link>
                      <Link
                        to={a.action.to as never}
                        params={a.action.params as never}
                        search={a.action.search as never}
                        className="text-xs font-medium rounded-lg border border-border/60 px-3 py-1.5 hover:bg-foreground/[0.04]"
                      >
                        {a.action.label}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-3">
            <SectionCard
              className="lg:col-span-2"
              title="Recent Employment Verifications"
              description="Incoming requests from other organizations"
              action={
                <Link
                  to="/app/verifications"
                  className="text-xs font-medium hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              }
            >
              {verificationListQuery.isPending && !verificationListQuery.data ? (
                <TableSkeleton rows={4} />
              ) : verificationListQuery.error ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="Employment Verifications didn't load"
                  description={getVerificationErrorMessage(
                    verificationListQuery.error,
                    "Please try again.",
                  )}
                  action={{
                    label: "Retry",
                    onClick: () => {
                      void verificationListQuery.refetch();
                    },
                  }}
                />
              ) : recentInbound.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="No employment verifications yet"
                  description="Inbound Employment Verifications from other organizations will appear here."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                        <th className="text-left font-medium py-2.5 px-5">Candidate</th>
                        <th className="text-left font-medium py-2.5 px-3 hidden md:table-cell">
                          Requesting org
                        </th>
                        <th className="text-left font-medium py-2.5 px-3">Status</th>
                        <th className="text-left font-medium py-2.5 px-3 hidden lg:table-cell">
                          Received
                        </th>
                        <th className="text-right font-medium py-2.5 px-5">Open</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {recentInbound.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-foreground/[0.02] transition-colors group"
                        >
                          <td className="py-3 px-5">
                            <div className="text-sm font-medium">{r.candidateName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {r.id}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-sm text-muted-foreground hidden md:table-cell">
                            {r.targetName ?? r.organizationName ?? "—"}
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground">{r.status}</td>
                          <td className="py-3 px-3 text-xs text-muted-foreground hidden lg:table-cell">
                            {formatDistanceToNow(new Date(r.receivedAt), { addSuffix: true })}
                          </td>
                          <td className="py-3 px-5 text-right">
                            <Link
                              to="/app/verifications/$id"
                              params={{ id: r.id }}
                              className="text-xs font-medium hover:underline"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Recent Activity" description="Latest events across your workspace">
              <RecentActivity />
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

function mapLegacyStatus(s: string) {
  switch (s) {
    case "Verified":
      return "Completed" as const;
    case "Rejected":
      return "Unable to Verify" as const;
    case "Under Review":
      return "In Verification" as const;
    case "Documents Requested":
      return "Clarification Required" as const;
    case "Pending":
      return "Waiting for Candidate" as const;
    default:
      return "Not Started" as const;
  }
}

function AttentionIcon({ reason }: { reason: string }) {
  const r = reason.toLowerCase();
  let Icon = AlertTriangle;
  let cls = "bg-warning/15 text-warning-foreground";
  if (r.includes("completed")) {
    Icon = CheckCircle2;
    cls = "bg-success/15 text-success";
  } else if (r.includes("could not") || r.includes("unable")) {
    Icon = ShieldOff;
    cls = "bg-destructive/10 text-destructive";
  } else if (r.includes("clarification")) {
    Icon = MessageCircleWarning;
    cls = "bg-warning/15 text-warning-foreground";
  } else if (r.includes("expires")) {
    Icon = MailOpen;
    cls = "bg-warning/15 text-warning-foreground";
  } else if (r.includes("accept")) {
    Icon = MailPlus;
    cls = "bg-info/15 text-info-foreground";
  } else if (r.includes("incomplete")) {
    Icon = Hourglass;
    cls = "bg-warning/15 text-warning-foreground";
  }
  return (
    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cls}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

function RecentActivity() {
  const { people } = useDashboard();
  const items = people
    .flatMap((p) =>
      p.personActivity.slice(0, 2).map((a) => ({ ...a, personName: p.name, personId: p.id })),
    )
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No recent activity"
        description="Activity will appear here as candidates and verifications progress."
      />
    );
  }
  return (
    <div className="divide-y divide-border/60 max-h-[520px] overflow-y-auto">
      {items.map((a) => (
        <Link
          key={`${a.personId}-${a.id}`}
          to="/app/people/$id"
          params={{ id: a.personId }}
          className="px-5 py-3.5 flex items-start gap-3 hover:bg-foreground/[0.02]"
        >
          <ActivityIcon kind={a.kind} />
          <div className="flex-1 min-w-0">
            <div className="text-sm">
              <span className="font-medium">{a.personName}</span>{" "}
              <span className="text-muted-foreground">· {a.label.toLowerCase()}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(a.at), { addSuffix: true })} · {a.actor}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ActivityIcon({ kind }: { kind: string }) {
  const map: Record<string, { Icon: typeof CheckCircle2; cls: string }> = {
    added: { Icon: UserPlus, cls: "bg-foreground/[0.06] text-foreground" },
    invited: { Icon: MailPlus, cls: "bg-info/15 text-info-foreground" },
    opened: { Icon: MailOpen, cls: "bg-info/15 text-info-foreground" },
    accepted: { Icon: MailCheck, cls: "bg-success/15 text-success" },
    consent: { Icon: ShieldCheck, cls: "bg-success/15 text-success" },
    shared: { Icon: Share2, cls: "bg-success/15 text-success" },
    accessed: { Icon: FileText, cls: "bg-foreground/[0.06] text-foreground" },
    request: { Icon: ShieldCheck, cls: "bg-info/15 text-info-foreground" },
    submitted: { Icon: FileText, cls: "bg-info/15 text-info-foreground" },
    "clarification-req": {
      Icon: MessageCircleWarning,
      cls: "bg-warning/15 text-warning-foreground",
    },
    "clarification-recv": {
      Icon: MessageCircleWarning,
      cls: "bg-warning/15 text-warning-foreground",
    },
    completed: { Icon: CheckCircle2, cls: "bg-success/15 text-success" },
    unable: { Icon: ShieldOff, cls: "bg-destructive/10 text-destructive" },
    expired: { Icon: ShieldOff, cls: "bg-destructive/10 text-destructive" },
    revoked: { Icon: ShieldOff, cls: "bg-destructive/10 text-destructive" },
  };
  const { Icon, cls } = map[kind] ?? map.added;
  return (
    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}
