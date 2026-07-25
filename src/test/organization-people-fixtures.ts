import type { PeopleDirectoryResponse, PersonDetailRecord } from "@/lib/organization-people";

export function makePeopleDirectoryResponse(
  overrides: Partial<PeopleDirectoryResponse> = {},
): PeopleDirectoryResponse {
  return {
    items: [
      {
        id: "person_internal_1",
        publicId: "person_123",
        name: "Aman Joshi",
        fullName: "Aman Joshi",
        email: "aman@example.com",
        phone: "+91 90000 00000",
        initials: "AJ",
        relationship: "Candidate",
        invitationStatus: "Sent",
        verificationStatus: "In Verification",
        passportStatus: "Active",
        trustState: "Verified",
        addedBy: "Riya Kapoor",
        addedAt: "2026-07-20T10:00:00.000Z",
        lastActivityAt: "2026-07-24T10:00:00.000Z",
        summaryCounts: {
          invitations: 1,
          verificationRequests: 1,
          sharedEvidenceItems: 1,
          internalNotes: 1,
        },
      },
    ],
    total: 1,
    page: 1,
    pageSize: 100,
    totalPages: 1,
    summary: {
      totalPeople: 1,
      byRelationship: { candidate: 1 },
      byInvitationStatus: { sent: 1 },
      byVerificationStatus: { in_verification: 1 },
      byPassportStatus: { active: 1 },
      byTrustState: { verified: 1 },
    },
    ...overrides,
  };
}

export function makePersonDetailRecord(
  overrides: Partial<PersonDetailRecord> = {},
): PersonDetailRecord {
  return {
    id: "person_internal_1",
    publicId: "person_123",
    fullName: "Aman Joshi",
    email: "aman@example.com",
    phone: "+91 90000 00000",
    linkedUserId: "user_123",
    relationship: "Candidate",
    invitationStatus: "Accepted",
    verificationStatus: "Completed",
    passportStatus: "Active",
    trustState: "Verified",
    addedBy: "Riya Kapoor",
    addedAt: "2026-07-20T10:00:00.000Z",
    lastActivityAt: "2026-07-24T10:00:00.000Z",
    resolutionState: "resolved",
    resolutionMethod: "email_match",
    resolutionConfidence: 1,
    resolutionMetadata: {},
    passportPreview: {
      status: "Active",
      sharedAt: "2026-07-21T10:00:00.000Z",
      expiresAt: "2026-08-21T10:00:00.000Z",
      revokedAt: null,
      permissions: { view_claims: true },
      claims: [
        {
          label: "Most recent employer",
          value: "Kairo",
          status: "Verified",
          source: "Employer records",
        },
      ],
    },
    verificationSummary: {
      latestStatus: "Completed",
      totalRequests: 1,
      completedRequests: 1,
      activeRequests: 0,
      clarificationRequiredRequests: 0,
    },
    employmentVerifications: [
      {
        id: "employment_verification_1",
        publicId: "verification_1",
        requestPublicId: "verification_request_1",
        status: "Completed",
        requestedBy: "Priya Singh",
        requestedAt: "2026-07-22T10:00:00.000Z",
        requestType: "Employment Verification",
      },
    ],
    sharedEvidence: [
      {
        id: "evidence_1",
        publicId: "evidence_public_1",
        requestPublicId: "verification_request_1",
        type: "offer_letter",
        sharedAt: "2026-07-22T10:00:00.000Z",
        status: "Available",
        originalFilename: "offer-letter.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        downloadUrl: "https://example.com/evidence.pdf",
        downloadUrlExpiresInSeconds: 300,
      },
    ],
    activity: [
      {
        id: "activity_1",
        kind: "accepted",
        label: "Invitation accepted",
        actor: "Aman Joshi",
        at: "2026-07-22T10:00:00.000Z",
        requestPublicId: "verification_request_1",
        sourceType: "trust_invitation",
        sourcePublicId: "invitation_1",
      },
    ],
    internalNotes: [
      {
        id: "note_1",
        publicId: "note_public_1",
        author: "Riya Kapoor",
        authorUserId: "user_1",
        body: "Strong match on submitted evidence.",
        at: "2026-07-24T10:00:00.000Z",
        createdAt: "2026-07-24T10:00:00.000Z",
        updatedAt: "2026-07-24T10:00:00.000Z",
        ownedByCurrentUser: true,
      },
    ],
    ...overrides,
  };
}
