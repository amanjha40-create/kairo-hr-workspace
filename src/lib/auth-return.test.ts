import { describe, expect, it } from "vitest";
import { authHref, safeAuthReturnPath } from "@/lib/auth-return";

describe("authentication return paths", () => {
  it("retains the internal team invitation route through authentication", () => {
    const returnTo = "/team-invitations/accept?token=opaque";
    expect(authHref("/login", returnTo)).toBe(
      "/login?returnTo=%2Fteam-invitations%2Faccept%3Ftoken%3Dopaque",
    );
    expect(safeAuthReturnPath(returnTo)).toBe(returnTo);
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil"])(
    "rejects unsafe return path %s",
    (value) => expect(safeAuthReturnPath(value)).toBeNull(),
  );
});
