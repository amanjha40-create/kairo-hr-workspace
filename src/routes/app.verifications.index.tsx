import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  StatCard,
  TableSkeleton,
} from "@/components/app/primitives";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboard } from "@/lib/dashboard-context";
import { useAccess } from "@/lib/access-context";
import {
  ageInDays,
  type EmploymentVerificationRecord,
  getVerificationErrorMessage,
  getVerificationNextAction,
  getVerificationStatusTone,
  matchesVerificationSearch,
  matchesVerificationStatusFilter,
  matchesVerificationTargetFilter,
  type VerificationInboxStatus,
} from "@/lib/employment-verifications";
import { useVerificationRequestListQuery } from "@/lib/queries/verification-requests";
import {
  Search,
  Inbox,
  Clock,
  MessageCircleWarning,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Building2,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const EMPTY_ROWS: EmploymentVerificationRecord[] = [];

const schema = z.object({
  status: fallback(z.string(), "all").default("all"),
  org: fallback(z.string(), "all").default("all"),
  window: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/app/verifications/")({
  validateSearch: zodValidator(schema),
  component: EmploymentVerificationsPage,
});

const STATUSES: VerificationInboxStatus[] = [
  "New",
  "In Review",
  "Clarification Requested",
  "Confirmed",
  "Rejected",
  "Cancelled",
  "Expired",
];

function EmploymentVerificationsPage() {
  const { search, setSearch } = useDashboard();
  const { org, can } = useAccess();
  const canModify = can("modify_verification");
  const nav = useNavigate({ from: Route.fullPath });
  const params = Route.useSearch();

  const verificationsQuery = useVerificationRequestListQuery(org?.publicId, {
    search: search.trim() || undefined,
    sort_by: "updated_at",
    sort_order: "desc",
  });

  const allRows = verificationsQuery.data ?? EMPTY_ROWS;
  const organizationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allRows
            .map((record) => record.targetName ?? record.organizationName)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [allRows],
  );

  const filtered = useMemo(() => {
    return allRows
      .filter((record) => matchesVerificationSearch(record, search))
      .filter((record) => matchesVerificationStatusFilter(record, params.status))
      .filter((record) =>
        matchesVerificationTargetFilter(record, params.org === "all" ? "all" : params.org),
      )
      .filter((record) => {
        if (params.window === "all") return true;
        const days = ageInDays(record.receivedAt);
        if (params.window === "7") return days <= 7;
        if (params.window === "30") return days <= 30;
        return true;
      });
  }, [allRows, params.org, params.status, params.window, search]);

  const counts = useMemo(
    () => ({
      newCount: allRows.filter((record) => record.status === "New").length,
      inReview: allRows.filter((record) => record.status === "In Review").length,
      clarification: allRows.filter((record) => record.status === "Clarification Requested").length,
      confirmed: allRows.filter((record) => record.status === "Confirmed").length,
      closed: allRows.filter((record) =>
        ["Rejected", "Cancelled", "Expired"].includes(record.status),
      ).length,
    }),
    [allRows],
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    params.status !== "all" ||
    params.org !== "all" ||
    params.window !== "all";

  const setFilter = (key: "status" | "org" | "window", value: string) =>
    nav({ search: (previous) => ({ ...previous, [key]: value }) });

  if (!org) {
    return (
      <EmptyState
        icon={Inbox}
        title="No active organization"
        description="Employment Verifications become available after your workspace organization is ready."
      />
    );
  }

  if (!canModify) {
    return (
      <EmptyState
        icon={Ban}
        title="Permission denied"
        description="You don't have permission to view Employment Verifications in this workspace."
      />
    );
  }

  if (verificationsQuery.error) {
    const status =
      "status" in verificationsQuery.error ? verificationsQuery.error.status : undefined;
    return (
      <EmptyState
        icon={AlertTriangle}
        title={status === 403 ? "Permission denied" : "Employment Verifications didn't load"}
        description={getVerificationErrorMessage(verificationsQuery.error, "Please try again.")}
        action={{
          label: "Retry",
          onClick: () => {
            void verificationsQuery.refetch();
          },
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Employment Verifications"
        description="Employment Verification Inbox — backend-owned requests for your workspace. Confirm employment facts only; hiring decisions stay with the requesting party."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <StatCard
          label="New"
          value={counts.newCount}
          icon={Inbox}
          onClick={() => setFilter("status", "New")}
        />
        <StatCard
          label="In Review"
          value={counts.inReview}
          icon={Clock}
          onClick={() => setFilter("status", "In Review")}
        />
        <StatCard
          label="Clarification"
          value={counts.clarification}
          icon={MessageCircleWarning}
          tone="warning"
          onClick={() => setFilter("status", "Clarification Requested")}
        />
        <StatCard
          label="Confirmed"
          value={counts.confirmed}
          icon={CheckCircle2}
          tone="success"
          onClick={() => setFilter("status", "Confirmed")}
        />
        <StatCard
          label="Rejected / Closed"
          value={counts.closed}
          icon={XCircle}
          tone="destructive"
          onClick={() => setFilter("status", "Rejected")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search candidate, organization, reviewer, ID…"
            className="pl-9 h-9 rounded-xl"
          />
        </div>
        <Select value={params.status} onValueChange={(value) => setFilter("status", value)}>
          <SelectTrigger className="h-9 rounded-xl w-[210px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.org} onValueChange={(value) => setFilter("org", value)}>
          <SelectTrigger className="h-9 rounded-xl w-[220px]">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {organizationOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.window} onValueChange={(value) => setFilter("window", value)}>
          <SelectTrigger className="h-9 rounded-xl w-[160px]">
            <SelectValue placeholder="Received" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {allRows.length}
        </div>
      </div>

      <SectionCard title="Verification inbox" description="Newest activity first">
        {verificationsQuery.isPending && !verificationsQuery.data ? (
          <TableSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={
              hasActiveFilters
                ? "No employment verifications match"
                : "No employment verifications yet"
            }
            description={
              hasActiveFilters
                ? "Try clearing a filter or broadening your search."
                : "Backend-owned Employment Verification requests will appear here when your workspace receives them."
            }
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-foreground/[0.02] border-b border-border/60">
                  <tr>
                    <th className="text-left font-medium px-5 py-2.5">Candidate</th>
                    <th className="text-left font-medium px-3 py-2.5">Organization</th>
                    <th className="text-left font-medium px-3 py-2.5">Type</th>
                    <th className="text-left font-medium px-3 py-2.5">Status</th>
                    <th className="text-left font-medium px-3 py-2.5">Received</th>
                    <th className="text-left font-medium px-3 py-2.5">Last Updated</th>
                    <th className="text-left font-medium px-3 py-2.5">Reviewer</th>
                    <th className="text-left font-medium px-3 py-2.5">Next Action</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((record) => {
                    const next = getVerificationNextAction(record);
                    const organizationLabel =
                      record.targetName ?? record.organizationName ?? "Unknown";
                    const organizationMeta = record.targetEmail ?? record.organizationType ?? "—";

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-foreground/[0.02] group cursor-pointer"
                        onClick={() =>
                          nav({ to: "/app/verifications/$id", params: { id: record.id } })
                        }
                      >
                        <td className="px-5 py-3">
                          <div className="text-sm font-medium">{record.candidateName}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {record.id}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-foreground/[0.06] flex items-center justify-center text-[10px] font-medium shrink-0">
                              {organizationLabel.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm truncate">{organizationLabel}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {organizationMeta}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="rounded-full font-normal">
                            {record.requestType}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill status={record.status} />
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          <div>{format(new Date(record.receivedAt), "MMM d")}</div>
                          <div className="text-[10px]">
                            {formatDistanceToNow(new Date(record.receivedAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          {formatDistanceToNow(new Date(record.updatedAt), { addSuffix: true })}
                        </td>
                        <td className="px-3 py-3 text-[12px]">
                          {record.assignedReviewer?.fullName ?? (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-[12px]">{next.text}</div>
                          <div className="text-[10px] text-muted-foreground">{next.owner}</div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity inline" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-border/60">
              {filtered.map((record) => {
                const next = getVerificationNextAction(record);
                const organizationLabel = record.targetName ?? record.organizationName ?? "Unknown";

                return (
                  <Link
                    key={record.id}
                    to="/app/verifications/$id"
                    params={{ id: record.id }}
                    className="block px-5 py-4 hover:bg-foreground/[0.02]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{record.candidateName}</div>
                        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {organizationLabel}
                        </div>
                      </div>
                      <StatusPill status={record.status} />
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>Next: {next.text}</span>
                      <span>
                        {formatDistanceToNow(new Date(record.receivedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function StatusPill({ status }: { status: VerificationInboxStatus }) {
  const tone = getVerificationStatusTone(status);
  const className =
    tone === "success"
      ? "bg-success/15 text-success border-success/25"
      : tone === "destructive"
        ? "bg-destructive/10 text-destructive border-destructive/25"
        : tone === "warning"
          ? "bg-warning/15 text-warning-foreground border-warning/25"
          : tone === "info"
            ? "bg-info/15 text-info-foreground border-info/25"
            : "bg-primary/10 text-primary border-primary/25";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
