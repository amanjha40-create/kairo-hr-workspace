import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { getTeamInvitationErrorState } from "@/lib/team-invitation-acceptance";

describe("team invitation acceptance states", () => {
  it.each([
    [409, "Invitation expired", "Invitation expired"],
    [409, "Invitation revoked", "Invitation revoked"],
    [409, "Invitation already consumed", "Invitation already used"],
    [403, "Invited email mismatch", "Email does not match"],
    [404, "Unknown token", "Invalid invitation"],
  ])("maps %s %s safely", (status, message, title) => {
    expect(
      getTeamInvitationErrorState(new ApiError({ status, code: "invitation_error", message }))
        .title,
    ).toBe(title);
  });

  it("does not leak lookup detail for invalid tokens", () => {
    const state = getTeamInvitationErrorState(
      new ApiError({ status: 404, code: "not_found", message: "email user@example.com missing" }),
    );
    expect(JSON.stringify(state)).not.toContain("user@example.com");
  });
});
