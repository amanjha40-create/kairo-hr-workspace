import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormerEmployeeCorrectionsCard } from "@/components/app/FormerEmployeeCorrectionsCard";
import type {
  FormerEmployeeCorrectionListItem,
  FormerEmployeeCorrectionPage,
  FormerEmployeeCorrectionStatus,
  OrganizationJobRole,
} from "@/lib/api/hr-v2";

interface QueryState {
  data: FormerEmployeeCorrectionPage | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => ({
  approveSpy: vi.fn(),
  rejectSpy: vi.fn(),
  querySpy: vi.fn(),
  results: {} as Record<string, QueryState>,
  roles: [] as OrganizationJobRole[],
}));

vi.mock("@/lib/queries/hr-v2", () => ({
  useFormerEmployeeCorrectionsQuery: (
    orgPublicId: string,
    params: { status: FormerEmployeeCorrectionStatus; page: number; page_size: number },
  ) => {
    mocks.querySpy(orgPublicId, params);
    return mocks.results[params.status];
  },
  useOrganizationJobRolesQuery: () => ({ data: mocks.roles }),
  useApproveFormerEmployeeCorrectionMutation: () => ({
    mutateAsync: mocks.approveSpy,
    isPending: false,
  }),
  useRejectFormerEmployeeCorrectionMutation: () => ({
    mutateAsync: mocks.rejectSpy,
    isPending: false,
  }),
}));

const pendingCorrection: FormerEmployeeCorrectionListItem = {
  public_id: "correction-public-1",
  person: { public_id: "person-public-1", display_name: "Synthetic Former Employee" },
  current_values: { department: "Operations", role_id: "role-public-1" },
  proposed_values: { department: "People Operations", role_id: "role-public-2" },
  reason: "Correct the historical department and role",
  requester: { display_name: "Morgan Member", email: "member@example.com" },
  submitted_at: "2026-10-30T10:00:00Z",
  status: "pending",
  reviewer: null,
  decided_at: null,
  decision_reason: null,
  updated_at: "2026-10-30T10:00:00Z",
};

function page(
  _status: FormerEmployeeCorrectionStatus,
  items: FormerEmployeeCorrectionListItem[] = [],
): FormerEmployeeCorrectionPage {
  return {
    items,
    total: items.length,
    page: 1,
    page_size: 10,
    total_pages: items.length ? 1 : 0,
    offset: 0,
    limit: 10,
  };
}

function queryState(data: FormerEmployeeCorrectionPage): QueryState {
  return {
    data,
    isPending: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  };
}

describe("FormerEmployeeCorrectionsCard", () => {
  beforeEach(() => {
    mocks.approveSpy.mockReset().mockResolvedValue({ status: "approved" });
    mocks.rejectSpy.mockReset().mockResolvedValue({ status: "rejected" });
    mocks.querySpy.mockReset();
    mocks.results.pending = queryState(page("pending", [pendingCorrection]));
    mocks.results.approved = queryState(
      page("approved", [
        {
          ...pendingCorrection,
          status: "approved",
          reviewer: { display_name: "Olivia Owner", email: "owner@example.com" },
          decided_at: "2026-10-30T11:00:00Z",
          decision_reason: "Confirmed against the source record",
        },
      ]),
    );
    mocks.results.rejected = queryState(page("rejected"));
    mocks.roles = [
      { public_id: "role-public-1", name: "Legacy Role" },
      { public_id: "role-public-2", name: "Corrected Role" },
    ] as OrganizationJobRole[];
  });

  it("renders the pending queue and safe correction detail without raw IDs", () => {
    render(<FormerEmployeeCorrectionsCard orgPublicId="org-public-1" />);

    expect(screen.getByText("Synthetic Former Employee")).toBeInTheDocument();
    expect(screen.getByText(/requested by Morgan Member/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Synthetic Former Employee"));

    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.getByText("People Operations")).toBeInTheDocument();
    expect(screen.getByText("Legacy Role")).toBeInTheDocument();
    expect(screen.getByText("Corrected Role")).toBeInTheDocument();
    expect(screen.getAllByText(pendingCorrection.reason)).toHaveLength(2);
    expect(screen.getByText("Morgan Member")).toBeInTheDocument();
    expect(screen.queryByText("role-public-1")).not.toBeInTheDocument();
    expect(screen.queryByText("role-public-2")).not.toBeInTheDocument();
    expect(screen.queryByText("correction-public-1")).not.toBeInTheDocument();
  });

  it("approves through the audited endpoint and refreshes to the Approved filter", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    render(<FormerEmployeeCorrectionsCard orgPublicId="org-public-1" />);

    fireEvent.click(screen.getByText("Synthetic Former Employee"));
    fireEvent.change(screen.getByLabelText("Decision note (optional)"), {
      target: { value: "Verified by HR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(mocks.approveSpy).toHaveBeenCalledWith({
        correctionPublicId: "correction-public-1",
        decisionReason: "Verified by HR",
      }),
    );
    await waitFor(() =>
      expect(mocks.querySpy).toHaveBeenLastCalledWith(
        "org-public-1",
        expect.objectContaining({ status: "approved" }),
      ),
    );
  });

  it("rejects through the audited endpoint and refreshes to the Rejected filter", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    render(<FormerEmployeeCorrectionsCard orgPublicId="org-public-1" />);

    fireEvent.click(screen.getByText("Synthetic Former Employee"));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() =>
      expect(mocks.rejectSpy).toHaveBeenCalledWith({
        correctionPublicId: "correction-public-1",
        decisionReason: undefined,
      }),
    );
    await waitFor(() =>
      expect(mocks.querySpy).toHaveBeenLastCalledWith(
        "org-public-1",
        expect.objectContaining({ status: "rejected" }),
      ),
    );
    expect(screen.getByText("No rejected correction requests")).toBeInTheDocument();
  });

  it("supports authoritative Approved and Rejected server filters", () => {
    render(<FormerEmployeeCorrectionsCard orgPublicId="org-public-1" />);

    fireEvent.click(screen.getByRole("button", { name: "approved" }));
    fireEvent.click(screen.getByText("Synthetic Former Employee"));
    expect(screen.getByText("Olivia Owner")).toBeInTheDocument();
    expect(screen.getByText("Confirmed against the source record")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "rejected" }));
    expect(screen.getByText("No rejected correction requests")).toBeInTheDocument();
  });

  it("shows an authorization-safe error without review controls", () => {
    mocks.results.pending = {
      data: undefined,
      isPending: false,
      isFetching: false,
      error: Object.assign(new Error("Forbidden"), { status: 403 }),
      refetch: vi.fn(),
    };

    render(<FormerEmployeeCorrectionsCard orgPublicId="org-public-1" />);

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("shows a retryable error when the correction queue cannot load", () => {
    const refetch = vi.fn();
    mocks.results.pending = {
      data: undefined,
      isPending: false,
      isFetching: false,
      error: Object.assign(new Error("Backend unavailable"), { status: 503 }),
      refetch,
    };

    render(<FormerEmployeeCorrectionsCard orgPublicId="org-public-1" />);

    expect(screen.getByText("Corrections didn't load")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
