import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refetchMembersSpy = vi.fn();
const refetchInvitationsSpy = vi.fn();
const inviteMutationSpy = vi.fn();
const updateRoleSpy = vi.fn();
const suspendSpy = vi.fn();
const restoreSpy = vi.fn();
const removeSpy = vi.fn();
const transferSpy = vi.fn();
const resendSpy = vi.fn();
const cancelSpy = vi.fn();
const toastSuccessSpy = vi.fn();
const toastErrorSpy = vi.fn();

const accessState: {
  org: { publicId: string } | null;
  role: string;
  can: (action: string) => boolean;
} = {
  org: { publicId: "org_123" },
  role: "Owner",
  can: (action: string) => action === "manage_team" || action === "transfer_ownership",
};

const membersQueryState = {
  data: [
    {
      public_id: "member_1",
      organization_public_id: "org_123",
      role: "owner",
      user_email: "riya@acme.co",
      user_full_name: "Riya Kapoor",
      suspended_at: null,
      suspension_reason: null,
      created_at: "2026-07-01T10:00:00Z",
      updated_at: "2026-07-01T10:00:00Z",
    },
    {
      public_id: "member_2",
      organization_public_id: "org_123",
      role: "admin",
      user_email: "arjun@acme.co",
      user_full_name: "Arjun Sethi",
      suspended_at: null,
      suspension_reason: null,
      created_at: "2026-07-02T10:00:00Z",
      updated_at: "2026-07-02T10:00:00Z",
    },
  ],
  isPending: false,
  error: null as unknown,
  refetch: refetchMembersSpy,
};

const invitationsQueryState = {
  data: [
    {
      public_id: "invite_1",
      organization_public_id: "org_123",
      invitee_email: "devika@acme.co",
      invitee_user_id: null,
      role: "member",
      status: "pending",
      invited_by_email: "riya@acme.co",
      invited_by_full_name: "Riya Kapoor",
      invited_at: "2026-07-03T10:00:00Z",
      expires_at: "2026-08-03T10:00:00Z",
      accepted_at: null,
      declined_at: null,
      cancelled_at: null,
      created_at: "2026-07-03T10:00:00Z",
      updated_at: "2026-07-03T10:00:00Z",
    },
  ],
  isPending: false,
  error: null as unknown,
  refetch: refetchInvitationsSpy,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
  }),
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
  SectionCard: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
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

vi.mock("@/components/app/access/PermissionDenied", () => ({
  PermissionDenied: ({ message }: { message: string }) => <div>{message}</div>,
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
    disabled,
    type,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    disabled?: boolean;
    type?: string;
  }) => (
    <input
      aria-label={placeholder ?? "input"}
      disabled={disabled}
      type={type}
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    />
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    disabled,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <textarea
      aria-label={placeholder ?? "textarea"}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
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
  DropdownMenuItem: ({
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
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => accessState,
}));

vi.mock("@/lib/queries/team", () => ({
  useOrganizationMembersQuery: () => membersQueryState,
  useOrganizationInvitationsQuery: () => invitationsQueryState,
  useCreateOrganizationInvitationMutation: () => ({
    mutateAsync: inviteMutationSpy,
    isPending: false,
  }),
  useUpdateOrganizationMemberMutation: () => ({
    mutateAsync: updateRoleSpy,
    isPending: false,
  }),
  useSuspendOrganizationMemberMutation: () => ({
    mutateAsync: suspendSpy,
    isPending: false,
  }),
  useRestoreOrganizationMemberMutation: () => ({
    mutateAsync: restoreSpy,
    isPending: false,
  }),
  useRemoveOrganizationMemberMutation: () => ({
    mutateAsync: removeSpy,
    isPending: false,
  }),
  useTransferOrganizationOwnershipMutation: () => ({
    mutateAsync: transferSpy,
    isPending: false,
  }),
  useResendOrganizationInvitationMutation: () => ({
    mutateAsync: resendSpy,
    isPending: false,
  }),
  useCancelOrganizationInvitationMutation: () => ({
    mutateAsync: cancelSpy,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessSpy,
    error: toastErrorSpy,
  },
}));

const { Route } = await import("../../routes/app.team");
const TeamPage = Route.options.component as ComponentType;

const defaultMembers = [
  {
    public_id: "member_1",
    organization_public_id: "org_123",
    role: "owner",
    user_email: "riya@acme.co",
    user_full_name: "Riya Kapoor",
    suspended_at: null,
    suspension_reason: null,
    created_at: "2026-07-01T10:00:00Z",
    updated_at: "2026-07-01T10:00:00Z",
  },
  {
    public_id: "member_2",
    organization_public_id: "org_123",
    role: "admin",
    user_email: "arjun@acme.co",
    user_full_name: "Arjun Sethi",
    suspended_at: null,
    suspension_reason: null,
    created_at: "2026-07-02T10:00:00Z",
    updated_at: "2026-07-02T10:00:00Z",
  },
];

const defaultInvitations = [
  {
    public_id: "invite_1",
    organization_public_id: "org_123",
    invitee_email: "devika@acme.co",
    invitee_user_id: null,
    role: "member",
    status: "pending",
    invited_by_email: "riya@acme.co",
    invited_by_full_name: "Riya Kapoor",
    invited_at: "2026-07-03T10:00:00Z",
    expires_at: "2026-08-03T10:00:00Z",
    accepted_at: null,
    declined_at: null,
    cancelled_at: null,
    created_at: "2026-07-03T10:00:00Z",
    updated_at: "2026-07-03T10:00:00Z",
  },
];

describe("Team page", () => {
  beforeEach(() => {
    refetchMembersSpy.mockReset();
    refetchInvitationsSpy.mockReset();
    inviteMutationSpy.mockReset();
    inviteMutationSpy.mockResolvedValue(undefined);
    updateRoleSpy.mockReset();
    suspendSpy.mockReset();
    restoreSpy.mockReset();
    removeSpy.mockReset();
    transferSpy.mockReset();
    resendSpy.mockReset();
    cancelSpy.mockReset();
    toastSuccessSpy.mockReset();
    toastErrorSpy.mockReset();
    accessState.org = { publicId: "org_123" };
    accessState.role = "Owner";
    accessState.can = (action: string) =>
      action === "manage_team" || action === "transfer_ownership";
    membersQueryState.data = defaultMembers;
    membersQueryState.isPending = false;
    membersQueryState.error = null;
    invitationsQueryState.data = defaultInvitations;
    invitationsQueryState.isPending = false;
    invitationsQueryState.error = null;
  });

  it("renders a loading state while backend team data is pending", () => {
    membersQueryState.isPending = true;
    membersQueryState.data = undefined as never;

    render(<TeamPage />);

    expect(screen.getByText("table-skeleton")).toBeInTheDocument();
  });

  it("renders backend team members and invitation history rows", () => {
    render(<TeamPage />);

    expect(screen.getAllByText("Riya Kapoor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Arjun Sethi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("devika@acme.co").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Invitation Pending").length).toBeGreaterThan(0);
  });

  it("retries both backend queries when loading fails", () => {
    membersQueryState.error = new Error("Backend unavailable");

    render(<TeamPage />);
    fireEvent.click(screen.getByText("Retry"));

    expect(refetchMembersSpy).toHaveBeenCalledTimes(1);
    expect(refetchInvitationsSpy).toHaveBeenCalledTimes(1);
  });

  it("sends backend invitations from the invite dialog", async () => {
    render(<TeamPage />);

    fireEvent.click(screen.getByText("Invite team member"));
    fireEvent.change(screen.getByLabelText("alex@company.com"), {
      target: { value: "alex@company.com" },
    });
    fireEvent.click(screen.getByText("Send team invitation"));

    await waitFor(() => {
      expect(inviteMutationSpy).toHaveBeenCalledWith({
        invitee_email: "alex@company.com",
        role: "member",
      });
    });
    expect(toastSuccessSpy).toHaveBeenCalledWith("Team invitation sent");
  });

  it("shows permission denied when team access is unavailable", () => {
    accessState.can = () => false;

    render(<TeamPage />);

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });
});
