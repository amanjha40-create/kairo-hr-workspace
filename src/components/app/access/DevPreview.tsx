import { useState } from "react";
import { useAccess, type AccessState, type WorkspaceRole } from "@/lib/access-context";
import { Wrench, X } from "lucide-react";

const STATES: { value: AccessState; label: string }[] = [
  { value: "ready", label: "Ready" },
  { value: "no_org", label: "No organization" },
  { value: "invitation_pending", label: "Pending invitation" },
  { value: "setup_incomplete", label: "Setup incomplete" },
  { value: "verification_pending", label: "Verification pending" },
  { value: "org_suspended", label: "Organization suspended" },
  { value: "membership_suspended", label: "Membership suspended" },
  { value: "access_denied", label: "Access denied" },
  { value: "session_expired", label: "Session expired" },
];

const ROLES: WorkspaceRole[] = ["Owner", "Admin", "Hiring Manager", "Recruiter", "Viewer"];

/**
 * Development-only preview switcher for organization access states and
 * mock role-based UI. Not rendered in production builds.
 */
export function DevPreview() {
  const { state, role, setState, setRole } = useAccess();
  const [open, setOpen] = useState(false);

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60]">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="h-10 px-3 rounded-full bg-foreground text-background text-xs font-semibold shadow-lg hover:opacity-90 flex items-center gap-2"
          aria-label="Open developer preview"
        >
          <Wrench className="h-3.5 w-3.5" />
          Dev
        </button>
      ) : (
        <div className="w-72 rounded-2xl border border-border/70 bg-background shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" /> Dev preview
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Access state</div>
              <select
                value={state}
                onChange={(e) => setState(e.target.value as AccessState)}
                className="w-full h-9 rounded-lg border border-border/70 bg-background text-sm px-2"
              >
                {STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Role</div>
              <div className="grid grid-cols-2 gap-1.5">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`h-8 rounded-lg text-[11px] font-medium border transition-all ${
                      role === r ? "bg-foreground text-background border-foreground" : "border-border/60 hover:border-foreground/40"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border/60">
              Development-only. Not visible in production builds.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
