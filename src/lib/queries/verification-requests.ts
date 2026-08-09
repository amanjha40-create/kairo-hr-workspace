import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrganizationMembers } from "@/lib/api/organization-members";
import {
  acceptVerificationRequest,
  assignVerificationReviewer,
  cancelVerificationRequest,
  getVerificationRequestDetail,
  getVerificationRequestEvidence,
  getVerificationRequestTimeline,
  markVerificationUnableToVerify,
  listVerificationRequests,
  rejectVerificationRequest,
  requestVerificationClarification,
  updateVerificationInternalNote,
  verifyVerificationRequest,
  type AssignReviewerPayload,
  type VerificationActionPayload,
  type VerificationRequestListParams,
} from "@/lib/api/verification-requests";
import {
  mapReviewerOptions,
  mapVerificationEvidenceItem,
  mapVerificationRecord,
  mapVerificationTimeline,
} from "@/lib/employment-verifications";

export const verificationRequestQueryKeys = {
  all: ["verification-requests"] as const,
  list: (orgPublicId: string, params: VerificationRequestListParams) =>
    [...verificationRequestQueryKeys.all, "list", orgPublicId, params] as const,
  detail: (verificationRequestPublicId: string) =>
    [...verificationRequestQueryKeys.all, "detail", verificationRequestPublicId] as const,
  timeline: (verificationRequestPublicId: string) =>
    [...verificationRequestQueryKeys.all, "timeline", verificationRequestPublicId] as const,
  evidence: (verificationRequestPublicId: string) =>
    [...verificationRequestQueryKeys.all, "evidence", verificationRequestPublicId] as const,
  reviewers: (orgPublicId: string) =>
    [...verificationRequestQueryKeys.all, "reviewers", orgPublicId] as const,
};

export function verificationRequestListQueryOptions(
  orgPublicId: string,
  params: VerificationRequestListParams,
) {
  return queryOptions({
    queryKey: verificationRequestQueryKeys.list(orgPublicId, params),
    queryFn: async () => {
      const response = await listVerificationRequests(orgPublicId, params);
      const items = Array.isArray(response) ? response : response.items;
      return items.map(mapVerificationRecord);
    },
    enabled: Boolean(orgPublicId),
    retry: false,
  });
}

export function verificationRequestDetailQueryOptions(verificationRequestPublicId: string) {
  return queryOptions({
    queryKey: verificationRequestQueryKeys.detail(verificationRequestPublicId),
    queryFn: async () =>
      mapVerificationRecord(await getVerificationRequestDetail(verificationRequestPublicId)),
    enabled: Boolean(verificationRequestPublicId),
    retry: false,
  });
}

export function verificationRequestTimelineQueryOptions(verificationRequestPublicId: string) {
  return queryOptions({
    queryKey: verificationRequestQueryKeys.timeline(verificationRequestPublicId),
    queryFn: async () =>
      mapVerificationTimeline(await getVerificationRequestTimeline(verificationRequestPublicId)),
    enabled: Boolean(verificationRequestPublicId),
    retry: false,
  });
}

export function verificationRequestEvidenceQueryOptions(verificationRequestPublicId: string) {
  return queryOptions({
    queryKey: verificationRequestQueryKeys.evidence(verificationRequestPublicId),
    queryFn: async () => {
      const response = await getVerificationRequestEvidence(verificationRequestPublicId);
      const items = Array.isArray(response) ? response : response.items;
      return items.map(mapVerificationEvidenceItem);
    },
    enabled: Boolean(verificationRequestPublicId),
    retry: false,
  });
}

export function verificationReviewerOptionsQueryOptions(orgPublicId: string) {
  return queryOptions({
    queryKey: verificationRequestQueryKeys.reviewers(orgPublicId),
    queryFn: async () => {
      const response = await listOrganizationMembers(orgPublicId);
      const items = Array.isArray(response) ? response : response.items;
      return mapReviewerOptions(items);
    },
    enabled: Boolean(orgPublicId),
    retry: false,
  });
}

export function useVerificationRequestListQuery(
  orgPublicId: string | undefined,
  params: VerificationRequestListParams,
) {
  return useQuery({
    ...verificationRequestListQueryOptions(orgPublicId ?? "", params),
    enabled: Boolean(orgPublicId),
  });
}

export function useVerificationRequestDetailQuery(verificationRequestPublicId: string | undefined) {
  return useQuery({
    ...verificationRequestDetailQueryOptions(verificationRequestPublicId ?? ""),
    enabled: Boolean(verificationRequestPublicId),
  });
}

export function useVerificationRequestTimelineQuery(
  verificationRequestPublicId: string | undefined,
) {
  return useQuery({
    ...verificationRequestTimelineQueryOptions(verificationRequestPublicId ?? ""),
    enabled: Boolean(verificationRequestPublicId),
  });
}

export function useVerificationRequestEvidenceQuery(
  verificationRequestPublicId: string | undefined,
) {
  return useQuery({
    ...verificationRequestEvidenceQueryOptions(verificationRequestPublicId ?? ""),
    enabled: Boolean(verificationRequestPublicId),
  });
}

export function useVerificationReviewerOptionsQuery(orgPublicId: string | undefined) {
  return useQuery({
    ...verificationReviewerOptionsQueryOptions(orgPublicId ?? ""),
    enabled: Boolean(orgPublicId),
  });
}

async function invalidateVerificationRequestQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  verificationRequestPublicId?: string,
) {
  await queryClient.invalidateQueries({ queryKey: verificationRequestQueryKeys.all });
  if (!verificationRequestPublicId) return;
  await queryClient.invalidateQueries({
    queryKey: verificationRequestQueryKeys.detail(verificationRequestPublicId),
  });
  await queryClient.invalidateQueries({
    queryKey: verificationRequestQueryKeys.timeline(verificationRequestPublicId),
  });
  await queryClient.invalidateQueries({
    queryKey: verificationRequestQueryKeys.evidence(verificationRequestPublicId),
  });
}

export function useAssignVerificationReviewerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      verificationRequestPublicId,
      payload,
    }: {
      verificationRequestPublicId: string;
      payload: AssignReviewerPayload;
    }) =>
      mapVerificationRecord(await assignVerificationReviewer(verificationRequestPublicId, payload)),
    onSuccess: async (verification) => {
      await invalidateVerificationRequestQueries(queryClient, verification.id);
    },
  });
}

export function useUpdateVerificationInternalNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      verificationRequestPublicId,
      note,
    }: {
      verificationRequestPublicId: string;
      note: string | null;
    }) =>
      mapVerificationRecord(
        await updateVerificationInternalNote(verificationRequestPublicId, note),
      ),
    onSuccess: async (verification) => {
      await invalidateVerificationRequestQueries(queryClient, verification.id);
    },
  });
}

function buildActionMutation(
  action: (
    verificationRequestPublicId: string,
    payload: VerificationActionPayload,
  ) => Promise<Awaited<ReturnType<typeof getVerificationRequestDetail>>>,
) {
  return function useActionMutation() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        verificationRequestPublicId,
        payload,
      }: {
        verificationRequestPublicId: string;
        payload: VerificationActionPayload;
      }) => mapVerificationRecord(await action(verificationRequestPublicId, payload)),
      onSuccess: async (verification) => {
        await invalidateVerificationRequestQueries(queryClient, verification.id);
      },
    });
  };
}

export const useRequestVerificationClarificationMutation = buildActionMutation(
  requestVerificationClarification,
);
export function useAcceptVerificationRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (verificationRequestPublicId: string) =>
      mapVerificationRecord(await acceptVerificationRequest(verificationRequestPublicId)),
    onSuccess: async (verification) => {
      await invalidateVerificationRequestQueries(queryClient, verification.id);
    },
  });
}
export const useVerifyVerificationRequestMutation = buildActionMutation(verifyVerificationRequest);
export const useRejectVerificationRequestMutation = buildActionMutation(rejectVerificationRequest);
export const useUnableToVerifyVerificationRequestMutation = buildActionMutation(
  markVerificationUnableToVerify,
);
export const useCancelVerificationRequestMutation = buildActionMutation(cancelVerificationRequest);
