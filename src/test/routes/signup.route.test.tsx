import { render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateSpy = vi.fn();
const isGoogleSsoEnabledSpy = vi.fn();

const authState = {
  session: null as { access_token: string } | null,
  signInWithGoogle: vi.fn(),
  completeGoogleSignIn: vi.fn(),
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
  }),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => navigateSpy,
}));

vi.mock("@/components/Logo", () => ({
  Logo: () => <div>logo</div>,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/app-config", () => ({
  getMarketingWebsiteUrl: () => "https://kairoid.com",
  isGoogleSsoEnabled: () => isGoogleSsoEnabledSpy(),
}));

vi.mock("@/lib/organization-signup-draft", () => ({
  readOrganizationSignupDraft: () => null,
  writeOrganizationSignupDraft: vi.fn(),
  clearOrganizationSignupDraft: vi.fn(),
}));

vi.mock("@/lib/api/organization-signup", () => ({
  startOrganizationSignup: vi.fn(),
  sendOrganizationSignupEmailOtp: vi.fn(),
  verifyOrganizationSignupEmail: vi.fn(),
  completeOrganizationSignup: vi.fn(),
}));

vi.mock("@/lib/api/auth-session", () => ({
  storeAuthSession: vi.fn(),
  toAuthSession: vi.fn(),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    type = "button",
    disabled,
  }: {
    children: ReactNode;
    type?: "button" | "submit";
    disabled?: boolean;
  }) => (
    <button type={type} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ placeholder }: { placeholder?: string }) => <input placeholder={placeholder} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const { Route } = await import("../../routes/signup");
const SignupRoute = Route.options.component as ComponentType;

describe("Signup route", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    isGoogleSsoEnabledSpy.mockReset();
    isGoogleSsoEnabledSpy.mockReturnValue(true);
    authState.session = null;
  });

  it("hides Google SSO when the production flag is disabled and still shows signup fields", () => {
    isGoogleSsoEnabledSpy.mockReturnValue(false);

    render(<SignupRoute />);

    expect(screen.queryByText("Continue with Google")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Create account")).toBeInTheDocument();
  });
});
