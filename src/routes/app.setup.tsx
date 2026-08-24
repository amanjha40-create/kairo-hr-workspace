import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { OrgOnboarding } from "@/components/app/access/OrgOnboarding";
import {
  AccessDeniedScreen,
  InvitationPendingScreen,
  MembershipSuspendedScreen,
  OrgSuspendedScreen,
  SessionExpiredScreen,
  WorkspaceErrorScreen,
  WorkspaceLoadingScreen,
} from "@/components/app/access/StateScreens";
import { DevPreview } from "@/components/app/access/DevPreview";
import { useAccess } from "@/lib/access-context";

export const Route = createFileRoute("/app/setup")({
  component: SetupRoute,
});

function SetupRoute() {
  const { state, loading, error, retry } = useAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (state !== "no_org" && state !== "setup_incomplete") {
      navigate({ to: "/app", replace: true });
    }
  }, [loading, state, navigate]);

  if (loading) {
    return (
      <>
        <WorkspaceLoadingScreen />
        <DevPreview />
      </>
    );
  }

  if (state === "session_expired") {
    return (
      <>
        <SessionExpiredScreen />
        <DevPreview />
      </>
    );
  }

  if (error && state !== "access_denied") {
    return (
      <>
        <WorkspaceErrorScreen
          message={error.message}
          onRetry={() => {
            void retry();
          }}
        />
        <DevPreview />
      </>
    );
  }

  if (state === "access_denied") {
    return (
      <>
        <AccessDeniedScreen message="You don't have access to this workspace." />
        <DevPreview />
      </>
    );
  }

  if (state === "no_org" || state === "setup_incomplete") {
    return (
      <>
        <OrgOnboarding />
        <DevPreview />
      </>
    );
  }

  if (state === "invitation_pending") {
    return (
      <>
        <InvitationPendingScreen />
        <DevPreview />
      </>
    );
  }

  if (state === "org_suspended") {
    return (
      <>
        <OrgSuspendedScreen />
        <DevPreview />
      </>
    );
  }

  if (state === "membership_suspended") {
    return (
      <>
        <MembershipSuspendedScreen />
        <DevPreview />
      </>
    );
  }

  return (
    <>
      <WorkspaceLoadingScreen />
      <DevPreview />
    </>
  );
}
