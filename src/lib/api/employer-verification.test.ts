import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequestSpy = vi.fn();

vi.mock("@/lib/api/client", () => ({ apiRequest: apiRequestSpy }));

const {
  getEmployerVerificationWorkspace,
  rejectEmployerEmployment,
  requestEmployerClarification,
  validateEmployerReportingManager,
  verifyEmployerEmployment,
} = await import("@/lib/api/employer-verification");

describe("public employer verification API contract", () => {
  beforeEach(() => apiRequestSpy.mockReset());

  it("loads the employer workspace without account authentication or referrer leakage", () => {
    getEmployerVerificationWorkspace("private/token");

    expect(apiRequestSpy).toHaveBeenCalledWith(
      "/api/v1/public/employer-verifications/private%2Ftoken",
      expect.objectContaining({
        auth: false,
        cache: "no-store",
        credentials: "omit",
        method: "GET",
        referrerPolicy: "no-referrer",
      }),
    );
  });

  it("uses only the certified factual response endpoints", () => {
    const decision = { reason: "The dates need review", comments: null };
    verifyEmployerEmployment("token", {
      employment_existed: true,
      dates_correct: true,
      role_correct: true,
      hr_reference: {
        status: "completed",
        eligible_for_rehire: "prefer_not_to_answer",
      },
    });
    requestEmployerClarification("token", decision);
    rejectEmployerEmployment("token", decision);

    expect(apiRequestSpy.mock.calls.map(([path]) => path)).toEqual([
      "/api/v1/public/employer-verifications/token/verify",
      "/api/v1/public/employer-verifications/token/request-clarification",
      "/api/v1/public/employer-verifications/token/reject",
    ]);
    expect(apiRequestSpy.mock.calls.every(([, options]) => options.auth === false)).toBe(true);
  });

  it("submits renewed manager validation without invoking an invitation endpoint", () => {
    validateEmployerReportingManager("token", {
      nomination_id: "nomination-1",
      relationship_decision: "confirmed_reporting_manager",
      contact_provenance: "hr_confirmed",
    });

    expect(apiRequestSpy).toHaveBeenCalledWith(
      "/api/v1/public/employer-verifications/token/references/manager-validation",
      expect.objectContaining({ method: "POST", auth: false }),
    );
    expect(apiRequestSpy.mock.calls.flat().join(" ")).not.toContain(
      "/references/reporting-manager/invite",
    );
  });
});
