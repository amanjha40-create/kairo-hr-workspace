import { useQuery } from "@tanstack/react-query";
import { getStructuredVerificationReport } from "@/lib/api/hr-v2";
import { mapStructuredVerificationReport } from "@/lib/verification-report";

export const verificationReportQueryKeys = {
  detail: (orgPublicId: string, personPublicId: string) =>
    ["verification-report", orgPublicId, personPublicId] as const,
};

export function useVerificationReportQuery({
  orgPublicId,
  personPublicId,
}: {
  orgPublicId: string | undefined;
  organizationName?: string | undefined;
  personPublicId: string | undefined;
  includeRoster?: boolean;
}) {
  return useQuery({
    queryKey: verificationReportQueryKeys.detail(orgPublicId ?? "", personPublicId ?? ""),
    enabled: Boolean(orgPublicId && personPublicId),
    retry: false,
    queryFn: async () =>
      mapStructuredVerificationReport(
        await getStructuredVerificationReport(orgPublicId ?? "", personPublicId ?? ""),
      ),
  });
}
