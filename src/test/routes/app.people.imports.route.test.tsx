import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RosterImportListResponse } from "@/lib/api/organization-roster-imports";
import { makeRosterPreview, makeRosterSummary } from "@/test/organization-roster-fixtures";
import { EmployeeRosterImportPage } from "@/components/app/roster/EmployeeRosterImportPage";

const navigateSpy = vi.fn();
const uploadSpy = vi.fn();
const refetchSpy = vi.fn();
const accessState = {
  org: { publicId: "org-1" } as { publicId: string } | null,
  membershipRole: "owner" as "owner" | "admin" | "member",
};
const historyState = {
  data: {
    items: [makeRosterSummary()],
    total: 1,
    page: 1,
    page_size: 20,
    total_pages: 1,
    offset: 0,
    limit: 20,
  } as RosterImportListResponse | undefined,
  isPending: false,
  error: null as unknown,
  refetch: refetchSpy,
};
const uploadState = {
  mutateAsync: uploadSpy,
  isPending: false,
  error: null as unknown,
};

function makeHistory(): RosterImportListResponse {
  return {
    items: [makeRosterSummary()],
    total: 1,
    page: 1,
    page_size: 20,
    total_pages: 1,
    offset: 0,
    limit: 20,
  };
}

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => navigateSpy,
}));

vi.mock("@/lib/access-context", () => ({ useAccess: () => accessState }));
vi.mock("@/lib/queries/organization-roster-imports", () => ({
  useRosterImportsQuery: () => historyState,
  useUploadEmployeeRosterMutation: () => uploadState,
}));

describe("employee roster import landing", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    uploadSpy.mockReset();
    uploadSpy.mockResolvedValue(makeRosterPreview());
    refetchSpy.mockReset();
    accessState.org = { publicId: "org-1" };
    accessState.membershipRole = "owner";
    historyState.data = makeHistory();
    historyState.isPending = false;
    historyState.error = null;
    uploadState.isPending = false;
    uploadState.error = null;
  });

  it.each(["employees.csv", "employees.xlsx"])(
    "uploads a supported %s roster and navigates to backend detail",
    async (filename) => {
      const user = userEvent.setup();
      render(<EmployeeRosterImportPage />);
      const file = new File(["employee_id,full_name\n1,Ada"], filename);

      await user.upload(screen.getByLabelText("Choose employee roster file"), file);
      await user.click(screen.getByRole("button", { name: /upload and preview/i }));

      await waitFor(() => expect(uploadSpy).toHaveBeenCalledWith({ orgPublicId: "org-1", file }));
      expect(navigateSpy).toHaveBeenCalledWith({
        to: "/app/people/imports/$id",
        params: { id: makeRosterPreview().import_id },
      });
    },
  );

  it("rejects unsupported and oversized files before upload", async () => {
    const user = userEvent.setup();
    render(<EmployeeRosterImportPage />);
    const input = screen.getByLabelText("Choose employee roster file");

    fireEvent.change(input, { target: { files: [new File(["x"], "employees.pdf")] } });
    expect(screen.getByText("Choose a CSV or XLSX file.")).toBeInTheDocument();
    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array(5_000_001)], "employees.csv")] },
    });
    expect(screen.getByText("The file must be 5 MB or smaller.")).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /upload and preview/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /upload and preview/i }));
  });

  it("renders backend import history and the organization-provided disclaimer", () => {
    render(<EmployeeRosterImportPage />);
    expect(screen.getByText("employees.csv")).toBeInTheDocument();
    expect(screen.getByText("Ready for review")).toBeInTheDocument();
    expect(screen.getByText(/not verified or approved by Kairo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download template/i })).toBeDisabled();
  });

  it("fails closed for non-manager memberships", () => {
    accessState.membershipRole = "member";
    render(<EmployeeRosterImportPage />);
    expect(screen.getByText("Permission denied")).toBeInTheDocument();
    expect(screen.queryByText("Upload employee roster")).not.toBeInTheDocument();
  });
});
