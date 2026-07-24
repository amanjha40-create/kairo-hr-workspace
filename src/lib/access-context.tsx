import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type WorkspaceRole = "Owner" | "Admin" | "Hiring Manager" | "Recruiter" | "Viewer";

export type OrgType =
  | "Employer"
  | "Staffing or Recruitment Firm"
  | "Background Verification Partner"
  | "Contractor Platform"
  | "Other";

export type OrgVerificationStatus = "verified" | "pending" | "unverified";

export type AccessState =
  | "ready"
  | "no_org"
  | "invitation_pending"
  | "setup_incomplete"
  | "verification_pending"
  | "org_suspended"
  | "membership_suspended"
  | "access_denied"
  | "session_expired";

export interface OrgProfile {
  name: string;
  type: OrgType;
  website: string;
  industry: string;
  location: string;
  workEmail: string;
  domain: string;
  domainVerified: boolean;
  verification: OrgVerificationStatus;
  createdAt: string;
}

export interface OrgInvitationPending {
  orgName: string;
  invitedRole: WorkspaceRole;
  invitedBy: string;
  invitedAt: string;
}

export interface OnboardingDraft {
  step: number; // 1..5
  name?: string;
  type?: OrgType;
  website?: string;
  industry?: string;
  location?: string;
  workEmail?: string;
  domain?: string;
  role?: Exclude<WorkspaceRole, "Viewer">;
}

interface AccessCtx {
  state: AccessState;
  role: WorkspaceRole;
  org: OrgProfile | null;
  pendingInvitation: OrgInvitationPending | null;
  onboarding: OnboardingDraft | null;
  // dev preview
  setState: (s: AccessState) => void;
  setRole: (r: WorkspaceRole) => void;
  // onboarding
  startOnboarding: () => void;
  updateOnboarding: (patch: Partial<OnboardingDraft>) => void;
  completeOnboarding: (final: OnboardingDraft) => void;
  cancelOnboarding: () => void;
  // pending invitation flow
  acceptInvitation: () => void;
  declineInvitation: () => void;
  // permissions
  can: (action: PermissionAction) => boolean;
}

export type PermissionAction =
  | "invite_candidate"
  | "modify_person"
  | "modify_invitation"
  | "modify_verification"
  | "manage_team"
  | "save_settings"
  | "transfer_ownership";

const KEY = "kairo.access.v1";

const DEFAULT_ORG: OrgProfile = {
  name: "Northstar Talent",
  type: "Employer",
  website: "https://northstar.example",
  industry: "Software",
  location: "Bengaluru, IN",
  workEmail: "you@northstar.example",
  domain: "northstar.example",
  domainVerified: true,
  verification: "verified",
  createdAt: new Date().toISOString(),
};

const DEFAULT_PENDING: OrgInvitationPending = {
  orgName: "Acme Verification Partners",
  invitedRole: "Admin",
  invitedBy: "priya@acme.example",
  invitedAt: new Date().toISOString(),
};

const AccessContext = createContext<AccessCtx | null>(null);

function loadPersisted(): { state: AccessState; role: WorkspaceRole; org: OrgProfile | null; onboarding: OnboardingDraft | null } {
  if (typeof window === "undefined") return { state: "ready", role: "Owner", org: DEFAULT_ORG, onboarding: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { state: "ready", role: "Owner", org: DEFAULT_ORG, onboarding: null };
    const p = JSON.parse(raw);
    return {
      state: (p.state as AccessState) ?? "ready",
      role: (p.role as WorkspaceRole) ?? "Owner",
      org: p.org ?? DEFAULT_ORG,
      onboarding: p.onboarding ?? null,
    };
  } catch {
    return { state: "ready", role: "Owner", org: DEFAULT_ORG, onboarding: null };
  }
}

const PERM_MATRIX: Record<WorkspaceRole, PermissionAction[]> = {
  Owner: ["invite_candidate", "modify_person", "modify_invitation", "modify_verification", "manage_team", "save_settings", "transfer_ownership"],
  Admin: ["invite_candidate", "modify_person", "modify_invitation", "modify_verification", "manage_team", "save_settings"],
  "Hiring Manager": ["invite_candidate", "modify_person", "modify_invitation", "modify_verification"],
  Recruiter: ["invite_candidate", "modify_person", "modify_invitation"],
  Viewer: [],
};

export function AccessProvider({ children }: { children: ReactNode }) {
  const initial = loadPersisted();
  const [state, setStateRaw] = useState<AccessState>(initial.state);
  const [role, setRoleRaw] = useState<WorkspaceRole>(initial.role);
  const [org, setOrg] = useState<OrgProfile | null>(initial.org);
  const [onboarding, setOnboarding] = useState<OnboardingDraft | null>(initial.onboarding);
  const [pendingInvitation, setPendingInvitation] = useState<OrgInvitationPending | null>(DEFAULT_PENDING);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ state, role, org, onboarding }));
    } catch { /* ignore */ }
  }, [state, role, org, onboarding]);

  const setState = useCallback((s: AccessState) => {
    setStateRaw(s);
    if (s === "no_org") { setOrg(null); setOnboarding(null); }
    if (s === "setup_incomplete" && !onboarding) {
      setOnboarding({ step: 2, name: "", type: "Employer" });
    }
    if (s === "verification_pending" && org) setOrg({ ...org, verification: "pending" });
    if (s === "ready" && !org) setOrg(DEFAULT_ORG);
  }, [onboarding, org]);

  const setRole = useCallback((r: WorkspaceRole) => setRoleRaw(r), []);

  const startOnboarding = useCallback(() => {
    setOnboarding({ step: 1 });
    setStateRaw("setup_incomplete");
  }, []);
  const updateOnboarding = useCallback((patch: Partial<OnboardingDraft>) => {
    setOnboarding((prev) => ({ ...(prev ?? { step: 1 }), ...patch }));
  }, []);
  const completeOnboarding = useCallback((final: OnboardingDraft) => {
    const now = new Date().toISOString();
    const newOrg: OrgProfile = {
      name: final.name ?? "New organization",
      type: final.type ?? "Employer",
      website: final.website ?? "",
      industry: final.industry ?? "",
      location: final.location ?? "",
      workEmail: final.workEmail ?? "",
      domain: final.domain ?? "",
      domainVerified: false,
      verification: "pending",
      createdAt: now,
    };
    setOrg(newOrg);
    setRoleRaw(final.role ?? "Owner");
    setOnboarding(null);
    setStateRaw("ready");
  }, []);
  const cancelOnboarding = useCallback(() => {
    setOnboarding(null);
    setStateRaw("no_org");
  }, []);

  const acceptInvitation = useCallback(() => {
    if (!pendingInvitation) return;
    const now = new Date().toISOString();
    setOrg({
      name: pendingInvitation.orgName,
      type: "Employer",
      website: "",
      industry: "",
      location: "",
      workEmail: "",
      domain: "",
      domainVerified: false,
      verification: "verified",
      createdAt: now,
    });
    setRoleRaw(pendingInvitation.invitedRole);
    setPendingInvitation(null);
    setStateRaw("ready");
  }, [pendingInvitation]);

  const declineInvitation = useCallback(() => {
    setPendingInvitation(null);
    setStateRaw("no_org");
  }, []);

  const can = useCallback(
    (action: PermissionAction) => PERM_MATRIX[role].includes(action),
    [role],
  );

  const value = useMemo<AccessCtx>(
    () => ({
      state,
      role,
      org,
      pendingInvitation,
      onboarding,
      setState,
      setRole,
      startOnboarding,
      updateOnboarding,
      completeOnboarding,
      cancelOnboarding,
      acceptInvitation,
      declineInvitation,
      can,
    }),
    [state, role, org, pendingInvitation, onboarding, setState, setRole, startOnboarding, updateOnboarding, completeOnboarding, cancelOnboarding, acceptInvitation, declineInvitation, can],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const v = useContext(AccessContext);
  if (!v) throw new Error("useAccess must be used inside AccessProvider");
  return v;
}

export function usePermission(action: PermissionAction) {
  return useAccess().can(action);
}
