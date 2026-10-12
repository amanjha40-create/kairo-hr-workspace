import { apiRequest } from "@/lib/api/client";

export type EmployerVerificationDecision = "pending" | "confirmed" | "declined" | "on_hold";

export type HRReferenceStatus = "completed" | "cannot_confirm";
export type RehireEligibility = "yes" | "no" | "prefer_not_to_answer";

export type ManagerRelationshipDecision =
  | "confirmed_reporting_manager"
  | "worked_here_but_not_reporting_manager"
  | "not_recognized"
  | "details_incorrect"
  | "cannot_confirm"
  | "left_organization";

export type ManagerContactProvenance =
  | "hr_confirmed"
  | "hr_corrected"
  | "hr_supplied"
  | "hr_cannot_confirm";

export interface EmployerPortalManagerContact {
  full_name: string;
  designation: string;
  work_email?: string | null;
  phone?: string | null;
}

export interface EmployerPortalReportingManager {
  nomination_id: string;
  candidate_provided: EmployerPortalManagerContact;
  status: string;
  revalidation_required: boolean;
  validation: {
    relationship_decision?: ManagerRelationshipDecision;
    contact_provenance?: ManagerContactProvenance;
    contact?: EmployerPortalManagerContact;
  };
  validated_at?: string | null;
}

export interface EmployerPortalWorkspace {
  reporting_manager: EmployerPortalReportingManager | null;
  employer_verification_public_id: string;
  state: "pending" | "completed";
  decision: EmployerVerificationDecision | null;
  expires_at: string;
  candidate: {
    full_name: string;
  };
  employment: {
    employer_name: string;
    job_title: string;
    employment_type: string;
    start_date: string | null;
    end_date: string | null;
    country: string | null;
    region: string | null;
  };
  evidence_summary: Array<{
    document_type: string;
    original_filename: string;
    mime_type: string;
    file_size: number;
    status: string;
  }>;
  verification_request_public_id: string | null;
  verification_request_status: string | null;
  employer_contact: {
    contact_name: string;
    relationship: string;
    email_masked: string;
  };
  timeline: Array<{
    event_type: string;
    previous_status: string | null;
    new_status: string | null;
    created_at: string;
  }>;
}

export interface HRReferencePayload {
  status: HRReferenceStatus;
  eligible_for_rehire: RehireEligibility;
  comments?: string | null;
}

export interface ManagerValidationPayload {
  nomination_id: string;
  relationship_decision: ManagerRelationshipDecision;
  contact_provenance: ManagerContactProvenance;
  confirmed_contact?: EmployerPortalManagerContact | null;
}

export interface EmployerVerifyPayload {
  employment_existed: boolean;
  dates_correct: boolean;
  role_correct: boolean;
  comments?: string | null;
  hr_reference?: HRReferencePayload | null;
  manager_validation?: ManagerValidationPayload | null;
}

export interface EmployerDecisionPayload {
  reason: string;
  comments?: string | null;
}

export interface EmployerPortalActionResponse {
  employer_verification_public_id: string;
  decision: EmployerVerificationDecision;
  verification_request_status: string | null;
  employment_verification_status: string;
  idempotent: boolean;
}

const publicRequestOptions = {
  auth: false,
  cache: "no-store" as const,
  credentials: "omit" as const,
  referrerPolicy: "no-referrer" as const,
};

function employerPortalPath(token: string, suffix = "") {
  return `/api/v1/public/employer-verifications/${encodeURIComponent(token)}${suffix}`;
}

export function getEmployerVerificationWorkspace(token: string) {
  return apiRequest<EmployerPortalWorkspace>(employerPortalPath(token), {
    ...publicRequestOptions,
    method: "GET",
  });
}

export function verifyEmployerEmployment(token: string, payload: EmployerVerifyPayload) {
  return apiRequest<EmployerPortalActionResponse>(employerPortalPath(token, "/verify"), {
    ...publicRequestOptions,
    method: "POST",
    body: payload,
  });
}

export function rejectEmployerEmployment(token: string, payload: EmployerDecisionPayload) {
  return apiRequest<EmployerPortalActionResponse>(employerPortalPath(token, "/reject"), {
    ...publicRequestOptions,
    method: "POST",
    body: payload,
  });
}

export function requestEmployerClarification(token: string, payload: EmployerDecisionPayload) {
  return apiRequest<EmployerPortalActionResponse>(
    employerPortalPath(token, "/request-clarification"),
    {
      ...publicRequestOptions,
      method: "POST",
      body: payload,
    },
  );
}

export function validateEmployerReportingManager(token: string, payload: ManagerValidationPayload) {
  return apiRequest<EmployerPortalReportingManager>(
    employerPortalPath(token, "/references/manager-validation"),
    {
      ...publicRequestOptions,
      method: "POST",
      body: payload,
    },
  );
}
