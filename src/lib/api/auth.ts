import { apiRequest } from "@/lib/api/client";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface OAuthAuthUrlResponse {
  provider: string;
  auth_url: string;
}

export function loginWithPassword(email: string, password: string) {
  return apiRequest<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest<ForgotPasswordResponse>("/api/v1/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export function logoutWithRefreshToken(refreshToken: string) {
  return apiRequest<void>("/api/v1/auth/logout", {
    method: "POST",
    auth: false,
    body: { refresh_token: refreshToken },
  });
}

export function getOAuthAuthUrl(provider: "google") {
  return apiRequest<OAuthAuthUrlResponse>(`/api/v1/auth/${provider}/url`, {
    method: "GET",
    auth: false,
  });
}

export function exchangeOAuthCode(provider: "google", code: string) {
  return apiRequest<TokenResponse>(`/api/v1/auth/${provider}/callback`, {
    method: "POST",
    auth: false,
    body: { code },
  });
}
