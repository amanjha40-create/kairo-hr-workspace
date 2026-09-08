import { apiRequest } from "@/lib/api/client";

export type RosterImportState =
  | "uploaded"
  | "parsing"
  | "mapping_required"
  | "ready_for_review"
  | "importing"
  | "completed"
  | "completed_with_errors"
  | "failed";

export type RosterRowDisposition =
  | "valid_new"
  | "valid_update"
  | "duplicate"
  | "invalid"
  | "skipped";

export type RosterRowApplicationStatus = "pending" | "ignored" | "created" | "updated" | "failed";

export interface RosterImportCounts {
  total_rows: number;
  valid_new: number;
  valid_update: number;
  duplicate: number;
  invalid: number;
  skipped: number;
  created: number;
  updated: number;
  failed: number;
}

export interface RosterSourceColumn {
  original: string;
  normalized: string;
}

export interface RosterMapping {
  source_columns: RosterSourceColumn[];
  mappings: Record<string, string>;
  unmapped_source_columns: string[];
  missing_required_mappings: string[];
  ambiguous_mappings: string[];
  warnings: string[];
}

export interface RosterRowIssue {
  code: string;
  field: string | null;
  message: string;
  row_number: number;
}

export interface RosterPreviewRow {
  row_number: number;
  raw_values: Record<string, unknown>;
  normalized_values: Record<string, unknown>;
  disposition: RosterRowDisposition;
  validation_errors: RosterRowIssue[];
  primary_identifier: string | null;
  matched_organization_person_id: string | null;
  result_organization_person_id: string | null;
  application_status: RosterRowApplicationStatus;
  application_errors: RosterRowIssue[];
  applied_at: string | null;
}

export interface RosterUploader {
  user_id: string;
  display_name: string;
  email: string;
}

export interface RosterAuditEvent {
  event_id: string;
  action:
    | "roster_import_confirmed"
    | "roster_person_created"
    | "roster_person_updated"
    | "roster_import_completed"
    | "roster_import_failed";
  organization_person_id: string | null;
  row_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OrganizationRosterPreview {
  import_id: string;
  roster_type: "employee";
  source_format: string;
  original_filename: string;
  state: RosterImportState;
  selected_sheet_name: string | null;
  selected_sheet_warning: string | null;
  mapping: RosterMapping;
  counts: RosterImportCounts;
  rows: RosterPreviewRow[];
  uploader: RosterUploader | null;
  audit_events: RosterAuditEvent[];
  confirmed_at: string | null;
  completed_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  parsed_at: string | null;
  created_at: string;
}

export interface RosterImportSummary {
  import_id: string;
  roster_type: "employee";
  source_format: string;
  original_filename: string;
  state: RosterImportState;
  counts: RosterImportCounts;
  uploader: RosterUploader;
  parsed_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RosterImportListResponse {
  items: RosterImportSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  offset: number;
  limit: number;
}

export interface RosterRowListResponse {
  items: RosterPreviewRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  offset: number;
  limit: number;
}

export interface OrganizationRosterEmployee {
  organization_person_id: string;
  roster_type: "employee";
  full_name: string;
  email: string | null;
  phone: string | null;
  roster_data: Record<string, unknown>;
  source_status: "organization_provided";
  verified: false;
  source_import_id: string | null;
  source_row_number: number | null;
  imported_by_user_id: string | null;
  imported_at: string;
}

export interface OrganizationRosterEmployeeListResponse {
  items: OrganizationRosterEmployee[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  offset: number;
  limit: number;
}

export interface RosterMappingAssignment {
  source_column: string;
  canonical_field: string | null;
}

function pageQuery(page: number, pageSize: number) {
  return `?page=${page}&page_size=${pageSize}`;
}

export function listRosterImports(orgPublicId: string, page = 1, pageSize = 20) {
  return apiRequest<RosterImportListResponse>(
    `/api/v1/organizations/${orgPublicId}/roster-imports${pageQuery(page, pageSize)}&roster_type=employee`,
  );
}

export function uploadEmployeeRoster(orgPublicId: string, file: File) {
  const body = new FormData();
  body.set("roster_type", "employee");
  body.set("file", file);
  return apiRequest<OrganizationRosterPreview>(
    `/api/v1/organizations/${orgPublicId}/roster-imports`,
    { method: "POST", body },
  );
}

export function getRosterImport(orgPublicId: string, importId: string) {
  return apiRequest<OrganizationRosterPreview>(
    `/api/v1/organizations/${orgPublicId}/roster-imports/${importId}`,
  );
}

export function updateRosterMapping(
  orgPublicId: string,
  importId: string,
  assignments: RosterMappingAssignment[],
) {
  return apiRequest<OrganizationRosterPreview>(
    `/api/v1/organizations/${orgPublicId}/roster-imports/${importId}/mapping`,
    { method: "PATCH", body: { assignments } },
  );
}

export function confirmRosterImport(orgPublicId: string, importId: string) {
  return apiRequest<OrganizationRosterPreview>(
    `/api/v1/organizations/${orgPublicId}/roster-imports/${importId}/confirm`,
    { method: "POST" },
  );
}

export function listRosterImportRows(
  orgPublicId: string,
  importId: string,
  page = 1,
  pageSize = 20,
) {
  return apiRequest<RosterRowListResponse>(
    `/api/v1/organizations/${orgPublicId}/roster-imports/${importId}/rows${pageQuery(page, pageSize)}`,
  );
}

export function downloadRosterImportErrors(orgPublicId: string, importId: string) {
  return apiRequest<string>(
    `/api/v1/organizations/${orgPublicId}/roster-imports/${importId}/errors.csv`,
  );
}

export function listRosterEmployees(
  orgPublicId: string,
  { page = 1, pageSize = 100, search }: { page?: number; pageSize?: number; search?: string } = {},
) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search?.trim()) params.set("search", search.trim());
  return apiRequest<OrganizationRosterEmployeeListResponse>(
    `/api/v1/organizations/${orgPublicId}/roster/employees?${params.toString()}`,
  );
}

export async function listAllRosterEmployees(orgPublicId: string, search = "") {
  const firstPage = await listRosterEmployees(orgPublicId, { page: 1, pageSize: 100, search });
  if (firstPage.total_pages <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.total_pages - 1 }, (_, index) =>
      listRosterEmployees(orgPublicId, { page: index + 2, pageSize: 100, search }),
    ),
  );
  return {
    ...firstPage,
    items: [firstPage, ...remainingPages].flatMap((page) => page.items),
  };
}
