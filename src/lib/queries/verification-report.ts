import { useQuery } from "@tanstack/react-query";
import { getOrganizationPerson } from "@/lib/api/organization-people";
import { listAllRosterEmployees } from "@/lib/api/organization-roster-imports";
import {
  getVerificationRequestDetail,
  getVerificationRequestEvidence,
  getVerificationRequestTimeline,
} from "@/lib/api/verification-requests";
import { getEmployeeRosterMetadata } from "@/lib/organization-roster";
import {
  buildVerificationReportModel,
  type VerificationReportRequestBundle,
} from "@/lib/verification-report";

export const verificationReportQueryKeys = {
  detail: (orgPublicId: string, personPublicId: string, includeRoster: boolean) =>
    ["verification-report", orgPublicId, personPublicId, includeRoster] as const,
};

export function useVerificationReportQuery({
  orgPublicId,
  organizationName,
  personPublicId,
  includeRoster,
}: {
  orgPublicId: string | undefined;
  organizationName: string | undefined;
  personPublicId: string | undefined;
  includeRoster: boolean;
}) {
  return useQuery({
    queryKey: verificationReportQueryKeys.detail(
      orgPublicId ?? "",
      personPublicId ?? "",
      includeRoster,
    ),
    enabled: Boolean(orgPublicId && organizationName && personPublicId),
    retry: false,
    queryFn: async () => {
      const person = await getOrganizationPerson(orgPublicId ?? "", personPublicId ?? "");
      const requestIds = [
        ...new Set(person.employment_verifications.map((item) => item.request_public_id)),
      ];
      const requests = await Promise.all(
        requestIds.map(async (requestId): Promise<VerificationReportRequestBundle> => {
          const [request, timeline, evidenceResponse] = await Promise.all([
            getVerificationRequestDetail(requestId),
            getVerificationRequestTimeline(requestId),
            getVerificationRequestEvidence(requestId),
          ]);
          return {
            request,
            timeline: timeline.items,
            evidence: Array.isArray(evidenceResponse) ? evidenceResponse : evidenceResponse.items,
          };
        }),
      );
      const rosterResponse = includeRoster
        ? await listAllRosterEmployees(
            orgPublicId ?? "",
            person.summary.email ?? person.summary.full_name,
          )
        : null;
      const rosterEmployee = rosterResponse?.items.find(
        (employee) => employee.organization_person_id === person.public_id,
      );
      return buildVerificationReportModel({
        person,
        organizationName: organizationName ?? "Organization",
        roster: getEmployeeRosterMetadata(rosterEmployee),
        requests,
      });
    },
  });
}
