import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePersonDetailRecord } from "@/test/organization-people-fixtures";

const refetchSpy = vi.fn();
const addNoteSpy = vi.fn();
const updateNoteSpy = vi.fn();
const deleteNoteSpy = vi.fn();
const lifecycleMutationSpy = vi.fn();
const profileMutationSpy = vi.fn();
const lifecycleMutationState = {
  isPending: false,
  error: null as unknown,
};
const jobRolesQueryState = {
  data: [] as Array<{
    public_id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    assigned_people_count: number;
    created_at: string;
    updated_at: string;
  }>,
};

const accessState: {
  org: { publicId: string } | null;
  membershipRole: "owner" | "admin" | "member";
  can: (action: string) => boolean;
} = {
  org: { publicId: "org_123" },
  membershipRole: "owner",
  can: (action: string) => action === "modify_person",
};

const detailQueryState = {
  data: makePersonDetailRecord(),
  isPending: false,
  error: null as unknown,
  refetch: refetchSpy,
};

const rosterEmployeesQueryState = {
  data: {
    items: [
      {
        organization_person_id: "person_123",
        roster_data: {
          employee_id: "EMP-123",
          designation: "Software Engineer",
          department: "Engineering",
          joining_date: "2025-01-15",
          exit_date: "2026-08-31",
          employment_status: "active",
        },
      },
    ],
  },
  isPending: false,
  error: null,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (_path: string) => (options: Record<string, unknown>) => ({
    options,
    useParams: () => ({ id: "person_123" }),
  }),
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/app/primitives", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
    </div>
  ),
  SectionCard: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <button onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
  TableSkeleton: () => <div>detail-skeleton</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
  }) =>
    asChild ? (
      <div>{children}</div>
    ) : (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={placeholder ?? "textarea"}
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <select aria-label="Role" value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    value,
    disabled,
  }: {
    children: ReactNode;
    value: string;
    disabled?: boolean;
  }) => (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/app/workspace-pills", () => ({
  ClaimPill: ({ value }: { value: string }) => <span>{value}</span>,
  InvitationPill: ({ value }: { value: string }) => <span>{value}</span>,
  PassportPill: ({ value }: { value: string }) => <span>{value}</span>,
  RelationshipPill: ({ value }: { value: string }) => <span>{value}</span>,
  VerificationPill: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => accessState,
}));

vi.mock("@/lib/queries/organization-people", () => ({
  useOrganizationPersonDetailQuery: () => detailQueryState,
  useAddOrganizationPersonNoteMutation: () => ({ mutateAsync: addNoteSpy, isPending: false }),
  useUpdateOrganizationPersonNoteMutation: () => ({
    mutateAsync: updateNoteSpy,
    isPending: false,
  }),
  useDeleteOrganizationPersonNoteMutation: () => ({
    mutateAsync: deleteNoteSpy,
    isPending: false,
  }),
}));

vi.mock("@/lib/queries/organization-roster-imports", () => ({
  useRosterEmployeesQuery: () => rosterEmployeesQueryState,
}));

vi.mock("@/lib/queries/hr-v2", () => ({
  useEmployeeLifecycleMutation: () => ({
    mutateAsync: lifecycleMutationSpy,
    isPending: lifecycleMutationState.isPending,
    error: lifecycleMutationState.error,
    reset: vi.fn(),
  }),
  useEmploymentProfileMutation: () => ({
    mutateAsync: profileMutationSpy,
    isPending: false,
    error: null,
  }),
  useOrganizationJobRolesQuery: () => ({ ...jobRolesQueryState, isPending: false }),
}));

const { Route } = await import("../../routes/app.people.$id");
const PersonDetail = Route.options.component as ComponentType;

describe("Person detail page", () => {
  beforeEach(() => {
    refetchSpy.mockReset();
    addNoteSpy.mockReset();
    updateNoteSpy.mockReset();
    deleteNoteSpy.mockReset();
    lifecycleMutationSpy.mockReset();
    profileMutationSpy.mockReset();
    lifecycleMutationSpy.mockResolvedValue({ employment_status: "ex_employee" });
    lifecycleMutationState.isPending = false;
    lifecycleMutationState.error = null;
    jobRolesQueryState.data = [
      {
        public_id: "role_software_engineer",
        name: "Software Engineer",
        description: null,
        is_active: true,
        assigned_people_count: 1,
        created_at: "2026-07-01T00:00:00Z",
        updated_at: "2026-07-01T00:00:00Z",
      },
      {
        public_id: "role_engineering_manager",
        name: "Engineering Manager",
        description: null,
        is_active: true,
        assigned_people_count: 0,
        created_at: "2026-07-01T00:00:00Z",
        updated_at: "2026-07-01T00:00:00Z",
      },
    ];
    accessState.org = { publicId: "org_123" };
    accessState.membershipRole = "owner";
    accessState.can = (action: string) => action === "modify_person";
    detailQueryState.data = makePersonDetailRecord();
    detailQueryState.isPending = false;
    detailQueryState.error = null;
    rosterEmployeesQueryState.data.items[0].roster_data.employment_status = "active";
  });

  it("renders a loading state while the backend person detail is pending", () => {
    detailQueryState.isPending = true;
    detailQueryState.data = undefined as never;

    render(<PersonDetail />);

    expect(screen.getByText("detail-skeleton")).toBeInTheDocument();
  });

  it("renders backend person detail tabs and content", () => {
    render(<PersonDetail />);

    expect(screen.getAllByText("Aman Joshi").length).toBeGreaterThan(0);
    expect(screen.getByText("offer-letter.pdf")).toBeInTheDocument();
    expect(screen.getByText("Strong match on submitted evidence.")).toBeInTheDocument();
    expect(screen.getByText(/organization-provided · not KairoID-verified/i)).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Reference Checks")).toBeInTheDocument();
    expect(screen.getByText("Shared Evidence")).toBeInTheDocument();
    expect(screen.getByText("Internal Notes")).toBeInTheDocument();
    expect(screen.queryByText("Shared Trust Passport")).not.toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getAllByText("View Verification Report").length).toBeGreaterThan(0);
  });

  it("shows authoritative former-employee status and last working day", () => {
    detailQueryState.data = makePersonDetailRecord({
      relationship: "Former Employee",
      employmentStatus: "ex_employee",
      lastWorkingDay: "2026-08-31",
    });
    rosterEmployeesQueryState.data.items[0].roster_data.employment_status = "former";

    render(<PersonDetail />);

    expect(screen.getAllByText("Former Employee").length).toBeGreaterThan(0);
    expect(screen.getByText("Aug 31, 2026")).toBeInTheDocument();
  });

  it("requires and submits Last Working Day for the canonical lifecycle mutation", async () => {
    render(<PersonDetail />);
    fireEvent.click(screen.getByText("Mark as ex-employee"));

    expect(screen.getByText("Confirm ex-employee")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Last working day"), {
      target: { value: "2026-10-18" },
    });
    fireEvent.click(screen.getByText("Confirm ex-employee"));

    await waitFor(() =>
      expect(lifecycleMutationSpy).toHaveBeenCalledWith({
        orgPublicId: "org_123",
        personPublicId: "person_123",
        lastWorkingDay: "2026-10-18",
      }),
    );
  });

  it("rejects a future Last Working Day before calling the backend", () => {
    render(<PersonDetail />);
    fireEvent.click(screen.getByText("Mark as ex-employee"));
    fireEvent.change(screen.getByLabelText("Last working day"), {
      target: { value: "2999-01-01" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/cannot be in the future/i);
    expect(screen.getByText("Confirm ex-employee")).toBeDisabled();
    expect(lifecycleMutationSpy).not.toHaveBeenCalled();
  });

  it("renders backend lifecycle validation without losing retained-history guidance", () => {
    lifecycleMutationState.error = Object.assign(new Error("Last Working Day is invalid"), {
      status: 422,
    });

    render(<PersonDetail />);
    fireEvent.click(screen.getByText("Mark as ex-employee"));

    expect(screen.getByRole("alert")).toHaveTextContent("Last Working Day is invalid");
    expect(screen.getByText(/preserves all verification history/i)).toBeInTheDocument();
  });

  it("does not expose an unsupported reactivation action", () => {
    detailQueryState.data = makePersonDetailRecord({
      relationship: "Former Employee",
      employmentStatus: "ex_employee",
      lastWorkingDay: "2026-08-31",
    });

    render(<PersonDetail />);

    expect(screen.queryByText(/reactivate/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Mark as ex-employee")).not.toBeInTheDocument();
  });

  it("omits an unchanged inactive historical role while patching employment metadata", async () => {
    detailQueryState.data = makePersonDetailRecord({
      roleId: "role_historical",
      role: "Historical Role",
      department: "Operations",
      joiningDate: "2025-01-15",
    });
    jobRolesQueryState.data = [
      ...jobRolesQueryState.data,
      {
        public_id: "role_historical",
        name: "Historical Role",
        description: null,
        is_active: false,
        assigned_people_count: 1,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    render(<PersonDetail />);
    fireEvent.click(screen.getByText("Edit employment"));
    expect(screen.getByRole("option", { name: "Historical Role (inactive)" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "People Operations" },
    });
    fireEvent.click(screen.getByText("Save profile"));

    await waitFor(() => {
      expect(profileMutationSpy).toHaveBeenCalledWith({
        orgPublicId: "org_123",
        personPublicId: "person_123",
        payload: {
          department: "People Operations",
          joining_date: "2025-01-15",
        },
      });
      expect(profileMutationSpy.mock.calls[0]?.[0].payload).not.toHaveProperty("role_id");
    });
  });

  it("sends a newly selected active role", async () => {
    render(<PersonDetail />);
    fireEvent.click(screen.getByText("Edit employment"));
    fireEvent.change(screen.getByRole("combobox", { name: "Role" }), {
      target: { value: "role_engineering_manager" },
    });
    fireEvent.click(screen.getByText("Save profile"));

    await waitFor(() =>
      expect(profileMutationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ role_id: "role_engineering_manager" }),
        }),
      ),
    );
  });

  it("sends null when the user explicitly clears the role", async () => {
    render(<PersonDetail />);
    fireEvent.click(screen.getByText("Edit employment"));
    fireEvent.change(screen.getByRole("combobox", { name: "Role" }), {
      target: { value: "unassigned" },
    });
    fireEvent.click(screen.getByText("Save profile"));

    await waitFor(() =>
      expect(profileMutationSpy).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ role_id: null }) }),
      ),
    );
  });

  it("does not offer an unrelated inactive role for a new assignment", () => {
    detailQueryState.data = makePersonDetailRecord({ roleId: null, role: null });
    jobRolesQueryState.data = [
      ...jobRolesQueryState.data,
      {
        public_id: "role_inactive",
        name: "Inactive Role",
        description: null,
        is_active: false,
        assigned_people_count: 0,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    render(<PersonDetail />);
    fireEvent.click(screen.getByText("Edit employment"));

    expect(screen.queryByRole("option", { name: /Inactive Role/ })).not.toBeInTheDocument();
  });

  it("preserves the restricted passport state from backend detail", () => {
    detailQueryState.data = makePersonDetailRecord({
      passportStatus: "Not Shared",
      passportPreview: {
        status: "Not Shared",
        sharedAt: null,
        expiresAt: null,
        revokedAt: null,
        permissions: {},
        claims: [],
      },
    });

    render(<PersonDetail />);

    expect(
      screen.getByText("This candidate hasn't shared a Trust Passport yet"),
    ).toBeInTheDocument();
  });

  it("shows retry on backend error and refetches the detail query", () => {
    detailQueryState.error = Object.assign(new Error("Backend unavailable"), { status: 500 });

    render(<PersonDetail />);
    fireEvent.click(screen.getByText("Retry"));

    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it("blocks access when people permission is missing", () => {
    accessState.can = () => false;

    render(<PersonDetail />);

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });
});
