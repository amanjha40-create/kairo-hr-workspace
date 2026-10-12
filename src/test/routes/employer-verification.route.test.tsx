import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type {
  EmployerPortalActionResponse,
  EmployerPortalWorkspace,
} from "@/lib/api/employer-verification";

const api = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  verify: vi.fn(),
  reject: vi.fn(),
  clarify: vi.fn(),
  validateManager: vi.fn(),
}));

vi.mock("@/lib/api/employer-verification", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/employer-verification")>()),
  getEmployerVerificationWorkspace: api.getWorkspace,
  verifyEmployerEmployment: api.verify,
  rejectEmployerEmployment: api.reject,
  requestEmployerClarification: api.clarify,
  validateEmployerReportingManager: api.validateManager,
}));

vi.mock("@/components/Logo", () => ({
  Logo: () => <div aria-label="KairoID">KairoID</div>,
}));

const { EmployerVerificationPortal } =
  await import("@/components/employer-verification/EmployerVerificationPortal");

const action: EmployerPortalActionResponse = {
  employer_verification_public_id: "ev-1",
  decision: "confirmed",
  verification_request_status: "pending_admin_quality_review",
  employment_verification_status: "submitted",
  idempotent: false,
};

function makeWorkspace(overrides: Partial<EmployerPortalWorkspace> = {}): EmployerPortalWorkspace {
  return {
    reporting_manager: null,
    employer_verification_public_id: "ev-1",
    state: "pending",
    decision: null,
    expires_at: "2026-10-20T12:00:00Z",
    candidate: { full_name: "Asha Candidate" },
    employment: {
      employer_name: "KairoID Labs",
      job_title: "Product Engineer",
      employment_type: "full_time",
      start_date: "2023-01-10",
      end_date: null,
      country: "India",
      region: "Karnataka",
    },
    evidence_summary: [],
    verification_request_public_id: "vr-1",
    verification_request_status: "pending_organization_acceptance",
    employer_contact: {
      contact_name: "Harsha HR",
      relationship: "HR",
      email_masked: "h***a@example.com",
    },
    timeline: [],
    ...overrides,
  };
}

function managerWorkspace(overrides: Record<string, unknown> = {}) {
  return makeWorkspace({
    reporting_manager: {
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
      ...overrides,
    },
  });
}

function completedWorkspace(manager = null as EmployerPortalWorkspace["reporting_manager"]) {
  return makeWorkspace({
    state: "completed",
    decision: "confirmed",
    verification_request_status: "pending_admin_quality_review",
    reporting_manager: manager,
  });
}

async function confirmEmployment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText(/worked at KairoID Labs/i));
  await user.click(screen.getByLabelText(/role or title was Product Engineer/i));
  await user.click(screen.getByLabelText(/employment dates shown below are correct/i));
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

async function continuePastReference(user: ReturnType<typeof userEvent.setup>) {
  expect(screen.getByRole("heading", { name: /concise factual reference/i })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

describe("public employer verification route", () => {
  beforeEach(() => {
    api.getWorkspace.mockReset();
    api.verify.mockReset();
    api.reject.mockReset();
    api.clarify.mockReset();
    api.validateManager.mockReset();
    api.verify.mockResolvedValue(action);
    api.reject.mockResolvedValue({ ...action, decision: "declined" });
    api.clarify.mockResolvedValue({ ...action, decision: "on_hold" });
    Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  });

  it("preserves the employment-only flow when no manager was nominated", async () => {
    const user = userEvent.setup();
    api.getWorkspace
      .mockResolvedValueOnce(makeWorkspace())
      .mockResolvedValueOnce(completedWorkspace());
    render(<EmployerVerificationPortal token="secret-token" />);

    await screen.findByRole("heading", { name: "Verify Asha Candidate" });
    await confirmEmployment(user);
    await continuePastReference(user);
    expect(screen.getByText("No manager was nominated")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit verification" }));

    await screen.findByRole("heading", { name: "Response recorded" });
    expect(api.verify).toHaveBeenCalledWith(
      "secret-token",
      expect.objectContaining({
        employment_existed: true,
        dates_correct: true,
        role_correct: true,
        manager_validation: null,
      }),
    );
    expect(screen.getByText(/Awaiting KairoID quality review/i)).toBeInTheDocument();
    expect(screen.getByText("Not nominated")).toBeInTheDocument();
  });

  it("confirms a nominated manager and candidate-provided contact in the atomic response", async () => {
    const user = userEvent.setup();
    const initial = managerWorkspace();
    const confirmedManager = {
      ...initial.reporting_manager!,
      status: "ready_to_invite",
      validation: {
        relationship_decision: "confirmed_reporting_manager" as const,
        contact_provenance: "hr_confirmed" as const,
      },
    };
    api.getWorkspace
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(completedWorkspace(confirmedManager));
    render(<EmployerVerificationPortal token="secret-token" />);

    await screen.findByText("Product Engineer");
    await confirmEmployment(user);
    await continuePastReference(user);
    await user.click(screen.getByLabelText("Yes, this was their reporting manager"));
    await user.click(
      await screen.findByRole("radio", { name: /the candidate-provided details are correct/i }),
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: "Submit verification" }));

    await waitFor(() =>
      expect(api.verify).toHaveBeenCalledWith(
        "secret-token",
        expect.objectContaining({
          manager_validation: {
            nomination_id: "nomination-1",
            relationship_decision: "confirmed_reporting_manager",
            contact_provenance: "hr_confirmed",
            confirmed_contact: undefined,
          },
        }),
      ),
    );
    expect(await screen.findByText("Ready to invite")).toBeInTheDocument();
  });

  it("validates and submits corrected manager contact details", async () => {
    const user = userEvent.setup();
    const initial = managerWorkspace();
    api.getWorkspace
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(completedWorkspace(initial.reporting_manager));
    render(<EmployerVerificationPortal token="secret-token" />);

    await screen.findByText("Product Engineer");
    await confirmEmployment(user);
    await continuePastReference(user);
    await user.click(screen.getByLabelText("Yes, this was their reporting manager"));
    await user.click(
      await screen.findByRole("radio", { name: /I'll correct the contact details/i }),
    );
    await user.clear(screen.getByLabelText("Work email"));
    await user.type(screen.getByLabelText("Work email"), "not-an-email");
    await user.clear(screen.getByLabelText("Phone (optional)"));
    await user.type(screen.getByLabelText("Phone (optional)"), "1234");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("Enter a valid work email address.")).toBeInTheDocument();
    expect(screen.getByText(/Use international format/i)).toBeInTheDocument();
    expect(api.verify).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Work email"));
    await user.type(screen.getByLabelText("Work email"), "NEW.MANAGER@EXAMPLE.COM");
    await user.clear(screen.getByLabelText("Phone (optional)"));
    await user.type(screen.getByLabelText("Phone (optional)"), "+91 98765 43210");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: "Submit verification" }));

    await waitFor(() =>
      expect(api.verify).toHaveBeenCalledWith(
        "secret-token",
        expect.objectContaining({
          manager_validation: expect.objectContaining({
            contact_provenance: "hr_corrected",
            confirmed_contact: expect.objectContaining({
              work_email: "new.manager@example.com",
              phone: "+919876543210",
            }),
          }),
        }),
      ),
    );
  });

  it.each([
    [
      "They worked here, but were not their reporting manager",
      "worked_here_but_not_reporting_manager",
    ],
    ["I don't recognize this person", "not_recognized"],
    ["The details are incorrect", "details_incorrect"],
    ["I can't confirm", "cannot_confirm"],
  ] as const)("records the negative relationship state: %s", async (label, decision) => {
    const user = userEvent.setup();
    const initial = managerWorkspace();
    api.getWorkspace.mockResolvedValueOnce(initial).mockResolvedValueOnce(
      completedWorkspace({
        ...initial.reporting_manager!,
        status: "needs_review",
        validation: { relationship_decision: decision, contact_provenance: "hr_cannot_confirm" },
      }),
    );
    render(<EmployerVerificationPortal token="secret-token" />);

    await screen.findByText("Product Engineer");
    await confirmEmployment(user);
    await continuePastReference(user);
    await user.click(screen.getByLabelText(label));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: "Submit verification" }));

    await waitFor(() =>
      expect(api.verify).toHaveBeenCalledWith(
        "secret-token",
        expect.objectContaining({
          manager_validation: {
            nomination_id: "nomination-1",
            relationship_decision: decision,
            contact_provenance: "hr_cannot_confirm",
          },
        }),
      ),
    );
    expect(await screen.findByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText(/Awaiting KairoID quality review/i)).toBeInTheDocument();
  });

  it("treats a former manager as valid while allowing contact to be withheld", async () => {
    const user = userEvent.setup();
    const initial = managerWorkspace();
    api.getWorkspace.mockResolvedValueOnce(initial).mockResolvedValueOnce(
      completedWorkspace({
        ...initial.reporting_manager!,
        status: "needs_review",
        validation: {
          relationship_decision: "left_organization",
          contact_provenance: "hr_cannot_confirm",
        },
      }),
    );
    render(<EmployerVerificationPortal token="secret-token" />);

    await screen.findByText("Product Engineer");
    await confirmEmployment(user);
    await continuePastReference(user);
    await user.click(
      screen.getByLabelText("They were the reporting manager but have left the organization"),
    );
    await user.click(
      await screen.findByRole("radio", {
        name: /I can confirm the manager but cannot share contact information/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: "Submit verification" }));

    await waitFor(() =>
      expect(api.verify).toHaveBeenCalledWith(
        "secret-token",
        expect.objectContaining({
          manager_validation: expect.objectContaining({
            relationship_decision: "left_organization",
            contact_provenance: "hr_cannot_confirm",
          }),
        }),
      ),
    );
  });

  it("uses the manager-only endpoint for a renewed nomination on a completed employment", async () => {
    const user = userEvent.setup();
    const renewed = managerWorkspace({ revalidation_required: true });
    renewed.state = "completed";
    renewed.decision = "confirmed";
    api.getWorkspace.mockResolvedValue(renewed);
    api.validateManager.mockResolvedValue({
      ...renewed.reporting_manager!,
      status: "ready_to_invite",
      revalidation_required: false,
      validation: {
        relationship_decision: "confirmed_reporting_manager",
        contact_provenance: "hr_confirmed",
      },
    });
    render(<EmployerVerificationPortal token="secret-token" />);

    expect(
      await screen.findByRole("heading", { name: "Review the reporting manager" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Confirm each statement")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Yes, this was their reporting manager"));
    await user.click(
      await screen.findByRole("radio", { name: /the candidate-provided details are correct/i }),
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: "Submit manager review" }));

    await waitFor(() => expect(api.validateManager).toHaveBeenCalledTimes(1));
    expect(api.verify).not.toHaveBeenCalled();
    expect(await screen.findByText("Ready to invite")).toBeInTheDocument();
  });

  it("keeps clarification separate from HR and manager completion", async () => {
    const user = userEvent.setup();
    api.getWorkspace.mockResolvedValue(makeWorkspace());
    render(<EmployerVerificationPortal token="secret-token" />);

    await screen.findByText("Product Engineer");
    await user.type(screen.getByLabelText("What needs attention?"), "The end date is unclear");
    await user.click(screen.getByRole("button", { name: "Request clarification" }));

    await waitFor(() =>
      expect(api.clarify).toHaveBeenCalledWith("secret-token", {
        reason: "The end date is unclear",
        comments: null,
      }),
    );
    expect(await screen.findByText("Clarification requested")).toBeInTheDocument();
    expect(screen.getByText("Not completed")).toBeInTheDocument();
  });

  it("renders an already-completed link without reopening the form", async () => {
    api.getWorkspace.mockResolvedValue(
      completedWorkspace({
        ...managerWorkspace().reporting_manager!,
        status: "invitation_sent",
        validation: {
          relationship_decision: "confirmed_reporting_manager",
          contact_provenance: "hr_confirmed",
        },
      }),
    );
    render(<EmployerVerificationPortal token="secret-token" />);

    expect(await screen.findByRole("heading", { name: "Response recorded" })).toBeInTheDocument();
    expect(screen.getByText("Invitation sent")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit verification" })).not.toBeInTheDocument();
  });

  it.each([
    [404, "This verification link is unavailable"],
    [410, "This verification link has expired"],
  ])("renders a safe terminal link state for HTTP %s", async (status, title) => {
    api.getWorkspace.mockRejectedValue(
      new ApiError({ status, code: "private_error", message: "raw backend detail" }),
    );
    render(<EmployerVerificationPortal token="secret-token" />);

    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByText("raw backend detail")).not.toBeInTheDocument();
    expect(screen.queryByText("secret-token")).not.toBeInTheDocument();
  });

  it("provides a retry for temporary failures", async () => {
    const user = userEvent.setup();
    api.getWorkspace
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(makeWorkspace());
    render(<EmployerVerificationPortal token="secret-token" />);

    await user.click(await screen.findByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Verify Asha Candidate" }),
    ).toBeInTheDocument();
  });

  it("keeps the form usable on mobile at 200% text size with labelled controls", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    document.documentElement.style.fontSize = "32px";
    api.getWorkspace.mockResolvedValue(managerWorkspace());
    render(<EmployerVerificationPortal token="secret-token" />);

    expect(await screen.findByLabelText(/worked at KairoID Labs/i)).toHaveAttribute(
      "type",
      "button",
    );
    expect(screen.getByRole("navigation", { name: "Verification progress" })).toBeInTheDocument();
    expect(screen.getByText("Secure employer link")).toBeInTheDocument();
    document.documentElement.style.removeProperty("font-size");
  });
});
