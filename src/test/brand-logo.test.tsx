import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

import { Logo } from "@/components/Logo";

describe("KairoID branding", () => {
  it("renders the canonical horizontal logo without changing its aspect ratio", () => {
    render(<Logo />);

    const logo = screen.getByRole("img", { name: "KairoID" });
    expect(logo).toHaveAttribute("src", expect.stringContaining("kairoid-logo-primary"));
    expect(logo).toHaveAttribute("width", "728");
    expect(logo).toHaveAttribute("height", "192");
  });
});
