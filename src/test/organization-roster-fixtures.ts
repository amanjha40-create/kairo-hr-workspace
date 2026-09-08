import type {
  OrganizationRosterPreview,
  RosterImportSummary,
  RosterPreviewRow,
} from "@/lib/api/organization-roster-imports";

export const rosterCounts = {
  total_rows: 5,
  valid_new: 2,
  valid_update: 1,
  duplicate: 1,
  invalid: 1,
  skipped: 0,
  created: 0,
  updated: 0,
  failed: 0,
};

export const rosterRows: RosterPreviewRow[] = [
  {
    row_number: 2,
    raw_values: { "Employee ID": "EMP-1", "Full Name": "Ada Lovelace" },
    normalized_values: {
      employee_id: "EMP-1",
      full_name: "Ada Lovelace",
      work_email: "ada@example.com",
      department: "Engineering",
    },
    disposition: "valid_new",
    validation_errors: [],
    primary_identifier: "EMP-1",
    matched_organization_person_id: null,
    result_organization_person_id: null,
    application_status: "pending",
    application_errors: [],
    applied_at: null,
  },
  {
    row_number: 3,
    raw_values: { "Employee ID": "EMP-1", "Full Name": "Ada Lovelace" },
    normalized_values: { employee_id: "EMP-1", full_name: "Ada Lovelace" },
    disposition: "duplicate",
    validation_errors: [
      { code: "duplicate", field: "employee_id", message: "Duplicate employee ID", row_number: 3 },
    ],
    primary_identifier: "EMP-1",
    matched_organization_person_id: null,
    result_organization_person_id: null,
    application_status: "ignored",
    application_errors: [],
    applied_at: null,
  },
  {
    row_number: 4,
    raw_values: { "Employee ID": "EMP-2", "Full Name": "" },
    normalized_values: { employee_id: "EMP-2" },
    disposition: "invalid",
    validation_errors: [
      {
        code: "missing_name",
        field: "full_name",
        message: "Employee name is required",
        row_number: 4,
      },
    ],
    primary_identifier: "EMP-2",
    matched_organization_person_id: null,
    result_organization_person_id: null,
    application_status: "ignored",
    application_errors: [],
    applied_at: null,
  },
  {
    row_number: 5,
    raw_values: { "Employee ID": "EMP-3", "Full Name": "Grace Hopper" },
    normalized_values: {
      employee_id: "EMP-3",
      full_name: "Grace Hopper",
      work_email: "grace@example.com",
      department: "Engineering",
    },
    disposition: "valid_update",
    validation_errors: [],
    primary_identifier: "EMP-3",
    matched_organization_person_id: "33333333-3333-4333-8333-333333333333",
    result_organization_person_id: null,
    application_status: "pending",
    application_errors: [],
    applied_at: null,
  },
  {
    row_number: 6,
    raw_values: { "Employee ID": "", "Full Name": "" },
    normalized_values: {},
    disposition: "skipped",
    validation_errors: [],
    primary_identifier: null,
    matched_organization_person_id: null,
    result_organization_person_id: null,
    application_status: "ignored",
    application_errors: [],
    applied_at: null,
  },
];

export function makeRosterPreview(
  overrides: Partial<OrganizationRosterPreview> = {},
): OrganizationRosterPreview {
  return {
    import_id: "11111111-1111-4111-8111-111111111111",
    roster_type: "employee",
    source_format: "csv",
    original_filename: "employees.csv",
    state: "ready_for_review",
    selected_sheet_name: null,
    selected_sheet_warning: null,
    mapping: {
      source_columns: [
        { original: "Employee ID", normalized: "employee_id" },
        { original: "Full Name", normalized: "full_name" },
        { original: "Department", normalized: "department" },
      ],
      mappings: {
        employee_id: "employee_id",
        full_name: "full_name",
        department: "department",
      },
      unmapped_source_columns: [],
      missing_required_mappings: [],
      ambiguous_mappings: [],
      warnings: [],
    },
    counts: { ...rosterCounts },
    rows: rosterRows,
    uploader: {
      user_id: "22222222-2222-4222-8222-222222222222",
      display_name: "HR Owner",
      email: "owner@example.com",
    },
    audit_events: [],
    confirmed_at: null,
    completed_at: null,
    failure_code: null,
    failure_message: null,
    parsed_at: "2026-09-09T08:00:00Z",
    created_at: "2026-09-09T08:00:00Z",
    ...overrides,
  };
}

export function makeRosterSummary(
  overrides: Partial<RosterImportSummary> = {},
): RosterImportSummary {
  const preview = makeRosterPreview();
  return {
    import_id: preview.import_id,
    roster_type: "employee",
    source_format: preview.source_format,
    original_filename: preview.original_filename,
    state: preview.state,
    counts: preview.counts,
    uploader: preview.uploader!,
    parsed_at: preview.parsed_at,
    confirmed_at: preview.confirmed_at,
    completed_at: preview.completed_at,
    created_at: preview.created_at,
    ...overrides,
  };
}
