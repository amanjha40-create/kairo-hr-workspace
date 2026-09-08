import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  FileSpreadsheet,
  History,
  Loader2,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { EmptyState, PageHeader, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/lib/access-context";
import { trackEvent } from "@/lib/analytics";
import {
  getRosterErrorMessage,
  rosterStateLabel,
  validateRosterFile,
} from "@/lib/organization-roster";
import {
  useRosterImportsQuery,
  useUploadEmployeeRosterMutation,
} from "@/lib/queries/organization-roster-imports";
import { cn } from "@/lib/utils";

export function EmployeeRosterImportPage() {
  const { org, membershipRole } = useAccess();
  const canManageRoster = membershipRole === "owner" || membershipRole === "admin";
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const historyQuery = useRosterImportsQuery(org?.publicId, 1);
  const uploadMutation = useUploadEmployeeRosterMutation();

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
        description="Only organization owners and admins can upload or review employee rosters."
      />
    );
  }

  function chooseFile(nextFile: File | null) {
    if (!nextFile) return;
    const validationError = validateRosterFile(nextFile);
    setFileError(validationError);
    setFile(validationError ? null : nextFile);
  }

  async function upload() {
    if (!file || !org || uploadMutation.isPending) return;
    trackEvent("roster_import_started", {
      roster_type: "employee",
      source_format: file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv",
    });
    try {
      const record = await uploadMutation.mutateAsync({ orgPublicId: org.publicId, file });
      trackEvent("roster_preview_ready", {
        roster_type: "employee",
        state: record.state,
        total_rows: record.counts.total_rows,
      });
      navigate({ to: "/app/people/imports/$id", params: { id: record.import_id } });
    } catch {
      // The mutation error is rendered below without replacing the selected file.
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/app/people"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          People
          <ArrowRight className="h-3 w-3" />
          Employee imports
        </Link>
      </div>
      <PageHeader
        eyebrow="Organization roster"
        title="Import Employees"
        description="Add or update employee records from a CSV or XLSX file. Imported data is organization-provided and is not verified or approved by Kairo."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <SectionCard
          title="Upload employee roster"
          description="Your file is validated by the Kairo roster service before anything is added."
        >
          <div className="p-5 sm:p-6">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              aria-label="Choose employee roster file"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                chooseFile(event.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "w-full rounded-2xl border border-dashed p-8 sm:p-12 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                dragging
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border bg-foreground/[0.015] hover:border-primary/50 hover:bg-primary/[0.025]",
              )}
            >
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </span>
              <span className="block text-sm font-semibold">
                {file ? file.name : "Drop a roster here, or choose a file"}
              </span>
              <span className="mt-1.5 block text-xs text-muted-foreground">
                CSV or XLSX · up to 5 MB · up to 10,000 rows and 64 columns
              </span>
            </button>

            {fileError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {fileError}
              </p>
            ) : null}
            {uploadMutation.error ? (
              <div
                className="mt-4 rounded-xl border border-destructive/20 bg-destructive/[0.04] p-3 text-sm text-destructive"
                role="alert"
              >
                {getRosterErrorMessage(uploadMutation.error, "The roster could not be uploaded.")}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Button
                  variant="outline"
                  disabled
                  title="No canonical template endpoint is available"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Download template
                </Button>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  A canonical backend template is not available yet.
                </p>
              </div>
              <Button
                className="btn-premium rounded-xl"
                disabled={!file || uploadMutation.isPending}
                onClick={() => void upload()}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadMutation.isPending ? "Uploading…" : "Upload and preview"}
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="What happens next"
          description="A review-first, backend-owned import flow"
        >
          <ol className="divide-y divide-border/60 px-5">
            {[
              ["1", "Map columns", "Confirm how your file maps to Kairo employee fields."],
              ["2", "Review preview", "See new, updated, duplicate, invalid and skipped rows."],
              [
                "3",
                "Confirm import",
                "Only eligible rows are applied to your organization registry.",
              ],
            ].map(([step, title, description]) => (
              <li key={step} className="flex gap-3 py-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Import history" description="Backend-owned employee roster activity">
          {historyQuery.isPending ? (
            <TableSkeleton rows={4} />
          ) : historyQuery.error ? (
            <EmptyState
              icon={AlertTriangle}
              title="Import history didn't load"
              description={getRosterErrorMessage(historyQuery.error, "Please try again.")}
              action={{ label: "Retry", onClick: () => void historyQuery.refetch() }}
            />
          ) : !historyQuery.data?.items.length ? (
            <EmptyState
              icon={History}
              title="No employee imports yet"
              description="Your completed and in-progress roster imports will appear here."
            />
          ) : (
            <div className="divide-y divide-border/60">
              {historyQuery.data.items.map((record) => (
                <Link
                  key={record.import_id}
                  to="/app/people/imports/$id"
                  params={{ id: record.import_id }}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-foreground/[0.02] sm:flex-row sm:items-center"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05]">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {record.original_filename}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {record.uploader.display_name} ·{" "}
                      {format(new Date(record.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{rosterStateLabel(record.state)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {record.counts.total_rows} rows
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
