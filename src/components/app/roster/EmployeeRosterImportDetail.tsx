import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { EmptyState, PageHeader, SectionCard, TableSkeleton } from "@/components/app/primitives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccess } from "@/lib/access-context";
import { trackEvent } from "@/lib/analytics";
import type {
  OrganizationRosterPreview,
  RosterImportCounts,
  RosterPreviewRow,
} from "@/lib/api/organization-roster-imports";
import {
  EMPLOYEE_ROSTER_FIELDS,
  getRosterErrorMessage,
  isRosterImportTerminal,
  rosterAttentionCount,
  rosterDispositionLabel,
  rosterStateLabel,
  triggerCsvDownload,
} from "@/lib/organization-roster";
import {
  useConfirmRosterImportMutation,
  useDownloadRosterErrorsMutation,
  useRosterImportDetailQuery,
  useRosterImportRowsQuery,
  useUpdateRosterMappingMutation,
} from "@/lib/queries/organization-roster-imports";
import { cn } from "@/lib/utils";

const IGNORE_VALUE = "__ignore";

function fieldLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clientMappingGaps(mapping: Record<string, string>) {
  const targets = new Set(Object.values(mapping));
  const gaps: string[] = [];
  if (!targets.has("employee_id") && !targets.has("work_email")) gaps.push("identity");
  if (!targets.has("full_name") && !targets.has("first_name") && !targets.has("last_name")) {
    gaps.push("name");
  }
  return gaps;
}

export function EmployeeRosterImportDetail({ importId }: { importId: string }) {
  const { org, membershipRole } = useAccess();
  const canManageRoster = membershipRole === "owner" || membershipRole === "admin";
  const detailQuery = useRosterImportDetailQuery(org?.publicId, importId);

  if (!org) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="No active organization"
        description="Employee imports become available after your organization is ready."
      />
    );
  }
  if (!canManageRoster) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Permission denied"
        description="Only organization owners and admins can review employee roster imports."
      />
    );
  }
  if (detailQuery.isPending) {
    return <RosterDetailLoading />;
  }
  if (detailQuery.error) {
    const status = "status" in detailQuery.error ? detailQuery.error.status : undefined;
    return (
      <EmptyState
        icon={AlertTriangle}
        title={status === 404 ? "Import not found" : "Employee import didn't load"}
        description={getRosterErrorMessage(detailQuery.error, "Please try again.")}
        action={{ label: "Retry", onClick: () => void detailQuery.refetch() }}
      />
    );
  }
  if (!detailQuery.data) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Import not found"
        description="This roster import is no longer available."
      />
    );
  }

  return <RosterDetailContent orgPublicId={org.publicId} record={detailQuery.data} />;
}

function RosterDetailLoading() {
  return (
    <div>
      <PageHeader
        eyebrow="Organization roster"
        title="Loading employee import"
        description="Fetching the latest backend preview and row status."
      />
      <SectionCard title="Import details">
        <TableSkeleton rows={6} />
      </SectionCard>
    </div>
  );
}

function RosterDetailContent({
  orgPublicId,
  record,
}: {
  orgPublicId: string;
  record: OrganizationRosterPreview;
}) {
  const terminal = isRosterImportTerminal(record.state);
  const [step, setStep] = useState<"mapping" | "preview">(
    terminal || record.state === "importing" ? "preview" : "mapping",
  );

  if (record.state === "uploaded" || record.state === "parsing" || record.state === "importing") {
    return <RosterProcessing record={record} />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/app/people/imports"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Import history
        </Link>
        <Badge variant="outline">{rosterStateLabel(record.state)}</Badge>
      </div>
      <PageHeader
        eyebrow="Employee roster"
        title={record.original_filename}
        description="Organization-provided employee data. This import does not verify identity, employment, or any Trust Passport claim."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/people/imports">
              <FileSpreadsheet className="h-4 w-4" /> New import
            </Link>
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft sm:grid-cols-2 xl:grid-cols-5">
        <ImportMeta label="Status" value={rosterStateLabel(record.state)} />
        <ImportMeta
          label="Uploader"
          value={record.uploader?.display_name ?? "Organization member"}
        />
        <ImportMeta
          label="Created"
          value={format(new Date(record.created_at), "MMM d, yyyy · h:mm a")}
        />
        <ImportMeta
          label="Last update"
          value={format(
            new Date(
              record.completed_at ?? record.confirmed_at ?? record.parsed_at ?? record.created_at,
            ),
            "MMM d, yyyy · h:mm a",
          )}
        />
        <ImportMeta label="Rows" value={String(record.counts.total_rows)} />
      </div>

      {record.selected_sheet_warning ? (
        <div className="mb-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
          {record.selected_sheet_warning}
        </div>
      ) : null}

      {terminal ? (
        <RosterResult orgPublicId={orgPublicId} record={record} />
      ) : step === "mapping" ? (
        <RosterMappingStep
          orgPublicId={orgPublicId}
          record={record}
          onContinue={() => setStep("preview")}
        />
      ) : (
        <RosterPreviewStep
          orgPublicId={orgPublicId}
          record={record}
          onBack={() => setStep("mapping")}
        />
      )}
    </div>
  );
}

function RosterMappingStep({
  orgPublicId,
  record,
  onContinue,
}: {
  orgPublicId: string;
  record: OrganizationRosterPreview;
  onContinue: () => void;
}) {
  const initializedImport = useRef<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const mutation = useUpdateRosterMappingMutation();

  useEffect(() => {
    if (initializedImport.current === record.import_id) return;
    initializedImport.current = record.import_id;
    setMapping(record.mapping.mappings);
  }, [record.import_id, record.mapping.mappings]);

  const gaps = clientMappingGaps(mapping);
  const duplicateTargets = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(mapping).forEach((target) => counts.set(target, (counts.get(target) ?? 0) + 1));
    return new Set([...counts].filter(([, count]) => count > 1).map(([target]) => target));
  }, [mapping]);
  const blocked = gaps.length > 0 || duplicateTargets.size > 0;

  async function saveAndContinue() {
    if (blocked || mutation.isPending) return;
    try {
      const updated = await mutation.mutateAsync({
        orgPublicId,
        importId: record.import_id,
        assignments: record.mapping.source_columns.map((column) => ({
          source_column: column.normalized,
          canonical_field: mapping[column.normalized] ?? null,
        })),
      });
      setMapping(updated.mapping.mappings);
      if (
        updated.mapping.missing_required_mappings.length === 0 &&
        updated.state === "ready_for_review"
      ) {
        onContinue();
      }
    } catch {
      // The backend mapping error is rendered below.
    }
  }

  return (
    <SectionCard
      title="Map your columns"
      description="Match each source column to one employee field, or ignore it. Identity and name mappings are required."
    >
      <div className="divide-y divide-border/60">
        {record.mapping.source_columns.map((column) => {
          const selected = mapping[column.normalized];
          const autoMapped = record.mapping.mappings[column.normalized] === selected;
          return (
            <div
              key={column.normalized}
              className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] md:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{column.original}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{column.normalized}</p>
              </div>
              <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block" />
              <div className="flex min-w-0 items-center gap-2">
                <Select
                  value={selected ?? IGNORE_VALUE}
                  onValueChange={(value) =>
                    setMapping((current) => {
                      const next = { ...current };
                      if (value === IGNORE_VALUE) delete next[column.normalized];
                      else next[column.normalized] = value;
                      return next;
                    })
                  }
                >
                  <SelectTrigger
                    className="h-10 min-w-0 flex-1 rounded-xl"
                    aria-label={`Map ${column.original}`}
                  >
                    <SelectValue placeholder="Choose a Kairo field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={IGNORE_VALUE}>Ignore this column</SelectItem>
                    {EMPLOYEE_ROSTER_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        {fieldLabel(field)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {autoMapped && selected ? (
                  <Badge variant="secondary" className="shrink-0">
                    Auto-mapped
                  </Badge>
                ) : !selected ? (
                  <Badge variant="outline" className="shrink-0 text-muted-foreground">
                    Unmapped
                  </Badge>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border/60 bg-foreground/[0.015] p-5">
        {gaps.length ? (
          <p className="mb-3 text-sm text-destructive" role="alert">
            Map{" "}
            {gaps
              .map((gap) => (gap === "identity" ? "an employee ID or work email" : "a name field"))
              .join(" and ")}{" "}
            to continue.
          </p>
        ) : null}
        {duplicateTargets.size ? (
          <p className="mb-3 text-sm text-destructive" role="alert">
            Each Kairo field can be mapped only once:{" "}
            {[...duplicateTargets].map(fieldLabel).join(", ")}.
          </p>
        ) : null}
        {mutation.error ? (
          <p className="mb-3 text-sm text-destructive" role="alert">
            {getRosterErrorMessage(mutation.error, "The column mapping could not be saved.")}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button
            className="btn-premium rounded-xl"
            disabled={blocked || mutation.isPending}
            onClick={() => void saveAndContinue()}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mutation.isPending ? "Validating…" : "Continue to preview"}
            {!mutation.isPending ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function RosterPreviewStep({
  orgPublicId,
  record,
  onBack,
}: {
  orgPublicId: string;
  record: OrganizationRosterPreview;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const rowsQuery = useRosterImportRowsQuery(orgPublicId, record.import_id, page);
  const confirmMutation = useConfirmRosterImportMutation();
  const confirmationInFlight = useRef(false);

  async function confirm() {
    if (confirmMutation.isPending || confirmationInFlight.current) return;
    confirmationInFlight.current = true;
    try {
      const completed = await confirmMutation.mutateAsync({
        orgPublicId,
        importId: record.import_id,
      });
      trackEvent("roster_confirmed", {
        roster_type: "employee",
        state: completed.state,
        created: completed.counts.created,
        updated: completed.counts.updated,
      });
    } catch {
      // The backend confirmation error is rendered below.
    } finally {
      confirmationInFlight.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <SummaryCards counts={record.counts} />
      <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
        Re-importing the same roster can update matched employee records. Conflicting or repeated
        identifiers may be reported as duplicates or invalid rows.
      </div>
      <SectionCard
        title="Review employee preview"
        description={`${record.counts.total_rows} source rows. Nothing is imported until you confirm.`}
      >
        {rowsQuery.isPending ? (
          <TableSkeleton rows={8} />
        ) : rowsQuery.error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Preview rows didn't load"
            description={getRosterErrorMessage(rowsQuery.error, "Please try again.")}
            action={{ label: "Retry", onClick: () => void rowsQuery.refetch() }}
          />
        ) : (
          <RosterRowsTable rows={rowsQuery.data?.items ?? []} />
        )}
        {rowsQuery.data && rowsQuery.data.total_pages > 1 ? (
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
            <span className="text-xs text-muted-foreground">
              Page {rowsQuery.data.page} of {rowsQuery.data.total_pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= rowsQuery.data.total_pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>

      {confirmMutation.error ? (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-3 text-sm text-destructive"
          role="alert"
        >
          {getRosterErrorMessage(
            confirmMutation.error,
            "The employee import could not be confirmed.",
          )}
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={onBack}
          disabled={confirmMutation.isPending}
        >
          <ArrowLeft className="h-4 w-4" /> Back to mapping
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="btn-premium rounded-xl"
              disabled={
                confirmMutation.isPending ||
                record.counts.valid_new + record.counts.valid_update === 0
              }
            >
              {confirmMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Confirm employee import
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm employee import?</AlertDialogTitle>
              <AlertDialogDescription>
                This will add {record.counts.valid_new} and update {record.counts.valid_update}{" "}
                organization-provided employee records. Invalid, duplicate and skipped rows will not
                be applied.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirmMutation.isPending}>
                Keep reviewing
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmMutation.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  void confirm();
                }}
              >
                {confirmMutation.isPending ? "Importing…" : "Confirm import"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function SummaryCards({ counts }: { counts: RosterImportCounts }) {
  const cards = [
    ["New", counts.valid_new, "text-success"],
    ["Updates", counts.valid_update, "text-info"],
    ["Duplicates", counts.duplicate, "text-warning-foreground"],
    ["Invalid", counts.invalid, "text-destructive"],
    ["Skipped", counts.skipped, "text-muted-foreground"],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map(([label, value, color]) => (
        <div key={label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-2xl font-semibold", color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function RosterRowsTable({ rows }: { rows: RosterPreviewRow[] }) {
  if (!rows.length) {
    return (
      <EmptyState
        icon={Users}
        title="No preview rows"
        description="The backend did not return any rows for this page."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[840px] text-sm">
        <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Row</th>
            <th className="px-3 py-3 font-medium">Employee</th>
            <th className="px-3 py-3 font-medium">Identifier</th>
            <th className="px-3 py-3 font-medium">Department</th>
            <th className="px-3 py-3 font-medium">Outcome</th>
            <th className="px-4 py-3 font-medium">Issues</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row) => {
            const issues = [...row.validation_errors, ...row.application_errors];
            const name = String(
              row.normalized_values.full_name ?? row.raw_values["Full Name"] ?? "—",
            );
            const email = String(row.normalized_values.work_email ?? "");
            return (
              <tr key={row.row_number} className="align-top">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {row.row_number}
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium">{name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{email || "No work email"}</p>
                </td>
                <td className="px-3 py-3 font-mono text-xs">{row.primary_identifier ?? "—"}</td>
                <td className="px-3 py-3 text-xs">
                  {String(row.normalized_values.department ?? "—")}
                </td>
                <td className="px-3 py-3">
                  <DispositionBadge row={row} />
                </td>
                <td className="max-w-[340px] px-4 py-3">
                  {issues.length ? (
                    <ul className="space-y-1 text-xs text-destructive">
                      {issues.map((issue, index) => (
                        <li key={`${issue.code}-${index}`}>{issue.message}</li>
                      ))}
                    </ul>
                  ) : row.disposition === "valid_update" ? (
                    <span className="text-xs text-muted-foreground">
                      Matches an existing organization person.
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No issues</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DispositionBadge({ row }: { row: RosterPreviewRow }) {
  const error = row.disposition === "invalid" || row.application_status === "failed";
  return (
    <Badge variant={error ? "destructive" : "outline"}>
      {row.application_status === "created"
        ? "Added"
        : row.application_status === "updated"
          ? "Updated"
          : row.application_status === "failed"
            ? "Failed"
            : rosterDispositionLabel(row.disposition)}
    </Badge>
  );
}

function RosterResult({
  orgPublicId,
  record,
}: {
  orgPublicId: string;
  record: OrganizationRosterPreview;
}) {
  const downloadMutation = useDownloadRosterErrorsMutation();
  const attention = rosterAttentionCount(record);
  const trackedImport = useRef<string | null>(null);

  useEffect(() => {
    if (trackedImport.current === record.import_id) return;
    trackedImport.current = record.import_id;
    trackEvent("roster_completed", {
      roster_type: "employee",
      state: record.state,
      created: record.counts.created,
      updated: record.counts.updated,
      attention,
    });
  }, [attention, record.counts.created, record.counts.updated, record.import_id, record.state]);

  async function downloadErrors() {
    try {
      const content = await downloadMutation.mutateAsync({
        orgPublicId,
        importId: record.import_id,
      });
      triggerCsvDownload(content, `roster-import-${record.import_id}-errors.csv`);
    } catch {
      // The download error is rendered below.
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title={record.state === "failed" ? "Import needs attention" : "Employee import complete"}
        description={
          record.completed_at
            ? `Completed ${format(new Date(record.completed_at), "MMM d, yyyy 'at' h:mm a")}`
            : "The backend is finalizing this import."
        }
      >
        <div className="p-6">
          <div className="mb-6 flex items-start gap-4">
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                record.state === "failed"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-success/10 text-success",
              )}
            >
              {record.state === "failed" ? (
                <AlertCircle className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6" />
              )}
            </span>
            <div>
              <p className="text-base font-semibold">
                {record.counts.created + record.counts.updated} records applied
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                These records are organization-provided. Their identity and employment claims are
                not Kairo-verified.
              </p>
              {record.failure_message ? (
                <p className="mt-2 text-sm text-destructive">{record.failure_message}</p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ResultMetric label="Added" value={record.counts.created} />
            <ResultMetric label="Updated" value={record.counts.updated} />
            <ResultMetric label="Needs attention" value={attention} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button className="btn-premium rounded-xl" asChild>
              <Link to="/app/people">
                <Users className="h-4 w-4" /> View Employees
              </Link>
            </Button>
            {attention > 0 ? (
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={downloadMutation.isPending}
                onClick={() => void downloadErrors()}
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Error Report
              </Button>
            ) : null}
            <Button variant="ghost" className="rounded-xl" asChild>
              <Link to="/app/people/imports">
                <History className="h-4 w-4" /> View Import History
              </Link>
            </Button>
          </div>
          {downloadMutation.error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {getRosterErrorMessage(
                downloadMutation.error,
                "The error report could not be downloaded.",
              )}
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Import audit trail"
        description="Authoritative backend events for this import"
      >
        {record.audit_events.length ? (
          <div className="divide-y divide-border/60">
            {record.audit_events.map((event) => (
              <div key={event.event_id} className="flex gap-3 px-5 py-4">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium">
                    {fieldLabel(event.action.replace("roster_", ""))}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm:ss a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={History}
            title="No audit events yet"
            description="Backend import events will appear here as the import progresses."
          />
        )}
      </SectionCard>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-foreground/[0.02] p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ImportMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}

function RosterProcessing({ record }: { record: OrganizationRosterPreview }) {
  return (
    <SectionCard
      title={record.state === "importing" ? "Import in progress" : "Preparing your preview"}
      description="The roster service is processing this file. This page refreshes automatically."
    >
      <div className="flex flex-col items-center px-5 py-14 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium">{rosterStateLabel(record.state)}</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Keep this page open. No employee record is treated as verified during processing.
        </p>
      </div>
    </SectionCard>
  );
}
