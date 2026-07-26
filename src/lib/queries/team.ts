import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelOrganizationInvitation,
  createOrganizationInvitation,
  listOrganizationInvitations,
  listOrganizationMembers,
  normalizeBackendList,
  removeOrganizationMember,
  resendOrganizationInvitation,
  restoreOrganizationMember,
  suspendOrganizationMember,
  transferOrganizationOwnership,
  updateOrganizationMember,
  type BackendOrganizationInvitationCreatePayload,
  type BackendOrganizationMemberSuspendPayload,
  type BackendOrganizationMemberUpdatePayload,
} from "@/lib/api/organization-members";
import { workspaceBootstrapQueryKey } from "@/lib/queries/workspace";

export const teamQueryKeys = {
  all: ["team"] as const,
  members: (orgPublicId: string) => [...teamQueryKeys.all, orgPublicId, "members"] as const,
  invitations: (orgPublicId: string) => [...teamQueryKeys.all, orgPublicId, "invitations"] as const,
};

export function organizationMembersQueryOptions(orgPublicId: string) {
  return queryOptions({
    queryKey: teamQueryKeys.members(orgPublicId),
    queryFn: async () => normalizeBackendList(await listOrganizationMembers(orgPublicId)),
    retry: false,
  });
}

export function organizationInvitationsQueryOptions(orgPublicId: string) {
  return queryOptions({
    queryKey: teamQueryKeys.invitations(orgPublicId),
    queryFn: async () => normalizeBackendList(await listOrganizationInvitations(orgPublicId)),
    retry: false,
  });
}

export function useOrganizationMembersQuery(orgPublicId: string | undefined) {
  return useQuery({
    ...organizationMembersQueryOptions(orgPublicId ?? ""),
    enabled: Boolean(orgPublicId),
  });
}

export function useOrganizationInvitationsQuery(orgPublicId: string | undefined) {
  return useQuery({
    ...organizationInvitationsQueryOptions(orgPublicId ?? ""),
    enabled: Boolean(orgPublicId),
  });
}

async function invalidateTeamQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgPublicId: string,
) {
  await queryClient.invalidateQueries({ queryKey: teamQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: workspaceBootstrapQueryKey });
  await queryClient.invalidateQueries({ queryKey: teamQueryKeys.members(orgPublicId) });
  await queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitations(orgPublicId) });
}

function requireOrgPublicId(orgPublicId: string | undefined) {
  if (!orgPublicId) {
    throw new Error("No active organization is available.");
  }
  return orgPublicId;
}

export function useCreateOrganizationInvitationMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BackendOrganizationInvitationCreatePayload) => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      return createOrganizationInvitation(currentOrgPublicId, payload);
    },
    onSuccess: async () => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      await invalidateTeamQueries(queryClient, currentOrgPublicId);
    },
  });
}

export function useUpdateOrganizationMemberMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberPublicId,
      payload,
    }: {
      memberPublicId: string;
      payload: BackendOrganizationMemberUpdatePayload;
    }) => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      return updateOrganizationMember(currentOrgPublicId, memberPublicId, payload);
    },
    onSuccess: async () => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      await invalidateTeamQueries(queryClient, currentOrgPublicId);
    },
  });
}

export function useSuspendOrganizationMemberMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberPublicId,
      payload,
    }: {
      memberPublicId: string;
      payload: BackendOrganizationMemberSuspendPayload;
    }) => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      return suspendOrganizationMember(currentOrgPublicId, memberPublicId, payload);
    },
    onSuccess: async () => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      await invalidateTeamQueries(queryClient, currentOrgPublicId);
    },
  });
}

export function useRestoreOrganizationMemberMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberPublicId: string) => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      return restoreOrganizationMember(currentOrgPublicId, memberPublicId);
    },
    onSuccess: async () => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      await invalidateTeamQueries(queryClient, currentOrgPublicId);
    },
  });
}

export function useRemoveOrganizationMemberMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberPublicId: string) => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      return removeOrganizationMember(currentOrgPublicId, memberPublicId);
    },
    onSuccess: async () => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      await invalidateTeamQueries(queryClient, currentOrgPublicId);
    },
  });
}

export function useTransferOrganizationOwnershipMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberPublicId: string) => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      return transferOrganizationOwnership(currentOrgPublicId, memberPublicId);
    },
    onSuccess: async () => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      await invalidateTeamQueries(queryClient, currentOrgPublicId);
    },
  });
}

export function useResendOrganizationInvitationMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationPublicId: string) => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      return resendOrganizationInvitation(currentOrgPublicId, invitationPublicId);
    },
    onSuccess: async () => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      await invalidateTeamQueries(queryClient, currentOrgPublicId);
    },
  });
}

export function useCancelOrganizationInvitationMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationPublicId: string) => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      return cancelOrganizationInvitation(currentOrgPublicId, invitationPublicId);
    },
    onSuccess: async () => {
      const currentOrgPublicId = requireOrgPublicId(orgPublicId);
      await invalidateTeamQueries(queryClient, currentOrgPublicId);
    },
  });
}
