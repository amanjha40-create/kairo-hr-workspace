import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { PageHeader, SectionCard, EmptyState, StatCard } from "@/components/app/primitives";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDashboard, useFilteredInboundRequests } from "@/lib/dashboard-context";
import { nextActionFor, ageInDays } from "@/lib/inbound-verifications";
import type { InboundStatus, InboundVerificationRequest } from "@/lib/inbound-verifications";
import {
  Search, Inbox, Clock, MessageCircleWarning, CheckCircle2, XCircle, ChevronRight, Building2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const schema = z.object({
  status: fallback(z.string(), "all").default("all"),
  org: fallback(z.string(), "all").default("all"),
  window: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/app/verifications/")({
  validateSearch: zodValidator(schema),
  component: EmploymentVerificationsPage,
});

const STATUSES: InboundStatus[] = [
  "New",
  "In Review",
  "Clarification Requested",
  "Confirmed",
  "Discrepancy Reported",
  "Unable to Verify",
];

function EmploymentVerificationsPage() {
  const rows = useFilteredInboundRequests();
  const { inboundRequests, search, setSearch } = useDashboard();
  const nav = useNavigate({ from: Route.fullPath });
  const params = Route.useSearch();

  const orgs = useMemo(
    () => Array.from(new Set(inboundRequests.map((r) => r.requestingOrg.name))).sort(),
    [inboundRequests],
  );

  const filtered = rows.filter((r) => {
    if (params.status !== "all" && r.status !== params.status) return false;
    if (params.org !== "all" && r.requestingOrg.name !== params.org) return false;
    if (params.window !== "all") {
      const days = ageInDays(r.receivedAt);
      if (params.window === "7" && days > 7) return false;
      if (params.window === "30" && days > 30) return false;
    }
    return true;
  });

  const setFilter = (key: "status" | "org" | "window", value: string) =>
    nav({ search: (p: any) => ({ ...p, [key]: value }) });

  const counts = useMemo(() => ({
    newCount: inboundRequests.filter((r) => r.status === "New").length,
    inReview: inboundRequests.filter((r) => r.status === "In Review").length,
    clarification: inboundRequests.filter((r) => r.status === "Clarification Requested").length,
    confirmed: inboundRequests.filter((r) => r.status === "Confirmed").length,
    discrepancy: inboundRequests.filter((r) => r.status === "Discrepancy Reported" || r.status === "Unable to Verify").length,
  }), [inboundRequests]);

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Employment Verifications"
        description="Employment Verification Inbox — inbound requests received from other organizations. Confirm employment facts only; hiring decisions stay with the requesting organization."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <StatCard label="New" value={counts.newCount} icon={Inbox} onClick={() => setFilter("status", "New")} />
        <StatCard label="In Review" value={counts.inReview} icon={Clock} onClick={() => setFilter("status", "In Review")} />
        <StatCard label="Clarification" value={counts.clarification} icon={MessageCircleWarning} tone="warning" onClick={() => setFilter("status", "Clarification Requested")} />
        <StatCard label="Confirmed" value={counts.confirmed} icon={CheckCircle2} tone="success" onClick={() => setFilter("status", "Confirmed")} />
        <StatCard label="Discrepancy / Unable" value={counts.discrepancy} icon={XCircle} tone="destructive" onClick={() => setFilter("status", "Discrepancy Reported")} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidate, organization, ID…" className="pl-9 h-9 rounded-xl" />
        </div>
        <Select value={params.status} onValueChange={(v) => setFilter("status", v)}>
          <SelectTrigger className="h-9 rounded-xl w-[210px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={params.org} onValueChange={(v) => setFilter("org", v)}>
          <SelectTrigger className="h-9 rounded-xl w-[220px]"><SelectValue placeholder="Requesting organization" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {orgs.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={params.window} onValueChange={(v) => setFilter("window", v)}>
          <SelectTrigger className="h-9 rounded-xl w-[160px]"><SelectValue placeholder="Received" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} of {inboundRequests.length}</div>
      </div>

      <SectionCard title="Verification inbox" description="Newest first">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No employment verifications match"
            description="Inbound employment verifications from other organizations will appear here. Onboarded organizations reach you directly; others use magic-link verification."
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-foreground/[0.02] border-b border-border/60">
                  <tr>
                    <th className="text-left font-medium px-5 py-2.5">Candidate</th>
                    <th className="text-left font-medium px-3 py-2.5">Requesting Organization</th>
                    <th className="text-left font-medium px-3 py-2.5">Type</th>
                    <th className="text-left font-medium px-3 py-2.5">Status</th>
                    <th className="text-left font-medium px-3 py-2.5">Received</th>
                    <th className="text-left font-medium px-3 py-2.5">Last Updated</th>
                    <th className="text-left font-medium px-3 py-2.5">Reviewer</th>
                    <th className="text-left font-medium px-3 py-2.5">Next Action</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-foreground/[0.02] group cursor-pointer" onClick={() => nav({ to: "/app/verifications/$id", params: { id: r.id } })}>
                      <td className="px-5 py-3">
                        <div className="text-sm font-medium">{r.candidateName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{r.id}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-foreground/[0.06] flex items-center justify-center text-[10px] font-medium shrink-0">
                            {r.requestingOrg.logoInitials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm truncate">{r.requestingOrg.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{r.requestingOrg.contact}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="rounded-full font-normal">{r.verificationType}</Badge>
                      </td>
                      <td className="px-3 py-3"><StatusPill status={r.status} /></td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">
                        <div>{format(new Date(r.receivedAt), "MMM d")}</div>
                        <div className="text-[10px]">{formatDistanceToNow(new Date(r.receivedAt), { addSuffix: true })}</div>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">
                        {formatDistanceToNow(new Date(r.lastUpdatedAt), { addSuffix: true })}
                      </td>
                      <td className="px-3 py-3 text-[12px]">
                        {r.assignedReviewer ?? <span className="text-muted-foreground">Unassigned</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-[12px]">{nextActionFor(r).text}</div>
                        <div className="text-[10px] text-muted-foreground">{nextActionFor(r).owner}</div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border/60">
              {filtered.map((r) => (
                <Link key={r.id} to="/app/verifications/$id" params={{ id: r.id }} className="block px-5 py-4 hover:bg-foreground/[0.02]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.candidateName}</div>
                      <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {r.requestingOrg.name}
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Next: {nextActionFor(r).text}</span>
                    <span>{formatDistanceToNow(new Date(r.receivedAt), { addSuffix: true })}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function StatusPill({ status }: { status: InboundStatus }) {
  const tone =
    status === "Confirmed" ? "bg-success/15 text-success border-success/25"
    : status === "Discrepancy Reported" || status === "Unable to Verify" ? "bg-destructive/10 text-destructive border-destructive/25"
    : status === "Clarification Requested" ? "bg-warning/15 text-warning-foreground border-warning/25"
    : status === "In Review" ? "bg-info/15 text-info-foreground border-info/25"
    : status === "New" ? "bg-primary/10 text-primary border-primary/25"
    : "bg-foreground/[0.04] text-foreground border-border/60";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{status}</span>;
}
