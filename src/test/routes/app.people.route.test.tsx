import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePeopleDirectoryResponse } from "@/test/organization-people-fixtures";

let routeSearch = {
  relationship: "all",
  invitation: "all",
  verification: "all",
  passport: "all",
  addedBy: "all",
  from: "all",
};
const navigateSpy = vi.fn();
const refetchAllSpy = vi.fn();
const refetchFilteredSpy = vi.fn();
const setInviteOpenSpy = vi.fn();
const setSearchSpy = vi.fn();

const accessState: { org: { publicId: string } | null; can: (action: string) => boolean } = {
  org: { publicId: "org_123" },
  can: (action: string) => action === "invite_candidate" || action === "modify_person",
};

const allPeopleQueryState = {
  data: makePeopleDirectoryResponse(),
  isPending: false,
  error: null as unknown,
  refetch: refetchAllSpy,
};

const filteredPeopleQueryState = {
  data: makePeopleDirectoryResponse(),
  isPending: false,
  error: null as unknown,
  refetch: refetchFilteredSpy,
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
    <button onClick={onClick} disabled={disabled}>
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
}));

vi.mock("@/components/app/access/PermissionDenied", () => ({
  PermissionDenied: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("@/components/app/workspace-pills", () => ({
  InvitationPill: ({ value }: { value: string }) => <span>{value}</span>,
  PassportPill: ({ value }: { value: string }) => <span>{value}</span>,
  RelationshipPill: ({ value }: { value: string }) => <span>{value}</span>,
  VerificationPill: ({ value }: { value: string }) => <span>{value}</span>,
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

vi.mock("@/lib/queries/organization-people", () => ({
  useOrganizationPeopleDirectoryQuery: (_orgPublicId: string, params: { search?: string }) =>
    params.search !== undefined || Object.keys(params).length > 2
      ? filteredPeopleQueryState
      : allPeopleQueryState,
}));

const { Route } = await import("../../routes/app.people.index");
const PeoplePage = Route.options.component as ComponentType;

describe("People directory page", () => {
  beforeEach(() => {
    routeSearch = {
      relationship: "all",
      invitation: "all",
      verification: "all",
      passport: "all",
      addedBy: "all",
      from: "all",
    };
    navigateSpy.mockReset();
    refetchAllSpy.mockReset();
    refetchFilteredSpy.mockReset();
    setInviteOpenSpy.mockReset();
    setSearchSpy.mockReset();
    accessState.org = { publicId: "org_123" };
    accessState.can = (action: string) =>
      action === "invite_candidate" || action === "modify_person";
    allPeopleQueryState.data = makePeopleDirectoryResponse();
    allPeopleQueryState.isPending = false;
    allPeopleQueryState.error = null;
    filteredPeopleQueryState.data = makePeopleDirectoryResponse();
    filteredPeopleQueryState.isPending = false;
    filteredPeopleQueryState.error = null;
  });

  it("renders a loading state while the filtered backend directory is pending", () => {
    filteredPeopleQueryState.isPending = true;
    filteredPeopleQueryState.data = undefined as never;

    render(<PeoplePage />);

    expect(screen.getByText("table-skeleton")).toBeInTheDocument();
  });

  it("renders an empty first-use state when the organization has no people", () => {
    allPeopleQueryState.data = makePeopleDirectoryResponse({
      items: [],
      total: 0,
      summary: {
        totalPeople: 0,
        byRelationship: {},
        byInvitationStatus: {},
        byVerificationStatus: {},
        byPassportStatus: {},
        byTrustState: {},
      },
    });
    filteredPeopleQueryState.data = allPeopleQueryState.data;

    render(<PeoplePage />);

    expect(screen.getByText("No people yet")).toBeInTheDocument();
    expect(screen.getAllByText("Invite Candidate")).toHaveLength(2);
  });

  it("renders backend people rows when data is available", () => {
    render(<PeoplePage />);

    expect(screen.getAllByText("Aman Joshi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("aman@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Candidate").length).toBeGreaterThan(0);
  });

  it("shows retry on backend error and refetches both queries", () => {
    filteredPeopleQueryState.error = Object.assign(new Error("Backend unavailable"), {
      status: 500,
    });

    render(<PeoplePage />);
    fireEvent.click(screen.getByText("Retry"));

    expect(refetchFilteredSpy).toHaveBeenCalledTimes(1);
    expect(refetchAllSpy).toHaveBeenCalledTimes(1);
  });

  it("blocks access when people permission is missing", () => {
    accessState.can = () => false;

    render(<PeoplePage />);

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });
});
