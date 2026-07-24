import { queryOptions } from "@tanstack/react-query";
import { getWorkspaceBootstrap } from "@/lib/api/workspace";

export const workspaceBootstrapQueryKey = ["workspace", "bootstrap"] as const;

export function workspaceBootstrapQueryOptions() {
  return queryOptions({
    queryKey: workspaceBootstrapQueryKey,
    queryFn: getWorkspaceBootstrap,
    retry: false,
    staleTime: 30_000,
  });
}
