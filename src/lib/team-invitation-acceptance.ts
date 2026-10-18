import { ApiError } from "@/lib/api/client";

export interface TeamInvitationErrorState {
  title: string;
  body: string;
}

export function getTeamInvitationErrorState(error: unknown): TeamInvitationErrorState {
  if (!(error instanceof ApiError)) {
    return { title: "Invitation unavailable", body: "Please try again in a moment." };
  }
  const message = error.message.toLowerCase();
  if (error.status === 404) {
    return { title: "Invalid invitation", body: "This invitation link is not valid." };
  }
  if (message.includes("expired")) {
    return {
      title: "Invitation expired",
      body: "Ask an organization admin to send a new invitation.",
    };
  }
  if (message.includes("revoked") || message.includes("cancel")) {
    return { title: "Invitation revoked", body: "This invitation is no longer available." };
  }
  if (message.includes("used") || message.includes("consum") || message.includes("accepted")) {
    return {
      title: "Invitation already used",
      body: "This single-use invitation has already been accepted.",
    };
  }
  if (error.status === 403) {
    return {
      title: "Email does not match",
      body: "Sign in with the same email address that received this invitation.",
    };
  }
  return { title: "Invitation unavailable", body: error.message || "Please try again." };
}
