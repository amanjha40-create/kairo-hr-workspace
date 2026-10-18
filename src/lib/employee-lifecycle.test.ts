import { describe, expect, it } from "vitest";
import { getLastWorkingDayError } from "@/lib/employee-lifecycle";

describe("employee lifecycle validation", () => {
  const validate = (value: string, joiningDate: string | null = "2025-01-15") =>
    getLastWorkingDayError({ value, joiningDate, today: "2026-10-18" });

  it("requires Last Working Day", () => {
    expect(validate("")).toMatch(/required/i);
  });

  it.each([
    ["2026-02-30", /valid/i],
    ["18-10-2026", /valid/i],
    ["2026-10-19", /future/i],
    ["2025-01-14", /before the joining date/i],
  ])("rejects invalid date %s", (value, message) => {
    expect(validate(value)).toMatch(message);
  });

  it("accepts a real date within the employment period", () => {
    expect(validate("2026-10-18")).toBeNull();
  });
});
