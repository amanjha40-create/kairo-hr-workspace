import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeEmploymentVerificationRecord,
  makeReviewerOption,
  makeVerificationEvidenceItem,
  makeVerificationTimelineItem,
} from "@/test/employment-verification-fixtures";

let routeParams = { id: "vr_123" };
const updateInternalNoteSpy = vi.fn();
const acceptMutationSpy = vi.fn();

const accessState: { org: { publicId: string } | null; can: (action: string) => boolean } = {
  org: { publicId: "org_123" },
  can: (action: string) => action === "modify_verification",
};

const detailQueryState = {
  data: undefined as ReturnType<typeof makeEmploymentVerificationRecord> | undefined,
  isPending: false,
  isFetching: false,
  error: null as unknown,
  refetch: vi.fn(),
};

const timelineQueryState = {
  data: [makeVerificationTimelineItem()],
  isPending: false,
  isFetching: false,
  error: null as unknown,
  refetch: vi.fn(),
};

const evidenceQueryState = {
  data: [makeVerificationEvidenceItem()],
  isPending: false,
  isFetching: false,
  error: null as unknown,
  refetch: vi.fn(),
};

const reviewersQueryState = {
  data: [makeReviewerOption()],
  isPending: false,
  isFetching: false,
  error: null as unknown,
  refetch: vi.fn(),
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
    useParams: () => routeParams,
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
  }) => {
    if (asChild) return <>{children}</>;
    return (
      <button disabled={disabled} onClick={onClick}>
        {children}
      </button>
    );
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => accessState,
}));

vi.mock("@/lib/queries/verification-requests", () => ({
  useAcceptVerificationRequestMutation: () => ({
    mutateAsync: acceptMutationSpy,
    isPending: false,
  }),
  useAssignVerificationReviewerMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRejectVerificationRequestMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRequestVerificationClarificationMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnableToVerifyVerificationRequestMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateVerificationInternalNoteMutation: () => ({
    mutateAsync: updateInternalNoteSpy,
    isPending: false,
  }),
  useVerificationRequestDetailQuery: () => detailQueryState,
  useVerificationRequestEvidenceQuery: () => evidenceQueryState,
  useVerificationRequestTimelineQuery: () => timelineQueryState,
  useVerificationReviewerOptionsQuery: () => reviewersQueryState,
  useVerifyVerificationRequestMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { Route } = await import("../../routes/app.verifications.$id");
const EmploymentVerificationDetailPage = Route.options.component as ComponentType;

describe("Employment Verification detail page", () => {
  beforeEach(() => {
    routeParams = { id: "vr_123" };
    accessState.org = { publicId: "org_123" };
    accessState.can = (action: string) => action === "modify_verification";
    acceptMutationSpy.mockReset();
    updateInternalNoteSpy.mockReset();
    detailQueryState.data = makeEmploymentVerificationRecord();
    detailQueryState.isPending = false;
    detailQueryState.isFetching = false;
    detailQueryState.error = null;
    detailQueryState.refetch.mockReset();
    timelineQueryState.error = null;
    timelineQueryState.refetch.mockReset();
    evidenceQueryState.error = null;
    evidenceQueryState.refetch.mockReset();
    reviewersQueryState.error = null;
    reviewersQueryState.refetch.mockReset();
  });

  it("renders a loading state while the backend detail is pending", () => {
    detailQueryState.data = undefined;
    detailQueryState.isPending = true;
    timelineQueryState.isPending = true;
    evidenceQueryState.isPending = true;

    render(<EmploymentVerificationDetailPage />);

    expect(screen.getByText("detail-skeleton")).toBeInTheDocument();
  });

  it("renders a not found state for backend 404 responses", () => {
    detailQueryState.data = undefined;
    detailQueryState.error = Object.assign(new Error("Not found"), { status: 404 });

    render(<EmploymentVerificationDetailPage />);

    expect(screen.getByText("Employment verification not found")).toBeInTheDocument();
  });

  it("saves internal notes through the backend mutation", () => {
    updateInternalNoteSpy.mockResolvedValue(makeEmploymentVerificationRecord());

    render(<EmploymentVerificationDetailPage />);
    fireEvent.change(screen.getByLabelText("Add a private note for reviewers…"), {
      target: { value: "Updated internal note" },
    });
    fireEvent.click(screen.getByText("Save note"));

    expect(updateInternalNoteSpy).toHaveBeenCalledWith({
      verificationRequestPublicId: "vr_123",
      note: "Updated internal note",
    });
  });

  it("shows acceptance as the only verifier action before the request is accepted", () => {
    const acceptedRecord = makeEmploymentVerificationRecord({
      backendStatus: "in_progress",
      status: "In Review",
      reviewStatus: "assigned",
    });
    acceptMutationSpy.mockResolvedValue(acceptedRecord);
    detailQueryState.data = makeEmploymentVerificationRecord({
      backendStatus: "pending_organization_acceptance",
      status: "Needs Acceptance",
      reviewStatus: "unassigned",
      assignedReviewer: undefined,
      isAssignedToCurrentUser: false,
    });

    render(<EmploymentVerificationDetailPage />);

    expect(screen.getByRole("button", { name: "Accept request" })).toBeInTheDocument();
    expect(screen.queryByText("Confirm employment")).not.toBeInTheDocument();
    expect(screen.queryByText("Report discrepancy")).not.toBeInTheDocument();
    expect(screen.queryByText("Unable to verify")).not.toBeInTheDocument();
    expect(screen.getByText("Accept the request before assigning a reviewer.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accept request" }));

    expect(acceptMutationSpy).toHaveBeenCalledWith("vr_123");
  });

  it("blocks access when verification-view permission is missing", () => {
    accessState.can = () => false;

    render(<EmploymentVerificationDetailPage />);

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });
});
