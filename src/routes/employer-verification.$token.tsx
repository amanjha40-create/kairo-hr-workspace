import { createFileRoute } from "@tanstack/react-router";
import { EmployerVerificationPortal } from "@/components/employer-verification/EmployerVerificationPortal";

export const Route = createFileRoute("/employer-verification/$token")({
  head: () => ({
    meta: [
      { title: "Employer verification — KairoID" },
      {
        name: "description",
        content: "Securely review an employment verification request from KairoID.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: EmployerVerificationRoute,
});

function EmployerVerificationRoute() {
  const { token } = Route.useParams();
  return <EmployerVerificationPortal token={token} />;
}
