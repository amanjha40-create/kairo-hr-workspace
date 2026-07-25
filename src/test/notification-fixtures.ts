import type { WorkspaceNotification } from "@/lib/notifications";

export function makeNotification(
  overrides: Partial<WorkspaceNotification> = {},
): WorkspaceNotification {
  return {
    id: "notif_1",
    kind: "trust_invitation_created",
    category: "verification",
    title: "Trust invitation sent",
    body: "A Trust invitation was sent to Aman Joshi.",
    at: "2 minutes ago",
    createdAt: "2026-07-25T10:00:00.000Z",
    read: false,
    target: {
      kind: "invitation",
      id: "inv_123",
      label: "inv_123",
    },
    available: true,
    ...overrides,
  };
}

export function makeNotifications(...overrides: Array<Partial<WorkspaceNotification>>) {
  return overrides.map((override, index) =>
    makeNotification({
      id: `notif_${index + 1}`,
      createdAt: `2026-07-25T1${index}:00:00.000Z`,
      ...override,
    }),
  );
}
