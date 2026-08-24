import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { completeOrganizationOnboarding } from "@/lib/api/organization-signup";
import {
  clearOrganizationSignupDraft,
  deriveDomainFromWorkEmail,
  readOrganizationSignupDraft,
} from "@/lib/organization-signup-draft";
import {
  acceptWorkspaceInvitation,
  declineWorkspaceInvitation,
  type BackendOrganizationRole,
  type BackendOrganizationType,
  type BackendOrganizationVerificationState,
  type WorkspaceBootstrapResponse,
  updateOrganization,
} from "@/lib/api/workspace";
import { useAuth } from "@/lib/auth-context";
import {
  workspaceBootstrapQueryKey,
  workspaceBootstrapQueryOptions,
} from "@/lib/queries/workspace";

export type WorkspaceRole = "Owner" | "Admin" | "Reviewer" | "Member" | "Viewer";

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
  publicId: string;
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
  publicId: string;
  orgName: string;
  invitedRole: WorkspaceRole;
  invitedBy: string;
  invitedAt: string;
}

export interface OnboardingDraft {
  step: number;
  name?: string;
  type?: OrgType;
  website?: string;
  industry?: string;
  location?: string;
  workEmail?: string;
  domain?: string;
  role?: Exclude<WorkspaceRole, "Viewer">;
}

export type PermissionAction =
  | "invite_candidate"
  | "modify_person"
  | "modify_invitation"
  | "modify_verification"
  | "manage_team"
  | "save_settings"
  | "transfer_ownership";

interface AccessCtx {
  state: AccessState;
  role: WorkspaceRole;
  membershipRole: BackendOrganizationRole | null;
  org: OrgProfile | null;
  pendingInvitation: OrgInvitationPending | null;
  onboarding: OnboardingDraft | null;
  loading: boolean;
  error: ApiError | Error | null;
  retry: () => Promise<unknown>;
  setState: (s: AccessState) => void;
  setRole: (r: WorkspaceRole) => void;
  startOnboarding: () => void;
  updateOnboarding: (patch: Partial<OnboardingDraft>) => void;
  completeOnboarding: (final: OnboardingDraft) => Promise<void>;
  cancelOnboarding: () => void;
  acceptInvitation: () => Promise<void>;
  declineInvitation: () => Promise<void>;
  can: (action: PermissionAction) => boolean;
}

const AccessContext = createContext<AccessCtx | null>(null);

const DEV_PERM_MATRIX: Record<WorkspaceRole, PermissionAction[]> = {
  Owner: [
    "invite_candidate",
    "modify_person",
    "modify_invitation",
    "modify_verification",
    "manage_team",
    "save_settings",
    "transfer_ownership",
  ],
  Admin: [
    "invite_candidate",
    "modify_person",
    "modify_invitation",
    "modify_verification",
    "manage_team",
    "save_settings",
  ],
  Reviewer: ["invite_candidate", "modify_person", "modify_invitation", "modify_verification"],
  Member: ["invite_candidate", "modify_person", "modify_invitation"],
  Viewer: [],
};

function mapBackendRoleToWorkspaceRole(role: BackendOrganizationRole | null): WorkspaceRole {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "reviewer":
      return "Reviewer";
    case "member":
      return "Member";
    default:
      return "Viewer";
  }
}

function mapOrgTypeToBackend(type: OrgType): BackendOrganizationType {
  switch (type) {
    case "Employer":
      return "employer";
    case "Staffing or Recruitment Firm":
      return "staffing_agency";
    case "Background Verification Partner":
      return "background_verification_partner";
    case "Contractor Platform":
      return "gig_platform";
    default:
      return "other";
  }
}

function mapBackendOrgType(type: BackendOrganizationType): OrgType {
  switch (type) {
    case "employer":
      return "Employer";
    case "staffing_agency":
      return "Staffing or Recruitment Firm";
    case "background_verification_partner":
      return "Background Verification Partner";
    case "gig_platform":
      return "Contractor Platform";
    default:
      return "Other";
  }
}

function mapVerificationState(
  state: BackendOrganizationVerificationState | null,
): OrgVerificationStatus {
  if (state === "verified") {
    return "verified";
  }
  if (state === "verification_pending" || state === "additional_information_required") {
    return "pending";
  }
  return "unverified";
}

function toOrgProfile(data: WorkspaceBootstrapResponse["active_organization"]): OrgProfile | null {
  if (!data) return null;
  return {
    publicId: data.public_id,
    name: data.name,
    type: mapBackendOrgType(data.organization_type),
    website: data.website ?? "",
    industry: data.industry ?? "",
    location: data.location ?? "",
    workEmail: data.work_email ?? "",
    domain: data.domain ?? "",
    domainVerified: Boolean(data.domain_verified_at),
    verification: mapVerificationState(data.verification_state),
    createdAt: data.created_at,
  };
}

function toPendingInvitation(
  data: WorkspaceBootstrapResponse["pending_organization_invitation"],
): OrgInvitationPending | null {
  if (!data) return null;
  return {
    publicId: data.public_id,
    orgName: data.organization_name,
    invitedRole: mapBackendRoleToWorkspaceRole(data.invited_role),
    invitedBy: data.invited_by_full_name ?? data.invited_by_email,
    invitedAt: data.invited_at,
  };
}

function buildOnboardingDraft(
  org: WorkspaceBootstrapResponse["active_organization"] | null,
  membershipRole: BackendOrganizationRole | null,
): OnboardingDraft {
  const signupDraft = org ? null : readOrganizationSignupDraft();
  const mappedRole = mapBackendRoleToWorkspaceRole(membershipRole);

  return {
    step: signupDraft?.stage === "complete_onboarding" ? 2 : 1,
    name: org?.name ?? signupDraft?.companyName ?? "",
    type: org ? mapBackendOrgType(org.organization_type) : "Employer",
    website: org?.website ?? "",
    industry: org?.industry ?? "",
    location: org?.location ?? "",
    workEmail: org?.work_email ?? signupDraft?.workEmail ?? "",
    domain: org?.domain ?? deriveDomainFromWorkEmail(signupDraft?.workEmail ?? "") ?? "",
    role: mappedRole === "Viewer" ? "Owner" : mappedRole,
  };
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading, sessionExpired, syncCurrentUser } = useAuth();
  const queryClient = useQueryClient();
  const [onboarding, setOnboarding] = useState<OnboardingDraft | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [devStateOverride, setDevStateOverride] = useState<AccessState | null>(null);
  const [devRoleOverride, setDevRoleOverride] = useState<WorkspaceRole | null>(null);

  const bootstrapQuery = useQuery({
    ...workspaceBootstrapQueryOptions(),
    enabled: Boolean(session) && !authLoading,
  });

  useEffect(() => {
    if (!bootstrapQuery.data) return;
    syncCurrentUser(bootstrapQuery.data.current_user);
  }, [bootstrapQuery.data, syncCurrentUser]);

  useEffect(() => {
    if (!bootstrapQuery.data) return;
    if (
      bootstrapQuery.data.state === "no_org" ||
      bootstrapQuery.data.state === "setup_incomplete"
    ) {
      setOnboarding(
        (existing) =>
          existing ??
          buildOnboardingDraft(
            bootstrapQuery.data.active_organization,
            bootstrapQuery.data.membership_role,
          ),
      );
      return;
    }
    setOnboarding(null);
  }, [bootstrapQuery.data]);

  const actualState: AccessState = useMemo(() => {
    if (sessionExpired) return "session_expired";
    if (bootstrapQuery.error instanceof ApiError && bootstrapQuery.error.status === 403) {
      return "access_denied";
    }
    return (bootstrapQuery.data?.state ?? "ready") as AccessState;
  }, [bootstrapQuery.data, bootstrapQuery.error, sessionExpired]);

  const org = toOrgProfile(bootstrapQuery.data?.active_organization ?? null);
  const pendingInvitation = toPendingInvitation(
    bootstrapQuery.data?.pending_organization_invitation ?? null,
  );
  const membershipRole = bootstrapQuery.data?.membership_role ?? null;
  const role = devRoleOverride ?? mapBackendRoleToWorkspaceRole(membershipRole);
  const permissionFlags = bootstrapQuery.data?.permission_flags;

  const retry = useCallback(async () => {
    return bootstrapQuery.refetch();
  }, [bootstrapQuery]);

  const refreshBootstrap = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: workspaceBootstrapQueryKey });
    await bootstrapQuery.refetch();
  }, [bootstrapQuery, queryClient]);

  const setState = useCallback((state: AccessState) => {
    if (import.meta.env.PROD) return;
    setDevStateOverride(state);
  }, []);

  const setRole = useCallback((nextRole: WorkspaceRole) => {
    if (import.meta.env.PROD) return;
    setDevRoleOverride(nextRole);
  }, []);

  const startOnboarding = useCallback(() => {
    setOnboarding(
      (existing) =>
        existing ??
        buildOnboardingDraft(
          bootstrapQuery.data?.active_organization ?? null,
          bootstrapQuery.data?.membership_role ?? null,
        ),
    );
  }, [bootstrapQuery.data]);

  const updateOnboarding = useCallback(
    (patch: Partial<OnboardingDraft>) => {
      setOnboarding((previous) => ({
        ...(previous ??
          buildOnboardingDraft(
            bootstrapQuery.data?.active_organization ?? null,
            bootstrapQuery.data?.membership_role ?? null,
          )),
        ...patch,
      }));
    },
    [bootstrapQuery.data],
  );

  const completeOnboarding = useCallback(
    async (final: OnboardingDraft) => {
      setActionPending(true);
      try {
        const currentOrgId = bootstrapQuery.data?.active_organization?.public_id;
        const signupDraft = !currentOrgId ? readOrganizationSignupDraft() : null;
        const payload = {
          name: final.name?.trim() || "New organization",
          organization_type: mapOrgTypeToBackend(final.type ?? "Employer"),
          website: final.website?.trim() || undefined,
          industry: final.industry?.trim() || undefined,
          location: final.location?.trim() || undefined,
          work_email: final.workEmail?.trim() || undefined,
          domain: final.domain?.trim() || undefined,
          organization_size: signupDraft?.companySize || undefined,
          hiring_volume: signupDraft?.hiringVolume || undefined,
          verification_capabilities: [] as string[],
        };

        if (!currentOrgId) {
          try {
            await completeOrganizationOnboarding(payload);
          } catch (error) {
            if (!(error instanceof ApiError && error.status === 409)) {
              throw error;
            }
          }
        } else {
          await updateOrganization(currentOrgId, payload);
        }

        setOnboarding(null);
        clearOrganizationSignupDraft();
        await refreshBootstrap();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "We couldn't save your organization setup.";
        toast.error(message);
        throw error;
      } finally {
        setActionPending(false);
      }
    },
    [bootstrapQuery.data, refreshBootstrap],
  );

  const cancelOnboarding = useCallback(() => {
    setOnboarding(
      buildOnboardingDraft(
        bootstrapQuery.data?.active_organization ?? null,
        bootstrapQuery.data?.membership_role ?? null,
      ),
    );
  }, [bootstrapQuery.data]);

  const acceptInvitation = useCallback(async () => {
    if (!pendingInvitation) return;
    setActionPending(true);
    try {
      await acceptWorkspaceInvitation(pendingInvitation.publicId);
      await refreshBootstrap();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We couldn't accept this invitation.";
      toast.error(message);
      throw error;
    } finally {
      setActionPending(false);
    }
  }, [pendingInvitation, refreshBootstrap]);

  const declineInvitation = useCallback(async () => {
    if (!pendingInvitation) return;
    setActionPending(true);
    try {
      await declineWorkspaceInvitation(pendingInvitation.publicId);
      await refreshBootstrap();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We couldn't decline this invitation.";
      toast.error(message);
      throw error;
    } finally {
      setActionPending(false);
    }
  }, [pendingInvitation, refreshBootstrap]);

  const can = useCallback(
    (action: PermissionAction) => {
      if (devRoleOverride) {
        return DEV_PERM_MATRIX[devRoleOverride].includes(action);
      }
      return Boolean(permissionFlags?.[action]);
    },
    [devRoleOverride, permissionFlags],
  );

  const value = useMemo<AccessCtx>(
    () => ({
      state: devStateOverride ?? actualState,
      role,
      membershipRole,
      org,
      pendingInvitation,
      onboarding,
      loading: authLoading || (Boolean(session) && bootstrapQuery.isLoading) || actionPending,
      error: (bootstrapQuery.error as ApiError | Error | null) ?? null,
      retry,
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
    [
      actionPending,
      actualState,
      authLoading,
      bootstrapQuery.error,
      bootstrapQuery.isLoading,
      can,
      cancelOnboarding,
      completeOnboarding,
      declineInvitation,
      devStateOverride,
      membershipRole,
      onboarding,
      org,
      pendingInvitation,
      retry,
      role,
      session,
      setRole,
      setState,
      startOnboarding,
      updateOnboarding,
      acceptInvitation,
    ],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) {
    throw new Error("useAccess must be used inside AccessProvider");
  }
  return value;
}

export function usePermission(action: PermissionAction) {
  return useAccess().can(action);
}
