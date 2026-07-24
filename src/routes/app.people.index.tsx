import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo } from "react";
import { PageHeader, SectionCard, EmptyState } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboard, useFilteredPeople } from "@/lib/dashboard-context";
import {
  RelationshipPill, InvitationPill, VerificationPill, PassportPill,
} from "@/components/app/workspace-pills";
import type {
  Relationship, InvitationStatus, WorkspaceVerificationStatus, SharedPassportStatus,
} from "@/lib/workspace-data";
import {
  Users, Plus, Search, Bell, MoreHorizontal, ShieldCheck, FileSearch, X, UserSearch,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const RELATIONSHIPS: readonly (Relationship | "all")[] = ["all", "Candidate", "Employee", "Former Employee", "Contractor"];
const INV_OPTIONS: readonly (InvitationStatus | "all")[] = ["all", "Not Invited", "Sent", "Opened", "Accepted", "Expired", "Cancelled"];
const WVS_OPTIONS: readonly (WorkspaceVerificationStatus | "all")[] = ["all", "Not Started", "Waiting for Candidate", "In Verification", "Clarification Required", "Completed", "Unable to Verify", "Cancelled"];
const SP_OPTIONS: readonly (SharedPassportStatus | "all")[] = ["all", "Not Shared", "Active", "Expiring Soon", "Expired", "Access Revoked"];
const DATE_OPTIONS = ["all", "7d", "30d", "90d"] as const;

const peopleSearch = z.object({
  relationship: fallback(z.string(), "all").default("all"),
  invitation: fallback(z.string(), "all").default("all"),
  verification: fallback(z.string(), "all").default("all"),
  passport: fallback(z.string(), "all").default("all"),
  addedBy: fallback(z.string(), "all").default("all"),
  from: fallback(z.string(), "all").default("all"),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/app/people/")({
  validateSearch: zodValidator(peopleSearch),
  component: PeoplePage,
});

function PeoplePage() {
  const people = useFilteredPeople();
  const { people: allPeople, setInviteOpen, search: globalSearch, setSearch } = useDashboard();
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  function update(patch: Partial<typeof s>) {
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) });
  }

  const rows = useMemo(() => {
    const now = Date.now();
    const cutoffDays = s.from === "7d" ? 7 : s.from === "30d" ? 30 : s.from === "90d" ? 90 : null;
    return people.filter((p) => {
      if (s.relationship !== "all" && p.relationship !== s.relationship) return false;
      if (s.invitation !== "all" && p.invitationStatus !== s.invitation) return false;
      if (s.verification !== "all" && p.workspaceVerificationStatus !== s.verification) return false;
      if (s.passport !== "all" && p.sharedPassport !== s.passport) return false;
      if (s.addedBy !== "all" && p.addedBy !== s.addedBy) return false;
      if (cutoffDays && new Date(p.addedAt).getTime() < now - cutoffDays * 86400e3) return false;
      return true;
    });
  }, [people, s]);

  const addedByOptions = Array.from(new Set(allPeople.map((p) => p.addedBy))).sort();
  const activeFilterCount =
    (s.relationship !== "all" ? 1 : 0) +
    (s.invitation !== "all" ? 1 : 0) +
    (s.verification !== "all" ? 1 : 0) +
    (s.passport !== "all" ? 1 : 0) +
    (s.addedBy !== "all" ? 1 : 0) +
    (s.from !== "all" ? 1 : 0);

  const clearAll = () =>
    navigate({ search: () => ({ relationship: "all", invitation: "all", verification: "all", passport: "all", addedBy: "all", from: "all", q: "" }) });

  const isFirstUse = allPeople.length === 0;
  const noSearchResults = !isFirstUse && globalSearch.trim() !== "" && rows.length === 0;
  const noFilterResults = !isFirstUse && !noSearchResults && activeFilterCount > 0 && rows.length === 0;

  return (
    <div>
      <PageHeader
        eyebrow="Kairo Trust Workspace"
        title="People"
        description="View candidates and professionals who have shared information with your organization."
        actions={
          <Button onClick={() => setInviteOpen(true)} className="btn-premium rounded-xl" size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Invite Candidate
          </Button>
        }
      />

      {/* Search + filters */}
      <div className="grid gap-3 mb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalSearch}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or reference"
            className="pl-9 h-10 rounded-xl"
            aria-label="Search people"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="Relationship" value={s.relationship} options={RELATIONSHIPS} onChange={(v) => update({ relationship: v })} />
          <FilterSelect label="Invitation" value={s.invitation} options={INV_OPTIONS} onChange={(v) => update({ invitation: v })} />
          <FilterSelect label="Verification" value={s.verification} options={WVS_OPTIONS} onChange={(v) => update({ verification: v })} />
          <FilterSelect label="Passport" value={s.passport} options={SP_OPTIONS} onChange={(v) => update({ passport: v })} />
          <Select value={s.addedBy} onValueChange={(v) => update({ addedBy: v })}>
            <SelectTrigger className="w-[180px] h-9 rounded-xl text-sm"><SelectValue placeholder="Added by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Added by · all</SelectItem>
              {addedByOptions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={s.from} onValueChange={(v) => update({ from: v })}>
            <SelectTrigger className="w-[160px] h-9 rounded-xl text-sm"><SelectValue placeholder="Date added" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Date added · any</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="rounded-xl h-9" onClick={clearAll}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear all filters ({activeFilterCount})
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {rows.length} of {allPeople.length}
          </div>
        </div>
      </div>

      <SectionCard title="Directory" description={`${rows.length} people matching current filters`}>
        {isFirstUse ? (
          <EmptyState
            icon={UserSearch}
            title="No people yet"
            description="Invite your first candidate to start building professional trust with your organization."
            action={{ label: "Invite Candidate", onClick: () => setInviteOpen(true) }}
          />
        ) : noSearchResults ? (
          <EmptyState
            icon={Search}
            title="No results for your search"
            description="Try a different name, email or reference."
          />
        ) : noFilterResults ? (
          <EmptyState
            icon={FileSearch}
            title="No people match your filters"
            description="Adjust or clear the filters above to see more people."
            action={{ label: "Clear all filters", onClick: clearAll }}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="text-left font-medium py-2.5 px-4">Person</th>
                    <th className="text-left font-medium py-2.5 px-3">Relationship</th>
                    <th className="text-left font-medium py-2.5 px-3">Invitation</th>
                    <th className="text-left font-medium py-2.5 px-3">Verification</th>
                    <th className="text-left font-medium py-2.5 px-3">Shared Passport</th>
                    <th className="text-left font-medium py-2.5 px-3">Last Activity</th>
                    <th className="text-left font-medium py-2.5 px-3">Added by</th>
                    <th className="text-left font-medium py-2.5 px-3">Date added</th>
                    <th className="text-right font-medium py-2.5 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((p) => (
                    <tr key={p.id} className="hover:bg-foreground/[0.02] group">
                      <td className="py-3 px-4">
                        <Link to="/app/people/$id" params={{ id: p.id }} className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 shrink-0 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-medium">{p.initials}</div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{p.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-3"><RelationshipPill value={p.relationship} /></td>
                      <td className="py-3 px-3"><InvitationPill value={p.invitationStatus} /></td>
                      <td className="py-3 px-3"><VerificationPill value={p.workspaceVerificationStatus} /></td>
                      <td className="py-3 px-3"><PassportPill value={p.sharedPassport} /></td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.lastActivity), { addSuffix: true })}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{p.addedBy}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.addedAt), { addSuffix: true })}</td>
                      <td className="py-3 px-4 text-right">
                        <RowActions personId={p.id} passport={p.sharedPassport} invitationStatus={p.invitationStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet cards */}
            <div className="lg:hidden divide-y divide-border/60">
              {rows.map((p) => (
                <div key={p.id} className="p-4">
                  <Link to="/app/people/$id" params={{ id: p.id }} className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-foreground/[0.06] flex items-center justify-center text-xs font-medium">{p.initials}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{p.email}</div>
                    </div>
                    <RowActions personId={p.id} passport={p.sharedPassport} invitationStatus={p.invitationStatus} />
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <RelationshipPill value={p.relationship} />
                    <InvitationPill value={p.invitationStatus} />
                    <VerificationPill value={p.workspaceVerificationStatus} />
                    <PassportPill value={p.sharedPassport} />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Last activity {formatDistanceToNow(new Date(p.lastActivity), { addSuffix: true })} · Added by {p.addedBy}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      to="/app/people/$id"
                      params={{ id: p.id }}
                      className="flex-1 text-center text-xs font-medium rounded-lg border border-border/60 px-3 py-2 hover:bg-foreground/[0.04]"
                    >
                      View person
                    </Link>
                    {(p.sharedPassport === "Active" || p.sharedPassport === "Expiring Soon") && (
                      <Link
                        to="/app/people/$id"
                        params={{ id: p.id }}
                        className="flex-1 text-center text-xs font-medium rounded-lg border border-border/60 px-3 py-2 hover:bg-foreground/[0.04]"
                      >
                        Open Passport
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function FilterSelect<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="w-auto min-w-[160px] h-9 rounded-xl text-sm">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o === "all" ? `${label} · all` : o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RowActions({ personId, passport }: { personId: string; passport: SharedPassportStatus; invitationStatus: InvitationStatus }) {
  const canOpenPassport = passport === "Active" || passport === "Expiring Soon";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="More actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuItem asChild>
          <Link to="/app/people/$id" params={{ id: personId }}>
            <Users className="h-4 w-4 mr-2" /> View person
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canOpenPassport}
          onClick={() => canOpenPassport && toast.success("Opening Shared Trust Passport")}
        >
          <ShieldCheck className="h-4 w-4 mr-2" /> Open Shared Trust Passport
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success("Reminder sent")}>
          <Bell className="h-4 w-4 mr-2" /> Send reminder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
