import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeNotifications } from "@/test/notification-fixtures";

const navigateSpy = vi.fn();
const refetchNotificationsSpy = vi.fn();
const refetchUnreadSpy = vi.fn();
const markReadSpy = vi.fn();
const markAllReadSpy = vi.fn();
const toastErrorSpy = vi.fn();

const notificationsQueryState = {
  data: makeNotifications(),
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
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
  }),
  useNavigate: () => navigateSpy,
}));

vi.mock("@/components/app/primitives", () => ({
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  ),
  SectionCard: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <button onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
  TableSkeleton: () => <div>table-skeleton</div>,
}));

vi.mock("@/components/app/NotificationsPopover", () => ({
  NotificationRow: ({
    n,
    onOpen,
    onMarkRead,
  }: {
    n: { title: string; body: string; read: boolean };
    onOpen: () => void;
    onMarkRead?: () => void;
  }) => (
    <div>
      <button onClick={onOpen}>{n.title}</button>
      <p>{n.body}</p>
      <button onClick={onMarkRead} disabled={n.read}>
        {n.read ? "Already read" : "Mark as read"}
      </button>
    </div>
  ),
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

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock("@/lib/queries/notifications", () => ({
  useNotificationsQuery: () => notificationsQueryState,
  useNotificationUnreadCountQuery: () => unreadCountQueryState,
  useMarkNotificationReadMutation: () => markReadMutationState,
  useMarkAllNotificationsReadMutation: () => markAllReadMutationState,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorSpy,
  },
}));

const { Route } = await import("../../routes/app.notifications");
const NotificationsPage = Route.options.component as ComponentType;

describe("Notifications page", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    refetchNotificationsSpy.mockReset();
    refetchUnreadSpy.mockReset();
    markReadSpy.mockReset();
    markReadSpy.mockResolvedValue(undefined);
    markAllReadSpy.mockReset();
    markAllReadSpy.mockResolvedValue(undefined);
    toastErrorSpy.mockReset();
    notificationsQueryState.data = makeNotifications();
    notificationsQueryState.isPending = false;
    notificationsQueryState.error = null;
    unreadCountQueryState.data = 1;
    unreadCountQueryState.error = null;
    markAllReadMutationState.isPending = false;
  });

  it("renders a loading state while notifications are pending", () => {
    notificationsQueryState.isPending = true;
    notificationsQueryState.data = undefined as never;

    render(<NotificationsPage />);

    expect(screen.getByText("table-skeleton")).toBeInTheDocument();
  });

  it("renders an empty state when no notifications are available", () => {
    notificationsQueryState.data = [];
    unreadCountQueryState.data = 0;

    render(<NotificationsPage />);

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("renders backend notifications and navigates on click-through", async () => {
    const notifications = makeNotifications({
      title: "Verification completed",
      body: "Employment verification finished.",
      kind: "verification_completed",
      target: { kind: "verification", id: "vr_123", label: "vr_123" },
    });
    notificationsQueryState.data = notifications;

    render(<NotificationsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Verification completed" }));

    await waitFor(() => {
      expect(markReadSpy).toHaveBeenCalledWith("notif_1");
    });
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it("shows a retry state on backend error", () => {
    notificationsQueryState.error = Object.assign(new Error("Backend unavailable"), {
      status: 500,
    });

    render(<NotificationsPage />);
    fireEvent.click(screen.getByText("Retry"));

    expect(refetchNotificationsSpy).toHaveBeenCalledTimes(1);
    expect(refetchUnreadSpy).toHaveBeenCalledTimes(1);
  });

  it("marks all notifications as read from the page action", async () => {
    render(<NotificationsPage />);

    fireEvent.click(screen.getByText("Mark all as read"));

    await waitFor(() => {
      expect(markAllReadSpy).toHaveBeenCalledTimes(1);
    });
  });
});
