import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelTrustInvitation,
  createTrustInvitation,
  deleteTrustInvitation,
  getTrustInvitationDetail,
  getTrustInvitationSummary,
  listTrustInvitations,
  resendTrustInvitation,
  sendTrustInvitation,
  type CreateTrustInvitationPayload,
  type TrustInvitationListParams,
} from "@/lib/api/trust-invitations";
import {
  mapInvitationCreateResult,
  mapInvitationDetail,
  mapInvitationRecord,
  mapInvitationSummary,
} from "@/lib/trust-invitations";
import { workspaceBootstrapQueryKey } from "@/lib/queries/workspace";

export const trustInvitationQueryKeys = {
  all: ["trust-invitations"] as const,
  list: (orgPublicId: string, params: TrustInvitationListParams) =>
    [...trustInvitationQueryKeys.all, "list", orgPublicId, params] as const,
  summary: (orgPublicId: string) =>
    [...trustInvitationQueryKeys.all, "summary", orgPublicId] as const,
  detail: (invitationPublicId: string) =>
    [...trustInvitationQueryKeys.all, "detail", invitationPublicId] as const,
};

export function trustInvitationListQueryOptions(
  orgPublicId: string,
  params: TrustInvitationListParams,
) {
  return queryOptions({
    queryKey: trustInvitationQueryKeys.list(orgPublicId, params),
    queryFn: async () => {
      const response = await listTrustInvitations(orgPublicId, params);
      const items = Array.isArray(response) ? response : response.items;
      return items.map(mapInvitationRecord);
    },
    enabled: Boolean(orgPublicId),
    retry: false,
  });
}

export function trustInvitationSummaryQueryOptions(orgPublicId: string) {
  return queryOptions({
    queryKey: trustInvitationQueryKeys.summary(orgPublicId),
    queryFn: async () => mapInvitationSummary(await getTrustInvitationSummary(orgPublicId)),
    enabled: Boolean(orgPublicId),
    retry: false,
  });
}

export function trustInvitationDetailQueryOptions(invitationPublicId: string) {
  return queryOptions({
    queryKey: trustInvitationQueryKeys.detail(invitationPublicId),
    queryFn: async () => mapInvitationDetail(await getTrustInvitationDetail(invitationPublicId)),
    enabled: Boolean(invitationPublicId),
    retry: false,
  });
}

export function useTrustInvitationListQuery(
  orgPublicId: string | undefined,
  params: TrustInvitationListParams,
) {
  return useQuery({
    ...trustInvitationListQueryOptions(orgPublicId ?? "", params),
    enabled: Boolean(orgPublicId),
  });
}

export function useTrustInvitationSummaryQuery(orgPublicId: string | undefined) {
  return useQuery({
    ...trustInvitationSummaryQueryOptions(orgPublicId ?? ""),
    enabled: Boolean(orgPublicId),
  });
}

export function useTrustInvitationDetailQuery(invitationPublicId: string | undefined) {
  return useQuery({
    ...trustInvitationDetailQueryOptions(invitationPublicId ?? ""),
    enabled: Boolean(invitationPublicId),
  });
}

async function invalidateTrustInvitationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgPublicId: string | undefined,
  invitationPublicId?: string,
) {
  await queryClient.invalidateQueries({ queryKey: trustInvitationQueryKeys.all });
  await queryClient.invalidateQueries({ queryKey: workspaceBootstrapQueryKey });
  if (orgPublicId) {
    await queryClient.invalidateQueries({
      queryKey: trustInvitationQueryKeys.summary(orgPublicId),
    });
  }
  if (invitationPublicId) {
    await queryClient.invalidateQueries({
      queryKey: trustInvitationQueryKeys.detail(invitationPublicId),
    });
  }
}

export function useCreateTrustInvitationMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTrustInvitationPayload) => {
      if (!orgPublicId) throw new Error("No active organization is available.");
      return mapInvitationCreateResult(await createTrustInvitation(orgPublicId, payload));
    },
    onSuccess: async (invitation) => {
      await invalidateTrustInvitationQueries(queryClient, orgPublicId, invitation.id);
    },
  });
}

export function useSendTrustInvitationMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationPublicId: string) =>
      mapInvitationDetail(await sendTrustInvitation(invitationPublicId)),
    onSuccess: async (invitation) => {
      await invalidateTrustInvitationQueries(queryClient, orgPublicId, invitation.id);
    },
  });
}

export function useResendTrustInvitationMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationPublicId: string) =>
      mapInvitationDetail(await resendTrustInvitation(invitationPublicId)),
    onSuccess: async (invitation) => {
      await invalidateTrustInvitationQueries(queryClient, orgPublicId, invitation.id);
    },
  });
}

export function useCancelTrustInvitationMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationPublicId: string) =>
      mapInvitationRecord(await cancelTrustInvitation(invitationPublicId)),
    onSuccess: async (invitation) => {
      await invalidateTrustInvitationQueries(queryClient, orgPublicId, invitation.id);
    },
  });
}

export function useDeleteTrustInvitationMutation(orgPublicId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationPublicId: string) => {
      await deleteTrustInvitation(invitationPublicId);
      return invitationPublicId;
    },
    onSuccess: async (invitationPublicId) => {
      await invalidateTrustInvitationQueries(queryClient, orgPublicId, invitationPublicId);
    },
  });
}
