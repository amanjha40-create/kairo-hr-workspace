import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addOrganizationPersonNote,
  deleteOrganizationPersonNote,
  getOrganizationPerson,
  listAllOrganizationPeople,
  listOrganizationPeople,
  updateOrganizationPersonNote,
  type BackendOrganizationPeopleListParams,
} from "@/lib/api/organization-people";
import {
  mapOrganizationPeopleDirectory,
  mapOrganizationPersonDetail,
  mapOrganizationPersonNote,
} from "@/lib/organization-people";

export const organizationPeopleQueryKeys = {
  all: ["organization-people"] as const,
  list: (orgPublicId: string, params: BackendOrganizationPeopleListParams) =>
    [...organizationPeopleQueryKeys.all, "list", orgPublicId, params] as const,
  detail: (orgPublicId: string, personPublicId: string) =>
    [...organizationPeopleQueryKeys.all, "detail", orgPublicId, personPublicId] as const,
};

export function organizationPeopleListQueryOptions(
  orgPublicId: string,
  params: BackendOrganizationPeopleListParams,
) {
  return queryOptions({
    queryKey: organizationPeopleQueryKeys.list(orgPublicId, params),
    queryFn: async () =>
      mapOrganizationPeopleDirectory(await listAllOrganizationPeople(orgPublicId, params)),
    enabled: Boolean(orgPublicId),
    retry: false,
  });
}

export function organizationPersonDetailQueryOptions(orgPublicId: string, personPublicId: string) {
  return queryOptions({
    queryKey: organizationPeopleQueryKeys.detail(orgPublicId, personPublicId),
    queryFn: async () =>
      mapOrganizationPersonDetail(await getOrganizationPerson(orgPublicId, personPublicId)),
    enabled: Boolean(orgPublicId) && Boolean(personPublicId),
    retry: false,
  });
}

export function useOrganizationPeopleDirectoryQuery(
  orgPublicId: string | undefined,
  params: BackendOrganizationPeopleListParams,
) {
  return useQuery({
    ...organizationPeopleListQueryOptions(orgPublicId ?? "", params),
    enabled: Boolean(orgPublicId),
  });
}

export function useOrganizationPersonDetailQuery(
  orgPublicId: string | undefined,
  personPublicId: string | undefined,
) {
  return useQuery({
    ...organizationPersonDetailQueryOptions(orgPublicId ?? "", personPublicId ?? ""),
    enabled: Boolean(orgPublicId) && Boolean(personPublicId),
  });
}

async function invalidateOrganizationPeopleQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgPublicId: string,
  personPublicId: string,
) {
  await queryClient.invalidateQueries({ queryKey: organizationPeopleQueryKeys.all });
  await queryClient.invalidateQueries({
    queryKey: organizationPeopleQueryKeys.detail(orgPublicId, personPublicId),
  });
}

export function useAddOrganizationPersonNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgPublicId,
      personPublicId,
      body,
    }: {
      orgPublicId: string;
      personPublicId: string;
      body: string;
    }) =>
      mapOrganizationPersonNote(
        await addOrganizationPersonNote(orgPublicId, personPublicId, { body }),
      ),
    onSuccess: async (_note, variables) => {
      await invalidateOrganizationPeopleQueries(
        queryClient,
        variables.orgPublicId,
        variables.personPublicId,
      );
    },
  });
}

export function useUpdateOrganizationPersonNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgPublicId,
      personPublicId,
      notePublicId,
      body,
    }: {
      orgPublicId: string;
      personPublicId: string;
      notePublicId: string;
      body: string;
    }) =>
      mapOrganizationPersonNote(
        await updateOrganizationPersonNote(orgPublicId, personPublicId, notePublicId, {
          body,
        }),
      ),
    onSuccess: async (_note, variables) => {
      await invalidateOrganizationPeopleQueries(
        queryClient,
        variables.orgPublicId,
        variables.personPublicId,
      );
    },
  });
}

export function useDeleteOrganizationPersonNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgPublicId,
      personPublicId,
      notePublicId,
    }: {
      orgPublicId: string;
      personPublicId: string;
      notePublicId: string;
    }) => deleteOrganizationPersonNote(orgPublicId, personPublicId, notePublicId),
    onSuccess: async (_response, variables) => {
      await invalidateOrganizationPeopleQueries(
        queryClient,
        variables.orgPublicId,
        variables.personPublicId,
      );
    },
  });
}
