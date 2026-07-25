import type { Employee } from "./dashboard-data";
import { seedEmployees, seedRequests } from "./dashboard-data";

export type Relationship =
  | "Candidate"
  | "Future Employee"
  | "Employee"
  | "Former Employee"
  | "Contractor";

export type InvitationStatus =
  | "Not Invited"
  | "Draft"
  | "Sent"
  | "Opened"
  | "Accepted"
  | "Expired"
  | "Cancelled";

export type WorkspaceVerificationStatus =
  | "Not Started"
  | "Waiting for Candidate"
  | "In Verification"
  | "Clarification Required"
  | "Completed"
  | "Unable to Verify"
  | "Cancelled";

export type SharedPassportStatus =
  | "Not Shared"
  | "Active"
  | "Expiring Soon"
  | "Expired"
  | "Access Revoked";

export type ClaimStatus =
  | "Candidate-provided"
  | "Verification pending"
  | "Verified"
  | "Unable to verify";

export interface SharedClaim {
  label: string;
  status: ClaimStatus;
  source?: string;
}

export interface PersonActivity {
  id: string;
  kind:
    | "added"
    | "invited"
    | "opened"
    | "accepted"
    | "consent"
    | "shared"
    | "accessed"
    | "request"
    | "submitted"
    | "clarification-req"
    | "clarification-recv"
    | "completed"
    | "unable"
    | "expired"
    | "revoked";
  label: string;
  actor: string;
  at: string;
  requestId?: string;
}

export interface InternalNote {
  id: string;
  author: string;
  body: string;
  at: string;
  ownedByMe?: boolean;
}

export interface SharedEvidence {
  id: string;
  type: string;
  requestId: string;
  sharedAt: string;
  status: "Available" | "Expired" | "Revoked";
}

export interface WorkspacePerson extends Employee {
  relationship: Relationship;
  invitationStatus: InvitationStatus;
  workspaceVerificationStatus: WorkspaceVerificationStatus;
  sharedPassport: SharedPassportStatus;
  addedBy: string;
  addedAt: string;
  invitedAt?: string;
  sharedAt?: string;
  passportExpiresAt?: string;
  lastActivity: string;
  passportSharedClaims: SharedClaim[];
  personActivity: PersonActivity[];
  notes: InternalNote[];
  sharedEvidence: SharedEvidence[];
}

export interface AttentionItem {
  id: string;
  personId: string;
  personName: string;
  reason: string;
  status: string;
  at: string;
  action: {
    label: string;
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
  };
}

const RELATIONSHIP_ROLL: Relationship[] = [
  "Candidate",
  "Employee",
  "Employee",
  "Contractor",
  "Former Employee",
  "Candidate",
  "Employee",
];
const INVITE_ROLL: InvitationStatus[] = [
  "Accepted",
  "Sent",
  "Opened",
  "Accepted",
  "Accepted",
  "Expired",
  "Sent",
];
const WVS_ROLL: WorkspaceVerificationStatus[] = [
  "Completed",
  "In Verification",
  "Waiting for Candidate",
  "Completed",
  "Clarification Required",
  "Not Started",
  "Unable to Verify",
];
const PASSPORT_ROLL: SharedPassportStatus[] = [
  "Active",
  "Not Shared",
  "Not Shared",
  "Active",
  "Expiring Soon",
  "Expired",
  "Access Revoked",
];
const ADDED_BY = ["Riya Kapoor", "Aman Joshi", "Neel Shah", "Isha Bansal"];

function buildActivity(
  name: string,
  i: number,
  inv: InvitationStatus,
  wvs: WorkspaceVerificationStatus,
  sp: SharedPassportStatus,
  invitedAt?: string,
  sharedAt?: string,
  requestId?: string,
): PersonActivity[] {
  const now = Date.now();
  const items: PersonActivity[] = [];
  items.push({
    id: `pa-${i}-added`,
    kind: "added",
    label: "Person added to workspace",
    actor: ADDED_BY[i % ADDED_BY.length],
    at: new Date(now - (i + 7) * 86400e3).toISOString(),
  });
  if (invitedAt)
    items.push({
      id: `pa-${i}-invited`,
      kind: "invited",
      label: "Trust invitation sent",
      actor: ADDED_BY[i % ADDED_BY.length],
      at: invitedAt,
    });
  if (inv === "Opened" || inv === "Accepted")
    items.push({
      id: `pa-${i}-opened`,
      kind: "opened",
      label: "Invitation opened",
      actor: name,
      at: new Date(now - (i + 3) * 86400e3).toISOString(),
    });
  if (inv === "Accepted") {
    items.push({
      id: `pa-${i}-accepted`,
      kind: "accepted",
      label: "Invitation accepted",
      actor: name,
      at: new Date(now - (i + 2) * 86400e3).toISOString(),
    });
    items.push({
      id: `pa-${i}-consent`,
      kind: "consent",
      label: "Consent granted for verification",
      actor: name,
      at: new Date(now - (i + 2) * 86400e3 + 300e3).toISOString(),
    });
  }
  if (sharedAt)
    items.push({
      id: `pa-${i}-shared`,
      kind: "shared",
      label: "Trust Passport shared with your organization",
      actor: name,
      at: sharedAt,
    });
  if (wvs !== "Not Started" && requestId) {
    items.push({
      id: `pa-${i}-request`,
      kind: "request",
      label: "Verification request created",
      actor: ADDED_BY[i % ADDED_BY.length],
      at: new Date(now - (i + 1) * 86400e3).toISOString(),
      requestId,
    });
    items.push({
      id: `pa-${i}-submitted`,
      kind: "submitted",
      label: "Candidate information submitted",
      actor: name,
      at: new Date(now - i * 86400e3 - 4 * 3600e3).toISOString(),
      requestId,
    });
  }
  if (wvs === "Clarification Required") {
    items.push({
      id: `pa-${i}-clar-req`,
      kind: "clarification-req",
      label: "Clarification requested from candidate",
      actor: "Kairo Trust Engine",
      at: new Date(now - 2 * 86400e3).toISOString(),
      requestId,
    });
    items.push({
      id: `pa-${i}-clar-recv`,
      kind: "clarification-recv",
      label: "Clarification received",
      actor: name,
      at: new Date(now - 18 * 3600e3).toISOString(),
      requestId,
    });
  }
  if (wvs === "Completed")
    items.push({
      id: `pa-${i}-completed`,
      kind: "completed",
      label: "Verification completed",
      actor: "Kairo Trust Engine",
      at: new Date(now - 12 * 3600e3).toISOString(),
      requestId,
    });
  if (wvs === "Unable to Verify")
    items.push({
      id: `pa-${i}-unable`,
      kind: "unable",
      label: "Unable to complete verification",
      actor: "Kairo Trust Engine",
      at: new Date(now - 20 * 3600e3).toISOString(),
      requestId,
    });
  if (sp === "Expired")
    items.push({
      id: `pa-${i}-expired`,
      kind: "expired",
      label: "Trust Passport access expired",
      actor: "System",
      at: new Date(now - 3 * 86400e3).toISOString(),
    });
  if (sp === "Access Revoked")
    items.push({
      id: `pa-${i}-revoked`,
      kind: "revoked",
      label: "Candidate revoked passport access",
      actor: name,
      at: new Date(now - 4 * 86400e3).toISOString(),
    });
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export const workspacePeople: WorkspacePerson[] = seedEmployees.map((e, i) => {
  const rel = RELATIONSHIP_ROLL[i % RELATIONSHIP_ROLL.length];
  const invitationStatus = INVITE_ROLL[i % INVITE_ROLL.length];
  const wvs = WVS_ROLL[i % WVS_ROLL.length];
  const sp = PASSPORT_ROLL[i % PASSPORT_ROLL.length];
  const invitedAt =
    invitationStatus !== "Not Invited"
      ? new Date(Date.now() - (i + 2) * 86400e3).toISOString()
      : undefined;
  const sharedAt =
    sp !== "Not Shared" ? new Date(Date.now() - (i + 3) * 86400e3).toISOString() : undefined;
  const passportExpiresAt =
    sp === "Expiring Soon"
      ? new Date(Date.now() + 4 * 86400e3).toISOString()
      : sp === "Expired"
        ? new Date(Date.now() - 3 * 86400e3).toISOString()
        : sp === "Active"
          ? new Date(Date.now() + 40 * 86400e3).toISOString()
          : undefined;
  const req = seedRequests[i % seedRequests.length];
  const claims: SharedClaim[] =
    sp === "Not Shared" || sp === "Expired" || sp === "Access Revoked"
      ? []
      : [
          { label: "Full name", status: "Verified", source: "Government ID" },
          { label: "Work email", status: "Verified" },
          {
            label: "Most recent employer",
            status:
              wvs === "Completed"
                ? "Verified"
                : wvs === "Unable to Verify"
                  ? "Unable to verify"
                  : "Verification pending",
            source: "Employer records",
          },
          {
            label: "Employment tenure",
            status: wvs === "Completed" ? "Verified" : "Verification pending",
          },
          { label: "Highest education", status: "Candidate-provided" },
        ];
  return {
    ...e,
    relationship: rel,
    invitationStatus,
    workspaceVerificationStatus: wvs,
    sharedPassport: sp,
    addedBy: ADDED_BY[i % ADDED_BY.length],
    addedAt: e.joinedAt,
    invitedAt,
    sharedAt,
    passportExpiresAt,
    lastActivity: e.updatedAt,
    passportSharedClaims: claims,
    personActivity: buildActivity(
      e.name,
      i,
      invitationStatus,
      wvs,
      sp,
      invitedAt,
      sharedAt,
      req?.id,
    ),
    notes:
      i % 4 === 0
        ? [
            {
              id: `n-${i}-1`,
              author: "Riya Kapoor",
              body: "Referral from CTO. Waiting on candidate to accept the Trust invitation.",
              at: new Date(Date.now() - (i + 1) * 3600e3).toISOString(),
            },
          ]
        : [],
    sharedEvidence:
      sp === "Active" || sp === "Expiring Soon"
        ? [
            {
              id: `ev-${i}-1`,
              type: "Offer letter",
              requestId: req?.id ?? "",
              sharedAt: sharedAt ?? new Date().toISOString(),
              status: "Available",
            },
            {
              id: `ev-${i}-2`,
              type: "Payslip · Mar",
              requestId: req?.id ?? "",
              sharedAt: sharedAt ?? new Date().toISOString(),
              status: "Available",
            },
          ]
        : sp === "Expired"
          ? [
              {
                id: `ev-${i}-1`,
                type: "Offer letter",
                requestId: req?.id ?? "",
                sharedAt: sharedAt ?? new Date().toISOString(),
                status: "Expired",
              },
            ]
          : [],
  };
});

export function buildAttentionItems(people: WorkspacePerson[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const p of people) {
    if (
      p.invitationStatus === "Sent" &&
      p.invitedAt &&
      new Date(p.invitedAt).getTime() < Date.now() - 4 * 86400e3
    ) {
      items.push({
        id: `att-${p.id}-invopen`,
        personId: p.id,
        personName: p.name,
        reason: "Candidate has not accepted the invitation",
        status: "Invitation sent",
        at: p.invitedAt,
        action: { label: "Send reminder", to: "/app/invitations" },
      });
    }
    if (
      p.invitationStatus === "Opened" &&
      p.invitedAt &&
      new Date(p.invitedAt).getTime() < Date.now() - 5 * 86400e3
    ) {
      items.push({
        id: `att-${p.id}-expiring`,
        personId: p.id,
        personName: p.name,
        reason: "Invitation expires soon",
        status: "Invitation opened",
        at: p.invitedAt,
        action: { label: "View invitation", to: "/app/invitations" },
      });
    }
    if (p.workspaceVerificationStatus === "Waiting for Candidate") {
      items.push({
        id: `att-${p.id}-info`,
        personId: p.id,
        personName: p.name,
        reason: "Candidate information is incomplete",
        status: "Waiting for candidate",
        at: p.lastActivity,
        action: { label: "Review information", to: "/app/people/$id", params: { id: p.id } },
      });
    }
    if (p.workspaceVerificationStatus === "Clarification Required") {
      items.push({
        id: `att-${p.id}-clar`,
        personId: p.id,
        personName: p.name,
        reason: "Clarification received from candidate",
        status: "In verification",
        at: p.lastActivity,
        action: { label: "Open request", to: "/app/verifications" },
      });
    }
    if (p.workspaceVerificationStatus === "Completed") {
      items.push({
        id: `att-${p.id}-done`,
        personId: p.id,
        personName: p.name,
        reason: "Verification has been completed",
        status: "Completed",
        at: p.lastActivity,
        action: { label: "View result", to: "/app/verifications" },
      });
    }
    if (p.workspaceVerificationStatus === "Unable to Verify") {
      items.push({
        id: `att-${p.id}-unable`,
        personId: p.id,
        personName: p.name,
        reason: "Verification could not be completed",
        status: "Unable to verify",
        at: p.lastActivity,
        action: { label: "Open request", to: "/app/verifications" },
      });
    }
    if (items.length >= 10) break;
  }
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);
}

export const workspaceActivityFeed: PersonActivity[] = workspacePeople
  .flatMap((p) =>
    p.personActivity.map(
      (a) =>
        ({ ...a, id: `${p.id}-${a.id}`, personName: p.name, personId: p.id }) as PersonActivity & {
          personName: string;
          personId: string;
        },
    ),
  )
  .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  .slice(0, 12) as (PersonActivity & { personName: string; personId: string })[];
