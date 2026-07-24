import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline message shown when a role cannot perform an action. Use this
 * next to a hidden/disabled action to explain why it's unavailable.
 */
export function PermissionDenied({
  message = "You do not have permission to perform this action.",
  className,
}: { message?: string; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] text-muted-foreground",
        className,
      )}
      role="note"
    >
      <Lock className="h-3 w-3" />
      {message}
    </div>
  );
}
