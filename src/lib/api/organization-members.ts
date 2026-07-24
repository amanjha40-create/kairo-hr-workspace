import { apiRequest } from "@/lib/api/client";

export type BackendOrganizationMemberRole = "owner" | "admin" | "member" | "reviewer";

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

export function listOrganizationMembers(orgPublicId: string) {
  return apiRequest<
    BackendPage<BackendOrganizationMemberResponse> | BackendOrganizationMemberResponse[]
  >(`/api/v1/organizations/${orgPublicId}/members`);
}
