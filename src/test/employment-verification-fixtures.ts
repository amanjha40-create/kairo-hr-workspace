import type {
  EmploymentVerificationRecord,
  VerificationEvidenceItem,
  VerificationReviewerOption,
  VerificationTimelineItem,
} from "@/lib/employment-verifications";
import type { BackendVerificationRequestResponse } from "@/lib/api/verification-requests";

export function makeEmploymentVerificationRecord(
  overrides: Partial<EmploymentVerificationRecord> = {},
): EmploymentVerificationRecord {
  return {
    id: "vr_123",
    candidateName: "Aman Joshi",
    candidateEmail: "aman@example.com",
    backendStatus: "in_progress",
    status: "In Review",
    reviewStatus: "assigned",
    requestType: "Employment",
    receivedAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-24T10:30:00.000Z",
    dueDate: "2026-07-31",
    targetName: "Kairo Labs",
    targetEmail: "hr@kairo.example",
    targetMetadata: { department: "People Operations" },
    organizationName: "Kairo Labs",
    organizationType: "employer",
    organizationVerificationState: "verified",
    organizationSuspended: false,
    claim: {
      employerName: "Kairo Labs",
      role: "Frontend Engineer",
      startDate: "2023-01-03",
      endDate: nullish(undefined),
      employmentType: "Full-time",
      workLocationCountry: "India",
      workLocationRegion: "Karnataka",
    },
    consentedFields: ["role", "employment_dates"],
    consentedEvidenceScope: ["employment_letter", "payroll_record"],
    candidateResponse: "Employment dates confirmed.",
    candidateResponseSubmittedAt: "2026-07-23T09:30:00.000Z",
    evidenceSummary: {
      totalItems: 2,
      documentItems: 1,
      fieldKeys: ["employment_letter", "role"],
    },
    assignedReviewer: {
      userId: "user_123",
      fullName: "Nisha Patel",
      email: "nisha@kairo.example",
      role: "admin",
    },
    isAssignedToCurrentUser: false,
    internalNote: "Internal note",
    ...overrides,
  };
}

export function makeVerificationTimelineItem(
  overrides: Partial<VerificationTimelineItem> = {},
): VerificationTimelineItem {
  return {
    id: "vt_123",
    label: "Verification request created",
    source: "Organization",
    at: "2026-07-20T10:00:00.000Z",
    note: undefined,
    eventType: "verification_request_created",
    ...overrides,
  };
}

export function makeVerificationEvidenceItem(
  overrides: Partial<VerificationEvidenceItem> = {},
): VerificationEvidenceItem {
  return {
    id: "ve_123",
    evidenceType: "Document",
    fieldKey: "employment_letter",
    value: { employer_name: "Kairo Labs" },
    status: "Approved",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-24T10:30:00.000Z",
    documentType: "employment_letter",
    fileName: "employment-letter.pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    uploadStatus: "Uploaded",
    downloadUrl: "https://example.com/download",
    downloadUrlExpiresInSeconds: 3600,
    ...overrides,
  };
}

export function makeReviewerOption(
  overrides: Partial<VerificationReviewerOption> = {},
): VerificationReviewerOption {
  return {
    id: "member_123",
    fullName: "Nisha Patel",
    email: "nisha@kairo.example",
    role: "Admin",
    ...overrides,
  };
}

export function makeBackendVerificationRequestResponse(
  overrides: Partial<BackendVerificationRequestResponse> = {},
): BackendVerificationRequestResponse {
  return {
    public_id: "vr_123",
    employment_id: null,
    origin_type: "subject_initiated",
    organization_public_id: "org_123",
    trust_invitation_public_id: null,
    subject_name: "Aman Joshi",
    subject_email: "aman@example.com",
    target_organization_name: "Kairo Labs",
    target_organization_email: "hr@kairo.example",
    request_type: "employment",
    status: "in_progress",
    due_date: "2026-07-31",
    trust_context: {},
    created_at: "2026-07-20T10:00:00.000Z",
    updated_at: "2026-07-24T10:30:00.000Z",
    candidate_response: "Employment dates confirmed.",
    candidate_response_submitted_at: "2026-07-23T09:30:00.000Z",
    accepted_at: "2026-07-21T10:00:00.000Z",
    consented_fields: ["role", "employment_dates"],
    consented_evidence_scope: ["employment_letter", "payroll_record"],
    target_organization_metadata: { department: "People Operations" },
    organization_summary: {
      public_id: "org_123",
      name: "Kairo Labs",
      organization_type: "employer",
      verification_state: "verified",
      suspended_at: null,
    },
    verification_target: {
      organization_name: "Kairo Labs",
      organization_email: "hr@kairo.example",
      metadata: { department: "People Operations" },
    },
    employment_claim: {
      employer_name: "Kairo Labs",
      role: "Frontend Engineer",
      start_date: "2023-01-03",
      end_date: null,
      employment_type: "Full-time",
      work_location_country: "India",
      work_location_region: "Karnataka",
    },
    evidence_summary: {
      total_items: 2,
      document_items: 1,
      field_keys: ["employment_letter", "role"],
    },
    assigned_reviewer: {
      user_id: "user_123",
      full_name: "Nisha Patel",
      email: "nisha@kairo.example",
      role: "admin",
    },
    review_status: "assigned",
    is_assigned_to_current_user: false,
    organization_internal_note: "Internal note",
    ...overrides,
  };
}

function nullish<T>(value: T) {
  return value;
}
