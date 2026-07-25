import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeTrustInvitationRecord } from "@/test/trust-invitation-fixtures";

let routeSearch = { status: "all", purpose: "all", type: "all", page: 1 };
const navigateSpy = vi.fn();
const fetchQuerySpy = vi.fn();
const refetchInvitationsSpy = vi.fn();
const refetchSummarySpy = vi.fn();
const setInviteOpenSpy = vi.fn();
const setSearchSpy = vi.fn();

const accessState: { org: { publicId: string } | null; can: (action: string) => boolean } = {
  org: { publicId: "org_123" },
  can: (action: string) => action === "invite_candidate" || action === "modify_invitation",
};

const listQueryState = {
  data: [] as ReturnType<typeof makeTrustInvitationRecord>[],
  isPending: false,
  error: null as unknown,
  refetch: refetchInvitationsSpy,
};

const summaryQueryState = {
  data: { active: 1, awaiting: 1, accepted: 0, expiring: 0, draft: 0 },
  isPending: false,
  error: null as unknown,
  refetch: refetchSummarySpy,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
    useSearch: () => routeSearch,
  }),
  useNavigate: () => navigateSpy,
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ fetchQuery: fetchQuerySpy }),
}));

vi.mock("@/components/app/primitives", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
    </div>
  ),
  SectionCard: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <button onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
  StatCard: ({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) => (
    <button onClick={onClick}>
      {label}: {value}
    </button>
  ),
  TableSkeleton: () => <div>table-skeleton</div>,
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
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <input
      aria-label={placeholder ?? "input"}
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/app/workspace-pills", () => ({
  InvitationPill: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock("@/components/app/access/PermissionDenied", () => ({
  PermissionDenied: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("@/lib/dashboard-context", () => ({
  useDashboard: () => ({
    setInviteOpen: setInviteOpenSpy,
    search: "",
    setSearch: setSearchSpy,
  }),
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => accessState,
}));

vi.mock("@/lib/queries/trust-invitations", () => ({
  trustInvitationDetailQueryOptions: (id: string) => ({ queryKey: ["detail", id] }),
  useCancelTrustInvitationMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTrustInvitationMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useResendTrustInvitationMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSendTrustInvitationMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTrustInvitationListQuery: () => listQueryState,
  useTrustInvitationSummaryQuery: () => summaryQueryState,
}));

const { Route } = await import("../../routes/app.invitations");
const InvitationsPage = Route.options.component as ComponentType;

describe("Trust Invitations list page", () => {
  beforeEach(() => {
    routeSearch = { status: "all", purpose: "all", type: "all", page: 1 };
    navigateSpy.mockReset();
    fetchQuerySpy.mockReset();
    refetchInvitationsSpy.mockReset();
    refetchSummarySpy.mockReset();
    setInviteOpenSpy.mockReset();
    setSearchSpy.mockReset();
    accessState.org = { publicId: "org_123" };
    accessState.can = (action: string) =>
      action === "invite_candidate" || action === "modify_invitation";
    listQueryState.data = [];
    listQueryState.isPending = false;
    listQueryState.error = null;
    summaryQueryState.data = { active: 1, awaiting: 1, accepted: 0, expiring: 0, draft: 0 };
    summaryQueryState.error = null;
  });

  it("renders a loading state while the backend list is pending", () => {
    listQueryState.isPending = true;
    listQueryState.data = undefined as never;

    render(<InvitationsPage />);

    expect(screen.getByText("table-skeleton")).toBeInTheDocument();
  });

  it("renders an empty state when the backend returns no invitations", () => {
    render(<InvitationsPage />);

    expect(screen.getByText("No invitations yet")).toBeInTheDocument();
    expect(screen.getAllByText("Invite Candidate")).toHaveLength(2);
  });

  it("renders backend invitation rows when data is available", () => {
    listQueryState.data = [makeTrustInvitationRecord()];

    render(<InvitationsPage />);

    expect(screen.getAllByText("Aman Joshi").length).toBeGreaterThan(0);
    expect(screen.getByText("aman@example.com")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("shows retry on backend error and refetches both list and summary queries", () => {
    listQueryState.error = Object.assign(new Error("Backend unavailable"), { status: 500 });

    render(<InvitationsPage />);
    fireEvent.click(screen.getByText("Retry"));

    expect(refetchInvitationsSpy).toHaveBeenCalledTimes(1);
    expect(refetchSummarySpy).toHaveBeenCalledTimes(1);
  });

  it("blocks access when invitation-view permission is missing", () => {
    accessState.can = () => false;

    render(<InvitationsPage />);

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });
});
