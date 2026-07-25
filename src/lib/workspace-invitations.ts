import { seedRequests } from "./dashboard-data";
import type { VerificationStatus } from "./dashboard-data";

// ============= Verification types =============

export type VerificationTypeKey =
  | "Identity"
  | "Employment"
  | "Education"
  | "Certification"
  | "Professional Reference";

export const VERIFICATION_TYPES: {
  key: VerificationTypeKey;
  label: string;
  description: string;
}[] = [
  {
    key: "Identity",
    label: "Identity",
    description: "Government-issued ID, name and date of birth.",
  },
  {
    key: "Employment",
    label: "Employment",
    description: "Employer, role, dates and employment status.",
  },
  {
    key: "Education",
    label: "Education",
    description: "Institution, degree, dates and graduation status.",
  },
  {
    key: "Certification",
    label: "Certification",
    description: "Professional certifications and licenses.",
  },
  {
    key: "Professional Reference",
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

// ============= Verification request enrichment =============

export type RequestVerificationType = VerificationTypeKey;

export type UserFacingRequestStatus =
  | "Waiting for Candidate Acceptance"
  | "Waiting for Candidate Information"
  | "In Verification"
  | "Clarification Required"
  | "Completed"
  | "Rejected"
  | "Unable to Verify"
  | "Cancelled";

export type ConsentStatus =
  | "Not Requested"
  | "Requested"
  | "Granted"
  | "Declined"
  | "Expired"
  | "Revoked";

export type ClaimStateLabel =
  | "Candidate Provided"
  | "Verification Pending"
  | "Verified"
  | "Discrepancy Found"
  | "Unable to Verify";

export interface RequestedField {
  label: string;
  value?: string;
  state: ClaimStateLabel;
}

export type ClarificationStatus = "Requested" | "Candidate Responded" | "Resolved" | "Cancelled";

export interface Clarification {
  id: string;
  subject: string;
  question: string;
  relatedField?: string;
  dueAt?: string;
  internalNote?: string;
  status: ClarificationStatus;
  requestedBy: string;
  requestedAt: string;
  candidateResponse?: string;
  respondedAt?: string;
}

export type ResultLabel =
  | "Verified"
  | "Partially Verified"
  | "Discrepancy Found"
  | "Unable to Verify"
  | "Rejected";

export interface VerificationResult {
  overall: ResultLabel;
  completedAt: string;
  verifiedFields: string[];
  discrepancies: string[];
  exceptions: string[];
  unableToVerify: string[];
  source: string;
  reference: string;
}

export interface RequestEnrichment {
  verificationType: RequestVerificationType;
  invitationId?: string;
  consent: {
    status: ConsentStatus;
    grantedAt?: string;
    accessExpiresAt?: string;
    sharedInformation: string[];
  };
  requestedFields: RequestedField[];
  clarifications: Clarification[];
  result?: VerificationResult;
  cancellationReason?: string;
}

const TYPE_ROLL: RequestVerificationType[] = [
  "Employment",
  "Identity",
  "Education",
  "Employment",
  "Certification",
  "Professional Reference",
];

function buildRequestedFields(
  t: RequestVerificationType,
  status: VerificationStatus,
): RequestedField[] {
  const done = status === "Verified";
  const state = (i: number): ClaimStateLabel =>
    done
      ? "Verified"
      : status === "Rejected"
        ? i === 0
          ? "Discrepancy Found"
          : "Unable to Verify"
        : status === "Documents Requested"
          ? "Verification Pending"
          : "Candidate Provided";
  if (t === "Employment") {
    return [
      { label: "Employer", value: "Northstar Labs", state: state(0) },
      { label: "Job title", value: "Senior Engineer", state: state(1) },
      { label: "Employment dates", value: "Apr 2021 — Aug 2023", state: state(0) },
      { label: "Employment status", value: "Full-time", state: state(0) },
    ];
  }
  if (t === "Education") {
    return [
      { label: "Institution", value: "IIT Bombay", state: state(0) },
      { label: "Degree", value: "B.Tech", state: state(0) },
      { label: "Field of study", value: "Computer Science", state: state(0) },
      { label: "Attendance dates", value: "2016 — 2020", state: state(1) },
      { label: "Graduation status", value: "Graduated", state: state(0) },
    ];
  }
  if (t === "Identity") {
    return [
      { label: "Full name", value: "As per candidate", state: state(0) },
      { label: "Date of birth", value: "Redacted", state: state(0) },
      { label: "Government ID", value: "PAN / Aadhaar checked", state: state(0) },
    ];
  }
  if (t === "Certification") {
    return [
      { label: "Certification", value: "AWS Solutions Architect", state: state(0) },
      { label: "Issuing body", value: "AWS", state: state(0) },
      { label: "Issue date", value: "2023-02", state: state(1) },
    ];
  }
  return [
    { label: "Reference name", value: "Riya Kapoor", state: state(0) },
    { label: "Relationship", value: "Direct manager", state: state(0) },
    { label: "Contact reached", value: done ? "Yes" : "Pending", state: state(0) },
  ];
}

function buildResult(
  t: RequestVerificationType,
  status: VerificationStatus,
  when: string,
): VerificationResult | undefined {
  if (status === "Verified") {
    return {
      overall: "Verified",
      completedAt: when,
      verifiedFields: buildRequestedFields(t, status).map((f) => f.label),
      discrepancies: [],
      exceptions: [],
      unableToVerify: [],
      source: t === "Employment" ? "Employer records · Northstar Labs" : "Kairo Trust Engine",
      reference: `RES-${Math.floor(Math.random() * 90000) + 10000}`,
    };
  }
  if (status === "Rejected") {
    return {
      overall: "Discrepancy Found",
      completedAt: when,
      verifiedFields: [],
      discrepancies: ["Employment tenure did not match employer records"],
      exceptions: [],
      unableToVerify: [],
      source: "Employer records",
      reference: `RES-${Math.floor(Math.random() * 90000) + 10000}`,
    };
  }
  return undefined;
}

export const requestEnrichments: Record<string, RequestEnrichment> = Object.fromEntries(
  seedRequests.map((r, i) => {
    const t = TYPE_ROLL[i % TYPE_ROLL.length];
    const consentStatus: ConsentStatus =
      r.status === "Pending" ? "Requested" : r.status === "Rejected" ? "Granted" : "Granted";
    const enrichment: RequestEnrichment = {
      verificationType: t,
      invitationId: undefined,
      consent: {
        status: consentStatus,
        grantedAt:
          consentStatus === "Granted"
            ? new Date(new Date(r.requestedAt).getTime() - 3600e3).toISOString()
            : undefined,
        accessExpiresAt: new Date(new Date(r.requestedAt).getTime() + 30 * 86400e3).toISOString(),
        sharedInformation: buildRequestedFields(t, r.status).map((f) => f.label),
      },
      requestedFields: buildRequestedFields(t, r.status),
      clarifications:
        r.status === "Documents Requested"
          ? [
              {
                id: `clr-${i}-1`,
                subject: "Employment dates mismatch",
                question: "Could you confirm your exact start and end dates at Northstar Labs?",
                relatedField: "Employment dates",
                status: "Requested",
                requestedBy: r.requestedBy,
                requestedAt: new Date(
                  new Date(r.requestedAt).getTime() + 12 * 3600e3,
                ).toISOString(),
              },
            ]
          : r.status === "Under Review" && i % 3 === 0
            ? [
                {
                  id: `clr-${i}-1`,
                  subject: "Additional payslip",
                  question: "Please share a payslip for the final month of employment.",
                  relatedField: "Employment dates",
                  status: "Candidate Responded",
                  requestedBy: r.requestedBy,
                  requestedAt: new Date(
                    new Date(r.requestedAt).getTime() + 12 * 3600e3,
                  ).toISOString(),
                  candidateResponse: "Uploaded the March payslip. Please review.",
                  respondedAt: new Date(
                    new Date(r.requestedAt).getTime() + 26 * 3600e3,
                  ).toISOString(),
                },
              ]
            : [],
      result: buildResult(t, r.status, new Date(Date.now() - 2 * 86400e3).toISOString()),
    };
    return [r.id, enrichment];
  }),
);

// ============= Helpers =============

export function toUserFacingStatus(
  s: VerificationStatus,
  consent: ConsentStatus,
): UserFacingRequestStatus {
  if (s === "Pending")
    return consent === "Granted"
      ? "Waiting for Candidate Information"
      : "Waiting for Candidate Acceptance";
  if (s === "Under Review") return "In Verification";
  if (s === "Documents Requested") return "Clarification Required";
  if (s === "Verified") return "Completed";
  if (s === "Rejected") return "Rejected";
  return "In Verification";
}

export function nextActionFor(s: UserFacingRequestStatus): {
  text: string;
  owner: "Candidate" | "Kairo" | "Organization" | "None";
} {
  switch (s) {
    case "Waiting for Candidate Acceptance":
      return { text: "Candidate must accept the invitation", owner: "Candidate" };
    case "Waiting for Candidate Information":
      return { text: "Candidate must submit information", owner: "Candidate" };
    case "In Verification":
      return { text: "Kairo verification in progress", owner: "Kairo" };
    case "Clarification Required":
      return { text: "Organization should review the clarification", owner: "Organization" };
    case "Completed":
      return { text: "Result ready", owner: "None" };
    case "Rejected":
    case "Unable to Verify":
      return { text: "No further action required", owner: "None" };
    case "Cancelled":
      return { text: "Request cancelled", owner: "None" };
  }
}

export function ageInDays(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400e3));
}
