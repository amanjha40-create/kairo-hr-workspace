import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { HTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsPopover } from "@/components/app/NotificationsPopover";
import { makeNotifications } from "@/test/notification-fixtures";

const { toastErrorSpy } = vi.hoisted(() => ({
  toastErrorSpy: vi.fn(),
}));

const navigateSpy = vi.fn();
const refetchNotificationsSpy = vi.fn();
const refetchUnreadSpy = vi.fn();
const markReadSpy = vi.fn();
const markAllReadSpy = vi.fn();

const notificationsQueryState = {
  data: makeNotifications(
    {
      title: "Trust invitation sent",
      read: false,
    },
    {
      title: "Verification completed",
      kind: "verification_completed",
      read: true,
      target: { kind: "verification", id: "vr_321", label: "vr_321" },
    },
  ),
  isPending: false,
  error: null as unknown,
  refetch: refetchNotificationsSpy,
};

const unreadCountQueryState = {
  data: 1,
  error: null as unknown,
  refetch: refetchUnreadSpy,
};

const markReadMutationState = {
  mutateAsync: markReadSpy,
};

const markAllReadMutationState = {
  mutateAsync: markAllReadSpy,
  isPending: false,
};

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  useNavigate: () => navigateSpy,
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

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
}));

vi.mock("@/lib/queries/notifications", () => ({
  useNotificationsQuery: () => notificationsQueryState,
  useNotificationUnreadCountQuery: () => unreadCountQueryState,
  useMarkNotificationReadMutation: () => markReadMutationState,
  useMarkAllNotificationsReadMutation: () => markAllReadMutationState,
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorSpy,
  },
}));

describe("Notifications popover", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    refetchNotificationsSpy.mockReset();
    refetchUnreadSpy.mockReset();
    markReadSpy.mockReset();
    markReadSpy.mockResolvedValue(undefined);
    markAllReadSpy.mockReset();
    markAllReadSpy.mockResolvedValue(undefined);
    toastErrorSpy.mockReset();
    notificationsQueryState.data = makeNotifications(
      {
        title: "Trust invitation sent",
        read: false,
      },
      {
        title: "Verification completed",
        kind: "verification_completed",
        read: true,
        target: { kind: "verification", id: "vr_321", label: "vr_321" },
      },
    );
    notificationsQueryState.isPending = false;
    notificationsQueryState.error = null;
    unreadCountQueryState.data = 1;
    unreadCountQueryState.error = null;
    markAllReadMutationState.isPending = false;
  });

  it("renders the unread count and backend notifications", () => {
    render(<NotificationsPopover />);

    expect(screen.getAllByText("Notifications").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 unread/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Trust invitation sent")).toBeInTheDocument();
  });

  it("retries when the popover notifications query fails", () => {
    notificationsQueryState.error = Object.assign(new Error("Request failed"), {
      status: 500,
    });

    render(<NotificationsPopover />);
    fireEvent.click(screen.getByText("Retry"));

    expect(refetchNotificationsSpy).toHaveBeenCalledTimes(1);
    expect(refetchUnreadSpy).toHaveBeenCalledTimes(1);
  });

  it("marks all notifications as read from the popover", async () => {
    render(<NotificationsPopover />);

    fireEvent.click(screen.getByText("Mark all read"));

    await waitFor(() => {
      expect(markAllReadSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("removes the old mark unread action and keeps read rows disabled", () => {
    render(<NotificationsPopover />);

    expect(screen.queryByText("Mark as unread")).not.toBeInTheDocument();
    expect(screen.getByText("Already read")).toBeDisabled();
  });

  it("marks an unread notification as read and routes through on click", async () => {
    render(<NotificationsPopover />);

    fireEvent.click(screen.getByText("Trust invitation sent"));

    await waitFor(() => {
      expect(markReadSpy).toHaveBeenCalledWith("notif_1");
    });
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });
});
