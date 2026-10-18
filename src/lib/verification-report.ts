import type {
  BackendOrganizationPersonDetailResponse,
  BackendOrganizationPersonPassportClaim,
} from "@/lib/api/organization-people";
import type {
  BackendVerificationEvidenceResponse,
  BackendVerificationRequestResponse,
  BackendVerificationTimelineEvent,
} from "@/lib/api/verification-requests";
import type { EmployeeRosterMetadata } from "@/lib/organization-roster";
import type { BackendVerificationReport, VerificationReportCheckStatus } from "@/lib/api/hr-v2";

export type VerificationReportOutcome =
  | "confirmed"
  | "matched"
  | "discrepancy"
  | "pending"
  | "awaiting_response"
  | "unable"
  | "rejected"
  | "not_ordered";

export interface VerificationReportEvidence {
  id: string;
  label: string;
  status: string;
  recordedAt: string;
}

export interface VerificationReportField {
  label: string;
  declaredValue: string | null;
  verifiedValue: string | null;
}

export interface VerificationReportCheck {
  id: string;
  type: string;
  title: string;
  outcome: VerificationReportOutcome;
  outcomeLabel: string;
  requestedAt: string;
  updatedAt: string;
  fields: VerificationReportField[];
  evidence: VerificationReportEvidence[];
  notes: string[];
}

export interface VerificationReportModel {
  personPublicId: string;
  candidateName: string;
  candidateRole: string | null;
  maskedEmail: string | null;
  maskedPhone: string | null;
  organizationName: string;
  initiatedAt: string | null;
  consentedAt: string | null;
  updatedAt: string;
  state: "Interim" | "Final";
  trustScore: number | null;
  checks: VerificationReportCheck[];
  openItems: string[];
  requiresHrReview: boolean;
  roster: EmployeeRosterMetadata | null;
}

export interface VerificationReportRequestBundle {
  request: BackendVerificationRequestResponse;
  timeline: BackendVerificationTimelineEvent[];
  evidence: BackendVerificationEvidenceResponse[];
}

const TERMINAL_STATUSES = new Set([
  "verified",
  "rejected",
  "unable_to_verify",
  "cancelled",
  "expired",
]);

const CHECK_TITLES: Record<string, string> = {
  identity: "Identity",
  education: "Education",
  employment: "Employment",
  reference: "References",
  address: "Address",
  court: "Court-record search",
  document: "Document",
  license: "License",
  medical: "Medical",
  platform: "Platform",
  certification: "Certification",
  custom: "Custom verification",
};

const OUTCOME_LABELS: Record<VerificationReportOutcome, string> = {
  confirmed: "Confirmed",
  matched: "Details matched",
  discrepancy: "Discrepancy",
  pending: "Pending",
  awaiting_response: "Awaiting response",
  unable: "Unable to verify",
  rejected: "Rejected",
  not_ordered: "Not ordered",
};

const STRUCTURED_OUTCOME: Record<VerificationReportCheckStatus, VerificationReportOutcome> = {
  CONFIRMED: "confirmed",
  DETAILS_MATCHED: "matched",
  DISCREPANCY: "discrepancy",
  PENDING: "pending",
  AWAITING_RESPONSE: "awaiting_response",
  UNABLE_TO_VERIFY: "unable",
  REJECTED: "rejected",
  NOT_ORDERED: "not_ordered",
};

function text(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function humanize(value: string) {
  return value.replace(/[._-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function maskEmail(value: string | null | undefined) {
  if (!value) return null;
  const [local, domain] = value.split("@");
  if (!local || !domain) return null;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export function maskPhone(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `${"*".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

function hasDiscrepancy(events: BackendVerificationTimelineEvent[]) {
  return events.some(
    (event) =>
      event.event_type.includes("discrepancy") ||
      Object.values(event.metadata).some(
        (value) => typeof value === "string" && value.toLowerCase().includes("discrepancy"),
      ),
  );
}

function outcomeFor(bundle: VerificationReportRequestBundle): VerificationReportOutcome {
  const { request, timeline } = bundle;
  if (hasDiscrepancy(timeline)) return "discrepancy";
  if (request.status === "rejected") return "rejected";
  if (["unable_to_verify", "cancelled", "expired"].includes(request.status)) return "unable";
  if (request.status === "verified") {
    return request.request_type === "identity" ? "matched" : "confirmed";
  }
  if (request.request_type === "reference") return "awaiting_response";
  return "pending";
}

function declaredFields(request: BackendVerificationRequestResponse): VerificationReportField[] {
  const values: Array<[string, unknown]> = [];
  if (request.request_type === "employment" && request.employment_claim) {
    values.push(
      ["Employer", request.employment_claim.employer_name],
      ["Role", request.employment_claim.role],
      ["Start date", request.employment_claim.start_date],
      ["End date", request.employment_claim.end_date],
      ["Employment type", request.employment_claim.employment_type],
      [
        "Location",
        [
          request.employment_claim.work_location_region,
          request.employment_claim.work_location_country,
        ]
          .filter(Boolean)
          .join(", "),
      ],
    );
  }
  if (request.request_type === "education" && request.education_claim) {
    values.push(
      ["Institution", request.education_claim.institution_name],
      ["Qualification", request.education_claim.degree],
      ["Field of study", request.education_claim.field_of_study],
      ["Start date", request.education_claim.start_date],
      ["End date", request.education_claim.end_date],
    );
  }
  return values
    .map(([label, value]) => ({ label, declaredValue: text(value), verifiedValue: null }))
    .filter((field) => field.declaredValue);
}

function verifiedFields(evidence: BackendVerificationEvidenceResponse[]) {
  const fields = new Map<string, string>();
  evidence.forEach((item) => {
    if (!item.value) return;
    Object.entries(item.value).forEach(([key, value]) => {
      const safeValue = text(value);
      if (safeValue && !key.toLowerCase().includes("token") && !key.toLowerCase().includes("url")) {
        fields.set(humanize(key), maskSensitiveEvidenceValue(key, safeValue));
      }
    });
  });
  return fields;
}

function maskSensitiveEvidenceValue(key: string, value: string) {
  const normalizedKey = key.toLowerCase();
  const identifiesDocument = [
    "aadhaar",
    "aadhar",
    "passport_number",
    "document_number",
    "identity_number",
    "id_number",
    "pan_number",
  ].some((part) => normalizedKey.includes(part));
  if (!identifiesDocument) return value;
  const compact = value.replace(/\s/g, "");
  return compact.length > 4
    ? `${"*".repeat(Math.max(4, compact.length - 4))}${compact.slice(-4)}`
    : "****";
}

function mergeFields(bundle: VerificationReportRequestBundle) {
  const declared = declaredFields(bundle.request);
  const verified = verifiedFields(bundle.evidence);
  const byLabel = new Map(declared.map((field) => [field.label.toLowerCase(), field]));
  verified.forEach((value, label) => {
    const existing = byLabel.get(label.toLowerCase());
    if (existing) existing.verifiedValue = value;
    else declared.push({ label, declaredValue: null, verifiedValue: value });
  });
  return declared;
}

function notesFromTimeline(events: BackendVerificationTimelineEvent[]) {
  return events
    .filter((event) => !event.event_type.includes("internal_note"))
    .flatMap((event) => [event.metadata.note, event.metadata.comment, event.metadata.reason])
    .map(text)
    .filter((note): note is string => Boolean(note));
}

function trustScoreFromClaims(claims: BackendOrganizationPersonPassportClaim[]) {
  const claim = claims.find((item) => item.label.toLowerCase().includes("trust score"));
  if (!claim?.value) return null;
  const value = Number.parseInt(claim.value.match(/\d+/)?.[0] ?? "", 10);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export function buildVerificationReportModel({
  person,
  organizationName,
  roster,
  requests,
}: {
  person: BackendOrganizationPersonDetailResponse;
  organizationName: string;
  roster: EmployeeRosterMetadata | null;
  requests: VerificationReportRequestBundle[];
}): VerificationReportModel {
  const checks = requests.map((bundle) => {
    const outcome = outcomeFor(bundle);
    return {
      id: bundle.request.public_id,
      type: bundle.request.request_type,
      title: CHECK_TITLES[bundle.request.request_type] ?? humanize(bundle.request.request_type),
      outcome,
      outcomeLabel: OUTCOME_LABELS[outcome],
      requestedAt: bundle.request.created_at,
      updatedAt: bundle.request.updated_at,
      fields: mergeFields(bundle),
      evidence: bundle.evidence.map((item) => ({
        id: item.public_id,
        label: item.original_filename ?? item.document_type ?? humanize(item.evidence_type),
        status: humanize(item.status),
        recordedAt: item.updated_at,
      })),
      notes: notesFromTimeline(bundle.timeline),
    } satisfies VerificationReportCheck;
  });
  const sortedDates = requests
    .flatMap(({ request }) => [request.created_at, request.updated_at])
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  const openChecks = checks.filter((check) =>
    ["pending", "awaiting_response"].includes(check.outcome),
  );
  const reportIsFinal =
    requests.length > 0 && requests.every(({ request }) => TERMINAL_STATUSES.has(request.status));
  const firstEmploymentRole = requests.find(({ request }) => request.employment_claim?.role)
    ?.request.employment_claim?.role;

  return {
    personPublicId: person.public_id,
    candidateName: person.summary.full_name,
    candidateRole: roster?.role ?? firstEmploymentRole ?? null,
    maskedEmail: maskEmail(person.summary.email),
    maskedPhone: maskPhone(person.summary.phone),
    organizationName,
    initiatedAt: requests.length
      ? requests.map(({ request }) => request.created_at).sort()[0]
      : null,
    consentedAt:
      requests
        .map(({ request }) => request.consented_at)
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? null,
    updatedAt: sortedDates.length
      ? new Date(Math.max(...sortedDates)).toISOString()
      : person.organization_relationship.added_at,
    state: reportIsFinal ? "Final" : "Interim",
    trustScore: trustScoreFromClaims(person.passport_preview.claims),
    checks,
    openItems: openChecks.map((check) => `${check.title}: ${check.outcomeLabel}`),
    requiresHrReview: checks.some((check) =>
      ["discrepancy", "pending", "awaiting_response", "unable", "rejected"].includes(check.outcome),
    ),
    roster,
  };
}

const CANONICAL_COURT_CHECK = "court_record_search";

function normalizeCheckKey(value: string) {
  return value === "court_search" ? CANONICAL_COURT_CHECK : value;
}

function displayLabel(value: string) {
  const normalized = normalizeCheckKey(value);
  return normalized === CANONICAL_COURT_CHECK ? "Court-record search" : humanize(normalized);
}

function valuesToFields(
  declared: Record<string, string | null>,
  verified: Record<string, string | null>,
): VerificationReportField[] {
  const keys = [...new Set([...Object.keys(declared), ...Object.keys(verified)])];
  return keys.map((key) => ({
    label: displayLabel(key),
    declaredValue: declared[key] ? maskSensitiveEvidenceValue(key, declared[key]) : null,
    verifiedValue: verified[key] ? maskSensitiveEvidenceValue(key, verified[key]) : null,
  }));
}

function appendField(
  fields: VerificationReportField[],
  label: string,
  declaredValue: string | number | boolean | null | undefined,
  verifiedValue?: string | number | boolean | null,
) {
  if (declaredValue == null && verifiedValue == null) return;
  fields.push({
    label,
    declaredValue: declaredValue == null ? null : String(declaredValue),
    verifiedValue: verifiedValue == null ? null : String(verifiedValue),
  });
}

function structuredCheckDetails(report: BackendVerificationReport, check: string) {
  const fields: VerificationReportField[] = [];
  const evidence: VerificationReportEvidence[] = [];
  const notes: string[] = [];
  const recordEvidence = (id: string | null, status: string, recordedAt: string | null) => {
    if (!id) return;
    evidence.push({
      id,
      label: `Evidence ${id}`,
      status: displayLabel(status),
      recordedAt: recordedAt ?? report.header.report_updated_at,
    });
  };
  const recordNote = (value: string | null | undefined) => {
    if (value?.trim()) notes.push(value.trim());
  };

  if (check === "identity") {
    report.identity.forEach((item) => {
      fields.push(...valuesToFields(item.declared_values, item.verified_values));
      appendField(fields, "Source", item.source);
      recordNote(item.remarks);
      recordEvidence(item.evidence_id, item.status, item.reviewed_at);
    });
  }
  if (check === "employment") {
    report.employment.forEach((item, index) => {
      const prefix =
        report.employment.length > 1 ? `${item.organization || `Employment ${index + 1}`} · ` : "";
      appendField(fields, `${prefix}Organization`, item.organization);
      appendField(fields, `${prefix}Employee ID`, item.masked_employee_id);
      appendField(fields, `${prefix}Title`, item.declared_title, item.confirmed_title);
      appendField(
        fields,
        `${prefix}Start date`,
        item.declared_start_date,
        item.confirmed_start_date,
      );
      appendField(fields, `${prefix}End date`, item.declared_end_date, item.confirmed_end_date);
      appendField(fields, `${prefix}Employment type`, item.employment_type);
      appendField(fields, `${prefix}Confirmed by`, item.confirmed_by);
      appendField(fields, `${prefix}Source`, item.source);
      appendField(fields, `${prefix}Reviewer`, item.reviewer);
      recordNote(item.remarks);
      recordEvidence(item.evidence_id, item.status, item.received_at);
    });
  }
  if (check === "education") {
    report.education.forEach((item) => {
      appendField(fields, "Qualification", item.qualification);
      appendField(fields, "Institution", item.institution);
      appendField(fields, "University", item.university);
      appendField(fields, "Completion year", item.completion_year);
      fields.push(...valuesToFields(item.declared_values, item.confirmed_values));
      appendField(fields, "Source", item.source);
      recordEvidence(item.evidence_id, item.status, item.confirmation_date);
    });
  }
  if (check === "references") {
    report.references.forEach((item, index) => {
      const prefix = report.references.length > 1 ? `Reference ${index + 1} · ` : "";
      appendField(fields, `${prefix}Name`, item.name);
      appendField(fields, `${prefix}Title / relationship`, item.title_or_relationship);
      appendField(fields, `${prefix}Organization`, item.organization);
      appendField(fields, `${prefix}Known for`, item.known_for);
      appendField(fields, `${prefix}Request date`, item.request_date);
      appendField(fields, `${prefix}Follow-ups`, item.follow_up_dates.join(", ") || null);
      appendField(fields, `${prefix}Response date`, item.response_date);
      appendField(fields, `${prefix}Strengths`, item.strengths);
      appendField(fields, `${prefix}Development areas`, item.development_areas);
      appendField(fields, `${prefix}Rehire response`, item.rehire_response);
      recordNote(item.comments);
      recordEvidence(item.evidence_id, item.status, item.response_date ?? item.request_date);
    });
  }
  if (check === "address") {
    report.address.forEach((item) => {
      appendField(fields, "Declared address", item.declared_address);
      appendField(fields, "Verification method", item.verification_method);
      appendField(fields, "Scope", item.scope);
      appendField(fields, "Physical visit performed", item.physical_visit_performed ? "Yes" : "No");
      recordEvidence(item.evidence_id, item.status, item.verified_at);
    });
  }
  if (normalizeCheckKey(check) === CANONICAL_COURT_CHECK) {
    report.court_search.forEach((item) => {
      appendField(fields, "Subject", item.safe_subject_display);
      appendField(fields, "Scope", item.scope);
      appendField(fields, "Search period", item.search_period);
      appendField(fields, "Source", item.source);
      appendField(fields, "Finding", item.finding);
      appendField(fields, "Reviewer", item.reviewer);
      appendField(fields, "Remarks", item.remarks);
      recordNote(item.limitations);
      recordEvidence(item.evidence_id, item.status, item.searched_at);
    });
  }

  return { fields, evidence, notes };
}

export function mapStructuredVerificationReport(
  report: BackendVerificationReport,
): VerificationReportModel {
  const courtSummary =
    report.check_summaries.find((summary) => summary.check === CANONICAL_COURT_CHECK) ??
    report.check_summaries.find(
      (summary) => normalizeCheckKey(summary.check) === CANONICAL_COURT_CHECK,
    );
  const summaries = report.check_summaries.filter(
    (summary) =>
      normalizeCheckKey(summary.check) !== CANONICAL_COURT_CHECK || summary === courtSummary,
  );

  const checks = summaries.map((summary, index) => {
    const normalizedCheck = normalizeCheckKey(summary.check);
    const outcome = STRUCTURED_OUTCOME[summary.status];
    const details = structuredCheckDetails(report, summary.check);
    return {
      id: `${normalizedCheck}-${index}`,
      type: normalizedCheck,
      title: displayLabel(normalizedCheck),
      outcome,
      outcomeLabel: OUTCOME_LABELS[outcome],
      requestedAt: report.header.initiated_at ?? report.header.report_updated_at,
      updatedAt: summary.updated_at ?? report.header.report_updated_at,
      ...details,
    } satisfies VerificationReportCheck;
  });

  return {
    personPublicId: report.header.person_id,
    candidateName: report.header.person_name,
    candidateRole: report.header.role,
    maskedEmail: report.header.masked_email,
    maskedPhone: report.header.masked_phone,
    organizationName: report.header.requested_by_organization,
    initiatedAt: report.header.initiated_at,
    consentedAt: report.header.consent_at,
    updatedAt: report.header.report_updated_at,
    state: report.header.report_status === "FINAL" ? "Final" : "Interim",
    trustScore: report.header.trust_score,
    checks,
    openItems: report.open_items.map((item) => item.display_text),
    requiresHrReview: report.hr_review_required,
    roster: null,
  };
}
