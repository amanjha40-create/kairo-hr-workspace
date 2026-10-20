import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const token = "opaque-team-token-value-123456";
const acceptSpy = vi.fn();
const queryState = {
  data: {
    organization_name: "Acme Limited",
    invited_role: "reviewer" as const,
    status: "pending",
    expires_at: "2026-10-25T00:00:00Z",
  },
  isPending: false,
  error: null as unknown,
};
const mutationState = {
  isPending: false,
  isSuccess: false,
  error: null as unknown,
  data: {
    organization_public_id: "org-1",
    membership_public_id: "membership-1",
    role: "reviewer" as const,
    accepted_at: "2026-10-18T10:00:00Z",
  },
};
const authState = {
  session: null as { access_token: string } | null,
  user: null as { email: string } | null,
  loading: false,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
    useSearch: () => ({ token }),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => queryState,
  useMutation: () => ({ ...mutationState, mutate: acceptSpy }),
}));

vi.mock("@/lib/auth-context", () => ({ useAuth: () => authState }));

vi.mock("@/components/auth/AuthShell", () => ({
  AuthShell: ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle: string;
    children: ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const { Route } = await import("../../routes/team-invitations.accept");
const AcceptancePage = Route.options.component as ComponentType;

describe("team invitation acceptance route", () => {
  beforeEach(() => {
    acceptSpy.mockReset();
    queryState.data.organization_name = "Acme Limited";
    queryState.data.invited_role = "reviewer";
    queryState.isPending = false;
    queryState.error = null;
    mutationState.isPending = false;
    mutationState.isSuccess = false;
    mutationState.error = null;
    authState.session = null;
    authState.user = null;
    authState.loading = false;
  });

  it("publishes a no-index, no-referrer public route and retains the token through sign-in", () => {
    render(<AcceptancePage />);

    expect(Route.fullPath).toBe("/team-invitations/accept");
    expect(Route.options.head?.({} as never)).toEqual({
      meta: expect.arrayContaining([
        { name: "robots", content: "noindex, nofollow" },
        { name: "referrer", content: "no-referrer" },
      ]),
    });
    expect(screen.getByText("Join Acme Limited")).toBeInTheDocument();
    expect(screen.getByText("Sign in to accept").closest("a")).toHaveAttribute(
      "href",
      `/login?returnTo=${encodeURIComponent(`/team-invitations/accept?token=${token}`)}`,
    );
  });

  it("lets the matching authenticated user accept and renders success", () => {
    authState.session = { access_token: "session" };
    authState.user = { email: "recipient@example.com" };
    const { rerender } = render(<AcceptancePage />);

    fireEvent.click(screen.getByText("Accept invitation"));
    expect(acceptSpy).toHaveBeenCalledTimes(1);

    mutationState.isSuccess = true;
    rerender(<AcceptancePage />);
    expect(screen.getByText("Invitation accepted")).toBeInTheDocument();
    expect(screen.getByText(/reviewer access to Acme Limited/i)).toBeInTheDocument();
  });

  it("renders an untrusted organization name as inert text", () => {
    const payload = '"><img src=x onerror=alert(1)><script>alert("xss")</script>';
    queryState.data.organization_name = payload;

    const { container } = render(<AcceptancePage />);

    expect(screen.getByText(`Join ${payload}`)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).toContain("&lt;script&gt;");
  });
});
