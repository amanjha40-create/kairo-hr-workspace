import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePersonDetailRecord } from "@/test/organization-people-fixtures";

const refetchSpy = vi.fn();
const addNoteSpy = vi.fn();
const updateNoteSpy = vi.fn();
const deleteNoteSpy = vi.fn();

const accessState: { org: { publicId: string } | null; can: (action: string) => boolean } = {
  org: { publicId: "org_123" },
  can: (action: string) => action === "modify_person",
};

const detailQueryState = {
  data: makePersonDetailRecord(),
  isPending: false,
  error: null as unknown,
  refetch: refetchSpy,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (_path: string) => (options: Record<string, unknown>) => ({
    options,
    useParams: () => ({ id: "person_123" }),
  }),
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
  TableSkeleton: () => <div>detail-skeleton</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
  }) =>
    asChild ? (
      <div>{children}</div>
    ) : (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={placeholder ?? "textarea"}
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    />
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/app/workspace-pills", () => ({
  ClaimPill: ({ value }: { value: string }) => <span>{value}</span>,
  InvitationPill: ({ value }: { value: string }) => <span>{value}</span>,
  PassportPill: ({ value }: { value: string }) => <span>{value}</span>,
  RelationshipPill: ({ value }: { value: string }) => <span>{value}</span>,
  VerificationPill: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => accessState,
}));

vi.mock("@/lib/queries/organization-people", () => ({
  useOrganizationPersonDetailQuery: () => detailQueryState,
  useAddOrganizationPersonNoteMutation: () => ({ mutateAsync: addNoteSpy, isPending: false }),
  useUpdateOrganizationPersonNoteMutation: () => ({
    mutateAsync: updateNoteSpy,
    isPending: false,
  }),
  useDeleteOrganizationPersonNoteMutation: () => ({
    mutateAsync: deleteNoteSpy,
    isPending: false,
  }),
}));

const { Route } = await import("../../routes/app.people.$id");
const PersonDetail = Route.options.component as ComponentType;

describe("Person detail page", () => {
  beforeEach(() => {
    refetchSpy.mockReset();
    addNoteSpy.mockReset();
    updateNoteSpy.mockReset();
    deleteNoteSpy.mockReset();
    accessState.org = { publicId: "org_123" };
    accessState.can = (action: string) => action === "modify_person";
    detailQueryState.data = makePersonDetailRecord();
    detailQueryState.isPending = false;
    detailQueryState.error = null;
  });

  it("renders a loading state while the backend person detail is pending", () => {
    detailQueryState.isPending = true;
    detailQueryState.data = undefined as never;

    render(<PersonDetail />);

    expect(screen.getByText("detail-skeleton")).toBeInTheDocument();
  });

  it("renders backend person detail tabs and content", () => {
    render(<PersonDetail />);

    expect(screen.getAllByText("Aman Joshi").length).toBeGreaterThan(0);
    expect(screen.getByText("Employment Verification")).toBeInTheDocument();
    expect(screen.getByText("offer-letter.pdf")).toBeInTheDocument();
    expect(screen.getByText("Strong match on submitted evidence.")).toBeInTheDocument();
  });

  it("preserves the restricted passport state from backend detail", () => {
    detailQueryState.data = makePersonDetailRecord({
      passportStatus: "Not Shared",
      passportPreview: {
        status: "Not Shared",
        sharedAt: null,
        expiresAt: null,
        revokedAt: null,
        permissions: {},
        claims: [],
      },
    });

    render(<PersonDetail />);

    expect(
      screen.getByText("This candidate hasn't shared a Trust Passport yet"),
    ).toBeInTheDocument();
  });

  it("shows retry on backend error and refetches the detail query", () => {
    detailQueryState.error = Object.assign(new Error("Backend unavailable"), { status: 500 });

    render(<PersonDetail />);
    fireEvent.click(screen.getByText("Retry"));

    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it("blocks access when people permission is missing", () => {
    accessState.can = () => false;

    render(<PersonDetail />);

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });
});
