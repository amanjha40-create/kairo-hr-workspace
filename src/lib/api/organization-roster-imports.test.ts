import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequestSpy = vi.fn();
const apiBlobRequestSpy = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiBlobRequest: apiBlobRequestSpy,
  apiRequest: apiRequestSpy,
}));

const {
  EMPLOYEE_ROSTER_TEMPLATE_FILENAME,
  confirmRosterImport,
  downloadEmployeeRosterTemplate,
  downloadRosterImportErrors,
  getRosterImport,
  listRosterEmployees,
  listRosterImportRows,
  listRosterImports,
  updateRosterMapping,
  uploadEmployeeRoster,
} = await import("@/lib/api/organization-roster-imports");

describe("organization roster API contract", () => {
  beforeEach(() => {
    apiBlobRequestSpy.mockReset();
    apiRequestSpy.mockReset();
  });

  it("downloads the authenticated backend employee template and preserves its filename", async () => {
    const blob = new Blob(["Employee ID,Full Name\n"], { type: "text/csv" });
    apiBlobRequestSpy.mockResolvedValue({
      blob,
      headers: new Headers({
        "Content-Disposition": 'attachment; filename="backend-employee-template.csv"',
      }),
    });

    await expect(downloadEmployeeRosterTemplate("org-1")).resolves.toEqual({
      blob,
      filename: "backend-employee-template.csv",
    });
    expect(apiBlobRequestSpy).toHaveBeenCalledWith(
      "/api/v1/organizations/org-1/roster/templates/employee.csv",
      { headers: { Accept: "text/csv" } },
    );
  });

  it("uses the canonical filename only when the backend omits Content-Disposition", async () => {
    const blob = new Blob(["Employee ID,Full Name\n"], { type: "text/csv" });
    apiBlobRequestSpy.mockResolvedValue({ blob, headers: new Headers() });

    await expect(downloadEmployeeRosterTemplate("org-1")).resolves.toEqual({
      blob,
      filename: EMPLOYEE_ROSTER_TEMPLATE_FILENAME,
    });
  });

  it("uploads employee CSV/XLSX files as the frozen multipart contract", () => {
    const file = new File(["employee_id,full_name"], "employees.csv", { type: "text/csv" });
    uploadEmployeeRoster("org-1", file);

    const [url, options] = apiRequestSpy.mock.calls[0];
    expect(url).toBe("/api/v1/organizations/org-1/roster-imports");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("roster_type")).toBe("employee");
    expect(options.body.get("file")).toBe(file);
  });

  it("uses the backend list, detail, rows, mapping, confirm, error and employee endpoints", () => {
    listRosterImports("org-1", 2, 20);
    getRosterImport("org-1", "import-1");
    listRosterImportRows("org-1", "import-1", 3, 20);
    updateRosterMapping("org-1", "import-1", [
      { source_column: "staff_code", canonical_field: "employee_id" },
    ]);
    confirmRosterImport("org-1", "import-1");
    downloadRosterImportErrors("org-1", "import-1");
    listRosterEmployees("org-1", { search: "Ada" });

    expect(apiRequestSpy.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/organizations/org-1/roster-imports?page=2&page_size=20&roster_type=employee",
      "/api/v1/organizations/org-1/roster-imports/import-1",
      "/api/v1/organizations/org-1/roster-imports/import-1/rows?page=3&page_size=20",
      "/api/v1/organizations/org-1/roster-imports/import-1/mapping",
      "/api/v1/organizations/org-1/roster-imports/import-1/confirm",
      "/api/v1/organizations/org-1/roster-imports/import-1/errors.csv",
      "/api/v1/organizations/org-1/roster/employees?page=1&page_size=100&search=Ada",
    ]);
    expect(apiRequestSpy.mock.calls[3][1]).toEqual({
      method: "PATCH",
      body: {
        assignments: [{ source_column: "staff_code", canonical_field: "employee_id" }],
      },
    });
    expect(apiRequestSpy.mock.calls[4][1]).toEqual({ method: "POST" });
  });
});
