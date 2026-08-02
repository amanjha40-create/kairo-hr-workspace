import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeTrustInvitationRecord } from "@/test/trust-invitation-fixtures";

let routeParams = { id: "ti_123" };
const navigateSpy = vi.fn();
const resendMutationSpy = vi.fn();
const cancelMutationSpy = vi.fn();
const deleteMutationSpy = vi.fn();
const sendMutationSpy = vi.fn();

const accessState: { org: { publicId: string } | null; can: (action: string) => boolean } = {
  org: { publicId: "org_123" },
  can: (action: string) => action === "invite_candidate" || action === "modify_invitation",
};

const detailQueryState = {
  data: undefined as ReturnType<typeof makeTrustInvitationRecord> | undefined,
  isPending: false,
  error: null as unknown,
  refetch: vi.fn(),
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
    useParams: () => routeParams,
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
  TableSkeleton: () => <div>detail-skeleton</div>,
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

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/app/workspace-pills", () => ({
  InvitationPill: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock("@/components/app/access/PermissionDenied", () => ({
  PermissionDenied: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => accessState,
}));

vi.mock("@/lib/queries/trust-invitations", () => ({
  useCancelTrustInvitationMutation: () => ({
    mutateAsync: cancelMutationSpy,
    isPending: false,
  }),
  useDeleteTrustInvitationMutation: () => ({
    mutateAsync: deleteMutationSpy,
    isPending: false,
  }),
  useResendTrustInvitationMutation: () => ({
    mutateAsync: resendMutationSpy,
    isPending: false,
  }),
  useSendTrustInvitationMutation: () => ({
    mutateAsync: sendMutationSpy,
    isPending: false,
  }),
  useTrustInvitationDetailQuery: () => detailQueryState,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { Route } = await import("../../routes/app.invitations.$id");
const InvitationDetailPage = Route.options.component as ComponentType;

describe("Trust Invitation detail page", () => {
  beforeEach(() => {
    routeParams = { id: "ti_123" };
    navigateSpy.mockReset();
    resendMutationSpy.mockReset();
    cancelMutationSpy.mockReset();
    deleteMutationSpy.mockReset();
    sendMutationSpy.mockReset();
    accessState.org = { publicId: "org_123" };
    accessState.can = (action: string) =>
      action === "invite_candidate" || action === "modify_invitation";
    detailQueryState.data = undefined;
    detailQueryState.isPending = false;
    detailQueryState.error = null;
    detailQueryState.refetch.mockReset();
  });

  it("renders a loading state while the backend detail is pending", () => {
    detailQueryState.isPending = true;

    render(<InvitationDetailPage />);

    expect(screen.getByText("detail-skeleton")).toBeInTheDocument();
  });

  it("renders an unknown invitation state for backend 404 responses", () => {
    detailQueryState.error = Object.assign(new Error("Not found"), { status: 404 });

    render(<InvitationDetailPage />);

    expect(screen.getByText("Invitation not found")).toBeInTheDocument();
  });

  it("renders backend invitation detail fields and timeline events exactly once", () => {
    detailQueryState.data = makeTrustInvitationRecord({
      timeline: [
        {
          id: "event_created",
          kind: "created",
          label: "Draft created",
          actor: "Owner Example",
          at: "2026-07-24T08:00:00.000Z",
        },
        {
          id: "event_sent",
          kind: "sent",
          label: "Invitation sent",
          actor: "Owner Example",
          at: "2026-07-24T09:00:00.000Z",
        },
      ],
    });

    render(<InvitationDetailPage />);

    expect(screen.getAllByText("Aman Joshi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("aman@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer Hiring")).toBeInTheDocument();
    expect(screen.getByText("https://trust.kairo.dev/invitations/ti_123")).toBeInTheDocument();
    expect(screen.getByText("Draft created")).toBeInTheDocument();
    expect(screen.getAllByText("Invitation sent")).toHaveLength(1);
  });

  it("resends backend invitations from the detail page", () => {
    detailQueryState.data = makeTrustInvitationRecord({ status: "Sent" });
    resendMutationSpy.mockResolvedValue(detailQueryState.data);

    render(<InvitationDetailPage />);
    fireEvent.click(screen.getByText("Send reminder"));

    expect(resendMutationSpy).toHaveBeenCalledWith("ti_123");
  });

  it("deletes backend drafts from the detail page", () => {
    detailQueryState.data = makeTrustInvitationRecord({ status: "Draft", backendStatus: "draft" });
    deleteMutationSpy.mockResolvedValue(undefined);

    render(<InvitationDetailPage />);
    fireEvent.click(screen.getByText("Delete draft"));
    fireEvent.click(screen.getByText("Delete"));

    expect(deleteMutationSpy).toHaveBeenCalledWith("ti_123");
  });

  it("blocks access when invitation-view permission is missing", () => {
    accessState.can = () => false;

    render(<InvitationDetailPage />);

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });
});
