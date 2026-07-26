import { ApiError } from "@/lib/api/client";
import type { InvitationStatus } from "@/lib/workspace-types";
import type {
  BackendTrustInvitationCreateResponse,
  BackendTrustInvitationDeliveryState,
  BackendTrustInvitationDetailResponse,
  BackendTrustInvitationEventType,
  BackendTrustInvitationResponse,
  BackendTrustInvitationStatus,
  BackendTrustInvitationSummaryResponse,
  BackendTrustInvitationTimelineEvent,
  BackendTrustInvitationVerificationType,
} from "@/lib/api/trust-invitations";

export type VerificationTypeKey = BackendTrustInvitationVerificationType;

export const VERIFICATION_TYPES: Array<{
  key: VerificationTypeKey;
  label: string;
  description: string;
}> = [
  {
    key: "identity",
    label: "Identity",
    description: "Government-issued ID, name and date of birth.",
  },
  {
    key: "employment",
    label: "Employment",
    description: "Employer, role, dates and employment status.",
  },
  {
    key: "education",
    label: "Education",
    description: "Institution, degree, dates and graduation status.",
  },
  {
    key: "certification",
    label: "Certification",
    description: "Professional certifications and licenses.",
  },
  {
    key: "professional_reference",
    label: "Professional Reference",
    description: "Manager or colleague references.",
  },
];

export const PURPOSE_ROLL = [
  "Software Engineer Hiring",
  "Employment Verification",
  "Contractor Onboarding",
  "Internship Verification",
  "Executive Hiring",
  "Product Designer Hiring",
  "Sales Lead Hiring",
];

export interface TrustInvitationTimelineItem {
  id: string;
  kind: BackendTrustInvitationEventType;
  label: string;
  actor: string;
  at: string;
  note?: string;
}

export interface TrustInvitationRecord {
  id: string;
  organizationPublicId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateInitials: string;
  purpose?: string;
  requestedVerifications: VerificationTypeKey[];
  message?: string;
  status: InvitationStatus;
  backendStatus: BackendTrustInvitationStatus;
  deliveryState: BackendTrustInvitationDeliveryState;
  deliveryLabel: string;
  deliveryMethod: string;
  createdByEmail: string;
  createdByName: string;
  expiresAt: string;
  sentAt?: string;
  openedAt?: string;
  acceptedAt?: string;
  cancelledAt?: string;
  relatedVerificationRequestPublicId?: string;
  createdAt: string;
  updatedAt: string;
  invitationUrl?: string;
  timeline: TrustInvitationTimelineItem[];
}

export interface TrustInvitationSummary {
  active: number;
  awaiting: number;
  accepted: number;
  expiring: number;
  draft: number;
}

const VERIFICATION_LABELS = Object.fromEntries(
  VERIFICATION_TYPES.map((type) => [type.key, type.label]),
) as Record<VerificationTypeKey, string>;

const TIMELINE_LABELS: Record<BackendTrustInvitationEventType, string> = {
  created: "Draft created",
  sent: "Invitation sent",
  resent: "Reminder sent",
  opened: "Invitation opened",
  accepted: "Invitation accepted",
  cancelled: "Invitation cancelled",
  expired: "Invitation expired",
  delivery_failed: "Delivery failed",
  deleted: "Draft deleted",
};

export function getVerificationLabel(value: VerificationTypeKey) {
  return VERIFICATION_LABELS[value];
}

export function mapBackendInvitationStatus(
  status: BackendTrustInvitationStatus,
  deliveryState: BackendTrustInvitationDeliveryState,
): InvitationStatus {
  if (status === "draft") return "Draft";
  if (status === "accepted") return "Accepted";
  if (status === "cancelled") return "Cancelled";
  if (status === "expired") return "Expired";
  return deliveryState === "opened" ? "Opened" : "Sent";
}

export function mapDeliveryStateLabel(state: BackendTrustInvitationDeliveryState) {
  switch (state) {
    case "queued":
      return "Queued";
    case "delivered":
      return "Delivered";
    case "opened":
      return "Opened";
    case "failed":
      return "Delivery Failed";
  }
}

function buildInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function mapTimelineItem(event: BackendTrustInvitationTimelineEvent): TrustInvitationTimelineItem {
  return {
    id: event.id,
    kind: event.event_type,
    label: TIMELINE_LABELS[event.event_type],
    actor: event.actor_full_name ?? event.actor_email ?? "System",
    at: event.occurred_at,
    note: event.metadata?.error_type ? `Error: ${String(event.metadata.error_type)}` : undefined,
  };
}

function mapInvitationBase(
  invitation:
    | BackendTrustInvitationResponse
    | BackendTrustInvitationCreateResponse
    | BackendTrustInvitationDetailResponse,
) {
  return {
    id: invitation.public_id,
    organizationPublicId: invitation.organization_public_id,
    candidateName: invitation.subject_name,
    candidateEmail: invitation.subject_email,
    candidatePhone: invitation.subject_phone ?? undefined,
    candidateInitials: buildInitials(invitation.subject_name),
    purpose: invitation.purpose ?? undefined,
    requestedVerifications: invitation.requested_verification_types,
    message: invitation.message ?? undefined,
    status: mapBackendInvitationStatus(invitation.status, invitation.delivery_state),
    backendStatus: invitation.status,
    deliveryState: invitation.delivery_state,
    deliveryLabel: mapDeliveryStateLabel(invitation.delivery_state),
    deliveryMethod: invitation.delivery_method,
    createdByEmail: invitation.created_by_email,
    createdByName: invitation.created_by_full_name ?? invitation.created_by_email,
    expiresAt: invitation.expires_at,
    sentAt: invitation.sent_at ?? undefined,
    openedAt: invitation.opened_at ?? undefined,
    acceptedAt: invitation.accepted_at ?? undefined,
    cancelledAt: invitation.cancelled_at ?? undefined,
    relatedVerificationRequestPublicId:
      invitation.related_verification_request_public_id ?? undefined,
    createdAt: invitation.created_at,
    updatedAt: invitation.updated_at,
  };
}

export function mapInvitationRecord(
  invitation: BackendTrustInvitationResponse,
): TrustInvitationRecord {
  return {
    ...mapInvitationBase(invitation),
    timeline: [],
  };
}

export function mapInvitationDetail(
  invitation: BackendTrustInvitationDetailResponse,
): TrustInvitationRecord {
  return {
    ...mapInvitationBase(invitation),
    invitationUrl: invitation.invitation_url,
    timeline: invitation.timeline
      .map(mapTimelineItem)
      .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime()),
  };
}

export function mapInvitationCreateResult(
  invitation: BackendTrustInvitationCreateResponse,
): TrustInvitationRecord {
  return {
    ...mapInvitationBase(invitation),
    invitationUrl: invitation.invitation_url,
    timeline: [],
  };
}

export function mapInvitationSummary(
  summary: BackendTrustInvitationSummaryResponse,
): TrustInvitationSummary {
  return {
    active: summary.active_count,
    awaiting: summary.active_count,
    accepted: summary.accepted_count,
    expiring: summary.expiring_soon_count,
    draft: summary.draft_count,
  };
}

export function mapUiStatusToBackendFilter(status: string) {
  switch (status) {
    case "Draft":
      return "draft" as const;
    case "Sent":
    case "Opened":
      return "pending" as const;
    case "Accepted":
      return "accepted" as const;
    case "Cancelled":
      return "cancelled" as const;
    case "Expired":
      return "expired" as const;
    default:
      return undefined;
  }
}

export function matchesUiStatusFilter(invitation: TrustInvitationRecord, status: string) {
  return status === "all" ? true : invitation.status === status;
}

export function matchesPurposeFilter(invitation: TrustInvitationRecord, purpose: string) {
  return purpose === "all" ? true : invitation.purpose === purpose;
}

export function matchesVerificationFilter(
  invitation: TrustInvitationRecord,
  verificationType: string,
) {
  return verificationType === "all"
    ? true
    : invitation.requestedVerifications.includes(verificationType as VerificationTypeKey);
}

export function formatVerificationList(values: VerificationTypeKey[]) {
  return values.map(getVerificationLabel);
}

export function getTrustInvitationErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
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
