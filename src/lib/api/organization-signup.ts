import { apiRequest } from "@/lib/api/client";
import type { TokenResponse } from "@/lib/api/auth";
import type { BackendOrganizationType } from "@/lib/api/workspace";

export interface OrganizationSignupStartRequest {
  full_name: string;
  work_email: string;
  password: string;
}

export interface OrganizationSignupStartResponse {
  signup_session_id: string;
  email_masked: string;
  email_verified: boolean;
  email_resend_after_seconds: number;
  expires_in_seconds: number;
  message: string;
}

export interface OrganizationSignupEmailSendResponse {
  signup_session_id: string;
  email_masked: string;
  email_verified: boolean;
  resend_after_seconds: number;
  expires_in_seconds: number;
  message: string;
}

export interface OrganizationSignupEmailVerifyResponse {
  signup_session_id: string;
  email_verified: boolean;
  message: string;
}

export interface OrganizationOnboardingCompleteRequest {
  name: string;
  organization_type: BackendOrganizationType;
  work_email?: string;
  domain?: string;
  organization_size?: string;
  hiring_volume?: string;
}

export function startOrganizationSignup(payload: OrganizationSignupStartRequest) {
  return apiRequest<OrganizationSignupStartResponse>("/api/v1/auth/organization/signup/start", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

export function sendOrganizationSignupEmailOtp(signupSessionId: string) {
  return apiRequest<OrganizationSignupEmailSendResponse>(
    "/api/v1/auth/organization/signup/email/send",
    {
      method: "POST",
      auth: false,
      body: { signup_session_id: signupSessionId },
    },
  );
}

export function verifyOrganizationSignupEmail(signupSessionId: string, code: string) {
  return apiRequest<OrganizationSignupEmailVerifyResponse>(
    "/api/v1/auth/organization/signup/email/verify",
    {
      method: "POST",
      auth: false,
      body: { signup_session_id: signupSessionId, code },
    },
  );
}

export function completeOrganizationSignup(signupSessionId: string) {
  return apiRequest<TokenResponse>("/api/v1/auth/organization/signup/complete", {
    method: "POST",
    auth: false,
    body: { signup_session_id: signupSessionId },
  });
}

export function completeOrganizationOnboarding(payload: OrganizationOnboardingCompleteRequest) {
  return apiRequest("/api/v1/organizations/onboarding/complete", {
    method: "POST",
    body: payload,
  });
}
