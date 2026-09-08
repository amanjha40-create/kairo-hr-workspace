import { describe, expect, it } from "vitest";
import {
  MAX_ROSTER_COLUMNS,
  MAX_ROSTER_ROWS,
  MAX_ROSTER_UPLOAD_BYTES,
  validateRosterFile,
} from "@/lib/organization-roster";

describe("employee roster frontend limits", () => {
  it.each(["employees.csv", "employees.xlsx"])("accepts supported file %s", (name) => {
    expect(validateRosterFile(new File(["employee_id,full_name"], name))).toBeNull();
  });

  it("rejects unsupported file types", () => {
    expect(validateRosterFile(new File(["employee"], "employees.pdf"))).toBe(
      "Choose a CSV or XLSX file.",
    );
  });

  it("rejects files above the backend upload limit", () => {
    const file = new File([new Uint8Array(MAX_ROSTER_UPLOAD_BYTES + 1)], "employees.csv");
    expect(validateRosterFile(file)).toBe("The file must be 5 MB or smaller.");
  });

  it("keeps the frozen backend row and column limits visible to the client", () => {
    expect(MAX_ROSTER_ROWS).toBe(10_000);
    expect(MAX_ROSTER_COLUMNS).toBe(64);
  });
});
