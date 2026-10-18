import { describe, expect, it } from "vitest";
import { MAX_ORGANIZATION_LOGO_BYTES, validateOrganizationLogo } from "@/lib/organization-logo";

describe("organization logo validation", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])("accepts %s", (type) => {
    expect(validateOrganizationLogo(new File(["image"], "logo", { type }))).toBeNull();
  });

  it("rejects SVG before upload", () => {
    expect(
      validateOrganizationLogo(new File(["svg"], "logo.svg", { type: "image/svg+xml" })),
    ).toMatch(/not supported/i);
  });

  it("rejects files larger than the certified five-megabyte bound", () => {
    const file = new File([new Uint8Array(MAX_ORGANIZATION_LOGO_BYTES + 1)], "large.png", {
      type: "image/png",
    });
    expect(validateOrganizationLogo(file)).toMatch(/5 MB/i);
  });
});
