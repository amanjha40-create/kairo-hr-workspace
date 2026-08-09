import { apiRequest } from "@/lib/api/client";

export type BackendVerificationRequestType =
  | "employment"
  | "education"
  | "identity"
  | "document"
  | "license"
  | "medical"
  | "reference"
  | "platform"
  | "certification"
  | "custom";

export type BackendVerificationRequestStatus =
  | "draft"
  | "pending_subject_acceptance"
  | "accepted"
  | "pending_subject_submission"
  | "pending_admin_review"
  | "awaiting_subject_corrections"
  | "pending_admin_re_review"
  | "approved_for_organization_verification"
  | "pending_organization_resolution"
  | "pending_organization_acceptance"
  | "in_progress"
  | "awaiting_information"
  | "pending_admin_quality_review"
  | "verified"
  | "rejected"
  | "unable_to_verify"
  | "cancelled"
  | "expired";

export type BackendVerificationEventSource =
  | "candidate"
  | "organization"
  | "admin"
  | "system"
  | "ai";

export interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  offset: number;
  limit: number;
}

export interface BackendVerificationRequestResponse {
  public_id: string;
  employment_id: string | null;
  origin_type: string | null;
  organization_public_id: string | null;
  trust_invitation_public_id: string | null;
  subject_name: string;
  subject_email: string;
  target_organization_name: string | null;
  target_organization_email: string | null;
  request_type: BackendVerificationRequestType;
  status: BackendVerificationRequestStatus;
  due_date: string | null;
  trust_context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  candidate_response: string | null;
  candidate_response_submitted_at: string | null;
  accepted_at: string | null;
  consented_fields: string[];
  consented_evidence_scope: string[];
  target_organization_metadata: Record<string, unknown>;
  organization_summary: {
    public_id: string;
    name: string;
    organization_type: string;
    verification_state: string;
    suspended_at: string | null;
  } | null;
  verification_target: {
    organization_name: string | null;
    organization_email: string | null;
    metadata: Record<string, unknown>;
  } | null;
  employment_claim: {
    employer_name: string | null;
    role: string | null;
    start_date: string | null;
    end_date: string | null;
    employment_type: string | null;
    work_location_country: string | null;
    work_location_region: string | null;
  } | null;
  evidence_summary: {
    total_items: number;
    document_items: number;
    field_keys: string[];
  };
  assigned_reviewer: {
    user_id: string;
    full_name: string | null;
    email: string;
    role: string;
  } | null;
  review_status: "completed" | "clarification_requested" | "assigned" | "unassigned" | null;
  is_assigned_to_current_user: boolean | null;
  organization_internal_note: string | null;
}

export interface BackendVerificationTimelineEvent {
  public_id: string;
  event_type: string;
  event_source: BackendVerificationEventSource;
  previous_status: BackendVerificationRequestStatus | null;
  new_status: BackendVerificationRequestStatus | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BackendVerificationTimelineResponse {
  verification_request_public_id: string;
  items: BackendVerificationTimelineEvent[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  offset: number;
  limit: number;
}

export interface BackendVerificationEvidenceResponse {
  public_id: string;
  evidence_type: string;
  field_key: string;
  document_id: string | null;
  employment_document_id: string | null;
  value: Record<string, unknown> | null;
  status: string;
  created_at: string;
  updated_at: string;
  document_type: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  upload_status: string | null;
  download_url: string | null;
  download_url_expires_in_seconds: number | null;
}

export interface VerificationRequestListParams {
  search?: string;
  status?: BackendVerificationRequestStatus;
  sort_by?:
    | "created_at"
    | "updated_at"
    | "subject_name"
    | "subject_email"
    | "request_type"
    | "status";
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
  paginate?: boolean;
}

export interface VerificationActionPayload {
  note?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AssignReviewerPayload {
  organization_member_public_id?: string | null;
  assignee_user_id?: string | null;
}

function buildQueryString(params: VerificationRequestListParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.status) searchParams.set("status", params.status);
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));
  if (params.paginate) searchParams.set("paginate", "true");

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function listVerificationRequests(
  orgPublicId: string,
  params: VerificationRequestListParams = {},
) {
  return apiRequest<
    BackendPage<BackendVerificationRequestResponse> | BackendVerificationRequestResponse[]
  >(`/api/v1/organizations/${orgPublicId}/verification-requests${buildQueryString(params)}`);
}

export function getVerificationRequestDetail(verificationRequestPublicId: string) {
  return apiRequest<BackendVerificationRequestResponse>(
    `/api/v1/verification-requests/${verificationRequestPublicId}`,
  );
}

export function getVerificationRequestTimeline(verificationRequestPublicId: string) {
  return apiRequest<BackendVerificationTimelineResponse>(
    `/api/v1/verification-requests/${verificationRequestPublicId}/timeline`,
  );
}

export function getVerificationRequestEvidence(verificationRequestPublicId: string) {
  return apiRequest<
    BackendPage<BackendVerificationEvidenceResponse> | BackendVerificationEvidenceResponse[]
  >(`/api/v1/verification-requests/${verificationRequestPublicId}/evidence`);
}

export function assignVerificationReviewer(
  verificationRequestPublicId: string,
  payload: AssignReviewerPayload,
) {
  return apiRequest<BackendVerificationRequestResponse>(
    `/api/v1/verification-requests/${verificationRequestPublicId}/reviewer`,
    {
      method: "PUT",
      body: payload,
    },
  );
}

export function updateVerificationInternalNote(
  verificationRequestPublicId: string,
  note: string | null,
) {
  return apiRequest<BackendVerificationRequestResponse>(
    `/api/v1/verification-requests/${verificationRequestPublicId}/internal-note`,
    {
      method: "PUT",
      body: { note },
    },
  );
}

export function requestVerificationClarification(
  verificationRequestPublicId: string,
  payload: VerificationActionPayload,
) {
  return apiRequest<BackendVerificationRequestResponse>(
    `/api/v1/verification-requests/${verificationRequestPublicId}/request-information`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function acceptVerificationRequest(verificationRequestPublicId: string) {
  return apiRequest<BackendVerificationRequestResponse>(
    `/api/v1/verification-requests/${verificationRequestPublicId}/accept`,
    {
      method: "POST",
    },
  );
}

export function verifyVerificationRequest(
  verificationRequestPublicId: string,
  payload: VerificationActionPayload,
) {
  return apiRequest<BackendVerificationRequestResponse>(
    `/api/v1/verification-requests/${verificationRequestPublicId}/verify`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function rejectVerificationRequest(
  verificationRequestPublicId: string,
  payload: VerificationActionPayload,
) {
  return apiRequest<BackendVerificationRequestResponse>(
    `/api/v1/verification-requests/${verificationRequestPublicId}/reject`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function cancelVerificationRequest(
  verificationRequestPublicId: string,
  payload: VerificationActionPayload,
) {
  return apiRequest<BackendVerificationRequestResponse>(
    `/api/v1/verification-requests/${verificationRequestPublicId}/cancel`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function markVerificationUnableToVerify(
  verificationRequestPublicId: string,
  payload: VerificationActionPayload,
) {
  return apiRequest<BackendVerificationRequestResponse>(
    `/api/v1/verification-requests/${verificationRequestPublicId}/unable-to-verify`,
    {
      method: "POST",
      body: payload,
    },
  );
}
