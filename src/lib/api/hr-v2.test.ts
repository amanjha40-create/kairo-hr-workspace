import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptTeamInvitationByToken,
  createOrganizationJobRole,
  deactivateOrganizationJobRole,
  getOrganizationLogo,
  getOrganizationVerificationPreferences,
  getStructuredVerificationReport,
  getTeamInvitationByToken,
  listOrganizationJobRoles,
  removeOrganizationLogo,
  updateEmployeeLifecycle,
  updateEmploymentProfile,
  updateOrganizationJobRole,
  updateOrganizationVerificationPreferences,
  uploadOrganizationLogo,
} from "@/lib/api/hr-v2";
import {
  createOrganizationInvitation,
  resendOrganizationInvitation,
} from "@/lib/api/organization-members";

const fetchSpy = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("HR V2 certified API contracts", () => {
  beforeEach(() => {
    fetchSpy.mockReset();
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("sends the atomic ex-employee lifecycle payload", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        person_public_id: "person-1",
        employment_status: "ex_employee",
        last_working_day: "2026-10-18",
        updated_at: "2026-10-18T10:00:00Z",
      }),
    );

    await updateEmployeeLifecycle("org-1", "person-1", "2026-10-18");

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/organizations/org-1/people/person-1/lifecycle",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          employment_status: "ex_employee",
          last_working_day: "2026-10-18",
        }),
      }),
    );
  });

  it("uses canonical role and employment-profile endpoints", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ public_id: "role-1", name: "QA Executive" }, 201))
      .mockResolvedValueOnce(
        jsonResponse({ person_public_id: "person-1", role_id: "role-1", role: "QA Executive" }),
      );

    await createOrganizationJobRole("org-1", { name: "QA Executive" });
    await updateEmploymentProfile("org-1", "person-1", {
      role_id: "role-1",
      department: "Quality",
      joining_date: "2026-10-01",
    });

    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      "http://localhost:8000/api/v1/organizations/org-1/job-roles",
    );
    expect(fetchSpy.mock.calls[1]?.[0]).toBe(
      "http://localhost:8000/api/v1/organizations/org-1/people/person-1/employment-profile",
    );
  });

  it("lists, edits, and safely deactivates organization roles", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ public_id: "role-1", name: "Lead Engineer" }))
      .mockResolvedValueOnce(
        jsonResponse({ public_id: "role-1", name: "Lead Engineer", is_active: false }),
      );

    await listOrganizationJobRoles("org-1");
    await updateOrganizationJobRole("org-1", "role-1", { name: "Lead Engineer" });
    await deactivateOrganizationJobRole("org-1", "role-1");

    expect(fetchSpy.mock.calls.map((call) => [call[0], call[1]?.method ?? "GET"])).toEqual([
      ["http://localhost:8000/api/v1/organizations/org-1/job-roles", "GET"],
      ["http://localhost:8000/api/v1/organizations/org-1/job-roles/role-1", "PATCH"],
      ["http://localhost:8000/api/v1/organizations/org-1/job-roles/role-1", "DELETE"],
    ]);
  });

  it("uses presigned upload then confirms without sending a caller-owned object key", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse(
          {
            upload_id: "upload-1",
            upload_url: "https://uploads.example/logo",
            expires_in_seconds: 300,
            headers_required: { "Content-Type": "image/png" },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        jsonResponse({ has_logo: true, display_url: "https://signed.example/logo" }),
      );
    const file = new File(["png"], "logo.png", { type: "image/png" });

    await uploadOrganizationLogo("org-1", file);

    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toEqual({
      content_type: "image/png",
      byte_size: 3,
    });
    expect(fetchSpy.mock.calls[1]?.[0]).toBe("https://uploads.example/logo");
    expect(JSON.parse(String(fetchSpy.mock.calls[2]?.[1]?.body))).toEqual({
      upload_id: "upload-1",
    });
  });

  it("updates organization defaults and reads the authoritative report endpoint", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ version: 1, checks: {}, reference_count: 0 }))
      .mockResolvedValueOnce(jsonResponse({ schema_version: "hr_verification_report_v1" }));

    await updateOrganizationVerificationPreferences("org-1", {
      checks: {
        identity: true,
        employment: true,
        education: false,
        references: false,
        address: false,
      },
      reference_count: 0,
    });
    await getStructuredVerificationReport("org-1", "person-1");

    expect(fetchSpy.mock.calls[0]?.[0]).toContain("/verification-preferences");
    expect(fetchSpy.mock.calls[1]?.[0]).toContain("/people/person-1/verification-report");
  });

  it("reads/removes logos, reads preferences, and uses create/resend team routes", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ has_logo: true }))
      .mockResolvedValueOnce(jsonResponse({ has_logo: false }))
      .mockResolvedValueOnce(jsonResponse({ version: 1, checks: {}, reference_count: 0 }))
      .mockResolvedValueOnce(jsonResponse({ public_id: "invite-1" }, 201))
      .mockResolvedValueOnce(jsonResponse({ public_id: "invite-1", last_sent_at: "now" }));

    await getOrganizationLogo("org-1");
    await removeOrganizationLogo("org-1");
    await getOrganizationVerificationPreferences("org-1");
    await createOrganizationInvitation("org-1", {
      invitee_email: "recipient@example.com",
      role: "reviewer",
    });
    await resendOrganizationInvitation("org-1", "invite-1");

    expect(fetchSpy.mock.calls.map((call) => [call[0], call[1]?.method ?? "GET"])).toEqual([
      ["http://localhost:8000/api/v1/organizations/org-1/logo", "GET"],
      ["http://localhost:8000/api/v1/organizations/org-1/logo", "DELETE"],
      ["http://localhost:8000/api/v1/organizations/org-1/verification-preferences", "GET"],
      ["http://localhost:8000/api/v1/organizations/org-1/invitations", "POST"],
      ["http://localhost:8000/api/v1/organizations/org-1/invitations/invite-1/resend", "POST"],
    ]);
  });

  it("uses the opaque token routes for public lookup and authenticated acceptance", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse({
          organization_name: "Acme",
          invited_role: "member",
          status: "pending",
          expires_at: "2026-10-25T00:00:00Z",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          organization_public_id: "org-1",
          membership_public_id: "member-1",
          role: "member",
          accepted_at: "2026-10-18T10:00:00Z",
        }),
      );

    await getTeamInvitationByToken("opaque-token-value");
    await acceptTeamInvitationByToken("opaque-token-value");

    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      "http://localhost:8000/api/v1/workspace/team-invitations/opaque-token-value",
      "http://localhost:8000/api/v1/workspace/team-invitations/opaque-token-value/accept",
    ]);
  });
});
