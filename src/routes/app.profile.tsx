import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bell, Camera, Lock, Save, ShieldCheck, Trash2 } from "lucide-react";
import { EmptyState, PageHeader, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAccess } from "@/lib/access-context";
import { useAuth } from "@/lib/auth-context";
import {
  getProfileSettingsErrorMessage,
  humanizeNotificationEvent,
  mapUserProfileToForm,
  SUPPORTED_NOTIFICATION_PREFERENCE_ROWS,
  toNullableString,
  type ProfileFormValue,
} from "@/lib/profile-settings";
import {
  useAccountSettingsQuery,
  useAvatarUploadMutation,
  useChangePasswordMutation,
  useCurrentUserProfileQuery,
  useRemoveAvatarMutation,
  useUpdateCurrentUserProfileMutation,
} from "@/lib/queries/user-settings";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { org } = useAccess();
  const { syncCurrentUser } = useAuth();
  const profileQuery = useCurrentUserProfileQuery();
  const accountSettingsQuery = useAccountSettingsQuery();
  const updateProfileMutation = useUpdateCurrentUserProfileMutation();
  const uploadAvatarMutation = useAvatarUploadMutation();
  const removeAvatarMutation = useRemoveAvatarMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileFormValue | null>(null);
  const [savedForm, setSavedForm] = useState<ProfileFormValue | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileQuery.data || form) return;
    const next = mapUserProfileToForm(profileQuery.data, org?.name ?? "");
    setForm(next);
    setSavedForm(next);
  }, [form, org?.name, profileQuery.data]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
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

  const initials = useMemo(() => {
    const source = form?.fullName || profileQuery.data?.email || "Workspace User";
    return source
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [form?.fullName, profileQuery.data?.email]);

  const notificationPreferences = useMemo(() => {
    const byEventType = new Map(
      (accountSettingsQuery.data?.notification_preferences ?? []).map((preference) => [
        preference.event_type,
        preference,
      ]),
    );

    return SUPPORTED_NOTIFICATION_PREFERENCE_ROWS.map((row) => ({
      label: row.label,
      enabled: byEventType.get(row.eventType)?.enabled ?? true,
      eventType: row.eventType,
      required: row.required,
    }));
  }, [accountSettingsQuery.data?.notification_preferences]);

  if (profileQuery.isPending && !profileQuery.data) {
    return (
      <div>
        <PageHeader
          eyebrow="Account"
          title="My profile"
          description="Manage your personal information and preferences."
        />
        <SectionCard title="Personal information">
          <TableSkeleton rows={5} />
        </SectionCard>
      </div>
    );
  }

  if (profileQuery.error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Profile didn't load"
        description={getProfileSettingsErrorMessage(profileQuery.error, "Please try again.")}
        action={{ label: "Retry", onClick: () => void profileQuery.refetch() }}
      />
    );
  }

  if (!profileQuery.data || !form || !savedForm) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Profile unavailable"
        description="We couldn't load your profile right now."
        action={{ label: "Retry", onClick: () => void profileQuery.refetch() }}
      />
    );
  }

  const syncProfileUser = (fullName: string | null) => {
    syncCurrentUser({
      id: profileQuery.data.id,
      email: profileQuery.data.email,
      full_name: fullName,
    });
  };

  const updateForm = <K extends keyof ProfileFormValue>(key: K, value: ProfileFormValue[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSaveProfile = async () => {
    try {
      const updated = await updateProfileMutation.mutateAsync({
        full_name: toNullableString(form.fullName),
        phone: toNullableString(form.phone),
        current_role: toNullableString(form.currentRole),
      });

      const next = mapUserProfileToForm(updated, org?.name ?? "");
      setForm(next);
      setSavedForm(next);
      syncProfileUser(updated.full_name);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(getProfileSettingsErrorMessage(error, "We couldn't update your profile."));
    }
  };

  const handleAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const updated = await uploadAvatarMutation.mutateAsync(file);
      const next = mapUserProfileToForm(updated, org?.name ?? "");
      setForm(next);
      setSavedForm((current) => (current ? { ...current, avatarUrl: next.avatarUrl } : next));
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(getProfileSettingsErrorMessage(error, "We couldn't upload this profile photo."));
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatarMutation.mutateAsync();
      setForm((current) => (current ? { ...current, avatarUrl: null } : current));
      setSavedForm((current) => (current ? { ...current, avatarUrl: null } : current));
      toast.success("Profile photo removed");
    } catch (error) {
      toast.error(getProfileSettingsErrorMessage(error, "We couldn't remove this profile photo."));
    }
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
      toast.success("Password updated");
    } catch (error) {
      setPasswordError(getProfileSettingsErrorMessage(error, "We couldn't update your password."));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Manage your personal information and preferences."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Personal information">
            <div className="p-6 space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar className="h-16 w-16 rounded-2xl">
                  <AvatarImage src={form.avatarUrl ?? undefined} alt={form.fullName || "Profile"} />
                  <AvatarFallback className="rounded-2xl bg-foreground text-background text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadAvatarMutation.isPending}
                  >
                    <Camera className="h-4 w-4 mr-1.5" />
                    {form.avatarUrl ? "Replace photo" : "Upload photo"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => void handleRemoveAvatar()}
                    disabled={!form.avatarUrl || removeAvatarMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Remove photo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarSelected}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <Input
                    value={form.fullName}
                    onChange={(event) => updateForm("fullName", event.target.value)}
                    className="rounded-xl"
                  />
                </Field>
                <Field label="Email">
                  <Input value={form.email} className="rounded-xl" disabled />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="rounded-xl"
                  />
                </Field>
                <Field label="Role">
                  <Input
                    value={form.currentRole}
                    onChange={(event) => updateForm("currentRole", event.target.value)}
                    placeholder="Your current title"
                    className="rounded-xl"
                  />
                </Field>
                <Field label="Organization">
                  <Input
                    value={org?.name ?? "No active organization"}
                    className="rounded-xl"
                    disabled
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-3">
                {dirty ? (
                  <span className="text-xs text-muted-foreground">You have unsaved changes.</span>
                ) : null}
                <Button
                  className="btn-premium rounded-xl"
                  onClick={() => void handleSaveProfile()}
                  disabled={!dirty || updateProfileMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-1.5" /> Save changes
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Security">
            <div className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
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
                <Field label="Confirm password">
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="rounded-xl"
                  />
                </Field>
              </div>

              {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void handleChangePassword()}
                  disabled={changePasswordMutation.isPending}
                >
                  <Lock className="h-4 w-4 mr-1.5" /> Change password
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <div>
                  <div className="text-sm font-medium">Two-factor authentication</div>
                  <div className="text-[11px] text-muted-foreground">
                    Adds an extra layer of security to sign-in.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Coming soon</Badge>
                  <Switch checked={false} disabled />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Notifications">
          <div className="p-6 space-y-4">
            {accountSettingsQuery.isPending && !accountSettingsQuery.data ? (
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-foreground/[0.06] animate-pulse" />
                <div className="h-4 w-32 rounded bg-foreground/[0.05] animate-pulse" />
                <div className="h-4 w-36 rounded bg-foreground/[0.05] animate-pulse" />
              </div>
            ) : accountSettingsQuery.error ? (
              <div className="space-y-3">
                <div className="text-sm font-medium">Preferences unavailable</div>
                <p className="text-sm text-muted-foreground">
                  {getProfileSettingsErrorMessage(
                    accountSettingsQuery.error,
                    "We couldn't load your notification preferences.",
                  )}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => void accountSettingsQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {notificationPreferences.map((preference) => (
                  <div
                    key={preference.eventType}
                    className="flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm">{preference.label}</div>
                      {preference.required ? (
                        <div className="text-[11px] text-muted-foreground">
                          Required security notification
                        </div>
                      ) : null}
                    </div>
                    <Badge variant={preference.enabled ? "default" : "outline"}>
                      {preference.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                ))}

                <div className="rounded-xl border border-border/60 bg-foreground/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-foreground/[0.06] flex items-center justify-center">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        Detailed notification controls live in Settings
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Channel-specific delivery preferences are still limited by the current
                        backend contract.
                      </p>
                      <Button asChild variant="outline" size="sm" className="rounded-lg">
                        <Link to="/app/settings">Manage notification preferences</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
