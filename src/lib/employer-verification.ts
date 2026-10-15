import { ApiError } from "@/lib/api/client";
import type {
  EmployerPortalManagerContact,
  EmployerPortalReportingManager,
  EmployerVerificationDecision,
  HRReferencePayload,
  ManagerContactProvenance,
  ManagerRelationshipDecision,
  ManagerValidationPayload,
  RehireEligibility,
} from "@/lib/api/employer-verification";

export const MANAGER_RELATIONSHIP_OPTIONS: ReadonlyArray<{
  value: ManagerRelationshipDecision;
  label: string;
}> = [
  { value: "confirmed_reporting_manager", label: "Yes, this was their reporting manager" },
  {
    value: "worked_here_but_not_reporting_manager",
    label: "They worked here, but were not their reporting manager",
  },
  { value: "not_recognized", label: "I don't recognize this person" },
  { value: "details_incorrect", label: "The details are incorrect" },
  { value: "cannot_confirm", label: "I can't confirm" },
  {
    value: "left_organization",
    label: "They were the reporting manager but have left the organization",
  },
];

export const MANAGER_CONTACT_OPTIONS: ReadonlyArray<{
  value: ManagerContactProvenance;
  label: string;
  description: string;
}> = [
  {
    value: "hr_confirmed",
    label: "The candidate-provided details are correct",
    description: "KairoID may use the confirmed work email when the backend allows an invitation.",
  },
  {
    value: "hr_corrected",
    label: "I'll correct the contact details",
    description: "Provide only contact information you are permitted to share.",
  },
  {
    value: "hr_cannot_confirm",
    label: "I can confirm the manager but cannot share contact information",
    description: "The relationship is recorded without requiring private contact details.",
  },
];

export interface EmployerPortalFormState {
  employmentExisted: boolean;
  datesCorrect: boolean;
  roleCorrect: boolean;
  employmentComments: string;
  hrReferenceStatus: HRReferencePayload["status"];
  rehireEligibility: RehireEligibility;
  hrComments: string;
  managerRelationship: ManagerRelationshipDecision | "";
  managerContactProvenance: ManagerContactProvenance | "";
  correctedContact: EmployerPortalManagerContact;
  decisionReason: string;
  decisionComments: string;
}

export function createEmployerPortalForm(
  manager: EmployerPortalReportingManager | null,
): EmployerPortalFormState {
  return {
    employmentExisted: false,
    datesCorrect: false,
    roleCorrect: false,
    employmentComments: "",
    hrReferenceStatus: "completed",
    rehireEligibility: "prefer_not_to_answer",
    hrComments: "",
    managerRelationship: "",
    managerContactProvenance: "",
    correctedContact: {
      full_name: manager?.candidate_provided.full_name ?? "",
      designation: manager?.candidate_provided.designation ?? "",
      work_email: manager?.candidate_provided.work_email ?? "",
      phone: manager?.candidate_provided.phone ?? "",
    },
    decisionReason: "",
    decisionComments: "",
  };
}

export function isConfirmedManagerRelationship(
  relationship: ManagerRelationshipDecision | "",
): relationship is "confirmed_reporting_manager" | "left_organization" {
  return relationship === "confirmed_reporting_manager" || relationship === "left_organization";
}

export function buildManagerValidation(
  manager: EmployerPortalReportingManager,
  form: EmployerPortalFormState,
): ManagerValidationPayload | null {
  if (!form.managerRelationship) return null;

  if (!isConfirmedManagerRelationship(form.managerRelationship)) {
    return {
      nomination_id: manager.nomination_id,
      relationship_decision: form.managerRelationship,
      contact_provenance: "hr_cannot_confirm",
    };
  }

  if (!form.managerContactProvenance) return null;

  return {
    nomination_id: manager.nomination_id,
    relationship_decision: form.managerRelationship,
    contact_provenance: form.managerContactProvenance,
    confirmed_contact:
      form.managerContactProvenance === "hr_corrected"
        ? normalizeManagerContact(form.correctedContact)
        : undefined,
  };
}

export function validateManagerForm(
  manager: EmployerPortalReportingManager | null,
  form: EmployerPortalFormState,
): Record<string, string> {
  if (!manager) return {};

  const errors: Record<string, string> = {};
  if (!form.managerRelationship) {
    errors.managerRelationship = "Select how this person was related to the candidate.";
    return errors;
  }

  if (!isConfirmedManagerRelationship(form.managerRelationship)) return errors;

  if (!form.managerContactProvenance) {
    errors.managerContactProvenance = "Select a contact-information option.";
    return errors;
  }

  if (form.managerContactProvenance !== "hr_corrected") return errors;

  const contact = normalizeManagerContact(form.correctedContact);
  if (!contact.full_name) errors.managerFullName = "Enter the reporting manager's name.";
  if (!contact.designation) errors.managerDesignation = "Enter the reporting manager's role.";
  if (!contact.work_email && !contact.phone) {
    errors.managerContact = "Provide a work email or an international phone number.";
  }
  if (contact.work_email && !isEmail(contact.work_email)) {
    errors.managerEmail = "Enter a valid work email address.";
  }
  if (contact.phone && !/^\+[1-9][0-9]{7,14}$/.test(contact.phone)) {
    errors.managerPhone = "Use international format, for example +919876543210.";
  }
  return errors;
}

export function managerRelationshipLabel(value: ManagerRelationshipDecision | "") {
  return MANAGER_RELATIONSHIP_OPTIONS.find((option) => option.value === value)?.label ?? "Not set";
}

export function managerContactLabel(value: ManagerContactProvenance | "") {
  return MANAGER_CONTACT_OPTIONS.find((option) => option.value === value)?.label ?? "Not set";
}

export function managerStatusLabel(status: string) {
  const labels: Record<string, string> = {
    not_started: "Not nominated",
    awaiting_hr_validation: "Awaiting employer confirmation",
    ready_to_invite: "Ready to invite",
    invitation_sent: "Invitation sent",
    opened: "Invitation opened",
    completed: "Reference completed",
    declined: "Reference declined",
    needs_review: "Needs review",
    expired: "Invitation expired",
  };
  return labels[status] ?? "Recorded";
}

export function decisionLabel(decision: EmployerVerificationDecision | null) {
  const labels: Record<EmployerVerificationDecision, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    declined: "Discrepancy reported",
    on_hold: "Clarification requested",
  };
  return decision ? labels[decision] : "Pending";
}

export type EmployerPortalErrorKind = "invalid" | "expired" | "conflict" | "temporary";

export function getEmployerPortalError(error: unknown): {
  kind: EmployerPortalErrorKind;
  title: string;
  message: string;
} {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return {
        kind: "invalid",
        title: "This verification link is unavailable",
        message: "The link may be invalid or revoked. Ask the candidate or KairoID team for help.",
      };
    }
    if (error.status === 410) {
      return {
        kind: "expired",
        title: "This verification link has expired",
        message: "Ask the candidate or KairoID team to send a new link.",
      };
    }
    if (error.status === 409) {
      return {
        kind: "conflict",
        title: "This verification has changed",
        message: "Refresh the page to see the latest status before continuing.",
      };
    }
  }

  return {
    kind: "temporary",
    title: "We couldn't load this verification",
    message: "Please check your connection and try again. Your response has not been submitted.",
  };
}

function normalizeManagerContact(
  contact: EmployerPortalManagerContact,
): EmployerPortalManagerContact {
  return {
    full_name: contact.full_name.trim(),
    designation: contact.designation.trim(),
    work_email: contact.work_email?.trim().toLowerCase() || null,
    phone: contact.phone?.replace(/[\s()-]/g, "") || null,
  };
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
