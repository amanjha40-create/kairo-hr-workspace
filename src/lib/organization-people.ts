import type {
  BackendOrganizationPeopleDirectorySummary,
  BackendOrganizationPeopleListResponse,
  BackendOrganizationPersonActivity,
  BackendOrganizationPersonDetailResponse,
  BackendOrganizationPersonEmploymentVerification,
  BackendOrganizationPersonNote,
  BackendOrganizationPersonPassportClaim,
  BackendOrganizationPersonSharedEvidence,
} from "@/lib/api/organization-people";
import { ApiError } from "@/lib/api/client";

export type PeopleRelationship =
  | "Candidate"
  | "Future Employee"
  | "Employee"
  | "Former Employee"
  | "Contractor";

export type PeopleInvitationStatus =
  | "Not Invited"
  | "Draft"
  | "Sent"
  | "Opened"
  | "Accepted"
  | "Expired"
  | "Cancelled";

export type PeopleVerificationStatus =
  | "Not Started"
  | "Waiting for Candidate"
  | "In Verification"
  | "Clarification Required"
  | "Completed"
  | "Unable to Verify"
  | "Cancelled";

export type PeoplePassportStatus =
  | "Not Shared"
  | "Active"
  | "Expiring Soon"
  | "Expired"
  | "Access Revoked";

export type PeopleTrustState =
  | "Unknown"
  | "Pending"
  | "Verified"
  | "Partially Verified"
  | "Revoked";

export interface PeopleDirectoryItem {
  id: string;
  publicId: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  initials: string;
  relationship: PeopleRelationship;
  invitationStatus: PeopleInvitationStatus;
  verificationStatus: PeopleVerificationStatus;
  passportStatus: PeoplePassportStatus;
  trustState: PeopleTrustState;
  addedBy: string;
  addedAt: string;
  lastActivityAt: string | null;
  summaryCounts: {
    invitations: number;
    verificationRequests: number;
    sharedEvidenceItems: number;
    internalNotes: number;
  };
}

export interface PeopleDirectorySummary {
  totalPeople: number;
  byRelationship: Record<string, number>;
  byInvitationStatus: Record<string, number>;
  byVerificationStatus: Record<string, number>;
  byPassportStatus: Record<string, number>;
  byTrustState: Record<string, number>;
}

export interface PeopleDirectoryResponse {
  items: PeopleDirectoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: PeopleDirectorySummary;
}

export interface PersonPassportClaim {
  label: string;
  value: string | null;
  status: "Candidate-provided" | "Verification pending" | "Verified" | "Unable to verify";
  source: string | null;
}

export interface PersonPassportPreview {
  status: PeoplePassportStatus;
  sharedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  permissions: Record<string, boolean>;
  claims: PersonPassportClaim[];
}

export interface PersonEmploymentVerification {
  id: string;
  publicId: string;
  requestPublicId: string;
  status: PeopleVerificationStatus;
  requestedBy: string;
  requestedAt: string;
  requestType: string;
}

export interface PersonSharedEvidence {
  id: string;
  publicId: string;
  requestPublicId: string;
  type: string;
  sharedAt: string;
  status: "Available" | "Expired" | "Revoked";
  originalFilename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  downloadUrl: string | null;
  downloadUrlExpiresInSeconds: number | null;
}

export interface PersonActivityItem {
  id: string;
  kind: string;
  label: string;
  actor: string;
  at: string;
  requestPublicId: string | null;
  sourceType: string;
  sourcePublicId: string | null;
}

export interface PersonInternalNote {
  id: string;
  publicId: string;
  author: string;
  authorUserId: string | null;
  body: string;
  at: string;
  createdAt: string;
  updatedAt: string;
  ownedByCurrentUser: boolean;
}

export interface OverviewPeopleCounts {
  totalPeople: number;
  inVerification: number;
}

export interface PersonDetailRecord {
  id: string;
  publicId: string;
  fullName: string;
  email: string;
  phone: string;
  linkedUserId: string | null;
  relationship: PeopleRelationship;
  invitationStatus: PeopleInvitationStatus;
  verificationStatus: PeopleVerificationStatus;
  passportStatus: PeoplePassportStatus;
  trustState: PeopleTrustState;
  addedBy: string;
  addedAt: string;
  lastActivityAt: string | null;
  resolutionState: string;
  resolutionMethod: string | null;
  resolutionConfidence: number | null;
  resolutionMetadata: Record<string, unknown>;
  passportPreview: PersonPassportPreview;
  verificationSummary: {
    latestStatus: PeopleVerificationStatus;
    totalRequests: number;
    completedRequests: number;
    activeRequests: number;
    clarificationRequiredRequests: number;
  };
  employmentVerifications: PersonEmploymentVerification[];
  sharedEvidence: PersonSharedEvidence[];
  activity: PersonActivityItem[];
  internalNotes: PersonInternalNote[];
}

function titleCaseWords(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSummaryCount(summary: Record<string, number>, key: string) {
  return summary[key] ?? 0;
}

function buildInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function mapOrganizationRelationship(value: string): PeopleRelationship {
  switch (value) {
    case "future_employee":
      return "Future Employee";
    case "employee":
      return "Employee";
    case "former_employee":
      return "Former Employee";
    case "contractor":
      return "Contractor";
    default:
      return "Candidate";
  }
}

export function mapOrganizationInvitationStatus(value: string): PeopleInvitationStatus {
  switch (value) {
    case "draft":
      return "Draft";
    case "sent":
      return "Sent";
    case "opened":
      return "Opened";
    case "accepted":
      return "Accepted";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return "Not Invited";
  }
}

export function mapOrganizationVerificationStatus(value: string): PeopleVerificationStatus {
  switch (value) {
    case "waiting_for_candidate":
      return "Waiting for Candidate";
    case "in_verification":
      return "In Verification";
    case "clarification_required":
      return "Clarification Required";
    case "completed":
      return "Completed";
    case "unable_to_verify":
      return "Unable to Verify";
    case "cancelled":
      return "Cancelled";
    default:
      return "Not Started";
  }
}

export function mapOrganizationPassportStatus(value: string): PeoplePassportStatus {
  switch (value) {
    case "active":
      return "Active";
    case "expiring_soon":
      return "Expiring Soon";
    case "expired":
      return "Expired";
    case "access_revoked":
      return "Access Revoked";
    default:
      return "Not Shared";
  }
}

export function mapOrganizationTrustState(value: string): PeopleTrustState {
  switch (value) {
    case "pending":
      return "Pending";
    case "verified":
      return "Verified";
    case "partially_verified":
      return "Partially Verified";
    case "revoked":
      return "Revoked";
    default:
      return "Unknown";
  }
}

function mapPassportClaim(claim: BackendOrganizationPersonPassportClaim): PersonPassportClaim {
  switch (claim.status) {
    case "verified":
      return { ...claim, status: "Verified" };
    case "verification_pending":
      return { ...claim, status: "Verification pending" };
    case "unable_to_verify":
      return { ...claim, status: "Unable to verify" };
    default:
      return { ...claim, status: "Candidate-provided" };
  }
}

function mapEmploymentVerification(
  verification: BackendOrganizationPersonEmploymentVerification,
): PersonEmploymentVerification {
  return {
    id: verification.id,
    publicId: verification.public_id,
    requestPublicId: verification.request_public_id,
    status: mapOrganizationVerificationStatus(verification.status),
    requestedBy: verification.requested_by ?? "Organization member",
    requestedAt: verification.requested_at,
    requestType: titleCaseWords(verification.request_type),
  };
}

function mapSharedEvidence(
  evidence: BackendOrganizationPersonSharedEvidence,
): PersonSharedEvidence {
  return {
    id: evidence.id,
    publicId: evidence.public_id,
    requestPublicId: evidence.request_public_id,
    type: evidence.type,
    sharedAt: evidence.shared_at,
    status:
      evidence.status === "revoked"
        ? "Revoked"
        : evidence.status === "expired"
          ? "Expired"
          : "Available",
    originalFilename: evidence.original_filename,
    mimeType: evidence.mime_type,
    fileSize: evidence.file_size,
    downloadUrl: evidence.download_url,
    downloadUrlExpiresInSeconds: evidence.download_url_expires_in_seconds,
  };
}

function mapActivity(activity: BackendOrganizationPersonActivity): PersonActivityItem {
  return {
    id: activity.id,
    kind: activity.kind,
    label: activity.label,
    actor: activity.actor,
    at: activity.at,
    requestPublicId: activity.request_public_id,
    sourceType: activity.source_type,
    sourcePublicId: activity.source_public_id,
  };
}

export function mapOrganizationPersonNote(note: BackendOrganizationPersonNote): PersonInternalNote {
  return {
    id: note.id,
    publicId: note.public_id,
    author: note.author ?? "Team member",
    authorUserId: note.author_user_id,
    body: note.body,
    at: note.at,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    ownedByCurrentUser: note.owned_by_current_user,
  };
}

export function mapDirectorySummary(
  summary: BackendOrganizationPeopleDirectorySummary,
): PeopleDirectorySummary {
  return {
    totalPeople: summary.total_people,
    byRelationship: summary.by_relationship,
    byInvitationStatus: summary.by_invitation_status,
    byVerificationStatus: summary.by_verification_status,
    byPassportStatus: summary.by_passport_status,
    byTrustState: summary.by_trust_state,
  };
}

export function mapOrganizationPeopleDirectory(
  response: BackendOrganizationPeopleListResponse,
): PeopleDirectoryResponse {
  return {
    items: response.items.map((item) => ({
      id: item.id,
      publicId: item.public_id,
      name: item.name,
      fullName: item.full_name,
      email: item.email ?? "",
      phone: item.phone ?? "",
      initials: buildInitials(item.full_name || item.name),
      relationship: mapOrganizationRelationship(item.relationship),
      invitationStatus: mapOrganizationInvitationStatus(item.invitation_status),
      verificationStatus: mapOrganizationVerificationStatus(item.verification_status),
      passportStatus: mapOrganizationPassportStatus(item.passport_status),
      trustState: mapOrganizationTrustState(item.trust_state),
      addedBy: item.added_by ?? "System",
      addedAt: item.added_at,
      lastActivityAt: item.last_activity_at,
      summaryCounts: {
        invitations: item.summary_counts.invitations,
        verificationRequests: item.summary_counts.verification_requests,
        sharedEvidenceItems: item.summary_counts.shared_evidence_items,
        internalNotes: item.summary_counts.internal_notes,
      },
    })),
    total: response.total,
    page: response.page,
    pageSize: response.page_size,
    totalPages: response.total_pages,
    summary: mapDirectorySummary(response.summary),
  };
}

export function mapOrganizationPersonDetail(
  response: BackendOrganizationPersonDetailResponse,
): PersonDetailRecord {
  return {
    id: response.id,
    publicId: response.public_id,
    fullName: response.summary.full_name,
    email: response.summary.email ?? "",
    phone: response.summary.phone ?? "",
    linkedUserId: response.summary.linked_user_id,
    relationship: mapOrganizationRelationship(response.organization_relationship.relationship),
    invitationStatus: mapOrganizationInvitationStatus(
      response.organization_relationship.invitation_status,
    ),
    verificationStatus: mapOrganizationVerificationStatus(
      response.organization_relationship.verification_status,
    ),
    passportStatus: mapOrganizationPassportStatus(
      response.organization_relationship.passport_status,
    ),
    trustState: mapOrganizationTrustState(response.organization_relationship.trust_state),
    addedBy: response.organization_relationship.added_by ?? "System",
    addedAt: response.organization_relationship.added_at,
    lastActivityAt: response.organization_relationship.last_activity_at,
    resolutionState: response.organization_relationship.resolution_state,
    resolutionMethod: response.organization_relationship.resolution_method,
    resolutionConfidence: response.organization_relationship.resolution_confidence,
    resolutionMetadata: response.organization_relationship.resolution_metadata,
    passportPreview: {
      status: mapOrganizationPassportStatus(response.passport_preview.status),
      sharedAt: response.passport_preview.shared_at,
      expiresAt: response.passport_preview.expires_at,
      revokedAt: response.passport_preview.revoked_at,
      permissions: response.passport_preview.permissions,
      claims: response.passport_preview.claims.map(mapPassportClaim),
    },
    verificationSummary: {
      latestStatus: mapOrganizationVerificationStatus(response.verification_summary.latest_status),
      totalRequests: response.verification_summary.total_requests,
      completedRequests: response.verification_summary.completed_requests,
      activeRequests: response.verification_summary.active_requests,
      clarificationRequiredRequests: response.verification_summary.clarification_required_requests,
    },
    employmentVerifications: response.employment_verifications.map(mapEmploymentVerification),
    sharedEvidence: response.shared_evidence.map(mapSharedEvidence),
    activity: response.activity.map(mapActivity),
    internalNotes: response.internal_notes.map(mapOrganizationPersonNote),
  };
}

export function canOpenSharedPassport(status: PeoplePassportStatus) {
  return status === "Active" || status === "Expiring Soon";
}

export function mapRelationshipFilterToBackend(value: string) {
  switch (value) {
    case "Future Employee":
      return "future_employee" as const;
    case "Employee":
      return "employee" as const;
    case "Former Employee":
      return "former_employee" as const;
    case "Contractor":
      return "contractor" as const;
    case "Candidate":
      return "candidate" as const;
    default:
      return undefined;
  }
}

export function mapInvitationFilterToBackend(value: string) {
  switch (value) {
    case "Draft":
      return "draft" as const;
    case "Sent":
      return "sent" as const;
    case "Opened":
      return "opened" as const;
    case "Accepted":
      return "accepted" as const;
    case "Expired":
      return "expired" as const;
    case "Cancelled":
      return "cancelled" as const;
    case "Not Invited":
      return "not_invited" as const;
    default:
      return undefined;
  }
}

export function mapVerificationFilterToBackend(value: string) {
  switch (value) {
    case "Waiting for Candidate":
      return "waiting_for_candidate" as const;
    case "In Verification":
      return "in_verification" as const;
    case "Clarification Required":
      return "clarification_required" as const;
    case "Completed":
      return "completed" as const;
    case "Unable to Verify":
      return "unable_to_verify" as const;
    case "Cancelled":
      return "cancelled" as const;
    case "Not Started":
      return "not_started" as const;
    default:
      return undefined;
  }
}

export function mapPassportFilterToBackend(value: string) {
  switch (value) {
    case "Active":
      return "active" as const;
    case "Expiring Soon":
      return "expiring_soon" as const;
    case "Expired":
      return "expired" as const;
    case "Access Revoked":
      return "access_revoked" as const;
    case "Not Shared":
      return "not_shared" as const;
    default:
      return undefined;
  }
}

export function getCreatedAfterFilter(windowValue: string) {
  const days =
    windowValue === "7d" ? 7 : windowValue === "30d" ? 30 : windowValue === "90d" ? 90 : null;

  if (!days) {
    return undefined;
  }

  return new Date(Date.now() - days * 86400e3).toISOString();
}

export function getPeopleOverviewCounts(summary: PeopleDirectorySummary): OverviewPeopleCounts {
  return {
    totalPeople: summary.totalPeople,
    inVerification:
      normalizeSummaryCount(summary.byVerificationStatus, "in_verification") +
      normalizeSummaryCount(summary.byVerificationStatus, "clarification_required"),
  };
}

export function getOrganizationPeopleErrorMessage(error: unknown, fallback: string) {
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
