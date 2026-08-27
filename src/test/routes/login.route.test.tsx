import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateSpy = vi.fn();
const signInSpy = vi.fn().mockResolvedValue(undefined);
const signInWithGoogleSpy = vi.fn().mockResolvedValue(undefined);
const completeGoogleSignInSpy = vi.fn().mockResolvedValue(undefined);
const isGoogleSsoEnabledSpy = vi.fn();

const authState = {
  session: null as { access_token: string } | null,
  signIn: signInSpy,
  signInWithGoogle: signInWithGoogleSpy,
  completeGoogleSignIn: completeGoogleSignInSpy,
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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    type = "button",
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: "button" | "submit";
    disabled?: boolean;
  }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    type,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    type?: string;
  }) => (
    <input
      value={value}
      type={type}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      placeholder={placeholder}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

const { Route } = await import("../../routes/login");
const LoginRoute = Route.options.component as ComponentType;

describe("Login route", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    signInSpy.mockClear();
    signInWithGoogleSpy.mockClear();
    completeGoogleSignInSpy.mockClear();
    isGoogleSsoEnabledSpy.mockReset();
    isGoogleSsoEnabledSpy.mockReturnValue(true);
    authState.session = null;
  });

  it("hides Google SSO when the production flag is disabled and still shows email auth", () => {
    isGoogleSsoEnabledSpy.mockReturnValue(false);

    render(<LoginRoute />);

    expect(screen.queryByText("Continue with Google")).not.toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Forgot?")).toBeInTheDocument();
  });

  it("submits email and password auth unchanged", async () => {
    render(<LoginRoute />);

    const email = screen.getByPlaceholderText("you@company.com");
    const password = screen.getByPlaceholderText("••••••••");

    fireEvent.change(email, { target: { value: "alex@acme.test" } });
    fireEvent.change(password, { target: { value: "SecurePassword123!" } });
    fireEvent.submit(screen.getByText("Sign in").closest("form")!);

    await waitFor(() => {
      expect(signInSpy).toHaveBeenCalledWith("alex@acme.test", "SecurePassword123!");
    });
  });
});
