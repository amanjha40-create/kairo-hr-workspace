import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  StatCard,
  TableSkeleton,
} from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { InvitationPill } from "@/components/app/workspace-pills";
import { PermissionDenied } from "@/components/app/access/PermissionDenied";
import { useDashboard } from "@/lib/dashboard-context";
import { useAccess } from "@/lib/access-context";
import {
  MailPlus,
  Search,
  Copy,
  MoreHorizontal,
  Send,
  RefreshCw,
  Ban,
  ChevronRight,
  Timer,
  AlertTriangle,
  Mailbox,
  MailCheck,
  MailOpen,
  MailWarning,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  formatVerificationList,
  getTrustInvitationErrorMessage,
  mapUiStatusToBackendFilter,
  matchesPurposeFilter,
  matchesUiStatusFilter,
  matchesVerificationFilter,
  PURPOSE_ROLL,
  type TrustInvitationRecord,
} from "@/lib/trust-invitations";
import {
  trustInvitationDetailQueryOptions,
  useCancelTrustInvitationMutation,
  useDeleteTrustInvitationMutation,
  useResendTrustInvitationMutation,
  useSendTrustInvitationMutation,
  useTrustInvitationListQuery,
  useTrustInvitationSummaryQuery,
} from "@/lib/queries/trust-invitations";

const PAGE_SIZE = 20;
const EMPTY_INVITATIONS: TrustInvitationRecord[] = [];

const schema = z.object({
  status: fallback(z.string(), "all").default("all"),
  purpose: fallback(z.string(), "all").default("all"),
  type: fallback(z.string(), "all").default("all"),
  page: fallback(z.coerce.number().int().min(1), 1).default(1),
});

export const Route = createFileRoute("/app/invitations")({
  validateSearch: zodValidator(schema),
  component: InvitationsPage,
});

function InvitationsPage() {
  const { setInviteOpen, search, setSearch } = useDashboard();
  const { org, can } = useAccess();
  const canInvite = can("invite_candidate");
  const canModify = can("modify_invitation");
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const nav = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();
  const queryClient = useQueryClient();
  const invitationsQuery = useTrustInvitationListQuery(org?.publicId, {
    search: search.trim() || undefined,
    status: mapUiStatusToBackendFilter(searchParams.status),
    sort_by: "created_at",
    sort_order: "desc",
  });
  const summaryQuery = useTrustInvitationSummaryQuery(org?.publicId);
  const sendMutation = useSendTrustInvitationMutation(org?.publicId);
  const resendMutation = useResendTrustInvitationMutation(org?.publicId);
  const cancelMutation = useCancelTrustInvitationMutation(org?.publicId);
  const deleteMutation = useDeleteTrustInvitationMutation(org?.publicId);

  const counts = summaryQuery.data ?? {
    active: 0,
    awaiting: 0,
    accepted: 0,
    expiring: 0,
    draft: 0,
  };
  const allInvitations = invitationsQuery.data ?? EMPTY_INVITATIONS;
  const filteredRows = useMemo(() => {
    return allInvitations
      .filter((invitation) => matchesUiStatusFilter(invitation, searchParams.status))
      .filter((invitation) => matchesPurposeFilter(invitation, searchParams.purpose))
      .filter((invitation) => matchesVerificationFilter(invitation, searchParams.type));
  }, [allInvitations, searchParams.purpose, searchParams.status, searchParams.type]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(searchParams.page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasActiveFilters =
    search.trim() !== "" ||
    searchParams.status !== "all" ||
    searchParams.purpose !== "all" ||
    searchParams.type !== "all";

  if (pathname !== "/app/invitations") {
    return <Outlet />;
  }

  const setFilter = (key: "status" | "purpose" | "type" | "page", value: string | number) =>
    nav({
      search: (previous) => ({ ...previous, [key]: value, ...(key === "page" ? {} : { page: 1 }) }),
    });

  const copyLink = async (id: string) => {
    try {
      const invitation = await queryClient.fetchQuery(trustInvitationDetailQueryOptions(id));
      if (!invitation.invitationUrl) {
        throw new Error("The backend did not return a canonical invitation link.");
      }
      await navigator.clipboard?.writeText(invitation.invitationUrl);
      toast.success("Invitation link copied");
    } catch (error) {
      toast.error(getTrustInvitationErrorMessage(error, "We couldn't copy this invitation link."));
    }
  };

  const handleMutation = async (
    callback: () => Promise<unknown>,
    successMessage: string,
    failureMessage: string,
  ) => {
    try {
      await callback();
      toast.success(successMessage);
    } catch (error) {
      toast.error(getTrustInvitationErrorMessage(error, failureMessage));
    }
  };

  if (!org) {
    return (
      <EmptyState
        icon={Mailbox}
        title="No active organization"
        description="Trust Invitations become available after your workspace organization is ready."
      />
    );
  }

  if (!canModify) {
    return (
      <EmptyState
        icon={Ban}
        title="Permission denied"
        description="You don't have permission to view Trust Invitations in this workspace."
      />
    );
  }

  const loadError = invitationsQuery.error ?? summaryQuery.error;
  if (loadError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={
          loadError instanceof Error && "status" in loadError && loadError.status === 403
            ? "Permission denied"
            : "Trust Invitations didn't load"
        }
        description={getTrustInvitationErrorMessage(loadError, "Please try again.")}
        action={{
          label: "Retry",
          onClick: () => {
            void invitationsQuery.refetch();
            void summaryQuery.refetch();
          },
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Trust Invitations"
        description="Send consent-first invitations. Track who's opened, accepted, or needs a nudge."
        actions={
          canInvite ? (
            <Button
              onClick={() => setInviteOpen(true)}
              className="btn-premium rounded-xl"
              size="sm"
            >
              <MailPlus className="h-4 w-4 mr-1.5" /> Invite Candidate
            </Button>
          ) : null
        }
      />
      {!canInvite ? (
        <PermissionDenied
          className="mb-4"
          message="Your role can review invitations, but only permitted users can create new ones."
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Active Invitations"
          value={counts.active}
          icon={Mailbox}
          onClick={() => setFilter("status", "Sent")}
        />
        <StatCard
          label="Awaiting Response"
          value={counts.awaiting}
          icon={MailWarning}
          tone="warning"
          onClick={() => setFilter("status", "Sent")}
        />
        <StatCard
          label="Accepted"
          value={counts.accepted}
          icon={MailCheck}
          tone="success"
          onClick={() => setFilter("status", "Accepted")}
        />
        <StatCard label="Expiring Soon" value={counts.expiring} icon={Timer} tone="warning" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              void setFilter("page", 1);
            }}
            placeholder="Search invitations…"
            className="pl-9 h-9 rounded-xl"
          />
        </div>
        <Select value={searchParams.status} onValueChange={(value) => setFilter("status", value)}>
          <SelectTrigger className="h-9 rounded-xl w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["Draft", "Sent", "Opened", "Accepted", "Expired", "Cancelled"].map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={searchParams.purpose} onValueChange={(value) => setFilter("purpose", value)}>
          <SelectTrigger className="h-9 rounded-xl w-[170px]">
            <SelectValue placeholder="Purpose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All purposes</SelectItem>
            {PURPOSE_ROLL.map((purpose) => (
              <SelectItem key={purpose} value={purpose}>
                {purpose}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={searchParams.type} onValueChange={(value) => setFilter("type", value)}>
          <SelectTrigger className="h-9 rounded-xl w-[180px]">
            <SelectValue placeholder="Verification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verifications</SelectItem>
            {[
              ["identity", "Identity"],
              ["employment", "Employment"],
              ["education", "Education"],
              ["certification", "Certification"],
              ["professional_reference", "Professional Reference"],
            ].map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          {filteredRows.length} of {allInvitations.length}
        </div>
      </div>

      <SectionCard title="Invitations" description="Newest first">
        {invitationsQuery.isPending && !invitationsQuery.data ? (
          <TableSkeleton rows={6} />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={hasActiveFilters ? Search : MailPlus}
            title={hasActiveFilters ? "No invitations match" : "No invitations yet"}
            description={
              hasActiveFilters
                ? "Adjust your search or filters to see more invitations."
                : "Send your first Trust Invitation to start tracking candidate consent and activity."
            }
            action={
              canInvite
                ? { label: "Invite Candidate", onClick: () => setInviteOpen(true) }
                : undefined
            }
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-foreground/[0.02] border-b border-border/60">
                  <tr>
                    <th className="text-left font-medium px-5 py-2.5">Candidate</th>
                    <th className="text-left font-medium px-3 py-2.5">Purpose</th>
                    <th className="text-left font-medium px-3 py-2.5">Requested</th>
                    <th className="text-left font-medium px-3 py-2.5">Status</th>
                    <th className="text-left font-medium px-3 py-2.5">Delivery</th>
                    <th className="text-left font-medium px-3 py-2.5">Expires</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {pageRows.map((invitation) => {
                    const expiring =
                      new Date(invitation.expiresAt).getTime() - Date.now() < 2 * 86400e3 &&
                      (invitation.status === "Sent" || invitation.status === "Opened");
                    const requestedLabels = formatVerificationList(
                      invitation.requestedVerifications,
                    );

                    return (
                      <tr
                        key={invitation.id}
                        className="hover:bg-foreground/[0.02] group cursor-pointer"
                        onClick={() =>
                          nav({ to: "/app/invitations/$id", params: { id: invitation.id } })
                        }
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-medium">
                              {invitation.candidateInitials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{invitation.candidateName}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {invitation.candidateEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-sm truncate max-w-[180px]">
                            {invitation.purpose ?? "—"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Created {format(new Date(invitation.createdAt), "MMM d, yyyy")}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {requestedLabels.slice(0, 3).map((label) => (
                              <Badge
                                key={label}
                                variant="outline"
                                className="rounded-full text-[10px] px-2 py-0 font-normal"
                              >
                                {label}
                              </Badge>
                            ))}
                            {requestedLabels.length > 3 ? (
                              <Badge
                                variant="outline"
                                className="rounded-full text-[10px] px-2 py-0 font-normal"
                              >
                                +{requestedLabels.length - 3}
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <InvitationPill value={invitation.status} />
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          <div>{invitation.deliveryLabel}</div>
                          {invitation.sentAt ? (
                            <div>
                              Sent{" "}
                              {formatDistanceToNow(new Date(invitation.sentAt), {
                                addSuffix: true,
                              })}
                            </div>
                          ) : (
                            <div>Not sent yet</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-[12px]">
                          {invitation.status === "Expired" ? (
                            <span className="text-destructive">Expired</span>
                          ) : expiring ? (
                            <span className="text-warning-foreground inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {formatDistanceToNow(new Date(invitation.expiresAt), {
                                addSuffix: true,
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(invitation.expiresAt), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </td>
                        <td
                          className="px-3 py-3 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem asChild>
                                <Link to="/app/invitations/$id" params={{ id: invitation.id }}>
                                  <ChevronRight className="h-3.5 w-3.5 mr-2" /> View invitation
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void copyLink(invitation.id)}>
                                <Copy className="h-3.5 w-3.5 mr-2" /> Copy invitation link
                              </DropdownMenuItem>
                              {invitation.status === "Draft" ? (
                                <>
                                  <DropdownMenuItem
                                    disabled={sendMutation.isPending}
                                    onClick={() =>
                                      void handleMutation(
                                        () => sendMutation.mutateAsync(invitation.id),
                                        "Invitation sent",
                                        "We couldn't send this invitation.",
                                      )
                                    }
                                  >
                                    <Send className="h-3.5 w-3.5 mr-2" /> Send invitation
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    disabled={deleteMutation.isPending}
                                    onClick={() =>
                                      void handleMutation(
                                        () => deleteMutation.mutateAsync(invitation.id),
                                        "Draft deleted",
                                        "We couldn't delete this draft.",
                                      )
                                    }
                                  >
                                    Delete draft
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                              {invitation.status === "Sent" || invitation.status === "Opened" ? (
                                <>
                                  <DropdownMenuItem
                                    disabled={resendMutation.isPending}
                                    onClick={() =>
                                      void handleMutation(
                                        () => resendMutation.mutateAsync(invitation.id),
                                        "Reminder sent",
                                        "We couldn't resend this invitation.",
                                      )
                                    }
                                  >
                                    <RefreshCw className="h-3.5 w-3.5 mr-2" /> Send reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    disabled={cancelMutation.isPending}
                                    onClick={() =>
                                      void handleMutation(
                                        () => cancelMutation.mutateAsync(invitation.id),
                                        "Invitation cancelled",
                                        "We couldn't cancel this invitation.",
                                      )
                                    }
                                  >
                                    <Ban className="h-3.5 w-3.5 mr-2" /> Cancel invitation
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-border/60">
              {pageRows.map((invitation) => (
                <Link
                  key={invitation.id}
                  to="/app/invitations/$id"
                  params={{ id: invitation.id }}
                  className="block px-5 py-4 hover:bg-foreground/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-medium">
                      {invitation.candidateInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{invitation.candidateName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {invitation.purpose ?? "—"}
                      </div>
                    </div>
                    <InvitationPill value={invitation.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formatVerificationList(invitation.requestedVerifications).map((label) => (
                      <Badge
                        key={label}
                        variant="outline"
                        className="rounded-full text-[10px] px-2 py-0 font-normal"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {invitation.sentAt
                      ? `Sent ${formatDistanceToNow(new Date(invitation.sentAt), { addSuffix: true })}`
                      : "Not sent yet"}{" "}
                    · {invitation.deliveryLabel}
                  </div>
                </Link>
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="px-5 py-4 border-t border-border/60 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={currentPage <= 1}
                  onClick={() => setFilter("page", currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <div className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilter("page", currentPage + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </div>
  );
}
