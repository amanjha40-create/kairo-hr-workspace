import { ApiError, apiRequest } from "@/lib/api/client";

export type EmploymentStatus = "active" | "ex_employee";

export interface EmployeeLifecycleResponse {
  person_public_id: string;
  employment_status: EmploymentStatus;
  last_working_day: string | null;
  updated_at: string;
}

export interface EmploymentProfilePayload {
  role_id?: string | null;
  department?: string | null;
  joining_date?: string | null;
}

export interface EmploymentProfileResponse {
  person_public_id: string;
  role_id: string | null;
  role: string | null;
  department: string | null;
  joining_date: string | null;
}

export interface OrganizationJobRole {
  public_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  assigned_people_count: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationJobRolePayload {
  name: string;
  description?: string | null;
}

export interface OrganizationJobRoleUpdatePayload {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface OrganizationLogo {
  has_logo: boolean;
  display_url?: string | null;
  display_url_expires_in_seconds?: number | null;
  content_type?: string | null;
  byte_size?: number | null;
  updated_at?: string | null;
}

interface OrganizationLogoUploadIntent {
  upload_id: string;
  upload_url: string;
  expires_in_seconds: number;
  headers_required: Record<string, string>;
}

export type VerificationPreferenceCheck =
  | "identity"
  | "employment"
  | "education"
  | "references"
  | "address";

export interface OrganizationVerificationPreferences {
  version: number;
  checks: Record<string, boolean>;
  reference_count: number;
  updated_at: string | null;
}

export interface VerificationPreferencesPayload {
  checks: Record<VerificationPreferenceCheck, boolean>;
  reference_count: number;
}

export type VerificationReportStatus = "INTERIM" | "FINAL";
export type VerificationReportCheckStatus =
  | "CONFIRMED"
  | "DETAILS_MATCHED"
  | "DISCREPANCY"
  | "PENDING"
  | "AWAITING_RESPONSE"
  | "UNABLE_TO_VERIFY"
  | "REJECTED"
  | "NOT_ORDERED";

export interface VerificationReportHeader {
  person_name: string;
  role: string | null;
  person_id: string;
  initiated_at: string | null;
  requested_by_organization: string;
  masked_email: string | null;
  masked_phone: string | null;
  consent_at: string | null;
  trust_score: number | null;
  report_updated_at: string;
  report_status: VerificationReportStatus;
}

export interface VerificationReportCheckSummary {
  check: string;
  status: VerificationReportCheckStatus;
  updated_at: string | null;
  display_text: string;
}

export interface VerificationReportIdentityItem {
  declared_values: Record<string, string | null>;
  verified_values: Record<string, string | null>;
  source: string | null;
  reviewed_at: string | null;
  evidence_id: string | null;
  status: VerificationReportCheckStatus;
  remarks: string | null;
}

export interface VerificationReportEmploymentItem {
  organization: string;
  masked_employee_id: string | null;
  declared_title: string | null;
  confirmed_title: string | null;
  declared_start_date: string | null;
  declared_end_date: string | null;
  confirmed_start_date: string | null;
  confirmed_end_date: string | null;
  employment_type: string | null;
  confirmed_by: string | null;
  source: string | null;
  received_at: string | null;
  evidence_id: string | null;
  reviewer: string | null;
  remarks: string | null;
  status: VerificationReportCheckStatus;
}

export interface VerificationReportEducationItem {
  qualification: string | null;
  institution: string | null;
  university: string | null;
  completion_year: number | null;
  declared_values: Record<string, string | null>;
  confirmed_values: Record<string, string | null>;
  source: string | null;
  confirmation_date: string | null;
  evidence_id: string | null;
  status: VerificationReportCheckStatus;
}

export interface VerificationReportReferenceItem {
  name: string | null;
  title_or_relationship: string | null;
  organization: string | null;
  known_for: string | null;
  request_date: string | null;
  follow_up_dates: string[];
  response_date: string | null;
  status: VerificationReportCheckStatus;
  strengths: string | null;
  development_areas: string | null;
  rehire_response: string | null;
  comments: string | null;
  evidence_id: string | null;
}

export interface VerificationReportAddressItem {
  declared_address: string | null;
  verification_method: string | null;
  verified_at: string | null;
  status: VerificationReportCheckStatus;
  scope: string | null;
  physical_visit_performed: boolean;
  evidence_id: string | null;
}

export interface VerificationReportCourtSearchItem {
  safe_subject_display: string | null;
  scope: string | null;
  search_period: string | null;
  searched_at: string | null;
  finding: string | null;
  evidence_id: string | null;
  reviewer: string | null;
  limitations: string | null;
  status: VerificationReportCheckStatus;
}

export interface VerificationReportOpenItem {
  code: string;
  check: string;
  display_text: string;
  request_public_id: string | null;
}

export interface BackendVerificationReport {
  schema_version: "hr_verification_report_v1";
  header: VerificationReportHeader;
  check_summaries: VerificationReportCheckSummary[];
  identity: VerificationReportIdentityItem[];
  employment: VerificationReportEmploymentItem[];
  education: VerificationReportEducationItem[];
  references: VerificationReportReferenceItem[];
  address: VerificationReportAddressItem[];
  court_search: VerificationReportCourtSearchItem[];
  open_items: VerificationReportOpenItem[];
  hr_review_required: boolean;
  metadata: Record<string, unknown>;
}

export interface TeamInvitationLookup {
  organization_name: string;
  invited_role: "member" | "reviewer" | "admin";
  status: string;
  expires_at: string;
}

export interface TeamInvitationAcceptResponse {
  organization_public_id: string;
  membership_public_id: string;
  role: "member" | "reviewer" | "admin";
  accepted_at: string;
}

export function updateEmployeeLifecycle(
  orgPublicId: string,
  personPublicId: string,
  lastWorkingDay: string,
) {
  return apiRequest<EmployeeLifecycleResponse>(
    `/api/v1/organizations/${orgPublicId}/people/${personPublicId}/lifecycle`,
    {
      method: "PATCH",
      body: { employment_status: "ex_employee", last_working_day: lastWorkingDay },
    },
  );
}

export function updateEmploymentProfile(
  orgPublicId: string,
  personPublicId: string,
  payload: EmploymentProfilePayload,
) {
  return apiRequest<EmploymentProfileResponse>(
    `/api/v1/organizations/${orgPublicId}/people/${personPublicId}/employment-profile`,
    { method: "PATCH", body: payload },
  );
}

export function listOrganizationJobRoles(orgPublicId: string) {
  return apiRequest<OrganizationJobRole[]>(`/api/v1/organizations/${orgPublicId}/job-roles`);
}

export function createOrganizationJobRole(
  orgPublicId: string,
  payload: OrganizationJobRolePayload,
) {
  return apiRequest<OrganizationJobRole>(`/api/v1/organizations/${orgPublicId}/job-roles`, {
    method: "POST",
    body: payload,
  });
}

export function updateOrganizationJobRole(
  orgPublicId: string,
  rolePublicId: string,
  payload: OrganizationJobRoleUpdatePayload,
) {
  return apiRequest<OrganizationJobRole>(
    `/api/v1/organizations/${orgPublicId}/job-roles/${rolePublicId}`,
    { method: "PATCH", body: payload },
  );
}

export function deactivateOrganizationJobRole(orgPublicId: string, rolePublicId: string) {
  return apiRequest<OrganizationJobRole>(
    `/api/v1/organizations/${orgPublicId}/job-roles/${rolePublicId}`,
    { method: "DELETE" },
  );
}

export function getOrganizationLogo(orgPublicId: string) {
  return apiRequest<OrganizationLogo>(`/api/v1/organizations/${orgPublicId}/logo`);
}

async function initializeOrganizationLogoUpload(orgPublicId: string, file: File) {
  return apiRequest<OrganizationLogoUploadIntent>(
    `/api/v1/organizations/${orgPublicId}/logo/upload-intents`,
    {
      method: "POST",
      body: { content_type: file.type, byte_size: file.size },
    },
  );
}

async function confirmOrganizationLogo(orgPublicId: string, uploadId: string) {
  return apiRequest<OrganizationLogo>(`/api/v1/organizations/${orgPublicId}/logo/confirm`, {
    method: "POST",
    body: { upload_id: uploadId },
  });
}

export async function uploadOrganizationLogo(orgPublicId: string, file: File) {
  const intent = await initializeOrganizationLogoUpload(orgPublicId, file);
  const uploadResponse = await fetch(intent.upload_url, {
    method: "PUT",
    headers: intent.headers_required,
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new ApiError({
      status: uploadResponse.status,
      code: "logo_upload_failed",
      message: "The logo upload could not be completed.",
    });
  }
  return confirmOrganizationLogo(orgPublicId, intent.upload_id);
}

export function removeOrganizationLogo(orgPublicId: string) {
  return apiRequest<OrganizationLogo>(`/api/v1/organizations/${orgPublicId}/logo`, {
    method: "DELETE",
  });
}

export function getOrganizationVerificationPreferences(orgPublicId: string) {
  return apiRequest<OrganizationVerificationPreferences>(
    `/api/v1/organizations/${orgPublicId}/verification-preferences`,
  );
}

export function updateOrganizationVerificationPreferences(
  orgPublicId: string,
  payload: VerificationPreferencesPayload,
) {
  return apiRequest<OrganizationVerificationPreferences>(
    `/api/v1/organizations/${orgPublicId}/verification-preferences`,
    { method: "PUT", body: payload },
  );
}

export function getStructuredVerificationReport(orgPublicId: string, personPublicId: string) {
  return apiRequest<BackendVerificationReport>(
    `/api/v1/organizations/${orgPublicId}/people/${personPublicId}/verification-report`,
  );
}

export function getTeamInvitationByToken(token: string) {
  return apiRequest<TeamInvitationLookup>(`/api/v1/workspace/team-invitations/${token}`, {
    auth: false,
  });
}

export function acceptTeamInvitationByToken(token: string) {
  return apiRequest<TeamInvitationAcceptResponse>(
    `/api/v1/workspace/team-invitations/${token}/accept`,
    { method: "POST" },
  );
}
