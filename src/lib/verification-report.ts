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

export type VerificationReportOutcome =
  | "confirmed"
  | "matched"
  | "discrepancy"
  | "pending"
  | "awaiting_response"
  | "unable"
  | "rejected";

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
