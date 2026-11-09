import { describe, expect, it } from "vitest";
import { makeTrustInvitationRecord } from "@/test/trust-invitation-fixtures";
import { matchesUiStatusFilter } from "@/lib/trust-invitations";

describe("Trust Invitation status filtering", () => {
  it("treats Accepted as the backend accepted lifecycle set", () => {
    const inProgress = makeTrustInvitationRecord({
      status: "In progress",
      backendStatus: "accepted",
    });
    const completed = makeTrustInvitationRecord({
      status: "Completed",
      backendStatus: "accepted",
      lifecycleState: "completed",
    });

    expect(matchesUiStatusFilter(inProgress, "Accepted")).toBe(true);
    expect(matchesUiStatusFilter(completed, "Accepted")).toBe(true);
  });

  it("keeps lifecycle-specific filters exact", () => {
    const inProgress = makeTrustInvitationRecord({
      status: "In progress",
      backendStatus: "accepted",
    });
    const completed = makeTrustInvitationRecord({
      status: "Completed",
      backendStatus: "accepted",
      lifecycleState: "completed",
    });

    expect(matchesUiStatusFilter(inProgress, "In progress")).toBe(true);
    expect(matchesUiStatusFilter(completed, "In progress")).toBe(false);
    expect(matchesUiStatusFilter(completed, "Completed")).toBe(true);
  });
});
