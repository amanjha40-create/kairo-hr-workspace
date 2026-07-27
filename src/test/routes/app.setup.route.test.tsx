import { render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateSpy = vi.fn();

const accessState = {
  state: "no_org",
  loading: false,
  error: null as { message: string } | null,
  retry: vi.fn(),
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
  }),
  useNavigate: () => navigateSpy,
}));

vi.mock("@/lib/access-context", () => ({
  AccessProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAccess: () => accessState,
}));

vi.mock("@/components/app/access/OrgOnboarding", () => ({
  OrgOnboarding: () => <div>org-onboarding</div>,
}));

vi.mock("@/components/app/access/StateScreens", () => ({
  AccessDeniedScreen: ({ message }: { message?: string }) => (
    <div>{message ?? "access-denied"}</div>
  ),
  InvitationPendingScreen: () => <div>invitation-pending</div>,
  MembershipSuspendedScreen: () => <div>membership-suspended</div>,
  OrgSuspendedScreen: () => <div>org-suspended</div>,
  SessionExpiredScreen: () => <div>session-expired</div>,
  WorkspaceErrorScreen: ({ message }: { message?: string }) => (
    <div>{message ?? "workspace-error"}</div>
  ),
  WorkspaceLoadingScreen: () => <div>workspace-loading</div>,
}));

vi.mock("@/components/app/access/DevPreview", () => ({
  DevPreview: () => null,
}));

const { Route } = await import("../../routes/app.setup");
const SetupRoute = Route.options.component as ComponentType;

describe("Setup route", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    accessState.state = "no_org";
    accessState.loading = false;
    accessState.error = null;
    accessState.retry.mockReset();
  });

  it("renders onboarding when organization setup is required", () => {
    render(<SetupRoute />);

    expect(screen.getByText("org-onboarding")).toBeInTheDocument();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("redirects ready workspaces back to /app", async () => {
    accessState.state = "ready";

    render(<SetupRoute />);

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith({ to: "/app", replace: true });
    });
  });

  it("shows the route error state when bootstrap fails", () => {
    accessState.error = { message: "Bootstrap failed" };
    accessState.state = "unknown";

    render(<SetupRoute />);

    expect(screen.getByText("Bootstrap failed")).toBeInTheDocument();
  });
});
