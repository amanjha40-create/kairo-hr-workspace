import { createFileRoute } from "@tanstack/react-router";
import { EmployeeRosterImportPage } from "@/components/app/roster/EmployeeRosterImportPage";

export const Route = createFileRoute("/app/people/imports/")({
  component: EmployeeRosterImportPage,
});
