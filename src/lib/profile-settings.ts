import { format, formatDistanceToNow } from "date-fns";
import { ApiError } from "@/lib/api/client";
import type { BackendNotificationPreferenceResponse } from "@/lib/api/account-settings";
import type { BackendUserProfileResponse } from "@/lib/api/users";
import type { BackendOrganizationType } from "@/lib/api/workspace";
import type { OrgType } from "@/lib/access-context";

export const SUPPORTED_NOTIFICATION_PREFERENCE_ROWS = [
  {
    eventType: "trust_invitation_created",
    label: "Trust invitation",
    description: "Notifications about Trust Invitations relevant to your workspace.",
    required: false,
  },
  {
    eventType: "verification_completed",
    label: "Verification completed",
    description: "Notifications when a verification completes.",
    required: false,
  },
  {
    eventType: "password_reset_requested",
    label: "Password reset requested",
    description: "Security notifications for password reset requests.",
    required: true,
  },
] as const;

export type SupportedNotificationPreferenceEvent =
  (typeof SUPPORTED_NOTIFICATION_PREFERENCE_ROWS)[number]["eventType"];

export interface NotificationPreferenceFormValue {
  enabled: boolean;
  preferredChannels: string[];
  required: boolean;
}

export type NotificationPreferenceFormState = Record<
  SupportedNotificationPreferenceEvent,
  NotificationPreferenceFormValue
>;

export interface ProfileFormValue {
  fullName: string;
  email: string;
  phone: string;
  currentRole: string;
  organizationName: string;
  avatarUrl: string | null;
}

export interface OrganizationSettingsFormValue {
  name: string;
  type: OrgType;
  website: string;
  workEmail: string;
  domain: string;
  industry: string;
  location: string;
  verification: "verified" | "pending" | "unverified";
  suspended: boolean;
}

export const ORG_TYPE_OPTIONS: OrgType[] = [
  "Employer",
  "Staffing or Recruitment Firm",
  "Background Verification Partner",
  "Contractor Platform",
  "Other",
];

export function mapBackendOrganizationType(type: BackendOrganizationType): OrgType {
  switch (type) {
    case "employer":
      return "Employer";
    case "staffing_agency":
      return "Staffing or Recruitment Firm";
    case "background_verification_partner":
      return "Background Verification Partner";
    case "gig_platform":
      return "Contractor Platform";
    default:
      return "Other";
  }
}

export function mapOrganizationTypeToBackend(type: OrgType): BackendOrganizationType {
  switch (type) {
    case "Employer":
      return "employer";
    case "Staffing or Recruitment Firm":
      return "staffing_agency";
    case "Background Verification Partner":
      return "background_verification_partner";
    case "Contractor Platform":
      return "gig_platform";
    default:
      return "other";
  }
}

export function mapUserProfileToForm(
  profile: BackendUserProfileResponse,
  organizationName: string,
): ProfileFormValue {
  return {
    fullName: profile.full_name ?? "",
    email: profile.email,
    phone: profile.phone ?? "",
    currentRole: profile.current_role ?? "",
    organizationName,
    avatarUrl: profile.avatar_url,
  };
}

export function buildNotificationPreferenceState(
  preferences: BackendNotificationPreferenceResponse[],
): NotificationPreferenceFormState {
  const byEventType = new Map(preferences.map((preference) => [preference.event_type, preference]));

  return SUPPORTED_NOTIFICATION_PREFERENCE_ROWS.reduce((state, row) => {
    const preference = byEventType.get(row.eventType);
    state[row.eventType] = {
      enabled: preference?.enabled ?? true,
      preferredChannels: preference?.preferred_channels ?? [],
      required: row.required,
    };
    return state;
  }, {} as NotificationPreferenceFormState);
}

export function buildNotificationPreferencePayload(state: NotificationPreferenceFormState) {
  return SUPPORTED_NOTIFICATION_PREFERENCE_ROWS.map((row) => ({
    event_type: row.eventType,
    enabled: state[row.eventType].required ? true : state[row.eventType].enabled,
    preferred_channels: state[row.eventType].preferredChannels,
    quiet_hours: {},
    metadata: {},
  }));
}

export function getProfileSettingsErrorMessage(error: unknown, fallback: string) {
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

export function humanizeNotificationEvent(eventType: string) {
  return eventType
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatSessionTimestamp(value: string) {
  const date = new Date(value);
  return {
    absolute: format(date, "dd MMM yyyy, HH:mm"),
    relative: formatDistanceToNow(date, { addSuffix: true }),
  };
}

export function toNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
