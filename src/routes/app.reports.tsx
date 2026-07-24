import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/reports")({
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
  component: () => null,
});
