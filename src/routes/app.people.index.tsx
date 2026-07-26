import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo } from "react";
import { EmptyState, PageHeader, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/lib/dashboard-context";
import { useAccess } from "@/lib/access-context";
import { PermissionDenied } from "@/components/app/access/PermissionDenied";
import {
  InvitationPill,
  PassportPill,
  RelationshipPill,
  VerificationPill,
} from "@/components/app/workspace-pills";
import type {
  InvitationStatus,
  Relationship,
  SharedPassportStatus,
  WorkspaceVerificationStatus,
} from "@/lib/workspace-types";
import {
  canOpenSharedPassport,
  getCreatedAfterFilter,
  getOrganizationPeopleErrorMessage,
  mapInvitationFilterToBackend,
  mapPassportFilterToBackend,
  mapRelationshipFilterToBackend,
  mapVerificationFilterToBackend,
} from "@/lib/organization-people";
import { useOrganizationPeopleDirectoryQuery } from "@/lib/queries/organization-people";
import {
  AlertTriangle,
  Bell,
  FileSearch,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  UserSearch,
  Users,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const RELATIONSHIPS: readonly (Relationship | "all")[] = [
  "all",
  "Candidate",
  "Future Employee",
  "Employee",
  "Former Employee",
  "Contractor",
];
const INV_OPTIONS: readonly (InvitationStatus | "all")[] = [
  "all",
  "Not Invited",
  "Draft",
  "Sent",
  "Opened",
  "Accepted",
  "Expired",
  "Cancelled",
];
const WVS_OPTIONS: readonly (WorkspaceVerificationStatus | "all")[] = [
  "all",
  "Not Started",
  "Waiting for Candidate",
  "In Verification",
  "Clarification Required",
  "Completed",
  "Unable to Verify",
  "Cancelled",
];
const SP_OPTIONS: readonly (SharedPassportStatus | "all")[] = [
  "all",
  "Not Shared",
  "Active",
  "Expiring Soon",
  "Expired",
  "Access Revoked",
];

const DATE_OPTIONS = ["all", "7d", "30d", "90d"] as const;

const peopleSearch = z.object({
  relationship: fallback(z.string(), "all").default("all"),
  invitation: fallback(z.string(), "all").default("all"),
  verification: fallback(z.string(), "all").default("all"),
  passport: fallback(z.string(), "all").default("all"),
  addedBy: fallback(z.string(), "all").default("all"),
  from: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/app/people/")({
  validateSearch: zodValidator(peopleSearch),
  component: PeoplePage,
});

function PeoplePage() {
  const { setInviteOpen, search: globalSearch, setSearch } = useDashboard();
  const { can, org } = useAccess();
  const canInvite = can("invite_candidate");
  const canModify = can("modify_person");
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const allPeopleQuery = useOrganizationPeopleDirectoryQuery(org?.publicId, {
    sort_by: "last_activity_at",
    sort_order: "desc",
  });

  const directoryQuery = useOrganizationPeopleDirectoryQuery(org?.publicId, {
    search: globalSearch.trim() || undefined,
    relationship: mapRelationshipFilterToBackend(s.relationship),
    invitation_status: mapInvitationFilterToBackend(s.invitation),
    verification_status: mapVerificationFilterToBackend(s.verification),
    passport_status: mapPassportFilterToBackend(s.passport),
    added_by: s.addedBy !== "all" ? s.addedBy : undefined,
    created_after: getCreatedAfterFilter(s.from),
    sort_by: "last_activity_at",
    sort_order: "desc",
  });

  function update(patch: Partial<typeof s>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  const rows = directoryQuery.data?.items ?? [];
  const addedByOptions = useMemo(
    () =>
      Array.from(
        new Set((allPeopleQuery.data?.items ?? []).map((person) => person.addedBy)),
      ).sort(),
    [allPeopleQuery.data?.items],
  );
  const activeFilterCount =
    (s.relationship !== "all" ? 1 : 0) +
    (s.invitation !== "all" ? 1 : 0) +
    (s.verification !== "all" ? 1 : 0) +
    (s.passport !== "all" ? 1 : 0) +
    (s.addedBy !== "all" ? 1 : 0) +
    (s.from !== "all" ? 1 : 0);

  const clearAll = () => {
    setSearch("");
    navigate({
      search: () => ({
        relationship: "all",
        invitation: "all",
        verification: "all",
        passport: "all",
        addedBy: "all",
        from: "all",
      }),
    });
  };

  const totalPeople = allPeopleQuery.data?.summary.totalPeople ?? 0;
  const isFirstUse = !allPeopleQuery.isPending && !allPeopleQuery.error && totalPeople === 0;
  const noSearchResults = !isFirstUse && globalSearch.trim() !== "" && rows.length === 0;
  const noFilterResults =
    !isFirstUse && !noSearchResults && activeFilterCount > 0 && rows.length === 0;

  if (!org) {
    return (
      <EmptyState
        icon={Users}
        title="No active organization"
        description="People become available after your workspace organization is ready."
      />
    );
  }

  if (!canModify) {
    return (
      <EmptyState
        icon={Users}
        title="Permission denied"
        description="You don't have permission to view People in this workspace."
      />
    );
  }

  const loadError = directoryQuery.error ?? allPeopleQuery.error;
  if (loadError) {
    const status = "status" in loadError ? loadError.status : undefined;
    return (
      <EmptyState
        icon={AlertTriangle}
        title={status === 403 ? "Permission denied" : "People didn't load"}
        description={getOrganizationPeopleErrorMessage(loadError, "Please try again.")}
        action={{
          label: "Retry",
          onClick: () => {
            void directoryQuery.refetch();
            void allPeopleQuery.refetch();
          },
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Kairo Trust Workspace"
        title="People"
        description="View candidates and professionals who have shared information with your organization."
        actions={
          canInvite ? (
            <Button
              onClick={() => setInviteOpen(true)}
              className="btn-premium rounded-xl"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Invite Candidate
            </Button>
          ) : null
        }
      />
      {!canInvite ? (
        <PermissionDenied
          className="mb-4"
          message="Your role can view People, but only permitted users can create Trust Invitations."
        />
      ) : null}

      <div className="grid gap-3 mb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalSearch}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or reference"
            className="pl-9 h-10 rounded-xl"
            aria-label="Search people"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Relationship"
            value={s.relationship}
            options={RELATIONSHIPS}
            onChange={(value) => update({ relationship: value })}
          />
          <FilterSelect
            label="Invitation"
            value={s.invitation}
            options={INV_OPTIONS}
            onChange={(value) => update({ invitation: value })}
          />
          <FilterSelect
            label="Verification"
            value={s.verification}
            options={WVS_OPTIONS}
            onChange={(value) => update({ verification: value })}
          />
          <FilterSelect
            label="Passport"
            value={s.passport}
            options={SP_OPTIONS}
            onChange={(value) => update({ passport: value })}
          />
          <Select value={s.addedBy} onValueChange={(value) => update({ addedBy: value })}>
            <SelectTrigger className="w-[180px] h-9 rounded-xl text-sm">
              <SelectValue placeholder="Added by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Added by · all</SelectItem>
              {addedByOptions.map((addedBy) => (
                <SelectItem key={addedBy} value={addedBy}>
                  {addedBy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={s.from} onValueChange={(value) => update({ from: value })}>
            <SelectTrigger className="w-[160px] h-9 rounded-xl text-sm">
              <SelectValue placeholder="Date added" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Date added · any</SelectItem>
              {DATE_OPTIONS.filter((value) => value !== "all").map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "7d"
                    ? "Last 7 days"
                    : value === "30d"
                      ? "Last 30 days"
                      : "Last 90 days"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilterCount > 0 || globalSearch.trim() !== "" ? (
            <Button variant="ghost" size="sm" className="rounded-xl h-9" onClick={clearAll}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear all filters
            </Button>
          ) : null}
          <div className="ml-auto text-xs text-muted-foreground">
            {rows.length} of {totalPeople}
          </div>
        </div>
      </div>

      <SectionCard title="Directory" description={`${rows.length} people matching current filters`}>
        {directoryQuery.isPending && !directoryQuery.data ? (
          <TableSkeleton rows={6} />
        ) : isFirstUse ? (
          <EmptyState
            icon={UserSearch}
            title="No people yet"
            description="Invite your first candidate to start building professional trust with your organization."
            action={
              canInvite
                ? { label: "Invite Candidate", onClick: () => setInviteOpen(true) }
                : undefined
            }
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
                  {rows.map((person) => (
                    <tr key={person.publicId} className="hover:bg-foreground/[0.02] group">
                      <td className="py-3 px-4">
                        <Link
                          to="/app/people/$id"
                          params={{ id: person.publicId }}
                          className="flex items-center gap-3 min-w-0"
                        >
                          <div className="h-9 w-9 shrink-0 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-medium">
                            {person.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{person.fullName}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {person.email || "No email shared"}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <RelationshipPill value={person.relationship} />
                      </td>
                      <td className="py-3 px-3">
                        <InvitationPill value={person.invitationStatus} />
                      </td>
                      <td className="py-3 px-3">
                        <VerificationPill value={person.verificationStatus} />
                      </td>
                      <td className="py-3 px-3">
                        <PassportPill value={person.passportStatus} />
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {person.lastActivityAt
                          ? formatDistanceToNow(new Date(person.lastActivityAt), {
                              addSuffix: true,
                            })
                          : "No activity yet"}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{person.addedBy}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(person.addedAt), { addSuffix: true })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <RowActions personId={person.publicId} passport={person.passportStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-border/60">
              {rows.map((person) => (
                <div key={person.publicId} className="p-4">
                  <Link
                    to="/app/people/$id"
                    params={{ id: person.publicId }}
                    className="flex items-center gap-3"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-full bg-foreground/[0.06] flex items-center justify-center text-xs font-medium">
                      {person.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{person.fullName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {person.email || "No email shared"}
                      </div>
                    </div>
                    <RowActions personId={person.publicId} passport={person.passportStatus} />
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <RelationshipPill value={person.relationship} />
                    <InvitationPill value={person.invitationStatus} />
                    <VerificationPill value={person.verificationStatus} />
                    <PassportPill value={person.passportStatus} />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Last activity{" "}
                    {person.lastActivityAt
                      ? formatDistanceToNow(new Date(person.lastActivityAt), {
                          addSuffix: true,
                        })
                      : "not available"}{" "}
                    · Added by {person.addedBy}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      to="/app/people/$id"
                      params={{ id: person.publicId }}
                      className="flex-1 text-center text-xs font-medium rounded-lg border border-border/60 px-3 py-2 hover:bg-foreground/[0.04]"
                    >
                      View person
                    </Link>
                    {canOpenSharedPassport(person.passportStatus) ? (
                      <Link
                        to="/app/people/$id"
                        params={{ id: person.publicId }}
                        className="flex-1 text-center text-xs font-medium rounded-lg border border-border/60 px-3 py-2 hover:bg-foreground/[0.04]"
                      >
                        Open Passport
                      </Link>
                    ) : null}
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

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <Select value={value} onValueChange={(value) => onChange(value as T)}>
      <SelectTrigger className="w-auto min-w-[160px] h-9 rounded-xl text-sm">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option === "all" ? `${label} · all` : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RowActions({ personId, passport }: { personId: string; passport: SharedPassportStatus }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuItem asChild>
          <Link to="/app/people/$id" params={{ id: personId }}>
            <Users className="h-4 w-4 mr-2" /> View person
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild disabled={!canOpenSharedPassport(passport)}>
          <Link to="/app/people/$id" params={{ id: personId }}>
            <ShieldCheck className="h-4 w-4 mr-2" /> Open Shared Trust Passport
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Bell className="h-4 w-4 mr-2" /> Send reminder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
