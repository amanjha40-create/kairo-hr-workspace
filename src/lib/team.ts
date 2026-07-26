import { format } from "date-fns";
import { ApiError } from "@/lib/api/client";
import type {
  BackendOrganizationInvitationResponse,
  BackendOrganizationInvitationStatus,
  BackendOrganizationMemberResponse,
  BackendOrganizationMemberRole,
} from "@/lib/api/organization-members";

export type TeamRole = "Owner" | "Admin" | "Reviewer" | "Member";
export type TeamStatus =
  | "Active"
  | "Suspended"
  | "Invitation Pending"
  | "Invitation Expired"
  | "Invitation Cancelled"
  | "Invitation Declined"
  | "Invitation Accepted";

export type TeamRecordKind = "member" | "invitation";

export interface TeamRecord {
  id: string;
  kind: TeamRecordKind;
  memberPublicId?: string;
  invitationPublicId?: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
  lastActive: string;
  joinedAt: string;
  joinedAtLabel: string;
  joinedAtSort: string;
  invitedBy: string;
  invitedByLabel: string;
  suspensionReason: string | null;
}

export const TEAM_ROLES: TeamRole[] = ["Owner", "Admin", "Reviewer", "Member"];

export const TEAM_ASSIGNABLE_ROLES: TeamRole[] = ["Admin", "Reviewer", "Member"];

export const TEAM_STATUSES: TeamStatus[] = [
  "Active",
  "Invitation Pending",
  "Invitation Expired",
  "Invitation Cancelled",
  "Invitation Declined",
  "Invitation Accepted",
  "Suspended",
];

export const TEAM_ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  Owner: "Full control including billing and ownership transfer.",
  Admin: "Manage team, workspace settings, and all verification activity.",
  Reviewer: "Review verification work and assigned organization workflows.",
  Member: "Standard team access for daily workspace collaboration.",
};

export const TEAM_ROLE_STYLE: Record<TeamRole, string> = {
  Owner: "bg-foreground text-background border-transparent",
  Admin: "bg-info/15 text-info-foreground border-info/25",
  Reviewer: "bg-primary/10 text-primary border-primary/25",
  Member: "bg-success/15 text-success border-success/25",
};

export const TEAM_STATUS_STYLE: Record<TeamStatus, string> = {
  Active: "bg-success/15 text-success border-success/25",
  Suspended: "bg-foreground/[0.06] text-muted-foreground border-border/60",
  "Invitation Pending": "bg-warning/15 text-warning-foreground border-warning/25",
  "Invitation Expired": "bg-destructive/10 text-destructive border-destructive/25",
  "Invitation Cancelled": "bg-foreground/[0.06] text-muted-foreground border-border/60",
  "Invitation Declined": "bg-foreground/[0.06] text-muted-foreground border-border/60",
  "Invitation Accepted": "bg-info/15 text-info-foreground border-info/25",
};

export function mapBackendTeamRole(role: BackendOrganizationMemberRole): TeamRole {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "reviewer":
      return "Reviewer";
    case "member":
      return "Member";
  }
}

export function mapTeamRoleToBackend(role: TeamRole): BackendOrganizationMemberRole {
  switch (role) {
    case "Owner":
      return "owner";
    case "Admin":
      return "admin";
    case "Reviewer":
      return "reviewer";
    case "Member":
      return "member";
  }
}

export function mapInvitationStatus(status: BackendOrganizationInvitationStatus): TeamStatus {
  switch (status) {
    case "pending":
      return "Invitation Pending";
    case "expired":
      return "Invitation Expired";
    case "cancelled":
      return "Invitation Cancelled";
    case "declined":
      return "Invitation Declined";
    case "accepted":
      return "Invitation Accepted";
    default:
      return "Invitation Pending";
  }
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatTeamDate(value: string | null) {
  if (!value) return "—";
  return format(new Date(value), "yyyy-MM-dd");
}

function getDisplayName(fullName: string | null, email: string) {
  return fullName?.trim() || email;
}

function shouldIncludeInvitation(
  invitation: BackendOrganizationInvitationResponse,
  memberEmails: Set<string>,
) {
  if (invitation.status !== "accepted") {
    return true;
  }
  return !memberEmails.has(invitation.invitee_email.toLowerCase());
}

export function buildTeamRecords(
  members: BackendOrganizationMemberResponse[],
  invitations: BackendOrganizationInvitationResponse[],
) {
  const memberEmails = new Set(members.map((member) => member.user_email.toLowerCase()));

  const memberRecords: TeamRecord[] = members.map((member) => ({
    id: member.public_id,
    kind: "member",
    memberPublicId: member.public_id,
    name: getDisplayName(member.user_full_name, member.user_email),
    email: member.user_email,
    role: mapBackendTeamRole(member.role),
    status: member.suspended_at ? "Suspended" : "Active",
    lastActive: "—",
    joinedAt: formatTeamDate(member.created_at),
    joinedAtLabel: "Joined",
    joinedAtSort: member.created_at,
    invitedBy: "—",
    invitedByLabel: "Invited by",
    suspensionReason: member.suspension_reason,
  }));

  const invitationRecords: TeamRecord[] = invitations
    .filter((invitation) => shouldIncludeInvitation(invitation, memberEmails))
    .map((invitation) => ({
      id: invitation.public_id,
      kind: "invitation",
      invitationPublicId: invitation.public_id,
      name: invitation.invitee_email,
      email: invitation.invitee_email,
      role: mapBackendTeamRole(invitation.role),
      status: mapInvitationStatus(invitation.status),
      lastActive: "—",
      joinedAt: formatTeamDate(invitation.invited_at),
      joinedAtLabel: "Invited",
      joinedAtSort: invitation.invited_at,
      invitedBy: invitation.invited_by_full_name ?? invitation.invited_by_email,
      invitedByLabel: "Invited by",
      suspensionReason: null,
    }));

  return [...memberRecords, ...invitationRecords].sort((left, right) =>
    right.joinedAtSort.localeCompare(left.joinedAtSort),
  );
}

export function getTeamErrorMessage(error: unknown, fallback: string) {
  const offline =
    typeof navigator !== "undefined" && "onLine" in navigator && navigator.onLine === false;

  if (offline) {
    return "You're offline. Reconnect to continue.";
  }

  if (!(error instanceof ApiError)) {
    if (error instanceof TypeError) {
      return "Network unavailable. Check your connection and try again.";
    }
    return error instanceof Error ? error.message : fallback;
  }

  if (error.details.length > 0) {
    const first = error.details[0];
    const message =
      typeof first.msg === "string"
        ? first.msg
        : typeof first.message === "string"
          ? first.message
          : null;
    if (message) return message;
  }

  return error.message || fallback;
}
