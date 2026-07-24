// Inbound Employment Verifications — requests received from other organizations
// asking this workspace to verify former or current employees.

export type InboundStatus =
  | "New"
  | "In Review"
  | "Clarification Requested"
  | "Confirmed"
  | "Discrepancy Reported"
  | "Unable to Verify";

export type InboundVerificationType = "Employment" | "Education" | "Reference";

export interface InboundEmploymentClaim {
  jobTitle: string;
  department?: string;
  startDate: string;
  endDate?: string;
  employmentStatus: "Full-time" | "Part-time" | "Contract" | "Intern";
  location?: string;
  reportingManager?: string;
  reasonForLeaving?: string;
}

export interface InboundRequestingOrg {
  name: string;
  contact: string;
  contactEmail: string;
  purpose: string;
  logoInitials: string;
}

export interface InboundTimelineEvent {
  id: string;
  at: string;
  label: string;
  actor: string;
  kind:
    | "received"
    | "assigned"
    | "clarification_requested"
    | "clarification_received"
    | "confirmed"
    | "discrepancy"
    | "unable"
    | "submitted";
  note?: string;
}

export interface InboundSubmission {
  outcome: "Confirmed" | "Discrepancy" | "Unable to Verify";
  notes: string;
  submittedAt: string;
  submittedBy: string;
  correctedFields?: Partial<InboundEmploymentClaim>;
}

export interface InboundVerificationRequest {
  id: string;
  candidateName: string;
  candidateInitials: string;
  formerEmployeeId?: string;
  requestingOrg: InboundRequestingOrg;
  verificationType: InboundVerificationType;
  claim: InboundEmploymentClaim;
  sharedInformation: string[]; // fields the candidate has consented to share
  consent: { status: "Granted" | "Pending" | "Revoked"; grantedAt?: string };
  status: InboundStatus;
  receivedAt: string;
  lastUpdatedAt: string;
  assignedReviewer?: string;
  timeline: InboundTimelineEvent[];
  submission?: InboundSubmission;
  internalNote?: string;
}

const daysAgo = (d: number) => new Date(Date.now() - d * 86400e3).toISOString();

export const inboundRequests: InboundVerificationRequest[] = [
  {
    id: "EV-4821",
    candidateName: "Aarav Mehta",
    candidateInitials: "AM",
    formerEmployeeId: "EMP-0432",
    requestingOrg: {
      name: "Northstar Technologies",
      contact: "Priya Ramanathan",
      contactEmail: "priya.r@northstar.example",
      purpose: "Pre-employment verification — Senior Engineer role",
      logoInitials: "NT",
    },
    verificationType: "Employment",
    claim: {
      jobTitle: "Senior Product Engineer",
      department: "Platform",
      startDate: "2021-03-14",
      endDate: "2024-08-30",
      employmentStatus: "Full-time",
      location: "Bengaluru",
      reportingManager: "Sana Kapoor",
      reasonForLeaving: "Resigned — new opportunity",
    },
    sharedInformation: ["Job title", "Employment dates", "Employment status", "Department"],
    consent: { status: "Granted", grantedAt: daysAgo(2) },
    status: "New",
    receivedAt: daysAgo(1),
    lastUpdatedAt: daysAgo(1),
    timeline: [
      { id: "t1", at: daysAgo(1), label: "Verification request received", actor: "Northstar Technologies", kind: "received" },
    ],
  },
  {
    id: "EV-4820",
    candidateName: "Ishita Rao",
    candidateInitials: "IR",
    formerEmployeeId: "EMP-0298",
    requestingOrg: {
      name: "Acme Financial",
      contact: "Rahul Verma",
      contactEmail: "rahul@acmefin.example",
      purpose: "Background check for regulated role",
      logoInitials: "AF",
    },
    verificationType: "Employment",
    claim: {
      jobTitle: "Product Manager",
      department: "Growth",
      startDate: "2019-06-10",
      endDate: "2023-11-15",
      employmentStatus: "Full-time",
      location: "Mumbai",
      reportingManager: "Devika Iyer",
    },
    sharedInformation: ["Job title", "Employment dates", "Employment status"],
    consent: { status: "Granted", grantedAt: daysAgo(3) },
    status: "In Review",
    receivedAt: daysAgo(2),
    lastUpdatedAt: daysAgo(1),
    assignedReviewer: "You",
    timeline: [
      { id: "t1", at: daysAgo(2), label: "Verification request received", actor: "Acme Financial", kind: "received" },
      { id: "t2", at: daysAgo(1), label: "Assigned to reviewer", actor: "You", kind: "assigned" },
    ],
  },
  {
    id: "EV-4818",
    candidateName: "Vikram Shah",
    candidateInitials: "VS",
    formerEmployeeId: "EMP-0511",
    requestingOrg: {
      name: "Meridian Health",
      contact: "Anita George",
      contactEmail: "anita@meridianhealth.example",
      purpose: "Employment verification for new hire onboarding",
      logoInitials: "MH",
    },
    verificationType: "Employment",
    claim: {
      jobTitle: "Data Analyst",
      department: "Analytics",
      startDate: "2020-01-06",
      endDate: "2022-04-28",
      employmentStatus: "Full-time",
    },
    sharedInformation: ["Job title", "Employment dates"],
    consent: { status: "Granted", grantedAt: daysAgo(6) },
    status: "Clarification Requested",
    receivedAt: daysAgo(5),
    lastUpdatedAt: daysAgo(2),
    assignedReviewer: "Nisha Patel",
    timeline: [
      { id: "t1", at: daysAgo(5), label: "Verification request received", actor: "Meridian Health", kind: "received" },
      { id: "t2", at: daysAgo(4), label: "Assigned to reviewer", actor: "You", kind: "assigned" },
      { id: "t3", at: daysAgo(2), label: "Clarification requested from candidate", actor: "Nisha Patel", kind: "clarification_requested", note: "Employment dates on record differ by one month." },
    ],
    internalNote: "HRMS shows Feb 2020 start, not January.",
  },
  {
    id: "EV-4810",
    candidateName: "Rohan Kapoor",
    candidateInitials: "RK",
    formerEmployeeId: "EMP-0187",
    requestingOrg: {
      name: "Cirrus Cloud",
      contact: "Vivek Nair",
      contactEmail: "vivek@cirrus.example",
      purpose: "Employment verification — Senior IC role",
      logoInitials: "CC",
    },
    verificationType: "Employment",
    claim: {
      jobTitle: "Staff Engineer",
      department: "Infrastructure",
      startDate: "2017-08-22",
      endDate: "2023-03-10",
      employmentStatus: "Full-time",
      reportingManager: "Karthik Menon",
      reasonForLeaving: "Resigned",
    },
    sharedInformation: ["Job title", "Employment dates", "Employment status", "Reporting manager"],
    consent: { status: "Granted", grantedAt: daysAgo(11) },
    status: "Confirmed",
    receivedAt: daysAgo(10),
    lastUpdatedAt: daysAgo(7),
    assignedReviewer: "You",
    timeline: [
      { id: "t1", at: daysAgo(10), label: "Verification request received", actor: "Cirrus Cloud", kind: "received" },
      { id: "t2", at: daysAgo(9), label: "Assigned to reviewer", actor: "You", kind: "assigned" },
      { id: "t3", at: daysAgo(7), label: "Verification submitted — Confirmed", actor: "You", kind: "submitted" },
    ],
    submission: {
      outcome: "Confirmed",
      notes: "All claim details match HRMS records.",
      submittedAt: daysAgo(7),
      submittedBy: "You",
    },
  },
  {
    id: "EV-4802",
    candidateName: "Sana Kulkarni",
    candidateInitials: "SK",
    formerEmployeeId: "EMP-0071",
    requestingOrg: {
      name: "Helix Robotics",
      contact: "Meera Suresh",
      contactEmail: "meera@helix.example",
      purpose: "Pre-employment verification",
      logoInitials: "HR",
    },
    verificationType: "Employment",
    claim: {
      jobTitle: "Engineering Manager",
      department: "Hardware",
      startDate: "2018-05-01",
      endDate: "2021-12-20",
      employmentStatus: "Full-time",
    },
    sharedInformation: ["Job title", "Employment dates", "Employment status"],
    consent: { status: "Granted", grantedAt: daysAgo(20) },
    status: "Discrepancy Reported",
    receivedAt: daysAgo(19),
    lastUpdatedAt: daysAgo(14),
    assignedReviewer: "Nisha Patel",
    timeline: [
      { id: "t1", at: daysAgo(19), label: "Verification request received", actor: "Helix Robotics", kind: "received" },
      { id: "t2", at: daysAgo(18), label: "Assigned to reviewer", actor: "You", kind: "assigned" },
      { id: "t3", at: daysAgo(14), label: "Verification submitted — Discrepancy", actor: "Nisha Patel", kind: "discrepancy", note: "Title on record was Senior Engineer, not Engineering Manager." },
    ],
    submission: {
      outcome: "Discrepancy",
      notes: "Candidate held the title Senior Engineer through the entire tenure; no Engineering Manager promotion on record.",
      submittedAt: daysAgo(14),
      submittedBy: "Nisha Patel",
      correctedFields: { jobTitle: "Senior Engineer" },
    },
  },
  {
    id: "EV-4795",
    candidateName: "Karan Malhotra",
    candidateInitials: "KM",
    requestingOrg: {
      name: "Blueprint Studios",
      contact: "Aisha Khan",
      contactEmail: "aisha@blueprint.example",
      purpose: "Employment verification — Contractor conversion",
      logoInitials: "BS",
    },
    verificationType: "Employment",
    claim: {
      jobTitle: "Design Lead",
      department: "Design",
      startDate: "2022-02-14",
      endDate: "2023-08-01",
      employmentStatus: "Contract",
    },
    sharedInformation: ["Job title", "Employment dates"],
    consent: { status: "Pending" },
    status: "New",
    receivedAt: daysAgo(0),
    lastUpdatedAt: daysAgo(0),
    timeline: [
      { id: "t1", at: daysAgo(0), label: "Verification request received", actor: "Blueprint Studios", kind: "received" },
    ],
  },
];

export function statusTone(s: InboundStatus): "warning" | "info" | "success" | "destructive" | "muted" {
  if (s === "New") return "info";
  if (s === "In Review") return "info";
  if (s === "Clarification Requested") return "warning";
  if (s === "Confirmed") return "success";
  if (s === "Discrepancy Reported") return "destructive";
  return "muted";
}

export function nextActionFor(r: InboundVerificationRequest): { text: string; owner: "Us" | "Candidate" | "Requesting Org" | "None" } {
  if (r.status === "New") return { text: "Assign a reviewer", owner: "Us" };
  if (r.status === "In Review") return { text: "Submit verification", owner: "Us" };
  if (r.status === "Clarification Requested") return { text: "Awaiting candidate response", owner: "Candidate" };
  if (r.status === "Confirmed" || r.status === "Discrepancy Reported") return { text: "Delivered to requesting organization", owner: "None" };
  return { text: "—", owner: "None" };
}

export function ageInDays(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400e3));
}
