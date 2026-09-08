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
    expect(screen.getByText("Duplicate employee ID")).toBeInTheDocument();
    expect(screen.getByText("Employee name is required")).toBeInTheDocument();
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
    const confirmButton = await screen.findByRole("button", { name: "Confirm import" });

    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    resolveConfirm?.(makeRosterPreview({ state: "completed" }));
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

    expect(screen.getByText("Employee import complete")).toBeInTheDocument();
    expect(screen.getByText(/not Kairo-verified/i)).toBeInTheDocument();
    expect(screen.getByText("Import Completed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /download error report/i }));
    expect(downloadSpy).toHaveBeenCalledWith({
      orgPublicId: "org-1",
      importId: detailState.data.import_id,
    });
  });

  it("fails closed for non-manager memberships", () => {
    accessState.membershipRole = "member";
    render(<EmployeeRosterImportDetail importId={makeRosterPreview().import_id} />);
    expect(screen.getByText("Permission denied")).toBeInTheDocument();
    expect(screen.queryByText("Map your columns")).not.toBeInTheDocument();
  });
});
