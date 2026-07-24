import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAccess } from "@/lib/access-context";

// Organization onboarding route. When the workspace is in `no_org` or
// `setup_incomplete`, `AppRoot` renders the OrgOnboarding wizard directly
// (bypassing the app chrome) — this component only handles the "already
// set up" case by bouncing the user back to /app.
export const Route = createFileRoute("/app/setup")({
  component: SetupRoute,
});

function SetupRoute() {
  const { state } = useAccess();
  const navigate = useNavigate();
  useEffect(() => {
    if (state !== "no_org" && state !== "setup_incomplete") {
      navigate({ to: "/app", replace: true });
    }
  }, [state, navigate]);
  return null;
}
