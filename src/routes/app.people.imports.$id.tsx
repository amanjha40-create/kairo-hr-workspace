import { createFileRoute } from "@tanstack/react-router";
import { EmployeeRosterImportDetail } from "@/components/app/roster/EmployeeRosterImportDetail";

export const Route = createFileRoute("/app/people/imports/$id")({
  component: EmployeeRosterImportRoute,
});

function EmployeeRosterImportRoute() {
  const { id } = Route.useParams();
  return <EmployeeRosterImportDetail importId={id} />;
}
