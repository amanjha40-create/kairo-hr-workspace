import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrganizationJobRole,
  deactivateOrganizationJobRole,
  getOrganizationLogo,
  getOrganizationVerificationPreferences,
  listOrganizationJobRoles,
  removeOrganizationLogo,
  updateEmployeeLifecycle,
  updateEmploymentProfile,
  updateOrganizationJobRole,
  updateOrganizationVerificationPreferences,
  uploadOrganizationLogo,
  type EmploymentProfilePayload,
  type OrganizationJobRolePayload,
  type OrganizationJobRoleUpdatePayload,
  type VerificationPreferencesPayload,
} from "@/lib/api/hr-v2";
import { organizationPeopleQueryKeys } from "@/lib/queries/organization-people";

export const hrV2QueryKeys = {
  all: ["hr-v2"] as const,
  roles: (orgPublicId: string) => [...hrV2QueryKeys.all, "roles", orgPublicId] as const,
  logo: (orgPublicId: string) => [...hrV2QueryKeys.all, "logo", orgPublicId] as const,
  preferences: (orgPublicId: string) => [...hrV2QueryKeys.all, "preferences", orgPublicId] as const,
};

function requireOrganization(orgPublicId: string | undefined) {
  if (!orgPublicId) throw new Error("No active organization is available.");
  return orgPublicId;
}

async function invalidatePeople(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: organizationPeopleQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ["verification-report"] });
}

export function organizationJobRolesQueryOptions(orgPublicId: string) {
  return queryOptions({
    queryKey: hrV2QueryKeys.roles(orgPublicId),
    queryFn: () => listOrganizationJobRoles(orgPublicId),
    enabled: Boolean(orgPublicId),
    retry: false,
  });
}

export function useOrganizationJobRolesQuery(orgPublicId: string | undefined) {
  return useQuery({
    ...organizationJobRolesQueryOptions(orgPublicId ?? ""),
    enabled: Boolean(orgPublicId),
  });
}

export function useCreateOrganizationJobRoleMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrganizationJobRolePayload) =>
      createOrganizationJobRole(requireOrganization(orgPublicId), payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrV2QueryKeys.roles(orgPublicId ?? "") });
    },
  });
}

export function useUpdateOrganizationJobRoleMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rolePublicId,
      payload,
    }: {
      rolePublicId: string;
      payload: OrganizationJobRoleUpdatePayload;
    }) => updateOrganizationJobRole(requireOrganization(orgPublicId), rolePublicId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrV2QueryKeys.roles(orgPublicId ?? "") });
      await invalidatePeople(queryClient);
    },
  });
}

export function useDeactivateOrganizationJobRoleMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rolePublicId: string) =>
      deactivateOrganizationJobRole(requireOrganization(orgPublicId), rolePublicId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrV2QueryKeys.roles(orgPublicId ?? "") });
      await invalidatePeople(queryClient);
    },
  });
}

export function useEmployeeLifecycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgPublicId,
      personPublicId,
      lastWorkingDay,
    }: {
      orgPublicId: string;
      personPublicId: string;
      lastWorkingDay: string;
    }) => updateEmployeeLifecycle(orgPublicId, personPublicId, lastWorkingDay),
    onSuccess: async () => invalidatePeople(queryClient),
  });
}

export function useEmploymentProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgPublicId,
      personPublicId,
      payload,
    }: {
      orgPublicId: string;
      personPublicId: string;
      payload: EmploymentProfilePayload;
    }) => updateEmploymentProfile(orgPublicId, personPublicId, payload),
    onSuccess: async () => {
      await invalidatePeople(queryClient);
      await queryClient.invalidateQueries({ queryKey: hrV2QueryKeys.all });
    },
  });
}

export function useOrganizationLogoQuery(orgPublicId: string | undefined) {
  return useQuery({
    queryKey: hrV2QueryKeys.logo(orgPublicId ?? ""),
    queryFn: () => getOrganizationLogo(orgPublicId ?? ""),
    enabled: Boolean(orgPublicId),
    retry: false,
    staleTime: 60_000,
  });
}

export function useUploadOrganizationLogoMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadOrganizationLogo(requireOrganization(orgPublicId), file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrV2QueryKeys.logo(orgPublicId ?? "") });
    },
  });
}

export function useRemoveOrganizationLogoMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => removeOrganizationLogo(requireOrganization(orgPublicId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrV2QueryKeys.logo(orgPublicId ?? "") });
    },
  });
}

export function useOrganizationVerificationPreferencesQuery(orgPublicId: string | undefined) {
  return useQuery({
    queryKey: hrV2QueryKeys.preferences(orgPublicId ?? ""),
    queryFn: () => getOrganizationVerificationPreferences(orgPublicId ?? ""),
    enabled: Boolean(orgPublicId),
    retry: false,
  });
}

export function useUpdateOrganizationVerificationPreferencesMutation(
  orgPublicId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VerificationPreferencesPayload) =>
      updateOrganizationVerificationPreferences(requireOrganization(orgPublicId), payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: hrV2QueryKeys.preferences(orgPublicId ?? ""),
      });
    },
  });
}
