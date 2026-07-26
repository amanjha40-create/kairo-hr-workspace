import { apiRequest } from "@/lib/api/client";

export type BackendOrganizationMemberRole = "owner" | "admin" | "member" | "reviewer";
export type BackendOrganizationInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired";

export interface BackendPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  offset: number;
  limit: number;
}

export interface BackendOrganizationMemberResponse {
  public_id: string;
  organization_public_id: string;
  role: BackendOrganizationMemberRole;
  user_email: string;
  user_full_name: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendOrganizationInvitationResponse {
  public_id: string;
  organization_public_id: string;
  invitee_email: string;
  invitee_user_id: string | null;
  role: BackendOrganizationMemberRole;
  status: BackendOrganizationInvitationStatus;
  invited_by_email: string;
  invited_by_full_name: string | null;
  invited_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendOrganizationMemberUpdatePayload {
  role: BackendOrganizationMemberRole;
}

export interface BackendOrganizationMemberSuspendPayload {
  reason?: string | null;
}

export interface BackendOrganizationInvitationCreatePayload {
  invitee_email: string;
  role: BackendOrganizationMemberRole;
}

export interface BackendOrganizationOwnershipTransferResponse {
  organization_public_id: string;
  previous_owner_member_public_id: string;
  new_owner_member_public_id: string;
  transferred_at: string;
}

export function normalizeBackendList<T>(payload: BackendPage<T> | T[]) {
  return Array.isArray(payload) ? payload : payload.items;
}

export function listOrganizationMembers(orgPublicId: string) {
  return apiRequest<
    BackendPage<BackendOrganizationMemberResponse> | BackendOrganizationMemberResponse[]
  >(`/api/v1/organizations/${orgPublicId}/members`);
}

export function updateOrganizationMember(
  orgPublicId: string,
  memberPublicId: string,
  payload: BackendOrganizationMemberUpdatePayload,
) {
  return apiRequest<BackendOrganizationMemberResponse>(
    `/api/v1/organizations/${orgPublicId}/members/${memberPublicId}`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export function suspendOrganizationMember(
  orgPublicId: string,
  memberPublicId: string,
  payload: BackendOrganizationMemberSuspendPayload,
) {
  return apiRequest<BackendOrganizationMemberResponse>(
    `/api/v1/organizations/${orgPublicId}/members/${memberPublicId}/suspend`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function restoreOrganizationMember(orgPublicId: string, memberPublicId: string) {
  return apiRequest<BackendOrganizationMemberResponse>(
    `/api/v1/organizations/${orgPublicId}/members/${memberPublicId}/restore`,
    {
      method: "POST",
    },
  );
}

export function removeOrganizationMember(orgPublicId: string, memberPublicId: string) {
  return apiRequest<void>(`/api/v1/organizations/${orgPublicId}/members/${memberPublicId}`, {
    method: "DELETE",
  });
}

export function transferOrganizationOwnership(orgPublicId: string, memberPublicId: string) {
  return apiRequest<BackendOrganizationOwnershipTransferResponse>(
    `/api/v1/organizations/${orgPublicId}/members/${memberPublicId}/transfer-ownership`,
    {
      method: "POST",
    },
  );
}

export function listOrganizationInvitations(orgPublicId: string) {
  return apiRequest<
    BackendPage<BackendOrganizationInvitationResponse> | BackendOrganizationInvitationResponse[]
  >(`/api/v1/organizations/${orgPublicId}/invitations`);
}

export function createOrganizationInvitation(
  orgPublicId: string,
  payload: BackendOrganizationInvitationCreatePayload,
) {
  return apiRequest<BackendOrganizationInvitationResponse>(
    `/api/v1/organizations/${orgPublicId}/invitations`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function resendOrganizationInvitation(orgPublicId: string, invitationPublicId: string) {
  return apiRequest<BackendOrganizationInvitationResponse>(
    `/api/v1/organizations/${orgPublicId}/invitations/${invitationPublicId}/resend`,
    {
      method: "POST",
    },
  );
}

export function cancelOrganizationInvitation(orgPublicId: string, invitationPublicId: string) {
  return apiRequest<BackendOrganizationInvitationResponse>(
    `/api/v1/organizations/${orgPublicId}/invitations/${invitationPublicId}/cancel`,
    {
      method: "POST",
    },
  );
}
