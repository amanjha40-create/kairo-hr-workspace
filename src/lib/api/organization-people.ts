import { apiRequest } from "@/lib/api/client";

export type BackendOrganizationPersonRelationship =
  | "candidate"
  | "employee"
  | "former_employee"
  | "contractor"
  | "future_employee";

export type BackendOrganizationPersonTrustState =
  | "unknown"
  | "pending"
  | "verified"
  | "partially_verified"
  | "revoked";

export type BackendOrganizationPersonInvitationStatus =
  | "not_invited"
  | "draft"
  | "sent"
  | "opened"
  | "accepted"
  | "expired"
  | "cancelled";

export type BackendOrganizationPersonVerificationStatus =
  | "not_started"
  | "waiting_for_candidate"
  | "in_verification"
  | "clarification_required"
  | "completed"
  | "unable_to_verify"
  | "cancelled";

export type BackendOrganizationPersonPassportStatus =
  | "not_shared"
  | "active"
  | "expiring_soon"
  | "expired"
  | "access_revoked";

export interface BackendOrganizationPeopleListParams {
  search?: string;
  relationship?: BackendOrganizationPersonRelationship;
  invitation_status?: BackendOrganizationPersonInvitationStatus;
  verification_status?: BackendOrganizationPersonVerificationStatus;
  passport_status?: BackendOrganizationPersonPassportStatus;
  trust_state?: BackendOrganizationPersonTrustState;
  added_by?: string;
  created_after?: string;
  sort_by?: "added_at" | "last_activity_at" | "name" | "relationship";
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export interface BackendOrganizationPeopleSummaryCounts {
  invitations: number;
  verification_requests: number;
  shared_evidence_items: number;
  internal_notes: number;
}

export interface BackendOrganizationPeopleDirectorySummary {
  total_people: number;
  by_relationship: Record<string, number>;
  by_invitation_status: Record<string, number>;
  by_verification_status: Record<string, number>;
  by_passport_status: Record<string, number>;
  by_trust_state: Record<string, number>;
}

export interface BackendOrganizationPersonListItem {
  id: string;
  public_id: string;
  name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  relationship: BackendOrganizationPersonRelationship;
  trust_state: BackendOrganizationPersonTrustState;
  invitation_status: BackendOrganizationPersonInvitationStatus;
  verification_status: BackendOrganizationPersonVerificationStatus;
  passport_status: BackendOrganizationPersonPassportStatus;
  added_by: string | null;
  added_at: string;
  last_activity_at: string | null;
  summary_counts: BackendOrganizationPeopleSummaryCounts;
}

export interface BackendOrganizationPeopleListResponse {
  items: BackendOrganizationPersonListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  offset: number;
  limit: number;
  summary: BackendOrganizationPeopleDirectorySummary;
}

export interface BackendOrganizationPersonPassportClaim {
  label: string;
  value: string | null;
  status: string;
  source: string | null;
}

export interface BackendOrganizationPersonPassportPreview {
  status: BackendOrganizationPersonPassportStatus;
  shared_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  permissions: Record<string, boolean>;
  claims: BackendOrganizationPersonPassportClaim[];
}

export interface BackendOrganizationPersonVerificationSummary {
  latest_status: BackendOrganizationPersonVerificationStatus;
  total_requests: number;
  completed_requests: number;
  active_requests: number;
  clarification_required_requests: number;
}

export interface BackendOrganizationPersonEmploymentVerification {
  id: string;
  public_id: string;
  status: string;
  requested_by: string | null;
  requested_at: string;
  request_type: string;
  request_public_id: string;
}

export interface BackendOrganizationPersonSharedEvidence {
  id: string;
  public_id: string;
  request_public_id: string;
  type: string;
  shared_at: string;
  status: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  download_url: string | null;
  download_url_expires_in_seconds: number | null;
}

export interface BackendOrganizationPersonActivity {
  id: string;
  kind: string;
  label: string;
  actor: string;
  at: string;
  request_public_id: string | null;
  source_type: string;
  source_public_id: string | null;
}

export interface BackendOrganizationPersonNote {
  id: string;
  public_id: string;
  author: string | null;
  author_user_id: string | null;
  body: string;
  at: string;
  created_at: string;
  updated_at: string;
  owned_by_current_user: boolean;
}

export interface BackendOrganizationPersonDetailResponse {
  id: string;
  public_id: string;
  summary: {
    full_name: string;
    email: string | null;
    phone: string | null;
    linked_user_id: string | null;
  };
  passport_preview: BackendOrganizationPersonPassportPreview;
  verification_summary: BackendOrganizationPersonVerificationSummary;
  employment_verifications: BackendOrganizationPersonEmploymentVerification[];
  shared_evidence: BackendOrganizationPersonSharedEvidence[];
  activity: BackendOrganizationPersonActivity[];
  internal_notes: BackendOrganizationPersonNote[];
  organization_relationship: {
    relationship: BackendOrganizationPersonRelationship;
    trust_state: BackendOrganizationPersonTrustState;
    invitation_status: BackendOrganizationPersonInvitationStatus;
    verification_status: BackendOrganizationPersonVerificationStatus;
    passport_status: BackendOrganizationPersonPassportStatus;
    added_by: string | null;
    added_at: string;
    last_activity_at: string | null;
    resolution_state: string;
    resolution_method: string | null;
    resolution_confidence: number | null;
    resolution_metadata: Record<string, unknown>;
  };
}

export interface OrganizationPersonNotePayload {
  body: string;
}

function buildQueryString(params: BackendOrganizationPeopleListParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.relationship) searchParams.set("relationship", params.relationship);
  if (params.invitation_status) searchParams.set("invitation_status", params.invitation_status);
  if (params.verification_status) {
    searchParams.set("verification_status", params.verification_status);
  }
  if (params.passport_status) searchParams.set("passport_status", params.passport_status);
  if (params.trust_state) searchParams.set("trust_state", params.trust_state);
  if (params.added_by?.trim()) searchParams.set("added_by", params.added_by.trim());
  if (params.created_after) searchParams.set("created_after", params.created_after);
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));
  searchParams.set("paginate", "true");

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function listOrganizationPeople(
  orgPublicId: string,
  params: BackendOrganizationPeopleListParams = {},
) {
  return apiRequest<BackendOrganizationPeopleListResponse>(
    `/api/v1/organizations/${orgPublicId}/people${buildQueryString(params)}`,
  );
}

export async function listAllOrganizationPeople(
  orgPublicId: string,
  params: BackendOrganizationPeopleListParams = {},
) {
  const pageSize = params.page_size ?? 100;
  const firstPage = await listOrganizationPeople(orgPublicId, {
    ...params,
    page: 1,
    page_size: pageSize,
  });

  if (firstPage.total_pages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.total_pages - 1 }, (_, index) =>
      listOrganizationPeople(orgPublicId, {
        ...params,
        page: index + 2,
        page_size: pageSize,
      }),
    ),
  );

  return {
    ...firstPage,
    items: [firstPage.items, ...remainingPages.map((page) => page.items)].flat(),
    total: remainingPages.reduce(
      (count, page) => count + page.items.length,
      firstPage.items.length,
    ),
    total_pages: firstPage.total_pages,
    page: 1,
    page_size: pageSize,
    offset: 0,
    limit: firstPage.limit,
  };
}

export function getOrganizationPerson(orgPublicId: string, personPublicId: string) {
  return apiRequest<BackendOrganizationPersonDetailResponse>(
    `/api/v1/organizations/${orgPublicId}/people/${personPublicId}`,
  );
}

export function addOrganizationPersonNote(
  orgPublicId: string,
  personPublicId: string,
  payload: OrganizationPersonNotePayload,
) {
  return apiRequest<BackendOrganizationPersonNote>(
    `/api/v1/organizations/${orgPublicId}/people/${personPublicId}/notes`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function updateOrganizationPersonNote(
  orgPublicId: string,
  personPublicId: string,
  notePublicId: string,
  payload: OrganizationPersonNotePayload,
) {
  return apiRequest<BackendOrganizationPersonNote>(
    `/api/v1/organizations/${orgPublicId}/people/${personPublicId}/notes/${notePublicId}`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export function deleteOrganizationPersonNote(
  orgPublicId: string,
  personPublicId: string,
  notePublicId: string,
) {
  return apiRequest<void>(
    `/api/v1/organizations/${orgPublicId}/people/${personPublicId}/notes/${notePublicId}`,
    {
      method: "DELETE",
    },
  );
}
