import { describe, expect, it } from "vitest";
import type { BackendOrganizationInvitationResponse } from "@/lib/api/organization-members";
import { mapInvitationStatus } from "@/lib/team";

function invitation(
  overrides: Partial<BackendOrganizationInvitationResponse> = {},
): BackendOrganizationInvitationResponse {
  return {
    public_id: "invite-1",
    organization_public_id: "org-1",
    invitee_email: "recipient@example.com",
    invitee_user_id: null,
    role: "member",
    status: "pending",
    invited_by_email: "admin@example.com",
    invited_by_full_name: "Admin User",
    invited_at: "2026-10-18T00:00:00Z",
    expires_at: "2026-10-25T00:00:00Z",
    accepted_at: null,
    declined_at: null,
    cancelled_at: null,
    created_at: "2026-10-18T00:00:00Z",
    updated_at: "2026-10-18T00:00:00Z",
    ...overrides,
  };
}

describe("certified team invitation status projection", () => {
  it.each([
    [{}, "Invitation Pending"],
    [{ last_sent_at: "2026-10-18T00:01:00Z" }, "Invitation Sent"],
    [
      {
        last_sent_at: "2026-10-18T00:01:00Z",
        delivery_failed_at: "2026-10-18T00:02:00Z",
      },
      "Invitation Delivery Failed",
    ],
    [{ status: "expired" }, "Invitation Expired"],
    [{ status: "accepted", token_used_at: "2026-10-18T00:03:00Z" }, "Invitation Accepted"],
  ] satisfies Array<[Partial<BackendOrganizationInvitationResponse>, string]>)(
    "maps backend state %j to %s",
    (overrides, expected) => {
      expect(mapInvitationStatus(invitation(overrides))).toBe(expected);
    },
  );
});
