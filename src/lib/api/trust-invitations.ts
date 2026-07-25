import { apiRequest } from "@/lib/api/client";

export type BackendTrustInvitationStatus =
  | "draft"
  | "pending"
  | "accepted"
  | "cancelled"
  | "expired";

export type BackendTrustInvitationDeliveryMethod = "email";
export type BackendTrustInvitationDeliveryState = "queued" | "delivered" | "opened" | "failed";
export type BackendTrustInvitationVerificationType =
  | "identity"
  | "employment"
  | "education"
  | "certification"
  | "professional_reference";

export type BackendTrustInvitationEventType =
  | "created"
  | "sent"
  | "resent"
  | "opened"
  | "accepted"
  | "cancelled"
  | "expired"
  | "delivery_failed"
  | "deleted";

export interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  offset: number;
  limit: number;
}

export interface BackendTrustInvitationResponse {
  public_id: string;
  organization_public_id: string;
  subject_name: string;
  subject_email: string;
  subject_phone: string | null;
  purpose: string | null;
  requested_verification_types: BackendTrustInvitationVerificationType[];
  message: string | null;
  status: BackendTrustInvitationStatus;
  delivery_method: BackendTrustInvitationDeliveryMethod;
  delivery_state: BackendTrustInvitationDeliveryState;
  created_by_email: string;
  created_by_full_name: string | null;
  expires_at: string;
  sent_at: string | null;
  opened_at: string | null;
  accepted_at: string | null;
  cancelled_at: string | null;
  related_verification_request_public_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendTrustInvitationTimelineEvent {
  id: string;
  event_type: BackendTrustInvitationEventType;
  occurred_at: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_full_name: string | null;
  metadata: Record<string, unknown>;
}

export interface BackendTrustInvitationDetailResponse extends BackendTrustInvitationResponse {
  invitation_url: string;
  timeline: BackendTrustInvitationTimelineEvent[];
}

export interface BackendTrustInvitationCreateResponse extends BackendTrustInvitationResponse {
  invitation_url: string;
}

export interface BackendTrustInvitationSummaryResponse {
  active_count: number;
  accepted_count: number;
  cancelled_count: number;
  expiring_soon_count: number;
  draft_count: number;
}

export interface CreateTrustInvitationPayload {
  subject_name: string;
  subject_email: string;
  subject_phone?: string;
  purpose?: string;
  requested_verification_types: BackendTrustInvitationVerificationType[];
  message?: string;
  delivery_method: BackendTrustInvitationDeliveryMethod;
  mode: "send" | "draft";
  expires_at: string;
}

export interface TrustInvitationListParams {
  search?: string;
  status?: BackendTrustInvitationStatus;
  sort_by?:
    | "created_at"
    | "updated_at"
    | "expires_at"
    | "subject_name"
    | "subject_email"
    | "purpose"
    | "status"
    | "delivery_state"
    | "sent_at"
    | "opened_at";
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
  paginate?: boolean;
}

function buildQueryString(params: TrustInvitationListParams = {}) {
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

export function listTrustInvitations(orgPublicId: string, params: TrustInvitationListParams = {}) {
  return apiRequest<BackendPage<BackendTrustInvitationResponse> | BackendTrustInvitationResponse[]>(
    `/api/v1/organizations/${orgPublicId}/trust-invitations${buildQueryString(params)}`,
  );
}

export function getTrustInvitationSummary(orgPublicId: string) {
  return apiRequest<BackendTrustInvitationSummaryResponse>(
    `/api/v1/organizations/${orgPublicId}/trust-invitations/summary`,
  );
}

export function getTrustInvitationDetail(invitationPublicId: string) {
  return apiRequest<BackendTrustInvitationDetailResponse>(
    `/api/v1/trust-invitations/by-id/${invitationPublicId}`,
  );
}

export function createTrustInvitation(orgPublicId: string, payload: CreateTrustInvitationPayload) {
  return apiRequest<BackendTrustInvitationCreateResponse>(
    `/api/v1/organizations/${orgPublicId}/trust-invitations`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function sendTrustInvitation(invitationPublicId: string) {
  return apiRequest<BackendTrustInvitationDetailResponse>(
    `/api/v1/trust-invitations/${invitationPublicId}/send`,
    { method: "POST" },
  );
}

export function resendTrustInvitation(invitationPublicId: string) {
  return apiRequest<BackendTrustInvitationDetailResponse>(
    `/api/v1/trust-invitations/${invitationPublicId}/resend`,
    { method: "POST" },
  );
}

export function cancelTrustInvitation(invitationPublicId: string) {
  return apiRequest<BackendTrustInvitationResponse>(
    `/api/v1/trust-invitations/${invitationPublicId}/cancel`,
    { method: "POST" },
  );
}

export function deleteTrustInvitation(invitationPublicId: string) {
  return apiRequest<void>(`/api/v1/trust-invitations/${invitationPublicId}`, {
    method: "DELETE",
  });
}
