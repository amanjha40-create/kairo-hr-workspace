import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { RosterImportListResponse } from "@/lib/api/organization-roster-imports";
import { makeRosterPreview, makeRosterSummary } from "@/test/organization-roster-fixtures";
import { EmployeeRosterImportPage } from "@/components/app/roster/EmployeeRosterImportPage";

const navigateSpy = vi.fn();
const uploadSpy = vi.fn();
const downloadTemplateSpy = vi.fn();
const refetchSpy = vi.fn();
const createObjectUrlSpy = vi.fn(() => "blob:employee-template");
const revokeObjectUrlSpy = vi.fn();
const anchorClickSpy = vi.fn();
const { trackEventSpy } = vi.hoisted(() => ({ trackEventSpy: vi.fn() }));
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
const downloadTemplateState = {
  mutateAsync: downloadTemplateSpy,
  isPending: false,
  error: null as unknown,
};
let backendTemplateBlob: Blob;

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
vi.mock("@/lib/analytics", () => ({ trackEvent: trackEventSpy }));
vi.mock("@/lib/queries/organization-roster-imports", () => ({
  useDownloadEmployeeRosterTemplateMutation: () => downloadTemplateState,
  useRosterImportsQuery: () => historyState,
  useUploadEmployeeRosterMutation: () => uploadState,
}));

describe("employee roster import landing", () => {
  beforeEach(() => {
    backendTemplateBlob = new Blob(["Employee ID,Full Name\n"], { type: "text/csv" });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlSpy,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlSpy,
    });
    Object.defineProperty(HTMLAnchorElement.prototype, "click", {
      configurable: true,
      value: anchorClickSpy,
    });
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
    downloadTemplateSpy.mockReset();
    downloadTemplateSpy.mockResolvedValue({
      blob: backendTemplateBlob,
      filename: "backend-employee-template.csv",
    });
    downloadTemplateState.isPending = false;
    downloadTemplateState.error = null;
    createObjectUrlSpy.mockClear();
    revokeObjectUrlSpy.mockClear();
    anchorClickSpy.mockClear();
    trackEventSpy.mockReset();
  });

  it("downloads the backend template blob using the backend filename", async () => {
    const user = userEvent.setup();
    render(<EmployeeRosterImportPage />);

    const button = screen.getByRole("button", { name: /download template/i });
    expect(button).toBeEnabled();
    await user.click(button);

    await waitFor(() => expect(downloadTemplateSpy).toHaveBeenCalledWith({ orgPublicId: "org-1" }));
    expect(URL.createObjectURL).toHaveBeenCalledWith(backendTemplateBlob);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    const downloadLink = anchorClickSpy.mock.contexts[0] as HTMLAnchorElement;
    expect(downloadLink.download).toBe("backend-employee-template.csv");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:employee-template");
  });

  it("shows template loading and backend failure states", () => {
    downloadTemplateState.isPending = true;
    const { rerender } = render(<EmployeeRosterImportPage />);
    expect(screen.getByRole("button", { name: "Downloading…" })).toBeDisabled();

    downloadTemplateState.isPending = false;
    downloadTemplateState.error = new Error("Template service unavailable");
    rerender(<EmployeeRosterImportPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Template service unavailable");
  });

  it("renders a truthful permission error from the template endpoint", () => {
    downloadTemplateState.error = new ApiError({
      status: 403,
      code: "forbidden",
      message: "Forbidden",
    });
    render(<EmployeeRosterImportPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You don't have permission to manage employee imports.",
    );
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
      expect(trackEventSpy).toHaveBeenCalledWith("roster_file_uploaded", {
        roster_type: "employee",
        source_format: "csv",
        state: "ready_for_review",
        total_rows: 5,
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
    expect(screen.getByText(/not verified or approved by KairoID/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download template/i })).toBeEnabled();
    expect(screen.getByText(/5 rows · 0 added · 0 updated · 2 issues/i)).toBeInTheDocument();
    expect(trackEventSpy).toHaveBeenCalledWith("roster_import_opened", {
      roster_type: "employee",
    });
  });

  it("renders upload failures without navigating", async () => {
    uploadState.error = new Error("The uploaded roster could not be parsed.");
    render(<EmployeeRosterImportPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("The uploaded roster could not be parsed.");
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("renders empty and error history states with retry", async () => {
    const user = userEvent.setup();
    historyState.data = { ...makeHistory(), items: [], total: 0, total_pages: 0 };
    const { rerender } = render(<EmployeeRosterImportPage />);
    expect(screen.getByText("No employee imports yet")).toBeInTheDocument();

    historyState.data = undefined;
    historyState.error = new Error("History service unavailable");
    rerender(<EmployeeRosterImportPage />);
    expect(screen.getByText("Import history didn't load")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it("allows organization admins to use employee imports", () => {
    accessState.membershipRole = "admin";
    render(<EmployeeRosterImportPage />);
    expect(screen.getByText("Upload employee roster")).toBeInTheDocument();
  });

  it("fails closed for non-manager memberships", () => {
    accessState.membershipRole = "member";
    render(<EmployeeRosterImportPage />);
    expect(screen.getByText("Permission denied")).toBeInTheDocument();
    expect(screen.queryByText("Upload employee roster")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download template/i })).not.toBeInTheDocument();
  });
});
