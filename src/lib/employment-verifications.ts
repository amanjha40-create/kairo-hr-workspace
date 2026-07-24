import { ApiError } from "@/lib/api/client";
import type {
  BackendVerificationEvidenceResponse,
  BackendVerificationRequestResponse,
  BackendVerificationRequestStatus,
  BackendVerificationTimelineEvent,
  BackendVerificationTimelineResponse,
} from "@/lib/api/verification-requests";
import type { BackendOrganizationMemberResponse } from "@/lib/api/organization-members";

export type VerificationInboxStatus =
  | "New"
  | "In Review"
  | "Clarification Requested"
  | "Confirmed"
  | "Rejected"
  | "Cancelled"
  | "Expired";

export interface VerificationTimelineItem {
  id: string;
  label: string;
  source: string;
  at: string;
  note?: string;
  eventType: string;
}

export interface VerificationEvidenceItem {
  id: string;
  evidenceType: string;
  fieldKey: string;
  value?: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  documentType?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  uploadStatus?: string;
  downloadUrl?: string;
  downloadUrlExpiresInSeconds?: number;
}

export interface VerificationReviewerOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface EmploymentVerificationRecord {
  id: string;
  candidateName: string;
  candidateEmail: string;
  backendStatus: BackendVerificationRequestStatus;
  status: VerificationInboxStatus;
  reviewStatus: "completed" | "clarification_requested" | "assigned" | "unassigned" | null;
  requestType: string;
  receivedAt: string;
  updatedAt: string;
  dueDate?: string;
  targetName?: string;
  targetEmail?: string;
  targetMetadata: Record<string, unknown>;
  organizationName?: string;
  organizationType?: string;
  organizationVerificationState?: string;
  organizationSuspended: boolean;
  claim: {
    employerName?: string;
    role?: string;
    startDate?: string;
    endDate?: string;
    employmentType?: string;
    workLocationCountry?: string;
    workLocationRegion?: string;
  };
  consentedFields: string[];
  consentedEvidenceScope: string[];
  candidateResponse?: string;
  candidateResponseSubmittedAt?: string;
  evidenceSummary: {
    totalItems: number;
    documentItems: number;
    fieldKeys: string[];
  };
  assignedReviewer?: {
    userId: string;
    fullName?: string;
    email: string;
    role: string;
  };
  isAssignedToCurrentUser: boolean;
  internalNote?: string;
}

const TYPE_LABELS: Record<string, string> = {
  employment: "Employment",
  education: "Education",
  identity: "Identity",
  document: "Document",
  license: "License",
  medical: "Medical",
  reference: "Reference",
  platform: "Platform",
  certification: "Certification",
  custom: "Custom",
};

const EVENT_LABELS: Record<string, string> = {
  verification_request_created: "Verification request created",
  verification_request_subject_accepted: "Candidate accepted request",
  verification_request_started: "Verification started",
  verification_request_information_requested: "Clarification requested",
  verification_request_information_submitted: "Candidate submitted clarification",
  verification_request_verified: "Verification completed",
  verification_request_rejected: "Verification rejected",
  verification_request_cancelled: "Verification cancelled",
  verification_request_reviewer_assigned: "Reviewer assignment updated",
  verification_request_internal_note_updated: "Internal note updated",
  verification_contact_added: "Verification contact added",
  candidate_updated_contact: "Candidate updated verification contact",
  evidence_uploaded: "Evidence uploaded",
  candidate_updated_evidence: "Candidate updated evidence",
  verification_connector_selected: "Verification provider selected",
  verification_connector_run_completed: "Verification run completed",
  verification_connector_run_failed: "Verification run failed",
  verification_connector_run_unavailable: "Verification provider unavailable",
  verification_request_resubmitted: "Candidate resubmitted request",
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function humanizeEventType(value: string) {
  return EVENT_LABELS[value] ?? titleCase(value.replace(/^verification_request_/, ""));
}

function sourceLabel(value: string) {
  switch (value) {
    case "candidate":
      return "Candidate";
    case "organization":
      return "Organization";
    case "admin":
      return "Admin";
    case "system":
      return "System";
    case "ai":
      return "Automation";
    default:
      return titleCase(value);
  }
}

function noteFromMetadata(metadata: Record<string, unknown>) {
  if (typeof metadata.note === "string" && metadata.note.trim()) {
    return metadata.note.trim();
  }

  if (typeof metadata.error_type === "string" && metadata.error_type.trim()) {
    return `Error: ${metadata.error_type.trim()}`;
  }

  return undefined;
}

export function getVerificationStatusLabel(
  backendStatus: BackendVerificationRequestStatus,
  reviewStatus: EmploymentVerificationRecord["reviewStatus"],
): VerificationInboxStatus {
  if (backendStatus === "verified") return "Confirmed";
  if (backendStatus === "rejected") return "Rejected";
  if (backendStatus === "cancelled") return "Cancelled";
  if (backendStatus === "expired") return "Expired";
  if (backendStatus === "awaiting_information" || reviewStatus === "clarification_requested") {
    return "Clarification Requested";
  }
  if (backendStatus === "in_progress" || reviewStatus === "assigned") return "In Review";
  return "New";
}

export function mapVerificationRecord(
  request: BackendVerificationRequestResponse,
): EmploymentVerificationRecord {
  const reviewStatus = request.review_status;
  return {
    id: request.public_id,
    candidateName: request.subject_name,
    candidateEmail: request.subject_email,
    backendStatus: request.status,
    status: getVerificationStatusLabel(request.status, reviewStatus),
    reviewStatus,
    requestType: TYPE_LABELS[request.request_type] ?? titleCase(request.request_type),
    receivedAt: request.created_at,
    updatedAt: request.updated_at,
    dueDate: request.due_date ?? undefined,
    targetName:
      request.verification_target?.organization_name ??
      request.target_organization_name ??
      undefined,
    targetEmail:
      request.verification_target?.organization_email ??
      request.target_organization_email ??
      undefined,
    targetMetadata:
      request.verification_target?.metadata ?? request.target_organization_metadata ?? {},
    organizationName: request.organization_summary?.name ?? undefined,
    organizationType: request.organization_summary?.organization_type ?? undefined,
    organizationVerificationState:
      request.organization_summary?.verification_state ?? undefined,
    organizationSuspended: Boolean(request.organization_summary?.suspended_at),
    claim: {
      employerName: request.employment_claim?.employer_name ?? undefined,
      role: request.employment_claim?.role ?? undefined,
      startDate: request.employment_claim?.start_date ?? undefined,
      endDate: request.employment_claim?.end_date ?? undefined,
      employmentType: request.employment_claim?.employment_type ?? undefined,
      workLocationCountry: request.employment_claim?.work_location_country ?? undefined,
      workLocationRegion: request.employment_claim?.work_location_region ?? undefined,
    },
    consentedFields: request.consented_fields,
    consentedEvidenceScope: request.consented_evidence_scope,
    candidateResponse: request.candidate_response ?? undefined,
    candidateResponseSubmittedAt: request.candidate_response_submitted_at ?? undefined,
    evidenceSummary: {
      totalItems: request.evidence_summary.total_items,
      documentItems: request.evidence_summary.document_items,
      fieldKeys: request.evidence_summary.field_keys,
    },
    assignedReviewer: request.assigned_reviewer
      ? {
          userId: request.assigned_reviewer.user_id,
          fullName: request.assigned_reviewer.full_name ?? undefined,
          email: request.assigned_reviewer.email,
          role: request.assigned_reviewer.role,
        }
      : undefined,
    isAssignedToCurrentUser: Boolean(request.is_assigned_to_current_user),
    internalNote: request.organization_internal_note ?? undefined,
  };
}

export function mapVerificationTimeline(
  timeline: BackendVerificationTimelineResponse,
): VerificationTimelineItem[] {
  return [...timeline.items]
    .map((event) => mapVerificationTimelineItem(event))
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
}

function mapVerificationTimelineItem(
  event: BackendVerificationTimelineEvent,
): VerificationTimelineItem {
  return {
    id: event.public_id,
    label: humanizeEventType(event.event_type),
    source: sourceLabel(event.event_source),
    at: event.created_at,
    note: noteFromMetadata(event.metadata),
    eventType: event.event_type,
  };
}

export function mapVerificationEvidenceItem(
  evidence: BackendVerificationEvidenceResponse,
): VerificationEvidenceItem {
  return {
    id: evidence.public_id,
    evidenceType: titleCase(evidence.evidence_type),
    fieldKey: evidence.field_key,
    value: evidence.value ?? undefined,
    status: titleCase(evidence.status),
    createdAt: evidence.created_at,
    updatedAt: evidence.updated_at,
    documentType: evidence.document_type ?? undefined,
    fileName: evidence.original_filename ?? undefined,
    mimeType: evidence.mime_type ?? undefined,
    fileSize: evidence.file_size ?? undefined,
    uploadStatus: evidence.upload_status ? titleCase(evidence.upload_status) : undefined,
    downloadUrl: evidence.download_url ?? undefined,
    downloadUrlExpiresInSeconds: evidence.download_url_expires_in_seconds ?? undefined,
  };
}

export function mapReviewerOptions(
  members: BackendOrganizationMemberResponse[],
): VerificationReviewerOption[] {
  return members
    .filter((member) => member.suspended_at == null)
    .map((member) => ({
      id: member.public_id,
      fullName: member.user_full_name ?? member.user_email,
      email: member.user_email,
      role: titleCase(member.role),
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName));
}

export function getVerificationNextAction(record: EmploymentVerificationRecord) {
  if (record.status === "Clarification Requested") {
    return { text: "Awaiting candidate response", owner: "Candidate" };
  }
  if (record.status === "Confirmed" || record.status === "Rejected") {
    return { text: "Delivered to workspace", owner: "None" };
  }
  if (record.status === "Cancelled" || record.status === "Expired") {
    return { text: "Closed", owner: "None" };
  }
  if (record.reviewStatus === "assigned" || record.status === "In Review") {
    return { text: "Submit verification", owner: "Us" };
  }
  return { text: "Assign a reviewer", owner: "Us" };
}

export function getVerificationStatusTone(status: VerificationInboxStatus) {
  switch (status) {
    case "Confirmed":
      return "success";
    case "Rejected":
    case "Cancelled":
    case "Expired":
      return "destructive";
    case "Clarification Requested":
      return "warning";
    case "In Review":
      return "info";
    default:
      return "default";
  }
}

export function matchesVerificationStatusFilter(
  record: EmploymentVerificationRecord,
  status: string,
) {
  return status === "all" ? true : record.status === status;
}

export function matchesVerificationTargetFilter(
  record: EmploymentVerificationRecord,
  targetName: string,
) {
  const currentTarget = record.targetName ?? record.organizationName ?? "";
  return targetName === "all" ? true : currentTarget === targetName;
}

export function matchesVerificationSearch(record: EmploymentVerificationRecord, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return [
    record.id,
    record.candidateName,
    record.candidateEmail,
    record.organizationName ?? "",
    record.targetName ?? "",
    record.targetEmail ?? "",
    record.claim.role ?? "",
    record.assignedReviewer?.fullName ?? "",
    record.assignedReviewer?.email ?? "",
  ].some((value) => value.toLowerCase().includes(query));
}

export function ageInDays(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400e3));
}

export function canReviewVerification(record: EmploymentVerificationRecord) {
  return !["Confirmed", "Rejected", "Cancelled", "Expired"].includes(record.status);
}

export function formatMetadataEntries(metadata: Record<string, unknown>) {
  return Object.entries(metadata)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => ({
      label: titleCase(key),
      value:
        typeof value === "string"
          ? value
          : typeof value === "number" || typeof value === "boolean"
            ? String(value)
            : JSON.stringify(value),
    }));
}

export function formatFileSize(bytes: number | undefined) {
  if (!bytes || bytes <= 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getVerificationErrorMessage(error: unknown, fallback: string) {
  const offline =
    typeof navigator !== "undefined" &&
    "onLine" in navigator &&
    navigator.onLine === false;

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
