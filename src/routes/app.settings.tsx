import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Bell,
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  KeyRound,
  Lock,
  LogOut,
  Save,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { EmptyState, PageHeader, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { PermissionDenied } from "@/components/app/access/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAccess } from "@/lib/access-context";
import {
  buildNotificationPreferencePayload,
  buildNotificationPreferenceState,
  formatSessionTimestamp,
  getProfileSettingsErrorMessage,
  mapBackendOrganizationType,
  mapOrganizationTypeToBackend,
  ORG_TYPE_OPTIONS,
  SUPPORTED_NOTIFICATION_PREFERENCE_ROWS,
  toNullableString,
  type NotificationPreferenceFormState,
  type OrganizationSettingsFormValue,
} from "@/lib/profile-settings";
import {
  useAccountSessionsQuery,
  useAccountSettingsQuery,
  useChangePasswordMutation,
  useRevokeAccountSessionMutation,
  useUpdateAccountSettingsMutation,
  useUpdateOrganizationSettingsMutation,
} from "@/lib/queries/user-settings";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

const SECTIONS = [
  { id: "org", label: "Organization", icon: Building2 },
  { id: "prefs", label: "Verification preferences", icon: ShieldCheck },
  { id: "notif", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function mapOrgToForm(
  org: NonNullable<ReturnType<typeof useAccess>["org"]>,
  suspended: boolean,
): OrganizationSettingsFormValue {
  return {
    name: org.name,
    type: org.type,
    website: org.website,
    workEmail: org.workEmail,
    domain: org.domain,
    industry: org.industry,
    location: org.location,
    verification: org.verification,
    suspended,
  };
}

function SettingsPage() {
  const { org, can, state: accessState } = useAccess();
  const canSaveSettings = can("save_settings");
  const accountSettingsQuery = useAccountSettingsQuery();
  const sessionsQuery = useAccountSessionsQuery();
  const updateAccountSettingsMutation = useUpdateAccountSettingsMutation();
  const revokeSessionMutation = useRevokeAccountSessionMutation();
  const updateOrganizationMutation = useUpdateOrganizationSettingsMutation(org?.publicId);
  const changePasswordMutation = useChangePasswordMutation();

  const [tab, setTab] = useState<SectionId>("org");
  const [orgForm, setOrgForm] = useState<OrganizationSettingsFormValue | null>(null);
  const [savedOrgForm, setSavedOrgForm] = useState<OrganizationSettingsFormValue | null>(null);
  const [notifForm, setNotifForm] = useState<NotificationPreferenceFormState | null>(null);
  const [savedNotifForm, setSavedNotifForm] = useState<NotificationPreferenceFormState | null>(
    null,
  );
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!org || orgForm) return;
    const next = mapOrgToForm(org, accessState === "org_suspended");
    setOrgForm(next);
    setSavedOrgForm(next);
  }, [accessState, org, orgForm]);

  useEffect(() => {
    if (!accountSettingsQuery.data || notifForm) return;
    const next = buildNotificationPreferenceState(
      accountSettingsQuery.data.notification_preferences,
    );
    setNotifForm(next);
    setSavedNotifForm(next);
  }, [accountSettingsQuery.data, notifForm]);

  const dirty = useMemo(
    () =>
      JSON.stringify(orgForm) !== JSON.stringify(savedOrgForm) ||
      JSON.stringify(notifForm) !== JSON.stringify(savedNotifForm),
    [notifForm, orgForm, savedNotifForm, savedOrgForm],
  );

  useBlocker({
    shouldBlockFn: ({ current, next }) => {
      if (!dirty) return false;
      if (current.pathname === next.pathname) return false;
      return !window.confirm("You have unsaved changes. Leave without saving?");
    },
  });

  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const orgDirty = JSON.stringify(orgForm) !== JSON.stringify(savedOrgForm);
  const notifDirty = JSON.stringify(notifForm) !== JSON.stringify(savedNotifForm);

  const updateOrgField = <K extends keyof OrganizationSettingsFormValue>(
    key: K,
    value: OrganizationSettingsFormValue[K],
  ) => {
    setOrgForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateNotifField = (eventType: keyof NotificationPreferenceFormState, enabled: boolean) => {
    setNotifForm((current) =>
      current
        ? {
            ...current,
            [eventType]: {
              ...current[eventType],
              enabled: current[eventType].required ? true : enabled,
            },
          }
        : current,
    );
  };

  const handleSave = async () => {
    try {
      if (orgDirty && orgForm && org) {
        const updatedOrg = await updateOrganizationMutation.mutateAsync({
          name: toNullableString(orgForm.name) ?? orgForm.name,
          organization_type: mapOrganizationTypeToBackend(orgForm.type),
          website: toNullableString(orgForm.website) ?? undefined,
          work_email: toNullableString(orgForm.workEmail) ?? undefined,
          domain: toNullableString(orgForm.domain) ?? undefined,
          industry: toNullableString(orgForm.industry) ?? undefined,
          location: toNullableString(orgForm.location) ?? undefined,
        });

        const nextOrg: OrganizationSettingsFormValue = {
          name: updatedOrg.name,
          type: mapBackendOrganizationType(updatedOrg.organization_type),
          website: updatedOrg.website ?? "",
          workEmail: updatedOrg.work_email ?? "",
          domain: updatedOrg.domain ?? "",
          industry: updatedOrg.industry ?? "",
          location: updatedOrg.location ?? "",
          verification:
            updatedOrg.verification_state === "verified"
              ? "verified"
              : updatedOrg.verification_state === "verification_pending" ||
                  updatedOrg.verification_state === "additional_information_required"
                ? "pending"
                : "unverified",
          suspended: Boolean(updatedOrg.suspended_at),
        };
        setOrgForm(nextOrg);
        setSavedOrgForm(nextOrg);
      }

      if (notifDirty && notifForm) {
        await updateAccountSettingsMutation.mutateAsync({
          notification_preferences: buildNotificationPreferencePayload(notifForm),
        });
        setSavedNotifForm(notifForm);
      }

      toast.success("Settings saved");
    } catch (error) {
      toast.error(getProfileSettingsErrorMessage(error, "We couldn't save these settings."));
    }
  };

  const handleCancel = () => {
    setOrgForm(savedOrgForm);
    setNotifForm(savedNotifForm);
    toast.message("Changes discarded");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordError(null);

    try {
      await changePasswordMutation.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
      toast.success("Password updated");
    } catch (error) {
      setPasswordError(getProfileSettingsErrorMessage(error, "We couldn't update your password."));
    }
  };

  return (
    <div className="pb-32 lg:pb-8">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your organization, verification defaults, notifications, and account security."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden lg:block space-y-0.5 sticky top-24 self-start">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setTab(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                tab === section.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]",
              )}
            >
              <section.icon className="h-4 w-4" /> {section.label}
            </button>
          ))}
        </nav>

        <div className="lg:hidden">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Section</Label>
          <Select value={tab} onValueChange={(value) => setTab(value as SectionId)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-6">
          {tab === "org" ? (
            <OrgSection
              canSaveSettings={canSaveSettings}
              error={updateOrganizationMutation.error}
              onChange={updateOrgField}
              value={orgForm}
            />
          ) : null}

          {tab === "prefs" ? <VerificationPreferencesUnavailable /> : null}

          {tab === "notif" ? (
            <NotifSection
              error={accountSettingsQuery.error}
              onChange={updateNotifField}
              onRetry={() => void accountSettingsQuery.refetch()}
              value={notifForm}
              loading={accountSettingsQuery.isPending && !accountSettingsQuery.data}
            />
          ) : null}

          {tab === "security" ? (
            <SecuritySection
              sessions={sessionsQuery.data}
              sessionsError={sessionsQuery.error}
              sessionsLoading={sessionsQuery.isPending && !sessionsQuery.data}
              onRetrySessions={() => void sessionsQuery.refetch()}
              onRevokeSession={async (sessionId) => {
                try {
                  await revokeSessionMutation.mutateAsync(sessionId);
                  toast.success("Session revoked");
                } catch (error) {
                  toast.error(
                    getProfileSettingsErrorMessage(error, "We couldn't revoke that session."),
                  );
                }
              }}
              passwordOpen={passwordOpen}
              setPasswordOpen={setPasswordOpen}
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              setCurrentPassword={setCurrentPassword}
              setNewPassword={setNewPassword}
              setConfirmPassword={setConfirmPassword}
              passwordError={passwordError}
              onSubmitPassword={() => void handleChangePassword()}
            />
          ) : null}
        </div>
      </div>

      {dirty && tab !== "security" ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-warning" />
              You have unsaved changes.
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="btn-premium rounded-lg"
                onClick={() => void handleSave()}
                disabled={
                  updateOrganizationMutation.isPending || updateAccountSettingsMutation.isPending
                }
              >
                <Save className="h-4 w-4 mr-1.5" /> Save changes
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p> : null}
    </div>
  );
}

function OrgVerificationBadge({
  verification,
  suspended,
}: {
  verification: OrganizationSettingsFormValue["verification"];
  suspended: boolean;
}) {
  const status = suspended
    ? "suspended"
    : verification === "verified"
      ? "verified"
      : verification === "pending"
        ? "pending"
        : "unverified";

  const config = {
    suspended: {
      icon: Ban,
      title: "Suspended",
      description: "This workspace is suspended. Contact support to restore access.",
      className: "bg-destructive/10 text-destructive border-destructive/30",
    },
    verified: {
      icon: CheckCircle2,
      title: "Verified",
      description: "Your organization is verified and ready for backend-driven workspace actions.",
      className: "bg-success/10 text-success border-success/30",
    },
    pending: {
      icon: Clock,
      title: "Verification pending",
      description:
        "Kairo is reviewing your organization details. Verification updates will appear here.",
      className: "bg-warning/10 text-warning-foreground border-warning/30",
    },
    unverified: {
      icon: Circle,
      title: "Setup incomplete",
      description: "Finish your organization details to continue setting up this workspace.",
      className: "bg-muted text-muted-foreground border-border",
    },
  }[status];

  const Icon = config.icon;

  return (
    <div className={cn("rounded-xl border p-4 flex items-start gap-3", config.className)}>
      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-sm font-medium">{config.title}</div>
        <p className="text-xs mt-0.5 opacity-80">{config.description}</p>
      </div>
    </div>
  );
}

function OrgSection({
  value,
  onChange,
  canSaveSettings,
  error,
}: {
  value: OrganizationSettingsFormValue | null;
  onChange: <K extends keyof OrganizationSettingsFormValue>(
    key: K,
    value: OrganizationSettingsFormValue[K],
  ) => void;
  canSaveSettings: boolean;
  error: unknown;
}) {
  if (!value) {
    return (
      <EmptyState
        icon={Building2}
        title="No active organization"
        description="Organization settings become available after a workspace organization is active."
      />
    );
  }

  return (
    <SectionCard
      title="Organization"
      description="Public information shown to candidates and other employers."
    >
      <div className="p-6 space-y-6">
        {!canSaveSettings ? (
          <PermissionDenied
            className="block"
            message="Your role can view organization settings, but only permitted users can change them."
          />
        ) : null}

        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {getProfileSettingsErrorMessage(
              error,
              "We couldn't save the latest organization changes.",
            )}
          </div>
        ) : null}

        <OrgVerificationBadge verification={value.verification} suspended={value.suspended} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Organization name">
            <Input
              value={value.name}
              onChange={(event) => onChange("name", event.target.value)}
              className="rounded-xl"
              disabled={!canSaveSettings}
            />
          </Field>
          <Field label="Organization type">
            <Select
              value={value.type}
              onValueChange={(next) =>
                onChange("type", next as OrganizationSettingsFormValue["type"])
              }
              disabled={!canSaveSettings}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Website">
            <Input
              value={value.website}
              onChange={(event) => onChange("website", event.target.value)}
              placeholder="https://"
              className="rounded-xl"
              disabled={!canSaveSettings}
            />
          </Field>
          <Field label="Work email">
            <Input
              value={value.workEmail}
              onChange={(event) => onChange("workEmail", event.target.value)}
              className="rounded-xl"
              disabled={!canSaveSettings}
            />
          </Field>
          <Field
            label="Work email domain"
            hint="Team members signing in with this domain are linked to your workspace."
          >
            <Input
              value={value.domain}
              onChange={(event) => onChange("domain", event.target.value)}
              className="rounded-xl"
              disabled={!canSaveSettings}
            />
          </Field>
          <Field label="Industry">
            <Input
              value={value.industry}
              onChange={(event) => onChange("industry", event.target.value)}
              className="rounded-xl"
              disabled={!canSaveSettings}
            />
          </Field>
          <Field label="Headquarters">
            <Input
              value={value.location}
              onChange={(event) => onChange("location", event.target.value)}
              className="rounded-xl"
              disabled={!canSaveSettings}
            />
          </Field>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Organization logo</Label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-foreground/[0.06] border border-border/60 flex items-center justify-center text-xs text-muted-foreground">
              Logo
            </div>
            <Button variant="outline" size="sm" className="rounded-lg" disabled>
              Coming soon
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Logo upload is not yet supported by the current backend contract.
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function VerificationPreferencesUnavailable() {
  return (
    <SectionCard
      title="Verification preferences"
      description="Defaults applied to new Trust Invitations and verification workflows."
    >
      <div className="p-6">
        <div className="rounded-2xl border border-border/60 bg-foreground/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-foreground/[0.06] flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium">Coming soon</div>
              <p className="text-sm text-muted-foreground mt-1">
                Verification default settings are not yet backed by the current backend contract, so
                this section is intentionally unavailable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function NotifSection({
  value,
  onChange,
  loading,
  error,
  onRetry,
}: {
  value: NotificationPreferenceFormState | null;
  onChange: (eventType: keyof NotificationPreferenceFormState, enabled: boolean) => void;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <SectionCard
      title="Notifications"
      description="Choose which backend-supported account notifications should stay enabled."
    >
      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <EmptyState
          icon={AlertTriangle}
          title="Notification preferences didn't load"
          description={getProfileSettingsErrorMessage(error, "Please try again.")}
          action={{ label: "Retry", onClick: onRetry }}
        />
      ) : !value ? (
        <EmptyState
          icon={Bell}
          title="Notification preferences unavailable"
          description="We couldn't load your account notification preferences."
          action={{ label: "Retry", onClick: onRetry }}
        />
      ) : (
        <div>
          <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_100px_100px] px-6 py-3 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
            <div>Event</div>
            <div className="text-center">Enabled</div>
            <div className="text-center">Email</div>
          </div>
          <div className="divide-y divide-border/60">
            {SUPPORTED_NOTIFICATION_PREFERENCE_ROWS.map((row) => {
              const preference = value[row.eventType];
              const emailEnabled = preference.preferredChannels.includes("email");

              return (
                <div
                  key={row.eventType}
                  className="px-6 py-3.5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px_100px] sm:items-center"
                >
                  <div>
                    <div className="text-sm font-medium">{row.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {row.description}
                    </div>
                    {row.required ? (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Required security notification
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 sm:justify-center">
                    <Switch
                      checked={row.required ? true : preference.enabled}
                      onCheckedChange={(checked) => onChange(row.eventType, checked)}
                      disabled={row.required}
                    />
                    <span className="text-xs text-muted-foreground sm:hidden">Enabled</span>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-center">
                    <Switch checked={emailEnabled} disabled />
                    <span className="text-xs text-muted-foreground sm:hidden">Email</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-6 py-4 text-[11px] text-muted-foreground border-t border-border/60">
            Channel-specific email delivery controls are not yet supported by the current backend
            preference contract, so email status is shown read-only.
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function SecuritySection({
  sessions,
  sessionsLoading,
  sessionsError,
  onRetrySessions,
  onRevokeSession,
  passwordOpen,
  setPasswordOpen,
  currentPassword,
  newPassword,
  confirmPassword,
  setCurrentPassword,
  setNewPassword,
  setConfirmPassword,
  passwordError,
  onSubmitPassword,
}: {
  sessions:
    | Array<{
        id: string;
        created_at: string;
        expires_at: string;
        last_active_at: string;
        current: boolean;
      }>
    | undefined;
  sessionsLoading: boolean;
  sessionsError: unknown;
  onRetrySessions: () => void;
  onRevokeSession: (sessionId: string) => Promise<void>;
  passwordOpen: boolean;
  setPasswordOpen: (open: boolean) => void;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  setCurrentPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  passwordError: string | null;
  onSubmitPassword: () => void;
}) {
  return (
    <div className="space-y-6">
      <SectionCard title="Password" description="Update the password for your Kairo account.">
        <div className="p-6">
          <Button variant="outline" className="rounded-xl" onClick={() => setPasswordOpen(true)}>
            Change password
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Multi-factor authentication"
        description="Add a second layer of security to sign-in."
      >
        <div className="p-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium">Authenticator app</div>
              <div className="text-[11px] text-muted-foreground">
                Time-based one-time passcodes.
              </div>
            </div>
          </div>
          <Badge variant="outline">Coming soon</Badge>
        </div>
      </SectionCard>

      <SectionCard
        title="Active sessions"
        description="Refresh-token sessions currently active on your account."
        action={
          <Button size="sm" variant="outline" className="rounded-lg h-8" disabled>
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out all other sessions
          </Button>
        }
      >
        {sessionsLoading ? (
          <TableSkeleton rows={3} />
        ) : sessionsError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Sessions didn't load"
            description={getProfileSettingsErrorMessage(sessionsError, "Please try again.")}
            action={{ label: "Retry", onClick: onRetrySessions }}
          />
        ) : (
          <div>
            <div className="px-5 pt-4 text-[11px] text-muted-foreground">
              “Sign out all other sessions” is unavailable because the current backend only exposes
              revoke-all, not revoke-all-except-current.
            </div>
            <div className="divide-y divide-border/60">
              {(sessions ?? []).length === 0 ? (
                <div className="px-5 py-6 text-sm text-muted-foreground">
                  No active sessions found.
                </div>
              ) : (
                sessions?.map((session) => {
                  const created = formatSessionTimestamp(session.created_at);
                  const lastActive = formatSessionTimestamp(session.last_active_at);
                  const expires = formatSessionTimestamp(session.expires_at);

                  return (
                    <div key={session.id} className="px-5 py-3.5 flex flex-wrap items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-2">
                          Session {session.id.slice(0, 8)}
                          {session.current ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success">
                              This session
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Last active {lastActive.relative} · Created {created.absolute} · Expires{" "}
                          {expires.absolute}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg h-8"
                        onClick={() => void onRevokeSession(session.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Recent security activity"
        description="Sign-ins and security events on your account."
      >
        <div className="p-6">
          <div className="rounded-2xl border border-border/60 bg-foreground/[0.03] p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-foreground/[0.06] flex items-center justify-center">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">Unavailable</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Recent security activity is not yet exposed by the current backend contract.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <AlertDialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your current password and choose a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Current password">
              <Input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="rounded-xl"
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-xl"
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-xl"
              />
            </Field>
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={onSubmitPassword}>Update password</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
