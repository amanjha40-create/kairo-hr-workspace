import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationRolesCard } from "@/components/app/OrganizationRolesCard";
import { ApiError } from "@/lib/api/client";
import type { OrganizationJobRole } from "@/lib/api/hr-v2";

const createSpy = vi.fn();
const updateSpy = vi.fn();
const deactivateSpy = vi.fn();
const approveSpy = vi.fn();
const rejectSpy = vi.fn();
const { toastErrorSpy } = vi.hoisted(() => ({ toastErrorSpy: vi.fn() }));
const activeRole: OrganizationJobRole = {
  public_id: "role-1",
  name: "Software Engineer",
  description: null,
  department: null,
  location: null,
  work_mode: null,
  status: "active",
  created_by_user_id: "user-1",
  approved_by_user_id: "user-1",
  approved_at: "2026-10-18T00:00:00Z",
  rejected_at: null,
  archived_at: null,
  is_active: true,
  assigned_people_count: 42,
  created_at: "2026-10-18T00:00:00Z",
  updated_at: "2026-10-18T00:00:00Z",
};
const rolesQuery: {
  data: OrganizationJobRole[];
  isPending: boolean;
  error: unknown;
  refetch: ReturnType<typeof vi.fn>;
} = {
  data: [activeRole],
  isPending: false,
  error: null as unknown,
  refetch: vi.fn(),
};

vi.mock("@/lib/queries/hr-v2", () => ({
  useOrganizationJobRolesQuery: () => rolesQuery,
  useCreateOrganizationJobRoleMutation: () => ({ mutateAsync: createSpy, isPending: false }),
  useUpdateOrganizationJobRoleMutation: () => ({ mutateAsync: updateSpy, isPending: false }),
  useDeactivateOrganizationJobRoleMutation: () => ({
    mutateAsync: deactivateSpy,
    isPending: false,
  }),
  useApproveOrganizationJobRoleMutation: () => ({ mutateAsync: approveSpy, isPending: false }),
  useRejectOrganizationJobRoleMutation: () => ({ mutateAsync: rejectSpy, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: toastErrorSpy },
}));

describe("OrganizationRolesCard", () => {
  beforeEach(() => {
    createSpy.mockReset();
    updateSpy.mockReset();
    deactivateSpy.mockReset();
    approveSpy.mockReset();
    rejectSpy.mockReset();
    toastErrorSpy.mockReset();
    createSpy.mockResolvedValue({ public_id: "role-2", status: "active" });
    updateSpy.mockResolvedValue({ public_id: "role-1" });
    deactivateSpy.mockResolvedValue({ is_active: false });
    approveSpy.mockResolvedValue({ ...activeRole, status: "active" });
    rejectSpy.mockResolvedValue({ ...activeRole, status: "rejected" });
    rolesQuery.data = [activeRole];
  });

  it("shows backend organization-wide counts and creates a role", async () => {
    render(<OrganizationRolesCard orgPublicId="org-1" canManage />);

    expect(screen.getByText("42")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Create role"));
    fireEvent.change(screen.getByLabelText("Role name"), { target: { value: "QA Executive" } });
    fireEvent.click(screen.getAllByText("Create role").at(-1)!);

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith({
        name: "QA Executive",
        description: null,
        department: null,
        location: null,
        work_mode: null,
        mode: "submit",
      }),
    );
  });

  it("deactivates safely while preserving assignments", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    render(<OrganizationRolesCard orgPublicId="org-1" canManage />);
    fireEvent.click(screen.getByText("Deactivate"));
    await waitFor(() => expect(deactivateSpy).toHaveBeenCalledWith("role-1"));
  });

  it("edits a role through the canonical update mutation", async () => {
    render(<OrganizationRolesCard orgPublicId="org-1" canManage />);
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(screen.getByLabelText("Role name"), {
      target: { value: "Senior Software Engineer" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Platform role" },
    });
    fireEvent.click(screen.getByText("Save role"));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith({
        rolePublicId: "role-1",
        payload: {
          name: "Senior Software Engineer",
          description: "Platform role",
          department: null,
          location: null,
          work_mode: null,
        },
      }),
    );
  });

  it("surfaces the backend duplicate-role error", async () => {
    createSpy.mockRejectedValueOnce(
      new ApiError({ status: 409, code: "duplicate_role", message: "Role already exists" }),
    );
    render(<OrganizationRolesCard orgPublicId="org-1" canManage />);
    fireEvent.click(screen.getByText("Create role"));
    fireEvent.change(screen.getByLabelText("Role name"), {
      target: { value: "software engineer" },
    });
    fireEvent.click(screen.getAllByText("Create role").at(-1)!);

    await waitFor(() => expect(toastErrorSpy).toHaveBeenCalledWith("Role already exists"));
  });

  it("hides role-management controls from non-managers", () => {
    render(<OrganizationRolesCard orgPublicId="org-1" canCreate={false} canManage={false} />);
    expect(screen.queryByText("Create role")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Deactivate")).not.toBeInTheDocument();
  });

  it("shows a Member proposal as pending approval", async () => {
    createSpy.mockResolvedValueOnce({
      ...activeRole,
      public_id: "role-2",
      status: "pending_approval",
      is_active: false,
    });
    render(<OrganizationRolesCard orgPublicId="org-1" canCreate canManage={false} />);

    fireEvent.click(screen.getByText("Create role"));
    expect(screen.getByText(/remain Pending approval/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Role name"), { target: { value: "QA Executive" } });
    fireEvent.click(screen.getAllByText("Create role").at(-1)!);

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ mode: "submit" })),
    );
    expect(approveSpy).not.toHaveBeenCalled();
  });

  it("lets an Owner or Admin approve and reject pending Hiring Roles", async () => {
    rolesQuery.data = [{ ...activeRole, status: "pending_approval", is_active: false }];
    render(<OrganizationRolesCard orgPublicId="org-1" canManage />);

    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => expect(approveSpy).toHaveBeenCalledWith("role-1"));
    fireEvent.click(screen.getByText("Reject"));
    await waitFor(() => expect(rejectSpy).toHaveBeenCalledWith({ rolePublicId: "role-1" }));
  });
});
