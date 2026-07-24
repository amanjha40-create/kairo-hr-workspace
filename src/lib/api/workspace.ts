import { apiRequest } from "@/lib/api/client";

export type BackendWorkspaceState =
  | "ready"
  | "no_org"
  | "invitation_pending"
  | "setup_incomplete"
  | "verification_pending"
  | "org_suspended"
  | "membership_suspended";

export type BackendOrganizationType =
  | "employer"
  | "university"
  | "staffing_agency"
  | "background_verification_partner"
  | "government"
  | "certification_body"
  | "hospital"
  | "gig_platform"
  | "financial_institution"
  | "other";

export type BackendOrganizationRole = "owner" | "admin" | "member" | "reviewer";
export type BackendOrganizationVerificationState =
  | "setup_incomplete"
  | "verification_pending"
  | "verified"
  | "additional_information_required";
export type BackendInvitationStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";

export interface WorkspaceBootstrapResponse {
  state: BackendWorkspaceState;
  current_user: {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    active_organization_public_id: string | null;
  };
  active_organization: {
    public_id: string;
    name: string;
    organization_type: BackendOrganizationType;
    website: string | null;
    industry: string | null;
    location: string | null;
    work_email: string | null;
    domain: string | null;
    domain_verified_at: string | null;
    verification_state: BackendOrganizationVerificationState;
    setup_completed_at: string | null;
    suspended_at: string | null;
    suspension_reason: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  membership_role: BackendOrganizationRole | null;
  organization_verification_state: BackendOrganizationVerificationState | null;
  organization_suspended: boolean;
  membership_suspended: boolean;
  setup_completed: boolean;
  pending_organization_invitation: WorkspaceOrganizationInvitationResponse | null;
  permission_flags: {
    invite_candidate: boolean;
    modify_person: boolean;
    modify_invitation: boolean;
    modify_verification: boolean;
    manage_team: boolean;
    save_settings: boolean;
    transfer_ownership: boolean;
  };
}

export interface WorkspaceOrganizationInvitationResponse {
  public_id: string;
  organization_public_id: string;
  organization_name: string;
  invited_role: BackendOrganizationRole;
  invited_by_email: string;
  invited_by_full_name: string | null;
  status: BackendInvitationStatus;
  invited_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
}

interface OrganizationPayload {
  name: string;
  organization_type: BackendOrganizationType;
  website?: string;
  industry?: string;
  location?: string;
  work_email?: string;
  domain?: string;
  verification_capabilities?: string[];
}

export function getWorkspaceBootstrap() {
  return apiRequest<WorkspaceBootstrapResponse>("/api/v1/workspace/bootstrap");
}

export function listWorkspaceInvitations() {
  return apiRequest<WorkspaceOrganizationInvitationResponse[]>("/api/v1/workspace/invitations");
}

export function acceptWorkspaceInvitation(invitationPublicId: string) {
  return apiRequest<WorkspaceOrganizationInvitationResponse>(
    `/api/v1/workspace/invitations/${invitationPublicId}/accept`,
    { method: "POST" },
  );
}

export function declineWorkspaceInvitation(invitationPublicId: string) {
  return apiRequest<WorkspaceOrganizationInvitationResponse>(
    `/api/v1/workspace/invitations/${invitationPublicId}/decline`,
    { method: "POST" },
  );
}

export function createOrganization(payload: OrganizationPayload) {
  return apiRequest("/api/v1/organizations", {
    method: "POST",
    body: payload,
  });
}

export function updateOrganization(orgPublicId: string, payload: Partial<OrganizationPayload>) {
  return apiRequest(`/api/v1/organizations/${orgPublicId}`, {
    method: "PATCH",
    body: payload,
  });
}
