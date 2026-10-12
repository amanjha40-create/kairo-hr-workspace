import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { EmployerPortalReportingManager } from "@/lib/api/employer-verification";
import {
  buildManagerValidation,
  createEmployerPortalForm,
  getEmployerPortalError,
  validateManagerForm,
} from "@/lib/employer-verification";

const manager: EmployerPortalReportingManager = {
  nomination_id: "nomination-1",
  candidate_provided: {
    full_name: "Riya Manager",
    designation: "Engineering Manager",
    work_email: "riya@example.com",
    phone: "+919876543210",
  },
  status: "awaiting_hr_validation",
  revalidation_required: false,
  validation: {},
  validated_at: null,
};

describe("employer verification form contract", () => {
  it("maps a confirmed candidate-provided manager without copying contact into the payload", () => {
    const form = {
      ...createEmployerPortalForm(manager),
      managerRelationship: "confirmed_reporting_manager" as const,
      managerContactProvenance: "hr_confirmed" as const,
    };

    expect(buildManagerValidation(manager, form)).toEqual({
      nomination_id: "nomination-1",
      relationship_decision: "confirmed_reporting_manager",
      contact_provenance: "hr_confirmed",
      confirmed_contact: undefined,
    });
  });

  it("normalizes an HR-corrected email and international phone", () => {
    const form = {
      ...createEmployerPortalForm(manager),
      managerRelationship: "left_organization" as const,
      managerContactProvenance: "hr_corrected" as const,
      correctedContact: {
        full_name: " Former Manager ",
        designation: " Director ",
        work_email: "FORMER@EXAMPLE.COM ",
        phone: "+91 98765 43210",
      },
    };

    expect(validateManagerForm(manager, form)).toEqual({});
    expect(buildManagerValidation(manager, form)?.confirmed_contact).toEqual({
      full_name: "Former Manager",
      designation: "Director",
      work_email: "former@example.com",
      phone: "+919876543210",
    });
  });

  it("requires a valid corrected contact method", () => {
    const form = {
      ...createEmployerPortalForm(manager),
      managerRelationship: "confirmed_reporting_manager" as const,
      managerContactProvenance: "hr_corrected" as const,
      correctedContact: {
        full_name: "Riya Manager",
        designation: "Manager",
        work_email: "not-an-email",
        phone: "1234",
      },
    };

    expect(validateManagerForm(manager, form)).toMatchObject({
      managerEmail: "Enter a valid work email address.",
      managerPhone: "Use international format, for example +919876543210.",
    });
  });

  it("maps negative relationship decisions without exposing contact details", () => {
    const form = {
      ...createEmployerPortalForm(manager),
      managerRelationship: "not_recognized" as const,
    };

    expect(buildManagerValidation(manager, form)).toEqual({
      nomination_id: "nomination-1",
      relationship_decision: "not_recognized",
      contact_provenance: "hr_cannot_confirm",
    });
  });

  it("uses safe wording for invalid, expired and temporary failures", () => {
    expect(
      getEmployerPortalError(
        new ApiError({ status: 404, code: "not_found", message: "raw token failure" }),
      ).title,
    ).toBe("This verification link is unavailable");
    expect(
      getEmployerPortalError(
        new ApiError({ status: 410, code: "expired", message: "raw token failure" }),
      ).title,
    ).toBe("This verification link has expired");
    expect(getEmployerPortalError(new TypeError("Failed to fetch")).kind).toBe("temporary");
  });
});
