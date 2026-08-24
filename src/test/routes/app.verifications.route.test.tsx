import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeEmploymentVerificationRecord } from "@/test/employment-verification-fixtures";

let routeSearch = { status: "all", org: "all", window: "all" };
const navigateSpy = vi.fn();
const setSearchSpy = vi.fn();

const accessState: { org: { publicId: string } | null; can: (action: string) => boolean } = {
  org: { publicId: "org_123" },
  can: (action: string) => action === "modify_verification",
};

const listQueryState = {
  data: [] as ReturnType<typeof makeEmploymentVerificationRecord>[],
  isPending: false,
  error: null as unknown,
  refetch: vi.fn(),
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
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
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
  StatCard: ({
    label,
    value,
    onClick,
  }: {
    label: string;
    value: number | string;
    onClick?: () => void;
  }) => (
    <button onClick={onClick}>
      {label}: {value}
    </button>
  ),
  TableSkeleton: () => <div>table-skeleton</div>,
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

vi.mock("@/lib/dashboard-context", () => ({
  useDashboard: () => ({
    search: "",
    setSearch: setSearchSpy,
  }),
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => accessState,
}));

vi.mock("@/lib/queries/verification-requests", () => ({
  useVerificationRequestListQuery: () => listQueryState,
}));

const { Route } = await import("../../routes/app.verifications.index");
const EmploymentVerificationsPage = Route.options.component as ComponentType;

describe("Employment Verification list page", () => {
  beforeEach(() => {
    routeSearch = { status: "all", org: "all", window: "all" };
    navigateSpy.mockReset();
    setSearchSpy.mockReset();
    accessState.org = { publicId: "org_123" };
    accessState.can = (action: string) => action === "modify_verification";
    listQueryState.data = [];
    listQueryState.isPending = false;
    listQueryState.error = null;
    listQueryState.refetch.mockReset();
  });

  it("renders a loading state while the backend list is pending", () => {
    listQueryState.isPending = true;
    listQueryState.data = undefined as never;

    render(<EmploymentVerificationsPage />);

    expect(screen.getByText("table-skeleton")).toBeInTheDocument();
  });

  it("renders backend verification rows when data is available", () => {
    listQueryState.data = [makeEmploymentVerificationRecord()];

    render(<EmploymentVerificationsPage />);

    expect(screen.getAllByText("Aman Joshi").length).toBeGreaterThan(0);
    expect(screen.getByText("Employment")).toBeInTheDocument();
    expect(screen.getAllByText("In Review").length).toBeGreaterThan(0);
  });

  it("shows retry on backend error and refetches the list query", () => {
    listQueryState.error = Object.assign(new Error("Backend unavailable"), { status: 500 });

    render(<EmploymentVerificationsPage />);
    fireEvent.click(screen.getByText("Retry"));

    expect(listQueryState.refetch).toHaveBeenCalledTimes(1);
  });

  it("blocks access when verification-view permission is missing", () => {
    accessState.can = () => false;

    render(<EmploymentVerificationsPage />);

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });
});
