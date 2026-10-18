import { describe, expect, it } from "vitest";
import type { BackendVerificationReport } from "@/lib/api/hr-v2";
import { mapStructuredVerificationReport } from "@/lib/verification-report";

function reportFixture(): BackendVerificationReport {
  return {
    schema_version: "hr_verification_report_v1",
    header: {
      person_name: "Aman Joshi",
      role: "Software Engineer",
      person_id: "person-1",
      initiated_at: "2026-10-01T10:00:00Z",
      requested_by_organization: "Acme Limited",
      masked_email: "am***@example.com",
      masked_phone: "******1234",
      consent_at: "2026-10-01T10:05:00Z",
      trust_score: 84,
      report_updated_at: "2026-10-18T10:00:00Z",
      report_status: "INTERIM",
    },
    check_summaries: [
      {
        check: "identity",
        status: "DETAILS_MATCHED",
        updated_at: null,
        display_text: "Details matched",
      },
      { check: "employment", status: "DISCREPANCY", updated_at: null, display_text: "Review" },
      { check: "education", status: "CONFIRMED", updated_at: null, display_text: "Confirmed" },
      {
        check: "references",
        status: "AWAITING_RESPONSE",
        updated_at: null,
        display_text: "Awaiting response",
      },
      { check: "address", status: "PENDING", updated_at: null, display_text: "Pending" },
      {
        check: "court_record_search",
        status: "NOT_ORDERED",
        updated_at: null,
        display_text: "Not ordered",
      },
      {
        check: "platform",
        status: "UNABLE_TO_VERIFY",
        updated_at: null,
        display_text: "Unable to verify",
      },
      { check: "custom", status: "REJECTED", updated_at: null, display_text: "Rejected" },
    ],
    identity: [
      {
        declared_values: { name: "Aman Joshi", aadhaar: "123456789012" },
        verified_values: { name: "Aman Joshi", aadhaar: "123456789012" },
        source: "identity_document",
        reviewed_at: "2026-10-02T10:00:00Z",
        evidence_id: "evidence-identity",
        status: "DETAILS_MATCHED",
        remarks: "Document details matched",
      },
    ],
    employment: [
      {
        organization: "Example Labs",
        masked_employee_id: "*****1234",
        declared_title: "Engineer",
        confirmed_title: "Senior Engineer",
        declared_start_date: "2022-01-01",
        declared_end_date: null,
        confirmed_start_date: "2022-02-01",
        confirmed_end_date: null,
        employment_type: "full_time",
        confirmed_by: "HR",
        source: "employer_response",
        received_at: "2026-10-03T10:00:00Z",
        evidence_id: "evidence-employment",
        reviewer: "Reviewer",
        remarks: "Start date differs",
        status: "DISCREPANCY",
      },
    ],
    education: [
      {
        qualification: "B.Tech",
        institution: "Example Institute",
        university: "Example University",
        completion_year: 2021,
        declared_values: {},
        confirmed_values: {},
        source: "institution",
        confirmation_date: "2026-10-04T10:00:00Z",
        evidence_id: "evidence-education",
        status: "CONFIRMED",
      },
    ],
    references: [
      {
        name: "Reference One",
        title_or_relationship: "Former manager",
        organization: "Example Labs",
        known_for: "3 years",
        request_date: "2026-10-05T10:00:00Z",
        follow_up_dates: ["2026-10-10T10:00:00Z"],
        response_date: null,
        status: "AWAITING_RESPONSE",
        strengths: null,
        development_areas: null,
        rehire_response: null,
        comments: "No response yet",
        evidence_id: null,
      },
    ],
    address: [
      {
        declared_address: "Bengaluru, Karnataka",
        verification_method: "document",
        verified_at: null,
        status: "PENDING",
        scope: "Document review only",
        physical_visit_performed: false,
        evidence_id: null,
      },
    ],
    court_search: [
      {
        safe_subject_display: null,
        scope: null,
        search_period: null,
        searched_at: null,
        source: null,
        finding: null,
        evidence_id: null,
        reviewer: null,
        remarks: null,
        limitations: "No authoritative court-search source was ordered.",
        status: "NOT_ORDERED",
      },
    ],
    open_items: [
      {
        code: "REFERENCE_AWAITING_RESPONSE",
        check: "references",
        display_text: "One reference is awaiting response.",
        request_public_id: "request-1",
      },
    ],
    hr_review_required: true,
    metadata: { internal_notes: "must not enter the frontend model" },
  };
}

describe("structured HR verification report adapter", () => {
  it("maps the backend-authoritative header, states, details, and open items", () => {
    const model = mapStructuredVerificationReport(reportFixture());

    expect(model).toMatchObject({
      candidateName: "Aman Joshi",
      candidateRole: "Software Engineer",
      organizationName: "Acme Limited",
      state: "Interim",
      trustScore: 84,
      requiresHrReview: true,
      openItems: ["One reference is awaiting response."],
    });
    expect(model.checks.map((check) => check.outcome)).toEqual([
      "matched",
      "discrepancy",
      "confirmed",
      "awaiting_response",
      "pending",
      "not_ordered",
      "unable",
      "rejected",
    ]);
    expect(model.checks.find((check) => check.type === "employment")?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Title",
          declaredValue: "Engineer",
          verifiedValue: "Senior Engineer",
        }),
      ]),
    );
    expect(model.checks.find((check) => check.type === "identity")?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Aadhaar", declaredValue: "********9012" }),
      ]),
    );
    expect(model.checks.find((check) => check.type === "education")?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Qualification", declaredValue: "B.Tech" }),
      ]),
    );
    expect(model.checks.find((check) => check.type === "references")?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Name", declaredValue: "Reference One" }),
      ]),
    );
    expect(model.checks.find((check) => check.type === "address")?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Declared address",
          declaredValue: "Bengaluru, Karnataka",
        }),
      ]),
    );
    expect(model.checks.find((check) => check.type === "court_record_search")?.notes).toEqual([
      "No authoritative court-search source was ordered.",
    ]);
  });

  it("maps canonical court summaries to the existing court detail collection", () => {
    const fixture = reportFixture();
    const summary = fixture.check_summaries.find((item) => item.check === "court_record_search");
    if (!summary) throw new Error("Missing court summary fixture");
    summary.status = "CONFIRMED";
    summary.display_text = "No matching records found";
    fixture.court_search = [
      {
        safe_subject_display: "A*** J***",
        scope: "District and High Court indexes",
        search_period: "2016–2026",
        searched_at: "2026-10-17T10:00:00Z",
        source: "Authorized court index",
        finding: "No matching records found",
        evidence_id: "evidence-court-safe",
        reviewer: "Authorized reviewer",
        remarks: "Search completed against the stated scope.",
        limitations: "Name-based search; identity correlation remains limited.",
        status: "CONFIRMED",
      },
    ];

    const court = mapStructuredVerificationReport(fixture).checks.find(
      (check) => check.type === "court_record_search",
    );

    expect(court).toMatchObject({
      title: "Court-record search",
      outcome: "confirmed",
      evidence: [
        {
          id: "evidence-court-safe",
          status: "CONFIRMED",
          recordedAt: "2026-10-17T10:00:00Z",
        },
      ],
      notes: ["Name-based search; identity correlation remains limited."],
    });
    expect(court?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Subject", declaredValue: "A*** J***" }),
        expect.objectContaining({
          label: "Scope",
          declaredValue: "District and High Court indexes",
        }),
        expect.objectContaining({ label: "Search period", declaredValue: "2016–2026" }),
        expect.objectContaining({ label: "Source", declaredValue: "Authorized court index" }),
        expect.objectContaining({ label: "Finding", declaredValue: "No matching records found" }),
        expect.objectContaining({
          label: "Remarks",
          declaredValue: "Search completed against the stated scope.",
        }),
      ]),
    );
  });

  it("omits empty Court source and remarks fields without blank report noise", () => {
    const fixture = reportFixture();
    const court = mapStructuredVerificationReport(fixture).checks.find(
      (check) => check.type === "court_record_search",
    );

    expect(court?.fields.some((field) => field.label === "Source")).toBe(false);
    expect(court?.fields.some((field) => field.label === "Remarks")).toBe(false);
  });

  it.each([
    ["NOT_ORDERED", "not_ordered", "Search not ordered"],
    ["PENDING", "pending", "Search pending"],
    ["CONFIRMED", "confirmed", "No matching records found"],
    ["DISCREPANCY", "discrepancy", "Potential match requires HR review"],
  ] as const)("maps court %s to %s", (status, outcome, finding) => {
    const fixture = reportFixture();
    const summary = fixture.check_summaries.find((item) => item.check === "court_record_search");
    if (!summary) throw new Error("Missing court summary fixture");
    summary.status = status;
    fixture.court_search[0] = { ...fixture.court_search[0], status, finding };

    const court = mapStructuredVerificationReport(fixture).checks.find(
      (check) => check.type === "court_record_search",
    );

    expect(court?.outcome).toBe(outcome);
    expect(court?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Finding", declaredValue: finding }),
      ]),
    );
  });

  it("keeps legacy court_search compatibility without duplicating the Court section", () => {
    const fixture = reportFixture();
    const canonical = fixture.check_summaries.find((item) => item.check === "court_record_search");
    if (!canonical) throw new Error("Missing court summary fixture");
    fixture.check_summaries = [
      { ...canonical, check: "court_search", status: "PENDING" },
      ...fixture.check_summaries,
    ];
    fixture.court_search[0] = {
      ...fixture.court_search[0],
      scope: "Canonical court scope",
      status: "NOT_ORDERED",
    };

    const courtChecks = mapStructuredVerificationReport(fixture).checks.filter(
      (check) => check.type === "court_record_search",
    );

    expect(courtChecks).toHaveLength(1);
    expect(courtChecks[0]?.outcome).toBe("not_ordered");
    expect(courtChecks[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Scope", declaredValue: "Canonical court scope" }),
      ]),
    );
  });

  it("maps a legacy-only court_search summary through the canonical Court adapter", () => {
    const fixture = reportFixture();
    const summary = fixture.check_summaries.find((item) => item.check === "court_record_search");
    if (!summary) throw new Error("Missing court summary fixture");
    summary.check = "court_search";
    fixture.court_search[0] = {
      ...fixture.court_search[0],
      scope: "Legacy fixture scope",
    };

    const court = mapStructuredVerificationReport(fixture).checks.find(
      (check) => check.type === "court_record_search",
    );

    expect(court?.title).toBe("Court-record search");
    expect(court?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Scope", declaredValue: "Legacy fixture scope" }),
      ]),
    );
  });

  it("preserves masking and excludes backend metadata/internal notes", () => {
    const fixture = reportFixture();
    fixture.metadata = {
      internal_notes: "must not enter the frontend model",
      court_raw_subject: "Private Unmasked Subject",
      provider_access_token: "secret-token",
    };
    fixture.court_search[0] = {
      ...fixture.court_search[0],
      safe_subject_display: "P****** S******",
      evidence_id: "evidence-court-safe",
    };
    const serialized = JSON.stringify(mapStructuredVerificationReport(fixture));

    expect(serialized).toContain("********9012");
    expect(serialized).toContain("P****** S******");
    expect(serialized).toContain("evidence-court-safe");
    expect(serialized).not.toContain("123456789012");
    expect(serialized).not.toContain("must not enter the frontend model");
    expect(serialized).not.toContain("internal_notes");
    expect(serialized).not.toContain("Private Unmasked Subject");
    expect(serialized).not.toContain("secret-token");
  });

  it("uses backend FINAL without frontend terminal-state inference", () => {
    const fixture = reportFixture();
    fixture.header.report_status = "FINAL";
    expect(mapStructuredVerificationReport(fixture).state).toBe("Final");
  });
});
