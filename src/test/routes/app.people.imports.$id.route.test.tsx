import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationRosterPreview } from "@/lib/api/organization-roster-imports";
import { EmployeeRosterImportDetail } from "@/components/app/roster/EmployeeRosterImportDetail";
import { makeRosterPreview, rosterRows } from "@/test/organization-roster-fixtures";

const updateMappingSpy = vi.fn();
const confirmSpy = vi.fn();
const downloadSpy = vi.fn();
const detailRefetchSpy = vi.fn();
const rowsRefetchSpy = vi.fn();
const { trackEventSpy } = vi.hoisted(() => ({ trackEventSpy: vi.fn() }));
const accessState = {
  org: { publicId: "org-1" } as { publicId: string } | null,
  membershipRole: "owner" as "owner" | "admin" | "member",
};
const detailState = {
  data: makeRosterPreview() as OrganizationRosterPreview | undefined,
  isPending: false,
  error: null as unknown,
  refetch: detailRefetchSpy,
};
const rowsState = {
  data: {
    items: rosterRows,
    total: rosterRows.length,
    page: 1,
    page_size: 20,
    total_pages: 1,
    offset: 0,
    limit: 20,
  },
  isPending: false,
  error: null as unknown,
  refetch: rowsRefetchSpy,
};
const mappingMutation = { mutateAsync: updateMappingSpy, isPending: false, error: null as unknown };
const confirmMutation = { mutateAsync: confirmSpy, isPending: false, error: null as unknown };
const downloadMutation = { mutateAsync: downloadSpy, isPending: false, error: null as unknown };

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/lib/access-context", () => ({ useAccess: () => accessState }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackEventSpy }));
vi.mock("@/lib/queries/organization-roster-imports", () => ({
  useRosterImportDetailQuery: () => detailState,
  useRosterImportRowsQuery: () => rowsState,
  useUpdateRosterMappingMutation: () => mappingMutation,
  useConfirmRosterImportMutation: () => confirmMutation,
  useDownloadRosterErrorsMutation: () => downloadMutation,
}));

describe("employee roster import detail", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => {},
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: () => {},
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: () => {},
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:errors"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    updateMappingSpy.mockReset();
    updateMappingSpy.mockResolvedValue(makeRosterPreview());
    confirmSpy.mockReset();
    confirmSpy.mockResolvedValue(makeRosterPreview({ state: "completed" }));
    downloadSpy.mockReset();
    downloadSpy.mockResolvedValue("row_number,error_code\n4,missing_name");
    detailRefetchSpy.mockReset();
    rowsRefetchSpy.mockReset();
    accessState.org = { publicId: "org-1" };
    accessState.membershipRole = "owner";
    detailState.data = makeRosterPreview();
    detailState.isPending = false;
    detailState.error = null;
    rowsState.isPending = false;
    rowsState.error = null;
    mappingMutation.isPending = false;
    mappingMutation.error = null;
    confirmMutation.isPending = false;
    confirmMutation.error = null;
    downloadMutation.isPending = false;
    downloadMutation.error = null;
    trackEventSpy.mockReset();
  });

  it("renders backend auto-mapping and persists a manual correction", async () => {
    const user = userEvent.setup();
    render(<EmployeeRosterImportDetail importId={makeRosterPreview().import_id} />);

    expect(screen.getAllByText("Auto-mapped")).toHaveLength(3);
    const departmentSelect = screen.getByRole("combobox", { name: "Map Department" });
    await user.click(departmentSelect);
    await user.click(await screen.findByRole("option", { name: "Designation" }));
    await user.click(screen.getByRole("button", { name: /continue to preview/i }));

    await waitFor(() => expect(updateMappingSpy).toHaveBeenCalledTimes(1));
    expect(updateMappingSpy.mock.calls[0][0].assignments).toContainEqual({
      source_column: "department",
      canonical_field: "designation",
    });
    expect(trackEventSpy).toHaveBeenCalledWith("roster_mapping_updated", {
      roster_type: "employee",
      mapped_columns: 3,
      state: "ready_for_review",
    });
  });

  it("persists an ignored source column as null", async () => {
    const user = userEvent.setup();
    render(<EmployeeRosterImportDetail importId={makeRosterPreview().import_id} />);

    await user.click(screen.getByRole("combobox", { name: "Map Department" }));
    await user.click(await screen.findByRole("option", { name: "Ignore this column" }));
    await user.click(screen.getByRole("button", { name: /continue to preview/i }));

    await waitFor(() => expect(updateMappingSpy).toHaveBeenCalledTimes(1));
    expect(updateMappingSpy.mock.calls[0][0].assignments).toContainEqual({
      source_column: "department",
      canonical_field: null,
    });
  });

  it("blocks incomplete required mappings", () => {
    detailState.data = makeRosterPreview({
      state: "mapping_required",
      mapping: {
        ...makeRosterPreview().mapping,
        mappings: { full_name: "full_name" },
        missing_required_mappings: ["identity"],
      },
    });
    render(<EmployeeRosterImportDetail importId={detailState.data.import_id} />);

    expect(screen.getByText(/map an employee ID or work email to continue/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue to preview/i })).toBeDisabled();
    expect(updateMappingSpy).not.toHaveBeenCalled();
  });

  it("renders preview counts, duplicate rows and invalid-row messages", async () => {
    const user = userEvent.setup();
    render(<EmployeeRosterImportDetail importId={makeRosterPreview().import_id} />);
    await user.click(screen.getByRole("button", { name: /continue to preview/i }));

    expect(await screen.findByText("Review employee preview")).toBeInTheDocument();
    expect(screen.getByText("Duplicates").parentElement).toHaveTextContent("Duplicates1");
    expect(screen.getAllByText("Invalid")[0].parentElement).toHaveTextContent("Invalid1");
    expect(screen.getAllByText("New").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Update").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Skipped").length).toBeGreaterThan(0);
    expect(screen.getByText("Duplicate employee ID")).toBeInTheDocument();
    expect(screen.getByText("Employee name is required")).toBeInTheDocument();
  });

  it("renders authoritative mapping API failures", () => {
    mappingMutation.error = new Error("The mapping conflicts with another source column.");
    render(<EmployeeRosterImportDetail importId={makeRosterPreview().import_id} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The mapping conflicts with another source column.",
    );
  });

  it("dispatches confirmation only once for duplicate clicks", async () => {
    const user = userEvent.setup();
    let resolveConfirm: ((value: OrganizationRosterPreview) => void) | undefined;
    confirmSpy.mockReturnValue(
      new Promise<OrganizationRosterPreview>((resolve) => {
        resolveConfirm = resolve;
      }),
    );
    render(<EmployeeRosterImportDetail importId={makeRosterPreview().import_id} />);
    await user.click(screen.getByRole("button", { name: /continue to preview/i }));
    await user.click(screen.getByRole("button", { name: "Confirm employee import" }));
    const confirmButton = await screen.findByRole("button", { name: "Import Employees" });

    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(trackEventSpy).toHaveBeenCalledWith("roster_confirm_clicked", {
      roster_type: "employee",
      valid_new: 2,
      valid_update: 1,
      attention: 2,
    });
    resolveConfirm?.(makeRosterPreview({ state: "completed" }));
  });

  it("shows exact confirmation counts and a truthful confirm failure", async () => {
    const user = userEvent.setup();
    confirmMutation.error = new Error("This import was already finalized.");
    render(<EmployeeRosterImportDetail importId={makeRosterPreview().import_id} />);
    await user.click(screen.getByRole("button", { name: /continue to preview/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("This import was already finalized.");
    await user.click(screen.getByRole("button", { name: "Confirm employee import" }));

    expect(screen.getByText(/2 new employees will be added/i)).toBeInTheDocument();
    expect(screen.getByText(/1 existing employee will be updated/i)).toBeInTheDocument();
    expect(screen.getByText(/2 rows will not be imported/i)).toBeInTheDocument();
  });

  it("renders completion metrics, audit events and downloads the backend error CSV", async () => {
    const user = userEvent.setup();
    detailState.data = makeRosterPreview({
      state: "completed_with_errors",
      completed_at: "2026-09-09T08:05:00Z",
      counts: {
        ...makeRosterPreview().counts,
        created: 2,
        updated: 1,
        failed: 1,
      },
      audit_events: [
        {
          event_id: "event-1",
          action: "roster_import_completed",
          organization_person_id: null,
          row_id: null,
          metadata: {},
          created_at: "2026-09-09T08:05:00Z",
        },
      ],
    });
    render(<EmployeeRosterImportDetail importId={detailState.data.import_id} />);

    expect(screen.getByText("Import completed with issues")).toBeInTheDocument();
    expect(screen.getByText("Import results")).toBeInTheDocument();
    expect(screen.getByText(/not Kairo-verified/i)).toBeInTheDocument();
    expect(screen.getByText("Import Completed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /download error report/i }));
    expect(downloadSpy).toHaveBeenCalledWith({
      orgPublicId: "org-1",
      importId: detailState.data.import_id,
    });
    expect(screen.getByRole("link", { name: /view employees/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view import history/i })).toBeInTheDocument();
    expect(trackEventSpy).toHaveBeenCalledWith("roster_import_completed", {
      roster_type: "employee",
      state: "completed_with_errors",
      created: 2,
      updated: 1,
      attention: 3,
    });
  });

  it("distinguishes successful and failed terminal imports", () => {
    detailState.data = makeRosterPreview({
      state: "completed",
      completed_at: "2026-09-09T08:05:00Z",
    });
    const { rerender } = render(
      <EmployeeRosterImportDetail importId={detailState.data.import_id} />,
    );
    expect(screen.getByText("Import complete")).toBeInTheDocument();

    detailState.data = makeRosterPreview({
      state: "failed",
      failure_message: "No rows could be applied.",
    });
    rerender(<EmployeeRosterImportDetail importId={detailState.data.import_id} />);
    expect(screen.getByText("Import needs attention")).toBeInTheDocument();
    expect(screen.getByText("No rows could be applied.")).toBeInTheDocument();
  });

  it("allows organization admins and never labels imported rows verified", () => {
    accessState.membershipRole = "admin";
    render(<EmployeeRosterImportDetail importId={makeRosterPreview().import_id} />);
    expect(screen.getByText("Map your columns")).toBeInTheDocument();
    expect(screen.queryByText(/^Verified$/)).not.toBeInTheDocument();
  });

  it("fails closed for non-manager memberships", () => {
    accessState.membershipRole = "member";
    render(<EmployeeRosterImportDetail importId={makeRosterPreview().import_id} />);
    expect(screen.getByText("Permission denied")).toBeInTheDocument();
    expect(screen.queryByText("Map your columns")).not.toBeInTheDocument();
  });
});
