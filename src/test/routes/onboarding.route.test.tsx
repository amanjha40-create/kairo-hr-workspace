import { render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateSpy = vi.fn();
const readOrganizationSignupDraftSpy = vi.fn();

const authState = {
  session: { access_token: "token" },
  loading: false,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
  }),
  useNavigate: () => navigateSpy,
}));

vi.mock("@/components/Logo", () => ({
  Logo: () => <div>logo</div>,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/organization-signup-draft", () => ({
  readOrganizationSignupDraft: () => readOrganizationSignupDraftSpy(),
}));

const { Route } = await import("../../routes/onboarding");
const OnboardingRoute = Route.options.component as ComponentType;

describe("Onboarding redirect route", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    readOrganizationSignupDraftSpy.mockReset();
    authState.session = { access_token: "token" };
    authState.loading = false;
  });

  it("sends authenticated signup users to the canonical app setup flow", async () => {
    readOrganizationSignupDraftSpy.mockReturnValue({ stage: "complete_onboarding" });

    render(<OnboardingRoute />);

    expect(screen.getByText("Preparing your workspace")).toBeInTheDocument();

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith({ to: "/app/setup", replace: true });
    });
  });

  it("sends authenticated users without setup work back to the workspace", async () => {
    readOrganizationSignupDraftSpy.mockReturnValue(null);

    render(<OnboardingRoute />);

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith({ to: "/app", replace: true });
    });
  });
});
