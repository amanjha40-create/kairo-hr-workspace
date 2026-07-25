import type {
  BackendTrustInvitationCreateResponse,
  BackendTrustInvitationDetailResponse,
} from "@/lib/api/trust-invitations";
import type { TrustInvitationRecord } from "@/lib/trust-invitations";

export function makeTrustInvitationRecord(
  overrides: Partial<TrustInvitationRecord> = {},
): TrustInvitationRecord {
  return {
    id: "ti_123",
    organizationPublicId: "org_123",
    candidateName: "Aman Joshi",
    candidateEmail: "aman@example.com",
    candidatePhone: "+91 9876543210",
    candidateInitials: "AJ",
    purpose: "Software Engineer Hiring",
    requestedVerifications: ["identity", "employment"],
    message: "Please complete this verification.",
    status: "Sent",
    backendStatus: "pending",
    deliveryState: "delivered",
    deliveryLabel: "Delivered",
    deliveryMethod: "email",
    createdByEmail: "owner@example.com",
    createdByName: "Owner Example",
    expiresAt: "2026-07-31T10:00:00.000Z",
    sentAt: "2026-07-24T09:00:00.000Z",
    openedAt: undefined,
    acceptedAt: undefined,
    cancelledAt: undefined,
    relatedVerificationRequestPublicId: undefined,
    createdAt: "2026-07-24T08:00:00.000Z",
    updatedAt: "2026-07-24T09:00:00.000Z",
    invitationUrl: "https://trust.kairo.dev/invitations/ti_123",
    timeline: [
      {
        id: "event_1",
        kind: "sent",
        label: "Invitation sent",
        actor: "Owner Example",
        at: "2026-07-24T09:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

export function makeTrustInvitationDetailResponse(
  overrides: Partial<BackendTrustInvitationDetailResponse> = {},
): BackendTrustInvitationDetailResponse {
  return {
    public_id: "ti_123",
    organization_public_id: "org_123",
    subject_name: "Aman Joshi",
    subject_email: "aman@example.com",
    subject_phone: "+91 9876543210",
    purpose: "Software Engineer Hiring",
    requested_verification_types: ["identity", "employment"],
    message: "Please complete this verification.",
    status: "pending",
    delivery_method: "email",
    delivery_state: "delivered",
    created_by_email: "owner@example.com",
    created_by_full_name: "Owner Example",
    expires_at: "2026-07-31T10:00:00.000Z",
    sent_at: "2026-07-24T09:00:00.000Z",
    opened_at: null,
    accepted_at: null,
    cancelled_at: null,
    related_verification_request_public_id: null,
    created_at: "2026-07-24T08:00:00.000Z",
    updated_at: "2026-07-24T09:00:00.000Z",
    invitation_url: "https://trust.kairo.dev/invitations/ti_123",
    timeline: [
      {
        id: "event_1",
        event_type: "sent",
        occurred_at: "2026-07-24T09:00:00.000Z",
        actor_user_id: "user_123",
        actor_email: "owner@example.com",
        actor_full_name: "Owner Example",
        metadata: {},
      },
    ],
    ...overrides,
  };
}

export function makeTrustInvitationCreateResponse(
  overrides: Partial<BackendTrustInvitationCreateResponse> = {},
): BackendTrustInvitationCreateResponse {
  return {
    ...makeTrustInvitationDetailResponse(overrides),
  };
}
