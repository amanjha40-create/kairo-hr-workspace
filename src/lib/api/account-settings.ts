import { apiRequest } from "@/lib/api/client";
import type { BackendUserProfileResponse } from "@/lib/api/users";

export interface BackendNotificationPreferenceResponse {
  public_id: string;
  user_id: string;
  event_type: string;
  enabled: boolean;
  preferred_channels: string[];
  quiet_hours: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BackendTrustScoreConsentSummary {
  status: string;
  version: string | null;
  consented_at: string | null;
}

export interface BackendAccountSettingsResponse {
  profile: BackendUserProfileResponse;
  trust_score_consent: BackendTrustScoreConsentSummary;
  notification_preferences: BackendNotificationPreferenceResponse[];
  app_version: string;
  api_version: string;
  trust_score_version: string;
}

export interface BackendNotificationPreferenceUpsertRequest {
  event_type: string;
  enabled: boolean;
  preferred_channels: string[];
  quiet_hours?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface BackendAccountSettingsUpdatePayload {
  notification_preferences?: BackendNotificationPreferenceUpsertRequest[];
  withdraw_trust_score_consent?: boolean;
}

export interface BackendAccountSessionResponse {
  id: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
  current: boolean;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export function getAccountSettings() {
  return apiRequest<BackendAccountSettingsResponse>("/api/v1/account/settings");
}

export function updateAccountSettings(payload: BackendAccountSettingsUpdatePayload) {
  return apiRequest<BackendAccountSettingsResponse>("/api/v1/account/settings", {
    method: "PATCH",
    body: payload,
  });
}

export function listAccountSessions() {
  return apiRequest<BackendAccountSessionResponse[]>("/api/v1/account/sessions");
}

export function revokeAccountSession(sessionId: string) {
  return apiRequest<void>(`/api/v1/account/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export function revokeAllAccountSessions() {
  return apiRequest<void>("/api/v1/account/sessions", {
    method: "DELETE",
  });
}

export function changePassword(payload: ChangePasswordPayload) {
  return apiRequest<ChangePasswordResponse>("/api/v1/auth/change-password", {
    method: "POST",
    body: payload,
  });
}
