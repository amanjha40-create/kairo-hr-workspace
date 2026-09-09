import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmRosterImport,
  downloadEmployeeRosterTemplate,
  downloadRosterImportErrors,
  getRosterImport,
  listAllRosterEmployees,
  listRosterImportRows,
  listRosterImports,
  updateRosterMapping,
  uploadEmployeeRoster,
  type RosterMappingAssignment,
} from "@/lib/api/organization-roster-imports";
import { organizationPeopleQueryKeys } from "@/lib/queries/organization-people";

export const organizationRosterQueryKeys = {
  all: ["organization-roster"] as const,
  imports: (orgPublicId: string, page: number) =>
    [...organizationRosterQueryKeys.all, "imports", orgPublicId, page] as const,
  detail: (orgPublicId: string, importId: string) =>
    [...organizationRosterQueryKeys.all, "detail", orgPublicId, importId] as const,
  rows: (orgPublicId: string, importId: string, page: number) =>
    [...organizationRosterQueryKeys.all, "rows", orgPublicId, importId, page] as const,
  employees: (orgPublicId: string, search: string) =>
    [...organizationRosterQueryKeys.all, "employees", orgPublicId, search] as const,
};

export function rosterImportDetailQueryOptions(orgPublicId: string, importId: string) {
  return queryOptions({
    queryKey: organizationRosterQueryKeys.detail(orgPublicId, importId),
    queryFn: () => getRosterImport(orgPublicId, importId),
    enabled: Boolean(orgPublicId) && Boolean(importId),
    retry: false,
  });
}

export function useRosterImportsQuery(orgPublicId: string | undefined, page: number) {
  return useQuery({
    queryKey: organizationRosterQueryKeys.imports(orgPublicId ?? "", page),
    queryFn: () => listRosterImports(orgPublicId ?? "", page),
    enabled: Boolean(orgPublicId),
    retry: false,
  });
}

export function useRosterImportDetailQuery(
  orgPublicId: string | undefined,
  importId: string | undefined,
) {
  return useQuery({
    ...rosterImportDetailQueryOptions(orgPublicId ?? "", importId ?? ""),
    enabled: Boolean(orgPublicId) && Boolean(importId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === "uploaded" || state === "parsing" || state === "importing" ? 2_000 : false;
    },
  });
}

export function useRosterImportRowsQuery(
  orgPublicId: string | undefined,
  importId: string | undefined,
  page: number,
) {
  return useQuery({
    queryKey: organizationRosterQueryKeys.rows(orgPublicId ?? "", importId ?? "", page),
    queryFn: () => listRosterImportRows(orgPublicId ?? "", importId ?? "", page),
    enabled: Boolean(orgPublicId) && Boolean(importId),
    retry: false,
  });
}

export function useRosterEmployeesQuery(
  orgPublicId: string | undefined,
  search = "",
  enabled = true,
) {
  return useQuery({
    queryKey: organizationRosterQueryKeys.employees(orgPublicId ?? "", search),
    queryFn: () => listAllRosterEmployees(orgPublicId ?? "", search),
    enabled: Boolean(orgPublicId) && enabled,
    retry: false,
  });
}

export function useUploadEmployeeRosterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgPublicId, file }: { orgPublicId: string; file: File }) =>
      uploadEmployeeRoster(orgPublicId, file),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(
        organizationRosterQueryKeys.detail(variables.orgPublicId, record.import_id),
        record,
      );
      await queryClient.invalidateQueries({
        queryKey: organizationRosterQueryKeys.imports(variables.orgPublicId, 1),
      });
    },
  });
}

export function useDownloadEmployeeRosterTemplateMutation() {
  return useMutation({
    mutationFn: ({ orgPublicId }: { orgPublicId: string }) =>
      downloadEmployeeRosterTemplate(orgPublicId),
  });
}

export function useUpdateRosterMappingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgPublicId,
      importId,
      assignments,
    }: {
      orgPublicId: string;
      importId: string;
      assignments: RosterMappingAssignment[];
    }) => updateRosterMapping(orgPublicId, importId, assignments),
    onSuccess: (record, variables) => {
      queryClient.setQueryData(
        organizationRosterQueryKeys.detail(variables.orgPublicId, variables.importId),
        record,
      );
      void queryClient.invalidateQueries({
        queryKey: organizationRosterQueryKeys.rows(variables.orgPublicId, variables.importId, 1),
      });
    },
  });
}

export function useConfirmRosterImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgPublicId, importId }: { orgPublicId: string; importId: string }) =>
      confirmRosterImport(orgPublicId, importId),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(
        organizationRosterQueryKeys.detail(variables.orgPublicId, variables.importId),
        record,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationRosterQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: organizationPeopleQueryKeys.all }),
      ]);
    },
  });
}

export function useDownloadRosterErrorsMutation() {
  return useMutation({
    mutationFn: ({ orgPublicId, importId }: { orgPublicId: string; importId: string }) =>
      downloadRosterImportErrors(orgPublicId, importId),
  });
}
