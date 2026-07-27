import { render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateSpy = vi.fn();
const signOutSpy = vi.fn().mockResolvedValue(undefined);
const setSearchSpy = vi.fn();
const setInviteOpenSpy = vi.fn();

const accessState = {
  state: "ready",
  loading: false,
  error: null as { message: string } | null,
  retry: vi.fn(),
  role: "Admin",
  org: { name: "Acme" },
  can: vi.fn(() => true),
};

const authState = {
  user: {
    email: "alex@acme.test",
    user_metadata: { full_name: "Alex Admin" },
  },
  session: { access_token: "token" },
  loading: false,
  signOut: signOutSpy,
};

const dashboardState = {
  search: "",
  setSearch: setSearchSpy,
  setInviteOpen: setInviteOpenSpy,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
  }),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  Outlet: () => <div>route-outlet</div>,
  useNavigate: () => navigateSpy,
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: "/app" } }),
}));

vi.mock("@/lib/access-context", () => ({
  AccessProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAccess: () => accessState,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/dashboard-context", () => ({
  DashboardProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useDashboard: () => dashboardState,
}));

vi.mock("@/components/Logo", () => ({
  Logo: () => <div>logo</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ref,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    ref?: React.Ref<HTMLInputElement>;
  }) => (
    <input
      ref={ref}
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      placeholder={placeholder}
    />
  ),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/app/InviteEmployeeModal", () => ({
  InviteEmployeeModal: () => <div>invite-modal</div>,
}));

vi.mock("@/components/app/NotificationsPopover", () => ({
  NotificationsPopover: () => <div>notifications</div>,
}));

vi.mock("@/components/app/HelpWidget", () => ({
  HelpWidget: () => <div>help-widget</div>,
}));

vi.mock("@/components/app/access/StateScreens", () => ({
  AccessDeniedScreen: ({ message }: { message?: string }) => (
    <div>{message ?? "access-denied"}</div>
  ),
  InvitationPendingScreen: () => <div>invitation-pending</div>,
  MembershipSuspendedScreen: () => <div>membership-suspended</div>,
  OrgSuspendedScreen: () => <div>org-suspended</div>,
  SessionExpiredScreen: () => <div>session-expired</div>,
  VerificationPendingBanner: () => <div>verification-pending-banner</div>,
  WorkspaceErrorScreen: ({ message }: { message?: string }) => (
    <div>{message ?? "workspace-error"}</div>
  ),
  WorkspaceLoadingScreen: () => <div>workspace-loading</div>,
}));

vi.mock("@/components/app/access/DevPreview", () => ({
  DevPreview: () => null,
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

const { Route } = await import("../../routes/app");
const AppRoute = Route.options.component as ComponentType;

describe("Authenticated app shell", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    signOutSpy.mockClear();
    setSearchSpy.mockReset();
    setInviteOpenSpy.mockReset();
    accessState.state = "ready";
    accessState.loading = false;
    accessState.error = null;
    accessState.retry.mockReset();
    accessState.can.mockReturnValue(true);
    authState.loading = false;
    authState.session = { access_token: "token" };
  });

  it("does not render the demo environment banner", () => {
    render(<AppRoute />);

    expect(screen.queryByText("Demo environment · Sample data")).not.toBeInTheDocument();
    expect(screen.getByText("route-outlet")).toBeInTheDocument();
  });

  it("renders the organization verification banner when applicable", () => {
    accessState.state = "verification_pending";

    render(<AppRoute />);

    expect(screen.getByText("verification-pending-banner")).toBeInTheDocument();
    expect(screen.queryByText("Demo environment · Sample data")).not.toBeInTheDocument();
  });
});
