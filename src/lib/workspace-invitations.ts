import { workspacePeople } from "./workspace-data";
import type { Relationship, InvitationStatus, WorkspacePerson } from "./workspace-data";
import { seedRequests } from "./dashboard-data";
import type { VerificationRequest, VerificationStatus } from "./dashboard-data";

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
  { key: "Identity", label: "Identity", description: "Government-issued ID, name and date of birth." },
  { key: "Employment", label: "Employment", description: "Employer, role, dates and employment status." },
  { key: "Education", label: "Education", description: "Institution, degree, dates and graduation status." },
  { key: "Certification", label: "Certification", description: "Professional certifications and licenses." },
  { key: "Professional Reference", label: "Professional Reference", description: "Manager or colleague references." },
];

// ============= Invitation entity =============

export type InvitationDeliveryStatus = "Queued" | "Delivered" | "Opened" | "Delivery Failed";

export type InvitationEventKind =
  | "draft_created"
  | "sent"
  | "delivered"
  | "opened"
  | "reminder"
  | "accepted"
  | "consent"
  | "request_created"
  | "expired"
  | "cancelled";

export interface InvitationEvent {
  id: string;
  kind: InvitationEventKind;
  label: string;
  actor: string;
  at: string;
  note?: string;
}

export interface WorkspaceInvitation {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateInitials: string;
  personId?: string;
  relationship: Relationship;
  purpose: string;
  internalReference?: string;
  department?: string;
  message?: string;
  requestedVerifications: VerificationTypeKey[];
  status: Exclude<InvitationStatus, "Not Invited">;
  deliveryStatus: InvitationDeliveryStatus;
  sentBy: string;
  sentAt?: string;
  expiresAt: string;
  linkedRequestId?: string;
  activity: InvitationEvent[];
  lastActivity: string;
}

export const PURPOSE_ROLL = [
  "Software Engineer Hiring",
  "Employment Verification",
  "Contractor Onboarding",
  "Internship Verification",
  "Executive Hiring",
  "Product Designer Hiring",
  "Sales Lead Hiring",
];

const REQUEST_ROLL: VerificationTypeKey[][] = [
  ["Identity", "Employment"],
  ["Identity", "Employment", "Education"],
  ["Identity", "Employment", "Education", "Professional Reference"],
  ["Identity", "Education", "Certification"],
  ["Identity", "Employment"],
  ["Identity", "Employment", "Certification", "Professional Reference"],
];

function toInvitationStatus(inv: InvitationStatus): Exclude<InvitationStatus, "Not Invited"> {
  return inv === "Not Invited" ? "Draft" : inv;
}

function buildInvitationActivity(
  status: Exclude<InvitationStatus, "Not Invited">,
  sentAt: string | undefined,
  sender: string,
): InvitationEvent[] {
  const now = Date.now();
  const list: InvitationEvent[] = [];
  const draftedAt = new Date(now - 9 * 86400e3).toISOString();
  list.push({ id: "e1", kind: "draft_created", label: "Draft created", actor: sender, at: draftedAt });
  if (status === "Draft") return list;
  const sent = sentAt ?? new Date(now - 6 * 86400e3).toISOString();
  list.push({ id: "e2", kind: "sent", label: "Invitation sent", actor: sender, at: sent });
  if (status === "Cancelled") {
    list.push({ id: "e3", kind: "cancelled", label: "Invitation cancelled", actor: sender, at: new Date(now - 1 * 86400e3).toISOString() });
    return list;
  }
  list.push({ id: "e3", kind: "delivered", label: "Invitation delivered", actor: "System", at: new Date(new Date(sent).getTime() + 30_000).toISOString() });
  if (status === "Opened" || status === "Accepted" || status === "Expired") {
    list.push({ id: "e4", kind: "opened", label: "Invitation opened", actor: "Candidate", at: new Date(new Date(sent).getTime() + 6 * 3600e3).toISOString() });
  }
  if (status === "Accepted") {
    list.push({ id: "e5", kind: "accepted", label: "Invitation accepted", actor: "Candidate", at: new Date(new Date(sent).getTime() + 14 * 3600e3).toISOString() });
    list.push({ id: "e6", kind: "consent", label: "Consent granted", actor: "Candidate", at: new Date(new Date(sent).getTime() + 14 * 3600e3 + 60_000).toISOString() });
  }
  if (status === "Expired") {
    list.push({ id: "e5", kind: "expired", label: "Invitation expired", actor: "System", at: new Date(now - 1 * 86400e3).toISOString() });
  }
  return list.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function invitationFor(p: WorkspacePerson, i: number, req?: VerificationRequest): WorkspaceInvitation | null {
  if (p.invitationStatus === "Not Invited") return null;
  const status = toInvitationStatus(p.invitationStatus);
  const sender = p.addedBy;
  const sentAt = p.invitedAt;
  const expiresAt = new Date(
    (sentAt ? new Date(sentAt).getTime() : Date.now() - 5 * 86400e3) + (status === "Expired" ? -1 : 7) * 86400e3,
  ).toISOString();
  return {
    id: `INV-${1040 + i}`,
    candidateName: p.name,
    candidateEmail: p.email,
    candidatePhone: p.phone,
    candidateInitials: p.initials,
    personId: p.id,
    relationship: p.relationship,
    purpose: PURPOSE_ROLL[i % PURPOSE_ROLL.length],
    internalReference: p.id,
    department: p.department,
    message:
      i % 3 === 0
        ? `Hi ${p.name.split(" ")[0]}, we'd love to run a quick professional verification for the ${PURPOSE_ROLL[i % PURPOSE_ROLL.length]} role. You control what to share.`
        : undefined,
    requestedVerifications: REQUEST_ROLL[i % REQUEST_ROLL.length],
    status,
    deliveryStatus:
      status === "Draft"
        ? "Queued"
        : i % 11 === 0
          ? "Delivery Failed"
          : status === "Opened" || status === "Accepted"
            ? "Opened"
            : "Delivered",
    sentBy: sender,
    sentAt,
    expiresAt,
    linkedRequestId: status === "Accepted" ? req?.id : undefined,
    activity: buildInvitationActivity(status, sentAt, sender),
    lastActivity:
      p.invitedAt ??
      p.lastActivity ??
      new Date().toISOString(),
  };
}

export const seedInvitations: WorkspaceInvitation[] = workspacePeople
  .map((p, i) => invitationFor(p, i, seedRequests[i % seedRequests.length]))
  .filter((x): x is WorkspaceInvitation => x !== null);

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

function buildRequestedFields(t: RequestVerificationType, status: VerificationStatus): RequestedField[] {
  const done = status === "Verified";
  const state = (i: number): ClaimStateLabel =>
    done ? "Verified" : status === "Rejected" ? (i === 0 ? "Discrepancy Found" : "Unable to Verify") : status === "Documents Requested" ? "Verification Pending" : "Candidate Provided";
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

function buildResult(t: RequestVerificationType, status: VerificationStatus, when: string): VerificationResult | undefined {
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
    const invitation = seedInvitations.find((inv) => inv.linkedRequestId === r.id);
    const consentStatus: ConsentStatus =
      r.status === "Pending"
        ? "Requested"
        : r.status === "Rejected"
          ? "Granted"
          : "Granted";
    const enrichment: RequestEnrichment = {
      verificationType: t,
      invitationId: invitation?.id,
      consent: {
        status: consentStatus,
        grantedAt: consentStatus === "Granted" ? new Date(new Date(r.requestedAt).getTime() - 3600e3).toISOString() : undefined,
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
                requestedAt: new Date(new Date(r.requestedAt).getTime() + 12 * 3600e3).toISOString(),
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
                  requestedAt: new Date(new Date(r.requestedAt).getTime() + 12 * 3600e3).toISOString(),
                  candidateResponse: "Uploaded the March payslip. Please review.",
                  respondedAt: new Date(new Date(r.requestedAt).getTime() + 26 * 3600e3).toISOString(),
                },
              ]
            : [],
      result: buildResult(t, r.status, new Date(Date.now() - 2 * 86400e3).toISOString()),
    };
    return [r.id, enrichment];
  }),
);

// ============= Helpers =============

export function toUserFacingStatus(s: VerificationStatus, consent: ConsentStatus): UserFacingRequestStatus {
  if (s === "Pending") return consent === "Granted" ? "Waiting for Candidate Information" : "Waiting for Candidate Acceptance";
  if (s === "Under Review") return "In Verification";
  if (s === "Documents Requested") return "Clarification Required";
  if (s === "Verified") return "Completed";
  if (s === "Rejected") return "Rejected";
  return "In Verification";
}

export function nextActionFor(s: UserFacingRequestStatus): { text: string; owner: "Candidate" | "Kairo" | "Organization" | "None" } {
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

// summary counts
export function invitationCounts(list: WorkspaceInvitation[]) {
  const now = Date.now();
  return {
    active: list.filter((i) => i.status === "Sent" || i.status === "Opened").length,
    awaiting: list.filter((i) => i.status === "Sent").length,
    accepted: list.filter((i) => i.status === "Accepted").length,
    expiring: list.filter(
      (i) => (i.status === "Sent" || i.status === "Opened") && new Date(i.expiresAt).getTime() - now < 2 * 86400e3,
    ).length,
  };
}
