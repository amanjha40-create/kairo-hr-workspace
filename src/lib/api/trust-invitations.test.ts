import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTrustInvitationDraft } from "@/lib/api/trust-invitations";

const fetchSpy = vi.fn();

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Trust Invitation draft API contract", () => {
  beforeEach(() => {
    fetchSpy.mockReset();
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("patches the canonical by-id route with immutable requirement structure", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ public_id: "invitation-1", status: "draft" }));

    await updateTrustInvitationDraft("invitation-1", {
      subject_name: "Aman Joshi",
      role_id: "role-1",
      requirements: [
        {
          requirement_type: "identity",
          mandatory: true,
          configuration: {},
        },
      ],
      message: "Please complete the requested checks.",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/trust-invitations/by-id/invitation-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          subject_name: "Aman Joshi",
          role_id: "role-1",
          requirements: [
            {
              requirement_type: "identity",
              mandatory: true,
              configuration: {},
            },
          ],
          message: "Please complete the requested checks.",
        }),
      }),
    );
  });
});
