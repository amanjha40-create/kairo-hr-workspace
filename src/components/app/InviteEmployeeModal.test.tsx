import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteEmployeeModal } from "./InviteEmployeeModal";
import { makeTrustInvitationRecord } from "@/test/trust-invitation-fixtures";

const { mutateAsyncSpy, resetMutationSpy, setInviteOpenSpy, toastSuccessSpy, toastErrorSpy } =
  vi.hoisted(() => ({
    mutateAsyncSpy: vi.fn(),
    resetMutationSpy: vi.fn(),
    setInviteOpenSpy: vi.fn(),
    toastSuccessSpy: vi.fn(),
    toastErrorSpy: vi.fn(),
  }));

const dashboardState = {
  inviteOpen: true,
  setInviteOpen: setInviteOpenSpy,
};

const accessState: { org: { publicId: string } | null; can: (action: string) => boolean } = {
  org: { publicId: "org_123" },
  can: (action: string) => action === "invite_candidate",
};

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    type,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    type?: string;
  }) => (
    <input
      aria-label={placeholder ?? type ?? "input"}
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
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={placeholder ?? "message"}
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
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

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label="checkbox"
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: ReactNode;
  }) => (
    <div data-value={value} data-testid="select">
      <button onClick={() => onValueChange?.("7")}>set-select</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>selected</span>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

vi.mock("@/lib/dashboard-context", () => ({
  useDashboard: () => dashboardState,
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => accessState,
}));

vi.mock("@/lib/queries/trust-invitations", () => ({
  useCreateTrustInvitationMutation: () => ({
    mutateAsync: mutateAsyncSpy,
    isPending: false,
    isError: false,
    error: null,
    reset: resetMutationSpy,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessSpy,
    error: toastErrorSpy,
  },
}));

describe("InviteEmployeeModal", () => {
  beforeEach(() => {
    mutateAsyncSpy.mockReset();
    resetMutationSpy.mockReset();
    setInviteOpenSpy.mockReset();
    toastSuccessSpy.mockReset();
    toastErrorSpy.mockReset();
    dashboardState.inviteOpen = true;
    accessState.org = { publicId: "org_123" };
    accessState.can = (action: string) => action === "invite_candidate";
  });

  async function advanceToReview() {
    fireEvent.change(screen.getByLabelText("Aman Joshi"), {
      target: { value: "Aman Joshi" },
    });
    fireEvent.change(screen.getByLabelText("aman@example.com"), {
      target: { value: "aman@example.com" },
    });
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));
  }

  it("requires candidate details before moving past the first step", () => {
    render(<InviteEmployeeModal />);

    expect(screen.getByText("Continue")).toBeDisabled();
  });

  it("submits the backend payload and shows the canonical invitation URL after send", async () => {
    mutateAsyncSpy.mockResolvedValue(
      makeTrustInvitationRecord({
        id: "ti_123",
        invitationUrl: "https://trust.kairo.dev/invitations/ti_123",
      }),
    );

    render(<InviteEmployeeModal />);
    await advanceToReview();
    fireEvent.click(screen.getByText("Send invitation"));

    await waitFor(() => {
      expect(mutateAsyncSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject_name: "Aman Joshi",
          subject_email: "aman@example.com",
          delivery_method: "email",
          mode: "send",
        }),
      );
      expect(screen.getByText("Invitation sent")).toBeInTheDocument();
      expect(screen.getByText("https://trust.kairo.dev/invitations/ti_123")).toBeInTheDocument();
    });
  });

  it("surfaces backend create failures without clearing the form", async () => {
    mutateAsyncSpy.mockRejectedValue(new Error("Backend rejected invitation"));

    render(<InviteEmployeeModal />);
    await advanceToReview();
    fireEvent.click(screen.getByText("Send invitation"));

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith("Backend rejected invitation");
      expect(screen.getByText("Send invitation")).toBeInTheDocument();
    });
  });

  it("shows read-only access when the user lacks invite permission", () => {
    accessState.can = () => false;

    render(<InviteEmployeeModal />);

    expect(screen.getByText("Invitation access is read-only")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeDisabled();
  });
});
