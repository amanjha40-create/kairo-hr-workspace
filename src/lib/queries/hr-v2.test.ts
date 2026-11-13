import { describe, expect, it } from "vitest";
import { organizationJobRolesQueryOptions } from "./hr-v2";

describe("organization job-role query", () => {
  it("revalidates Admin-created roles without requiring logout or workspace re-entry", () => {
    const options = organizationJobRolesQueryOptions("organization-id");

    expect(options.staleTime).toBe(0);
    expect(options.refetchOnMount).toBe("always");
    expect(options.refetchOnWindowFocus).toBe("always");
    expect(options.refetchInterval).toBe(30_000);
  });
});
