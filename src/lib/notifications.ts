import { formatDistanceToNow } from "date-fns";
import { ApiError } from "@/lib/api/client";
import type { BackendUserNotificationResponse } from "@/lib/api/notifications";

export type NotificationTargetKind = "invitation" | "verification" | "person" | "settings" | "none";

export interface WorkspaceNotification {
  id: string;
  kind: string;
  category: string;
  title: string;
  body: string;
  at: string;
  createdAt: string;
  read: boolean;
  target: {
    kind: NotificationTargetKind;
    id?: string;
    label?: string;
  };
  available: boolean;
}

function humanizeToken(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStringValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function resolveNotificationTarget(
  metadata: Record<string, unknown>,
): WorkspaceNotification["target"] {
  const trustInvitationId = getStringValue(metadata, "trust_invitation_public_id");
  if (trustInvitationId) {
    return {
      kind: "invitation",
      id: trustInvitationId,
      label: trustInvitationId,
    };
  }

  const verificationRequestId = getStringValue(metadata, "verification_request_public_id");
  if (verificationRequestId) {
    return {
      kind: "verification",
      id: verificationRequestId,
      label: verificationRequestId,
    };
  }

  const personId =
    getStringValue(metadata, "organization_person_public_id") ??
    getStringValue(metadata, "person_public_id");
  if (personId) {
    return {
      kind: "person",
      id: personId,
      label: personId,
    };
  }

  return { kind: "none" };
}

export function mapNotificationRecord(
  notification: BackendUserNotificationResponse,
): WorkspaceNotification {
  const target = resolveNotificationTarget(notification.metadata ?? {});

  return {
    id: notification.public_id,
    kind: notification.event_type,
    category: notification.category,
    title: notification.title,
    body: notification.body,
    at: formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }),
    createdAt: notification.created_at,
    read: Boolean(notification.read_at),
    target,
    available: target.kind !== "none",
  };
}

export function getNotificationKindLabel(kind: string, category?: string) {
  if (kind === "trust_invitation_created") return "Trust invitation";
  if (kind === "verification_completed") return "Verification completed";
  if (kind === "password_reset_requested") return "Security";

  if (category === "verification") return "Verification";
  if (category === "security") return "Security";
  if (category === "system") return "System";

  return humanizeToken(kind);
}

export function getNotificationTargetHref(notification: WorkspaceNotification) {
  if (!notification.available) return null;

  switch (notification.target.kind) {
    case "person":
      return notification.target.id
        ? { to: "/app/people/$id", params: { id: notification.target.id } }
        : { to: "/app/people" };
    case "invitation":
      return notification.target.id
        ? { to: "/app/invitations/$id", params: { id: notification.target.id } }
        : { to: "/app/invitations" };
    case "verification":
      return notification.target.id
        ? { to: "/app/verifications/$id", params: { id: notification.target.id } }
        : { to: "/app/verifications" };
    case "settings":
      return { to: "/app/settings" };
    default:
      return null;
  }
}

export function getNotificationErrorMessage(error: unknown, fallback: string) {
  const offline =
    typeof navigator !== "undefined" && "onLine" in navigator && navigator.onLine === false;

  if (offline) {
    return "You're offline. Reconnect to continue.";
  }

  if (!(error instanceof ApiError)) {
    if (error instanceof TypeError) {
      return "Network unavailable. Check your connection and try again.";
    }
    return error instanceof Error ? error.message : fallback;
  }

  if (error.details.length > 0) {
    const first = error.details[0];
    const message =
      typeof first.msg === "string"
        ? first.msg
        : typeof first.message === "string"
          ? first.message
          : null;
    if (message) return message;
  }

  return error.message || fallback;
}
