export interface OrganizationSignupDraft {
  stage: "verify_email" | "complete_onboarding";
  signupSessionId?: string;
  fullName: string;
  workEmail: string;
  companyName: string;
  companySize: string;
  hiringVolume: string;
}

const STORAGE_KEY = "kairo.hr.organization-signup.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readOrganizationSignupDraft(): OrganizationSignupDraft | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrganizationSignupDraft;
  } catch {
    return null;
  }
}

export function writeOrganizationSignupDraft(draft: OrganizationSignupDraft) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearOrganizationSignupDraft() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function deriveDomainFromWorkEmail(workEmail: string) {
  const normalized = workEmail.trim().toLowerCase();
  const parts = normalized.split("@");
  if (parts.length !== 2 || !parts[1]) {
    return undefined;
  }
  return parts[1];
}
