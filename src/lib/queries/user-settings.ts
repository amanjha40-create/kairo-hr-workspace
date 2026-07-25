import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changePassword,
  getAccountSettings,
  listAccountSessions,
  revokeAccountSession,
  revokeAllAccountSessions,
  updateAccountSettings,
  type BackendAccountSettingsUpdatePayload,
  type ChangePasswordPayload,
} from "@/lib/api/account-settings";
import {
  completeAvatarUpload,
  getAvatarUploadIntent,
  getCurrentUserProfile,
  removeAvatar,
  updateCurrentUserProfile,
  type UpdateCurrentUserProfilePayload,
} from "@/lib/api/users";
import { updateOrganization } from "@/lib/api/workspace";
import { workspaceBootstrapQueryKey } from "@/lib/queries/workspace";

export const userSettingsQueryKeys = {
  all: ["user-settings"] as const,
  profile: () => [...userSettingsQueryKeys.all, "profile"] as const,
  account: () => [...userSettingsQueryKeys.all, "account"] as const,
  sessions: () => [...userSettingsQueryKeys.all, "sessions"] as const,
};

export function currentUserProfileQueryOptions() {
  return queryOptions({
    queryKey: userSettingsQueryKeys.profile(),
    queryFn: getCurrentUserProfile,
    retry: false,
  });
}

export function accountSettingsQueryOptions() {
  return queryOptions({
    queryKey: userSettingsQueryKeys.account(),
    queryFn: getAccountSettings,
    retry: false,
  });
}

export function accountSessionsQueryOptions() {
  return queryOptions({
    queryKey: userSettingsQueryKeys.sessions(),
    queryFn: listAccountSessions,
    retry: false,
  });
}

export function useCurrentUserProfileQuery() {
  return useQuery(currentUserProfileQueryOptions());
}

export function useAccountSettingsQuery() {
  return useQuery(accountSettingsQueryOptions());
}

export function useAccountSessionsQuery() {
  return useQuery(accountSessionsQueryOptions());
}

async function invalidateUserSettingsQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: userSettingsQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: workspaceBootstrapQueryKey });
}

export function useUpdateCurrentUserProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCurrentUserProfilePayload) => updateCurrentUserProfile(payload),
    onSuccess: async () => {
      await invalidateUserSettingsQueries(queryClient);
    },
  });
}

export function useAvatarUploadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const intent = await getAvatarUploadIntent(file.type);
      const response = await fetch(intent.upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Avatar upload failed.");
      }

      return completeAvatarUpload();
    },
    onSuccess: async () => {
      await invalidateUserSettingsQueries(queryClient);
    },
  });
}

export function useRemoveAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeAvatar,
    onSuccess: async () => {
      await invalidateUserSettingsQueries(queryClient);
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
  });
}

export function useUpdateAccountSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BackendAccountSettingsUpdatePayload) => updateAccountSettings(payload),
    onSuccess: async () => {
      await invalidateUserSettingsQueries(queryClient);
    },
  });
}

export function useRevokeAccountSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => revokeAccountSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userSettingsQueryKeys.sessions() });
    },
  });
}

export function useRevokeAllAccountSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeAllAccountSessions,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userSettingsQueryKeys.sessions() });
    },
  });
}

export function useUpdateOrganizationSettingsMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Parameters<typeof updateOrganization>[1]) => {
      if (!orgPublicId) {
        throw new Error("No active organization is available.");
      }

      return updateOrganization(orgPublicId, payload);
    },
    onSuccess: async () => {
      await invalidateUserSettingsQueries(queryClient);
    },
  });
}
