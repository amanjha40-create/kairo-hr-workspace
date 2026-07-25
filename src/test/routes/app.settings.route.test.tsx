import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refetchAccountSpy = vi.fn();
const refetchSessionsSpy = vi.fn();
const updateAccountSettingsSpy = vi.fn();
const revokeSessionSpy = vi.fn();
const updateOrganizationSpy = vi.fn();
const changePasswordSpy = vi.fn();
const toastSuccessSpy = vi.fn();
const toastErrorSpy = vi.fn();
const toastMessageSpy = vi.fn();

const accessState = {
  org: {
    publicId: "org_123",
    name: "Northstar Talent",
    type: "Employer",
    website: "https://northstar.example",
    workEmail: "ops@northstar.example",
    domain: "northstar.example",
    industry: "Software",
    location: "Bengaluru, IN",
    verification: "verified",
  },
  can: (action: string) => action === "save_settings",
  state: "ready",
};

const accountSettingsQueryState = {
  data: {
    notification_preferences: [
      {
        public_id: "np_1",
        user_id: "user_123",
        event_type: "trust_invitation_created",
        enabled: true,
        preferred_channels: ["email"],
        quiet_hours: {},
        metadata: {},
        created_at: "2026-07-24T10:00:00Z",
        updated_at: "2026-07-24T10:00:00Z",
      },
      {
        public_id: "np_2",
        user_id: "user_123",
        event_type: "verification_completed",
        enabled: false,
        preferred_channels: [],
        quiet_hours: {},
        metadata: {},
        created_at: "2026-07-24T10:00:00Z",
        updated_at: "2026-07-24T10:00:00Z",
      },
    ],
  },
  isPending: false,
  error: null as unknown,
  refetch: refetchAccountSpy,
};

const sessionsQueryState = {
  data: [
    {
      id: "session_12345678",
      created_at: "2026-07-20T10:00:00Z",
      expires_at: "2026-08-20T10:00:00Z",
      last_active_at: "2026-07-25T08:00:00Z",
      current: false,
    },
  ],
  isPending: false,
  error: null as unknown,
  refetch: refetchSessionsSpy,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
  }),
  useBlocker: () => undefined,
}));

vi.mock("@/components/app/primitives", () => ({
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  ),
  SectionCard: ({
    title,
    description,
    action,
    children,
  }: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
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

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
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

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => accessState,
}));

vi.mock("@/lib/queries/user-settings", () => ({
  useAccountSettingsQuery: () => accountSettingsQueryState,
  useAccountSessionsQuery: () => sessionsQueryState,
  useUpdateAccountSettingsMutation: () => ({
    mutateAsync: updateAccountSettingsSpy,
    isPending: false,
    error: null,
  }),
  useRevokeAccountSessionMutation: () => ({
    mutateAsync: revokeSessionSpy,
  }),
  useUpdateOrganizationSettingsMutation: () => ({
    mutateAsync: updateOrganizationSpy,
    isPending: false,
    error: null,
  }),
  useChangePasswordMutation: () => ({
    mutateAsync: changePasswordSpy,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessSpy,
    error: toastErrorSpy,
    message: toastMessageSpy,
  },
}));

const { Route } = await import("../../routes/app.settings");
const SettingsPage = Route.options.component as ComponentType;

describe("Settings route", () => {
  beforeEach(() => {
    refetchAccountSpy.mockReset();
    refetchSessionsSpy.mockReset();
    updateAccountSettingsSpy.mockReset();
    updateAccountSettingsSpy.mockResolvedValue(accountSettingsQueryState.data);
    revokeSessionSpy.mockReset();
    revokeSessionSpy.mockResolvedValue(undefined);
    updateOrganizationSpy.mockReset();
    updateOrganizationSpy.mockResolvedValue({
      public_id: "org_123",
      name: "Northstar Labs",
      organization_type: "employer",
      website: "https://northstar.example",
      work_email: "ops@northstar.example",
      domain: "northstar.example",
      industry: "Software",
      location: "Bengaluru, IN",
      verification_state: "verified",
      suspended_at: null,
    });
    changePasswordSpy.mockReset();
    toastSuccessSpy.mockReset();
    toastErrorSpy.mockReset();
    toastMessageSpy.mockReset();
    accessState.can = (action: string) => action === "save_settings";
    accessState.state = "ready";
    accountSettingsQueryState.isPending = false;
    accountSettingsQueryState.error = null;
    sessionsQueryState.isPending = false;
    sessionsQueryState.error = null;
    sessionsQueryState.data = [
      {
        id: "session_12345678",
        created_at: "2026-07-20T10:00:00Z",
        expires_at: "2026-08-20T10:00:00Z",
        last_active_at: "2026-07-25T08:00:00Z",
        current: false,
      },
    ];
  });

  it("saves supported organization details through the backend", async () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByDisplayValue("Northstar Talent"), {
      target: { value: "Northstar Labs" },
    });
    fireEvent.click(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(updateOrganizationSpy).toHaveBeenCalledWith({
        name: "Northstar Labs",
        organization_type: "employer",
        website: "https://northstar.example",
        work_email: "ops@northstar.example",
        domain: "northstar.example",
        industry: "Software",
        location: "Bengaluru, IN",
      });
    });
    expect(toastSuccessSpy).toHaveBeenCalledWith("Settings saved");
  });

  it("shows verification defaults as intentionally unavailable", () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getAllByText("Verification preferences")[0]!);

    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByText(/not yet backed by the current backend contract/i)).toBeInTheDocument();
  });

  it("renders backend sessions and supports revoking a single session", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getAllByText("Security")[0]!);

    expect(screen.getByText(/revoke-all, not revoke-all-except-current/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Revoke"));

    await waitFor(() => {
      expect(revokeSessionSpy).toHaveBeenCalledWith("session_12345678");
    });
  });

  it("shows retry for notification preference errors", () => {
    accountSettingsQueryState.error = new Error("Backend unavailable");

    render(<SettingsPage />);
    fireEvent.click(screen.getAllByText("Notifications")[0]!);
    fireEvent.click(screen.getByText("Retry"));

    expect(refetchAccountSpy).toHaveBeenCalledTimes(1);
  });
});
