import { apiRequest } from "@/lib/api/client";

export interface BackendProfileLinkResponse {
  id: string;
  link_type: string;
  label: string | null;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface BackendProfileLanguageResponse {
  id: string;
  language: string;
  proficiency: string;
  created_at: string;
  updated_at: string;
}

export interface BackendUserProfileResponse {
  id: string;
  email: string;
  full_name: string | null;
  profile_slug: string | null;
  phone: string | null;
  current_role: string | null;
  industry: string | null;
  years_of_experience: number | null;
  location: string | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  headline: string | null;
  bio: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  phone_verified_at: string | null;
  email_verified_at: string | null;
  employment_onboarding_completed_at: string | null;
  languages: BackendProfileLanguageResponse[];
  professional_links: BackendProfileLinkResponse[];
  profile_completion_percentage: number;
  created_at: string;
}

export interface BackendAvatarUploadIntentResponse {
  upload_url: string;
  avatar_url: string;
  expires_in_seconds: number;
}

export interface UpdateCurrentUserProfilePayload {
  full_name?: string | null;
  phone?: string | null;
  current_role?: string | null;
  industry?: string | null;
  years_of_experience?: number | null;
  location?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  location_country?: string | null;
  headline?: string | null;
  bio?: string | null;
  date_of_birth?: string | null;
}

export function getCurrentUserProfile() {
  return apiRequest<BackendUserProfileResponse>("/api/v1/users/me");
}

export function updateCurrentUserProfile(payload: UpdateCurrentUserProfilePayload) {
  return apiRequest<BackendUserProfileResponse>("/api/v1/users/me", {
    method: "PATCH",
    body: payload,
  });
}

export function getAvatarUploadIntent(contentType: string) {
  return apiRequest<BackendAvatarUploadIntentResponse>("/api/v1/users/me/avatar-upload-url", {
    method: "POST",
    body: { content_type: contentType },
  });
}

export function completeAvatarUpload() {
  return apiRequest<BackendUserProfileResponse>("/api/v1/users/me/avatar/complete", {
    method: "POST",
  });
}

export function removeAvatar() {
  return apiRequest<void>("/api/v1/users/me/avatar", {
    method: "DELETE",
  });
}
