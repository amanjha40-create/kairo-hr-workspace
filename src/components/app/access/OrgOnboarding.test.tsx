import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrgOnboarding } from "./OrgOnboarding";

const updateOnboardingSpy = vi.fn();
const completeOnboardingSpy = vi.fn();
const setStateSpy = vi.fn();

const accessState = {
  onboarding: null as null | {
    step: number;
    name?: string;
    type?: string;
    website?: string;
    industry?: string;
    location?: string;
    workEmail?: string;
    domain?: string;
    role?: string;
  },
  updateOnboarding: updateOnboardingSpy,
  completeOnboarding: completeOnboardingSpy,
  setState: setStateSpy,
  pendingInvitation: null as null | {
    orgName: string;
  },
};

vi.mock("@/components/Logo", () => ({
  Logo: ({ className }: { className?: string }) => <div className={className}>Kairo</div>,
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => accessState,
}));

describe("OrgOnboarding", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => {},
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: () => {},
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: () => {},
    });

    updateOnboardingSpy.mockReset();
    completeOnboardingSpy.mockReset();
    completeOnboardingSpy.mockResolvedValue(undefined);
    setStateSpy.mockReset();
    accessState.onboarding = null;
    accessState.pendingInvitation = null;
  });

  it("renders the step-2 organization type select without triggering React error #185", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<OrgOnboarding />);

    await user.click(screen.getByRole("button", { name: /set up organization/i }));

    expect(screen.getByText("Tell us about your organization.")).toBeInTheDocument();

    const organizationTypeSelect = screen.getByRole("combobox");
    expect(organizationTypeSelect).toHaveTextContent("Employer");

    await user.click(organizationTypeSelect);
    await user.click(await screen.findByRole("option", { name: "Other" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Other");
    });

    const consoleErrorMessages = consoleErrorSpy.mock.calls
      .flatMap((call) => call)
      .map((value) => String(value));

    expect(
      consoleErrorMessages.some(
        (message) =>
          message.includes("React error #185") || message.includes("Maximum update depth exceeded"),
      ),
    ).toBe(false);

    consoleErrorSpy.mockRestore();
  });
});
