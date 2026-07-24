import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/app/$")({
  component: AppNotFound,
});

function AppNotFound() {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="h-14 w-14 rounded-2xl bg-foreground/[0.05] border border-border/60 flex items-center justify-center mx-auto mb-5">
        <Compass className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Page not found in Trust Workspace</h1>
      <p className="text-sm text-muted-foreground mt-2">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        to="/app"
        className="inline-flex items-center h-10 px-4 rounded-xl bg-foreground text-background text-sm font-medium mt-6 hover:opacity-90"
      >
        Back to Overview
      </Link>
    </div>
  );
}
