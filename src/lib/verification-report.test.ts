import { describe, expect, it } from "vitest";
import type { BackendOrganizationPersonDetailResponse } from "@/lib/api/organization-people";
import type {
  BackendVerificationEvidenceResponse,
  BackendVerificationRequestResponse,
} from "@/lib/api/verification-requests";
import { buildVerificationReportModel, maskEmail, maskPhone } from "@/lib/verification-report";

const person: BackendOrganizationPersonDetailResponse = {
  id: "internal-person",
  public_id: "person-123",
  summary: {
    full_name: "Aman Joshi",
    email: "aman.joshi@example.com",
    phone: "+91 98765 43210",
    linked_user_id: "user-123",
  },
  passport_preview: {
    status: "active",
    shared_at: "2026-08-01T00:00:00Z",
    expires_at: null,
    revoked_at: null,
    permissions: {},
    claims: [{ label: "Trust Score", value: "82/100", status: "verified", source: "KairoID" }],
  },
  verification_summary: {
    latest_status: "in_verification",
    total_requests: 2,
    completed_requests: 1,
    active_requests: 1,
    clarification_required_requests: 0,
  },
  employment_verifications: [],
  shared_evidence: [],
  activity: [],
  internal_notes: [],
  organization_relationship: {
    relationship: "employee",
    trust_state: "partially_verified",
    invitation_status: "accepted",
    verification_status: "in_verification",
    passport_status: "active",
    added_by: "HR Owner",
    added_at: "2026-08-01T00:00:00Z",
    last_activity_at: "2026-08-03T00:00:00Z",
    resolution_state: "resolved",
    resolution_method: "email",
    resolution_confidence: 1,
    resolution_metadata: {},
  },
};

function request(
  type: BackendVerificationRequestResponse["request_type"],
  status: BackendVerificationRequestResponse["status"],
): BackendVerificationRequestResponse {
  return {
    public_id: `request-${type}`,
    employment_id: type === "employment" ? "employment-1" : null,
    origin_type: "trust_invitation",
    organization_public_id: "org-1",
    trust_invitation_public_id: "invitation-1",
    subject_name: "Aman Joshi",
    subject_email: "aman.joshi@example.com",
    target_organization_name: "Acme Limited",
    target_organization_email: "hr@acme.test",
    request_type: type,
    status,
    due_date: null,
    trust_context: {},
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-03T00:00:00Z",
    candidate_response: null,
    candidate_response_submitted_at: null,
    accepted_at: "2026-08-01T01:00:00Z",
    consented_at: "2026-08-01T01:00:00Z",
    consented_fields: [],
    consented_evidence_scope: [],
    target_organization_metadata: {},
    organization_summary: null,
    verification_target: null,
    employment_claim:
      type === "employment"
        ? {
            employer_name: "Example Employer",
            role: "Engineer",
            start_date: "2024-01-01",
            end_date: null,
            employment_type: "full_time",
            work_location_country: "India",
            work_location_region: "Delhi",
          }
        : null,
    evidence_summary: { total_items: 0, document_items: 0, field_keys: [] },
    assigned_reviewer: null,
    review_status: null,
    is_assigned_to_current_user: false,
    organization_internal_note: null,
  };
}

const evidence: BackendVerificationEvidenceResponse = {
  public_id: "evidence-safe-id",
  evidence_type: "document",
  field_key: "employment.role",
  document_id: "document-internal-id",
  employment_document_id: null,
  value: {
    role: "Senior Engineer",
    aadhaar_number: "1234 5678 9012",
    raw_url: "https://private.example/secret",
  },
  status: "accepted",
  created_at: "2026-08-02T00:00:00Z",
  updated_at: "2026-08-02T00:00:00Z",
  document_type: "offer_letter",
  original_filename: "offer-letter.pdf",
  mime_type: "application/pdf",
  file_size: 100,
  upload_status: "completed",
  download_url: "https://private.example/download",
  download_url_expires_in_seconds: 300,
};

describe("verification report model", () => {
  it("masks private contact identifiers", () => {
    expect(maskEmail("aman.joshi@example.com")).toBe("am********@example.com");
    expect(maskPhone("+91 98765 43210")).toBe("********3210");
  });

  it("supports confirmed, pending, interim, HR review, and omits unordered checks", () => {
    const report = buildVerificationReportModel({
      person,
      organizationName: "Acme Limited",
      roster: null,
      requests: [
        { request: request("employment", "verified"), timeline: [], evidence: [evidence] },
        { request: request("reference", "in_progress"), timeline: [], evidence: [] },
      ],
    });

    expect(report.state).toBe("Interim");
    expect(report.trustScore).toBe(82);
    expect(report.checks.map((check) => check.title)).toEqual(["Employment", "References"]);
    expect(report.checks.map((check) => check.outcome)).toEqual(["confirmed", "awaiting_response"]);
    expect(report.checks.some((check) => check.title === "Education")).toBe(false);
    expect(report.requiresHrReview).toBe(true);
    expect(JSON.stringify(report)).not.toContain("private.example");
    expect(JSON.stringify(report)).not.toContain("1234 5678 9012");
    expect(JSON.stringify(report)).toContain("********9012");
  });

  it("supports discrepancy and final report semantics", () => {
    const report = buildVerificationReportModel({
      person,
      organizationName: "Acme Limited",
      roster: null,
      requests: [
        {
          request: request("employment", "verified"),
          timeline: [
            {
              public_id: "event-1",
              event_type: "hr_response_discrepancy_reported",
              event_source: "organization",
              previous_status: "in_progress",
              new_status: "verified",
              metadata: { note: "Role differs from employer record." },
              created_at: "2026-08-03T00:00:00Z",
            },
          ],
          evidence: [],
        },
      ],
    });

    expect(report.state).toBe("Final");
    expect(report.checks[0].outcome).toBe("discrepancy");
    expect(report.requiresHrReview).toBe(true);
  });
});
