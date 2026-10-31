import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, History, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  FormerEmployeeCorrectionListItem,
  FormerEmployeeCorrectionStatus,
  HRUserSummary,
} from "@/lib/api/hr-v2";
import { getOrganizationPeopleErrorMessage } from "@/lib/organization-people";
import {
  useApproveFormerEmployeeCorrectionMutation,
  useFormerEmployeeCorrectionsQuery,
  useOrganizationJobRolesQuery,
  useRejectFormerEmployeeCorrectionMutation,
} from "@/lib/queries/hr-v2";

const STATUSES: FormerEmployeeCorrectionStatus[] = ["pending", "approved", "rejected"];
const FIELD_LABELS: Record<string, string> = {
  role_id: "Role",
  department: "Department",
  joining_date: "Joining date",
  last_working_day: "Last working day",
};

export function FormerEmployeeCorrectionsCard({ orgPublicId }: { orgPublicId: string }) {
  const [status, setStatus] = useState<FormerEmployeeCorrectionStatus>("pending");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FormerEmployeeCorrectionListItem | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const params = { status, page, page_size: 10 } as const;
  const correctionsQuery = useFormerEmployeeCorrectionsQuery(orgPublicId, params);
  const rolesQuery = useOrganizationJobRolesQuery(orgPublicId);
  const approveMutation = useApproveFormerEmployeeCorrectionMutation(orgPublicId);
  const rejectMutation = useRejectFormerEmployeeCorrectionMutation(orgPublicId);
  const roleNames = useMemo(
    () => new Map((rolesQuery.data ?? []).map((role) => [role.public_id, role.name])),
    [rolesQuery.data],
  );
  const pending = approveMutation.isPending || rejectMutation.isPending;
  const items = correctionsQuery.data?.items ?? [];

  function selectStatus(nextStatus: FormerEmployeeCorrectionStatus) {
    setStatus(nextStatus);
    setPage(1);
    setSelected(null);
  }

  function openDetail(item: FormerEmployeeCorrectionListItem) {
    setSelected(item);
    setDecisionReason("");
  }

  async function decide(action: "approve" | "reject") {
    if (!selected) return;
    const approved = action === "approve";
    const confirmed = window.confirm(
      approved
        ? "Approve this audited correction? The backend will update the historical employment record and preserve the audit trail."
        : "Reject this audited correction request? The historical employment record will remain unchanged.",
    );
    if (!confirmed) return;

    try {
      const variables = {
        correctionPublicId: selected.public_id,
        decisionReason: decisionReason.trim() || undefined,
      };
      if (approved) {
        await approveMutation.mutateAsync(variables);
        toast.success("Correction approved");
        selectStatus("approved");
      } else {
        await rejectMutation.mutateAsync(variables);
        toast.success("Correction rejected");
        selectStatus("rejected");
      }
    } catch (error) {
      toast.error(
        getOrganizationPeopleErrorMessage(error, `We couldn't ${action} that correction.`),
      );
    }
  }

  return (
    <>
      <SectionCard
        title="Correction requests"
        description="Review audited changes requested for former-employee records"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-4">
          {STATUSES.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? "default" : "outline"}
              className="rounded-xl capitalize"
              aria-pressed={status === value}
              onClick={() => selectStatus(value)}
            >
              {value}
            </Button>
          ))}
          {correctionsQuery.data ? (
            <span className="ml-auto text-xs text-muted-foreground">
              {correctionsQuery.data.total} {status} request
              {correctionsQuery.data.total === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {correctionsQuery.isPending && !correctionsQuery.data ? (
          <TableSkeleton rows={3} />
        ) : correctionsQuery.error ? (
          <EmptyState
            icon={History}
            title={
              isForbidden(correctionsQuery.error) ? "Permission denied" : "Corrections didn't load"
            }
            description={getOrganizationPeopleErrorMessage(
              correctionsQuery.error,
              "Please try again.",
            )}
            action={
              isForbidden(correctionsQuery.error)
                ? undefined
                : { label: "Retry", onClick: () => void correctionsQuery.refetch() }
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={History}
            title={`No ${status} correction requests`}
            description={emptyDescription(status)}
          />
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((item) => (
              <button
                key={item.public_id}
                type="button"
                className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-foreground/[0.02] sm:flex-row sm:items-center"
                onClick={() => openDetail(item)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.person.display_name}</span>
                    <Badge variant="outline" className="rounded-full capitalize">
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {changedFields(item).map(fieldLabel).join(", ")} · requested by{" "}
                    {safeUserLabel(item.requester)}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{item.reason}</p>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(item.submitted_at)}
                </div>
              </button>
            ))}
          </div>
        )}

        {correctionsQuery.data && correctionsQuery.data.total_pages > 1 ? (
          <div className="flex items-center justify-between border-t border-border/60 p-4">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={page <= 1 || correctionsQuery.isFetching}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {correctionsQuery.data.page} of {correctionsQuery.data.total_pages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={page >= correctionsQuery.data.total_pages || correctionsQuery.isFetching}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </SectionCard>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="rounded-2xl sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.person.display_name}</DialogTitle>
                <DialogDescription>
                  Audited former-employee correction submitted{" "}
                  {formatDateTime(selected.submitted_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid gap-3">
                  {changedFields(selected).map((field) => (
                    <div key={field} className="rounded-xl border border-border/60 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {fieldLabel(field)}
                      </div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <ValueBlock
                          label="Current value"
                          value={displayValue(field, selected.current_values[field], roleNames)}
                        />
                        <ValueBlock
                          label="Proposed value"
                          value={displayValue(field, selected.proposed_values[field], roleNames)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-foreground/[0.03] p-3 text-sm">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Reason
                  </div>
                  <p className="mt-1">{selected.reason}</p>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <ValueBlock label="Requested by" value={safeUserLabel(selected.requester)} />
                  <ValueBlock label="Status" value={capitalize(selected.status)} />
                  {selected.reviewer ? (
                    <ValueBlock label="Reviewed by" value={safeUserLabel(selected.reviewer)} />
                  ) : null}
                  {selected.decided_at ? (
                    <ValueBlock label="Decision time" value={formatDateTime(selected.decided_at)} />
                  ) : null}
                </div>

                {selected.decision_reason ? (
                  <ValueBlock label="Decision note" value={selected.decision_reason} />
                ) : null}

                {selected.status === "pending" ? (
                  <div>
                    <Label htmlFor="correction-decision-reason">Decision note (optional)</Label>
                    <Textarea
                      id="correction-decision-reason"
                      value={decisionReason}
                      onChange={(event) => setDecisionReason(event.target.value)}
                      className="mt-1.5"
                      maxLength={2000}
                      placeholder="Add context for the requester"
                    />
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={() => setSelected(null)}>
                  Close
                </Button>
                {selected.status === "pending" ? (
                  <>
                    <Button
                      variant="outline"
                      className="rounded-xl text-destructive"
                      disabled={pending}
                      onClick={() => void decide("reject")}
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <X className="mr-2 h-4 w-4" />
                      )}
                      Reject
                    </Button>
                    <Button
                      className="btn-premium rounded-xl"
                      disabled={pending}
                      onClick={() => void decide("approve")}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ValueBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words font-medium">{value}</div>
    </div>
  );
}

function changedFields(item: FormerEmployeeCorrectionListItem) {
  return Object.keys(item.proposed_values).filter((field) => field in FIELD_LABELS);
}

function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? "Employment field";
}

function displayValue(field: string, value: unknown, roleNames: Map<string, string>) {
  if (field === "role_id") {
    if (!value) return "Unassigned";
    return roleNames.get(String(value)) ?? "Assigned role";
  }
  if (value === null || value === undefined || value === "") return "Not provided";
  if (field === "joining_date" || field === "last_working_day") {
    try {
      return format(parseISO(String(value)), "MMM d, yyyy");
    } catch {
      return "Date unavailable";
    }
  }
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "Value unavailable";
}

function safeUserLabel(user: HRUserSummary) {
  return user.display_name?.trim() || user.email;
}

function formatDateTime(value: string) {
  try {
    return format(parseISO(value), "MMM d, yyyy · h:mm a");
  } catch {
    return "Time unavailable";
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function emptyDescription(status: FormerEmployeeCorrectionStatus) {
  if (status === "pending") return "No pending correction requests require review.";
  if (status === "approved") return "No approved correction requests are available.";
  return "No rejected correction requests are available.";
}

function isForbidden(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error && error.status === 403);
}
