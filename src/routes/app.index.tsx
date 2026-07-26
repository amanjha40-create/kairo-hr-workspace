import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  EyeOff,
  FileText,
  Hourglass,
  Loader2,
  MailCheck,
  MailOpen,
  MailPlus,
  MessageCircleWarning,
  Plus,
  Share2,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useMemo } from "react";
import { PermissionDenied } from "@/components/app/access/PermissionDenied";
import { EmptyState, PageHeader, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/lib/access-context";
import { useDashboard } from "@/lib/dashboard-context";
import {
  canReviewVerification,
  getVerificationErrorMessage,
  type EmploymentVerificationRecord,
} from "@/lib/employment-verifications";
import {
  getPeopleOverviewCounts,
  getOrganizationPeopleErrorMessage,
  type PeopleDirectoryItem,
} from "@/lib/organization-people";
import { useOrganizationPeopleDirectoryQuery } from "@/lib/queries/organization-people";
import {
  useTrustInvitationListQuery,
  useTrustInvitationSummaryQuery,
} from "@/lib/queries/trust-invitations";
import { useVerificationRequestListQuery } from "@/lib/queries/verification-requests";
import { type TrustInvitationRecord } from "@/lib/trust-invitations";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

const EMPTY_INVITATIONS: TrustInvitationRecord[] = [];
const EMPTY_VERIFICATIONS: EmploymentVerificationRecord[] = [];
const EMPTY_PEOPLE: PeopleDirectoryItem[] = [];

type OverviewAttentionItem = {
  id: string;
  personName: string;
  personPublicId: string;
  reason: string;
  status: string;
  at: string;
  actionLabel: string;
};

type OverviewActivityItem = {
  id: string;
  subjectName: string;
  label: string;
  actor: string;
  at: string;
  kind: string;
  to: "/app/invitations/$id" | "/app/verifications/$id";
  params: { id: string };
};

function sortByNewest<T extends { at: string }>(items: T[]) {
  return [...items].sort(
    (left, right) => new Date(right.at).getTime() - new Date(left.at).getTime(),
  );
}

function isCurrentMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function buildOverviewAttentionItems(people: PeopleDirectoryItem[]): OverviewAttentionItem[] {
  const items: OverviewAttentionItem[] = [];

  for (const person of people) {
    const at = person.lastActivityAt ?? person.addedAt;

    if (person.verificationStatus === "Clarification Required") {
      items.push({
        id: `${person.publicId}-clarification`,
        personName: person.name,
        personPublicId: person.publicId,
        reason: "Clarification required for shared verification",
        status: person.verificationStatus,
        at,
        actionLabel: "Review details",
      });
      continue;
    }

    if (person.verificationStatus === "Waiting for Candidate") {
      items.push({
        id: `${person.publicId}-waiting`,
        personName: person.name,
        personPublicId: person.publicId,
        reason: "Candidate information is still pending",
        status: person.verificationStatus,
        at,
        actionLabel: "Open person",
      });
      continue;
    }

    if (person.invitationStatus === "Sent" || person.invitationStatus === "Opened") {
      items.push({
        id: `${person.publicId}-invitation`,
        personName: person.name,
        personPublicId: person.publicId,
        reason: "Trust invitation still needs candidate acceptance",
        status: person.invitationStatus,
        at,
        actionLabel: "Review invitation state",
      });
      continue;
    }

    if (person.passportStatus === "Expiring Soon") {
      items.push({
        id: `${person.publicId}-passport-expiring`,
        personName: person.name,
        personPublicId: person.publicId,
        reason: "Shared Trust Passport access expires soon",
        status: person.passportStatus,
        at,
        actionLabel: "Review passport access",
      });
      continue;
    }

    if (person.passportStatus === "Expired") {
      items.push({
        id: `${person.publicId}-passport-expired`,
        personName: person.name,
        personPublicId: person.publicId,
        reason: "Shared Trust Passport access expired",
        status: person.passportStatus,
        at,
        actionLabel: "Open person",
      });
      continue;
    }

    if (person.passportStatus === "Access Revoked") {
      items.push({
        id: `${person.publicId}-passport-revoked`,
        personName: person.name,
        personPublicId: person.publicId,
        reason: "Shared Trust Passport access was revoked",
        status: person.passportStatus,
        at,
        actionLabel: "Open person",
      });
      continue;
    }

    if (person.verificationStatus === "Unable to Verify") {
      items.push({
        id: `${person.publicId}-unable`,
        personName: person.name,
        personPublicId: person.publicId,
        reason: "Verification could not be completed",
        status: person.verificationStatus,
        at,
        actionLabel: "Review details",
      });
    }
  }

  return sortByNewest(items).slice(0, 8);
}

function buildInvitationActivityItems(
  invitations: TrustInvitationRecord[],
): OverviewActivityItem[] {
  return invitations.flatMap((invitation) => {
    if (invitation.status === "Accepted" && invitation.acceptedAt) {
      return [
        {
          id: `${invitation.id}-accepted`,
          subjectName: invitation.candidateName,
          label: "accepted a trust invitation",
          actor: invitation.candidateName,
          at: invitation.acceptedAt,
          kind: "accepted",
          to: "/app/invitations/$id",
          params: { id: invitation.id },
        },
      ];
    }

    if (invitation.status === "Opened" && invitation.openedAt) {
      return [
        {
          id: `${invitation.id}-opened`,
          subjectName: invitation.candidateName,
          label: "opened a trust invitation",
          actor: invitation.candidateName,
          at: invitation.openedAt,
          kind: "opened",
          to: "/app/invitations/$id",
          params: { id: invitation.id },
        },
      ];
    }

    if (invitation.status === "Cancelled" && invitation.cancelledAt) {
      return [
        {
          id: `${invitation.id}-cancelled`,
          subjectName: invitation.candidateName,
          label: "had a trust invitation cancelled",
          actor: invitation.createdByName,
          at: invitation.cancelledAt,
          kind: "revoked",
          to: "/app/invitations/$id",
          params: { id: invitation.id },
        },
      ];
    }

    if (invitation.status === "Expired") {
      return [
        {
          id: `${invitation.id}-expired`,
          subjectName: invitation.candidateName,
          label: "had a trust invitation expire",
          actor: "System",
          at: invitation.updatedAt,
          kind: "expired",
          to: "/app/invitations/$id",
          params: { id: invitation.id },
        },
      ];
    }

    if (invitation.status === "Sent") {
      return [
        {
          id: `${invitation.id}-sent`,
          subjectName: invitation.candidateName,
          label: "was sent a trust invitation",
          actor: invitation.createdByName,
          at: invitation.sentAt ?? invitation.updatedAt,
          kind: "invited",
          to: "/app/invitations/$id",
          params: { id: invitation.id },
        },
      ];
    }

    return [];
  });
}

function buildVerificationActivityItems(
  verifications: EmploymentVerificationRecord[],
): OverviewActivityItem[] {
  return verifications.map((verification) => {
    switch (verification.status) {
      case "Clarification Requested":
        return {
          id: `${verification.id}-clarification`,
          subjectName: verification.candidateName,
          label: "needs verification clarification",
          actor:
            verification.assignedReviewer?.fullName ??
            verification.assignedReviewer?.email ??
            "Organization",
          at: verification.updatedAt,
          kind: "clarification-req",
          to: "/app/verifications/$id",
          params: { id: verification.id },
        };
      case "Confirmed":
        return {
          id: `${verification.id}-confirmed`,
          subjectName: verification.candidateName,
          label: "verification was completed",
          actor:
            verification.assignedReviewer?.fullName ??
            verification.assignedReviewer?.email ??
            "Organization",
          at: verification.updatedAt,
          kind: "completed",
          to: "/app/verifications/$id",
          params: { id: verification.id },
        };
      case "Rejected":
        return {
          id: `${verification.id}-rejected`,
          subjectName: verification.candidateName,
          label: "verification was rejected",
          actor:
            verification.assignedReviewer?.fullName ??
            verification.assignedReviewer?.email ??
            "Organization",
          at: verification.updatedAt,
          kind: "unable",
          to: "/app/verifications/$id",
          params: { id: verification.id },
        };
      case "Cancelled":
        return {
          id: `${verification.id}-cancelled`,
          subjectName: verification.candidateName,
          label: "verification was cancelled",
          actor: "Organization",
          at: verification.updatedAt,
          kind: "revoked",
          to: "/app/verifications/$id",
          params: { id: verification.id },
        };
      case "Expired":
        return {
          id: `${verification.id}-expired`,
          subjectName: verification.candidateName,
          label: "verification request expired",
          actor: "System",
          at: verification.updatedAt,
          kind: "expired",
          to: "/app/verifications/$id",
          params: { id: verification.id },
        };
      case "In Review":
        return {
          id: `${verification.id}-review`,
          subjectName: verification.candidateName,
          label: "verification moved into review",
          actor:
            verification.assignedReviewer?.fullName ??
            verification.assignedReviewer?.email ??
            "Organization",
          at: verification.updatedAt,
          kind: "request",
          to: "/app/verifications/$id",
          params: { id: verification.id },
        };
      default:
        return {
          id: `${verification.id}-new`,
          subjectName: verification.candidateName,
          label: "employment verification was received",
          actor: verification.targetName ?? verification.organizationName ?? "Organization",
          at: verification.receivedAt,
          kind: "request",
          to: "/app/verifications/$id",
          params: { id: verification.id },
        };
    }
  });
}

function Overview() {
  const { setInviteOpen, emptyMode, setEmptyMode } = useDashboard();
  const { org, can } = useAccess();
  const canInvite = can("invite_candidate");

  const invitationSummaryQuery = useTrustInvitationSummaryQuery(org?.publicId);
  const invitationListQuery = useTrustInvitationListQuery(org?.publicId, {
    sort_by: "updated_at",
    sort_order: "desc",
    page_size: 50,
    paginate: true,
  });
  const verificationListQuery = useVerificationRequestListQuery(org?.publicId, {
    sort_by: "updated_at",
    sort_order: "desc",
    page_size: 100,
    paginate: true,
  });
  const peopleDirectoryQuery = useOrganizationPeopleDirectoryQuery(org?.publicId, {
    sort_by: "last_activity_at",
    sort_order: "desc",
  });

  const invitationCounts = invitationSummaryQuery.data ?? {
    active: 0,
    awaiting: 0,
    accepted: 0,
    expiring: 0,
    draft: 0,
  };
  const invitationRows = invitationListQuery.data ?? EMPTY_INVITATIONS;
  const verificationRows = verificationListQuery.data ?? EMPTY_VERIFICATIONS;
  const peopleRows = peopleDirectoryQuery.data?.items ?? EMPTY_PEOPLE;

  const peopleCounts = peopleDirectoryQuery.data
    ? getPeopleOverviewCounts(peopleDirectoryQuery.data.summary)
    : { totalPeople: 0, inVerification: 0 };

  const attentionItems = useMemo(
    () => (emptyMode ? [] : buildOverviewAttentionItems(peopleRows)),
    [emptyMode, peopleRows],
  );
  const recentActivityItems = useMemo(() => {
    if (emptyMode) return [];
    const items: OverviewActivityItem[] = [
      ...buildInvitationActivityItems(invitationRows),
      ...buildVerificationActivityItems(verificationRows),
    ];
    return sortByNewest(items).slice(0, 10);
  }, [emptyMode, invitationRows, verificationRows]);

  const hasInvitationData =
    invitationCounts.active +
      invitationCounts.accepted +
      invitationCounts.draft +
      invitationCounts.expiring >
    0;
  const hasVerificationData = verificationRows.length > 0;
  const isEmpty =
    emptyMode ||
    (!invitationSummaryQuery.isPending &&
      !verificationListQuery.isPending &&
      !peopleDirectoryQuery.isPending &&
      !invitationSummaryQuery.error &&
      !verificationListQuery.error &&
      !peopleDirectoryQuery.error &&
      peopleCounts.totalPeople === 0 &&
      !hasInvitationData &&
      !hasVerificationData);

  const activeInvitations = invitationSummaryQuery.error ? "—" : invitationCounts.active;
  const awaitingCandidate = invitationSummaryQuery.error ? "—" : invitationCounts.awaiting;
  const inVerification = peopleDirectoryQuery.error ? "—" : peopleCounts.inVerification;
  const completedThisMonth =
    verificationListQuery.isPending && verificationListQuery.data == null
      ? "—"
      : verificationListQuery.error
        ? "—"
        : verificationRows.filter(
            (record) => record.status === "Confirmed" && isCurrentMonth(record.updatedAt),
          ).length;
  const inboundOpen =
    verificationListQuery.isPending && verificationListQuery.data == null
      ? "—"
      : verificationListQuery.error
        ? "—"
        : verificationRows.filter((record) => canReviewVerification(record)).length;

  const kpis = [
    {
      key: "invites",
      label: "Active Trust Invitations",
      value: activeInvitations,
      icon: MailPlus,
      desc: "Awaiting candidate acceptance",
      to: "/app/invitations",
    },
    {
      key: "inbound",
      label: "Employment Verifications",
      value: inboundOpen,
      icon: ShieldCheck,
      desc: "Incoming from other organizations",
      to: "/app/verifications",
    },
    {
      key: "awaiting",
      label: "Awaiting Candidate",
      value: awaitingCandidate,
      icon: Hourglass,
      desc: "Needs candidate action",
      to: "/app/invitations",
    },
    {
      key: "in-verif",
      label: "In Verification",
      value: inVerification,
      icon: Loader2,
      desc: "Currently being processed",
      to: "/app/people",
    },
    {
      key: "completed",
      label: "Completed This Month",
      value: completedThisMonth,
      icon: CheckCircle2,
      desc: "Finalized this month",
      to: "/app/verifications",
    },
  ] as const;

  const recentInbound = verificationRows.slice(0, 6);

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
            {kpis.map(({ key, label, value, icon: Icon, desc, to }) => (
              <Link
                key={key}
                to={to}
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
            {peopleDirectoryQuery.isPending && !peopleDirectoryQuery.data ? (
              <TableSkeleton rows={4} />
            ) : peopleDirectoryQuery.error ? (
              <EmptyState
                icon={AlertTriangle}
                title="Attention items didn't load"
                description={getOrganizationPeopleErrorMessage(
                  peopleDirectoryQuery.error,
                  "Please try again.",
                )}
                action={{
                  label: "Retry",
                  onClick: () => {
                    void peopleDirectoryQuery.refetch();
                  },
                }}
              />
            ) : attentionItems.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing needs your attention"
                description="You're up to date. New alerts appear here as candidates and verifications progress."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {attentionItems.map((item) => (
                  <div key={item.id} className="px-5 py-4 flex flex-wrap items-start gap-3">
                    <div className="mt-0.5">
                      <AttentionIcon reason={item.reason} />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <div className="text-sm font-medium">{item.personName}</div>
                      <div className="text-[13px] text-muted-foreground mt-0.5">{item.reason}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                          {item.status}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{formatDistanceToNow(new Date(item.at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to="/app/people/$id"
                        params={{ id: item.personPublicId }}
                        className="text-xs font-medium hover:underline text-muted-foreground"
                      >
                        View person
                      </Link>
                      <Link
                        to="/app/people/$id"
                        params={{ id: item.personPublicId }}
                        className="text-xs font-medium rounded-lg border border-border/60 px-3 py-1.5 hover:bg-foreground/[0.04]"
                      >
                        {item.actionLabel}
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
                      {recentInbound.map((record) => (
                        <tr
                          key={record.id}
                          className="hover:bg-foreground/[0.02] transition-colors group"
                        >
                          <td className="py-3 px-5">
                            <div className="text-sm font-medium">{record.candidateName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {record.id}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-sm text-muted-foreground hidden md:table-cell">
                            {record.targetName ?? record.organizationName ?? "—"}
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground">
                            {record.status}
                          </td>
                          <td className="py-3 px-3 text-xs text-muted-foreground hidden lg:table-cell">
                            {formatDistanceToNow(new Date(record.receivedAt), { addSuffix: true })}
                          </td>
                          <td className="py-3 px-5 text-right">
                            <Link
                              to="/app/verifications/$id"
                              params={{ id: record.id }}
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
              <RecentActivity
                items={recentActivityItems}
                loading={
                  (invitationListQuery.isPending && !invitationListQuery.data) ||
                  (verificationListQuery.isPending && !verificationListQuery.data)
                }
                error={invitationListQuery.error ?? verificationListQuery.error ?? null}
                retry={() => {
                  void invitationListQuery.refetch();
                  void verificationListQuery.refetch();
                }}
              />
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

function AttentionIcon({ reason }: { reason: string }) {
  const normalizedReason = reason.toLowerCase();
  let Icon = AlertTriangle;
  let cls = "bg-warning/15 text-warning-foreground";
  if (normalizedReason.includes("could not") || normalizedReason.includes("unable")) {
    Icon = ShieldOff;
    cls = "bg-destructive/10 text-destructive";
  } else if (normalizedReason.includes("clarification")) {
    Icon = MessageCircleWarning;
    cls = "bg-warning/15 text-warning-foreground";
  } else if (normalizedReason.includes("expires") || normalizedReason.includes("expired")) {
    Icon = MailOpen;
    cls = "bg-warning/15 text-warning-foreground";
  } else if (normalizedReason.includes("accept")) {
    Icon = MailPlus;
    cls = "bg-info/15 text-info-foreground";
  } else if (normalizedReason.includes("pending")) {
    Icon = Hourglass;
    cls = "bg-warning/15 text-warning-foreground";
  }
  return (
    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cls}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

function RecentActivity({
  items,
  loading,
  error,
  retry,
}: {
  items: OverviewActivityItem[];
  loading: boolean;
  error: unknown;
  retry: () => void;
}) {
  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  if (error) {
    const description = error instanceof Error ? error.message : "Please try again.";
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Recent activity didn't load"
        description={description}
        action={{ label: "Retry", onClick: retry }}
      />
    );
  }

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
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to as never}
          params={item.params as never}
          className="px-5 py-3.5 flex items-start gap-3 hover:bg-foreground/[0.02]"
        >
          <ActivityIcon kind={item.kind} />
          <div className="flex-1 min-w-0">
            <div className="text-sm">
              <span className="font-medium">{item.subjectName}</span>{" "}
              <span className="text-muted-foreground">· {item.label}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(item.at), { addSuffix: true })} · {item.actor}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ActivityIcon({ kind }: { kind: string }) {
  const map: Record<string, { Icon: typeof CheckCircle2; cls: string }> = {
    invited: { Icon: MailPlus, cls: "bg-info/15 text-info-foreground" },
    opened: { Icon: MailOpen, cls: "bg-info/15 text-info-foreground" },
    accepted: { Icon: MailCheck, cls: "bg-success/15 text-success" },
    request: { Icon: ShieldCheck, cls: "bg-info/15 text-info-foreground" },
    "clarification-req": {
      Icon: MessageCircleWarning,
      cls: "bg-warning/15 text-warning-foreground",
    },
    completed: { Icon: CheckCircle2, cls: "bg-success/15 text-success" },
    unable: { Icon: ShieldOff, cls: "bg-destructive/10 text-destructive" },
    expired: { Icon: ShieldOff, cls: "bg-destructive/10 text-destructive" },
    revoked: { Icon: Share2, cls: "bg-foreground/[0.06] text-foreground" },
    added: { Icon: UserPlus, cls: "bg-foreground/[0.06] text-foreground" },
    submitted: { Icon: FileText, cls: "bg-info/15 text-info-foreground" },
  };
  const { Icon, cls } = map[kind] ?? map.request;
  return (
    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}
