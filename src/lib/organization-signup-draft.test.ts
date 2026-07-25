import { beforeEach, describe, expect, it } from "vitest";
import {
  clearOrganizationSignupDraft,
  deriveDomainFromWorkEmail,
  readOrganizationSignupDraft,
  writeOrganizationSignupDraft,
} from "@/lib/organization-signup-draft";

describe("organization signup draft storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("persists the pending verification draft", () => {
    writeOrganizationSignupDraft({
      stage: "verify_email",
      signupSessionId: "signup_123",
      fullName: "Jane Doe",
      workEmail: "jane@company.com",
      companyName: "Acme Inc.",
      companySize: "11-50",
      hiringVolume: "10-50",
    });

    expect(readOrganizationSignupDraft()).toEqual({
      stage: "verify_email",
      signupSessionId: "signup_123",
      fullName: "Jane Doe",
      workEmail: "jane@company.com",
      companyName: "Acme Inc.",
      companySize: "11-50",
      hiringVolume: "10-50",
    });
  });

  it("clears the saved draft", () => {
    writeOrganizationSignupDraft({
      stage: "complete_onboarding",
      fullName: "Jane Doe",
      workEmail: "jane@company.com",
      companyName: "Acme Inc.",
      companySize: "11-50",
      hiringVolume: "10-50",
    });

    clearOrganizationSignupDraft();

    expect(readOrganizationSignupDraft()).toBeNull();
  });

  it("derives a lowercase domain from a work email", () => {
    expect(deriveDomainFromWorkEmail("Jane@Company.COM")).toBe("company.com");
    expect(deriveDomainFromWorkEmail("invalid-email")).toBeUndefined();
  });
});
