import { ApiError } from "@/lib/api/client";
import type {
  OrganizationRosterPreview,
  RosterImportState,
  RosterPreviewRow,
} from "@/lib/api/organization-roster-imports";

export const MAX_ROSTER_UPLOAD_BYTES = 5_000_000;
export const MAX_ROSTER_ROWS = 10_000;
export const MAX_ROSTER_COLUMNS = 64;
export const MAX_ROSTER_FILENAME_LENGTH = 255;

export const EMPLOYEE_ROSTER_FIELDS = [
  "employee_id",
  "full_name",
  "first_name",
  "last_name",
  "work_email",
  "phone",
  "department",
  "designation",
  "employment_type",
  "joining_date",
  "exit_date",
  "employment_status",
  "location",
] as const;

export const TERMINAL_ROSTER_STATES: readonly RosterImportState[] = [
  "completed",
  "completed_with_errors",
  "failed",
];

export function isRosterImportTerminal(state: RosterImportState) {
  return TERMINAL_ROSTER_STATES.includes(state);
}

export function validateRosterFile(file: File): string | null {
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension !== "csv" && extension !== "xlsx") {
    return "Choose a CSV or XLSX file.";
  }
  if (file.name.length > MAX_ROSTER_FILENAME_LENGTH) {
    return "The filename must be 255 characters or fewer.";
  }
  if (file.size > MAX_ROSTER_UPLOAD_BYTES) {
    return "The file must be 5 MB or smaller.";
  }
  if (file.size === 0) {
    return "The file is empty.";
  }
  return null;
}

export function rosterStateLabel(state: RosterImportState) {
  const labels: Record<RosterImportState, string> = {
    uploaded: "Uploaded",
    parsing: "Processing",
    mapping_required: "Mapping required",
    ready_for_review: "Ready for review",
    importing: "Importing",
    completed: "Completed",
    completed_with_errors: "Completed with issues",
    failed: "Failed",
  };
  return labels[state];
}

export function rosterDispositionLabel(disposition: RosterPreviewRow["disposition"]) {
  const labels: Record<RosterPreviewRow["disposition"], string> = {
    valid_new: "New",
    valid_update: "Update",
    duplicate: "Duplicate",
    invalid: "Invalid",
    skipped: "Skipped",
  };
  return labels[disposition];
}

export function rosterAttentionCount(importRecord: OrganizationRosterPreview) {
  const { counts } = importRecord;
  return counts.invalid + counts.duplicate + counts.skipped + counts.failed;
}

export function getRosterErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "You don't have permission to manage employee imports.";
    if (error.status === 404) return "This employee import could not be found.";
    if (error.status === 409) return error.message || "This import changed. Refresh and try again.";
    if (error.status === 413) return "The selected file exceeds the 5 MB upload limit.";
    if (error.status === 422) return error.message || "The roster file could not be validated.";
    return error.message || fallback;
  }
  if (error instanceof TypeError) {
    return "The roster service is unreachable. Check your connection and try again.";
  }
  return error instanceof Error ? error.message : fallback;
}

export function triggerCsvDownload(content: string, filename: string) {
  triggerBlobDownload(new Blob([content], { type: "text/csv;charset=utf-8" }), filename);
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
