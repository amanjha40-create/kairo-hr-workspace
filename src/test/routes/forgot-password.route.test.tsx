import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";

const useSearchSpy = vi.fn();
const requestPasswordResetSpy = vi.fn();
const resetPasswordSpy = vi.fn();
const toastErrorSpy = vi.fn();
const toastSuccessSpy = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
    useSearch: () => useSearchSpy(),
  }),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("@tanstack/zod-adapter", () => ({
  fallback: <T,>(schema: T) => schema,
  zodValidator: (schema: unknown) => schema,
}));

vi.mock("@/components/Logo", () => ({
  Logo: () => <div>logo</div>,
}));

vi.mock("@/lib/api/auth", () => ({
  requestPasswordReset: (...args: unknown[]) => requestPasswordResetSpy(...args),
  resetPassword: (...args: unknown[]) => resetPasswordSpy(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorSpy(...args),
    success: (...args: unknown[]) => toastSuccessSpy(...args),
  },
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

const { Route } = await import("../../routes/forgot-password");
const ForgotPasswordRoute = Route.options.component as ComponentType;

describe("Forgot password route", () => {
  beforeEach(() => {
    useSearchSpy.mockReset();
    requestPasswordResetSpy.mockReset();
    resetPasswordSpy.mockReset();
    toastErrorSpy.mockReset();
    toastSuccessSpy.mockReset();
    useSearchSpy.mockReturnValue({ reset_token: undefined });
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("submits the forgot-password request flow", async () => {
    requestPasswordResetSpy.mockResolvedValue({ message: "ok" });

    render(<ForgotPasswordRoute />);

    fireEvent.change(screen.getByPlaceholderText("you@company.com"), {
      target: { value: "alex@acme.test" },
    });
    fireEvent.submit(screen.getByText("Send reset link").closest("form")!);

    await waitFor(() => {
      expect(requestPasswordResetSpy).toHaveBeenCalledWith("alex@acme.test");
    });
    expect(screen.getByText(/a reset link is on its way/i)).toBeInTheDocument();
  });

  it("parses reset_token from the URL and renders reset mode", () => {
    useSearchSpy.mockReturnValue({ reset_token: "reset-token-12345678901234567890" });

    render(<ForgotPasswordRoute />);

    expect(screen.getByText("Choose a new password")).toBeInTheDocument();
    expect(screen.getByText("Reset password")).toBeInTheDocument();
    expect(screen.queryByText("Send reset link")).not.toBeInTheDocument();
  });

  it("submits a successful reset without persisting the token", async () => {
    useSearchSpy.mockReturnValue({ reset_token: "reset-token-12345678901234567890" });
    resetPasswordSpy.mockResolvedValue({ message: "Password reset successful." });

    render(<ForgotPasswordRoute />);

    const [newPasswordInput, confirmPasswordInput] = screen.getAllByPlaceholderText("••••••••••••");

    fireEvent.change(newPasswordInput, {
      target: { value: "StrongPassword123!" },
    });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "StrongPassword123!" },
    });
    fireEvent.submit(screen.getByText("Reset password").closest("form")!);

    await waitFor(() => {
      expect(resetPasswordSpy).toHaveBeenCalledWith(
        "reset-token-12345678901234567890",
        "StrongPassword123!",
        "StrongPassword123!",
      );
    });

    expect(screen.getByText("Password updated")).toBeInTheDocument();
    expect(screen.getByText("Back to sign in")).toBeInTheDocument();
    expect(toastSuccessSpy).toHaveBeenCalledWith("Password reset successful.");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("shows an invalid token error truthfully", async () => {
    useSearchSpy.mockReturnValue({ reset_token: "reset-token-12345678901234567890" });
    resetPasswordSpy.mockRejectedValue(
      new ApiError({
        status: 401,
        code: "request_failed",
        message: "Invalid or expired password reset token",
      }),
    );

    render(<ForgotPasswordRoute />);

    const [newPasswordInput, confirmPasswordInput] = screen.getAllByPlaceholderText("••••••••••••");

    fireEvent.change(newPasswordInput, {
      target: { value: "StrongPassword123!" },
    });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "StrongPassword123!" },
    });
    fireEvent.submit(screen.getByText("Reset password").closest("form")!);

    await waitFor(() => {
      expect(resetPasswordSpy).toHaveBeenCalled();
    });
    expect(toastErrorSpy).toHaveBeenCalledWith("Invalid or expired password reset token");
    expect(screen.getByText("Choose a new password")).toBeInTheDocument();
  });

  it("shows an expired token error truthfully", async () => {
    useSearchSpy.mockReturnValue({ reset_token: "reset-token-12345678901234567890" });
    resetPasswordSpy.mockRejectedValue(
      new ApiError({
        status: 401,
        code: "request_failed",
        message: "Invalid or expired password reset token",
      }),
    );

    render(<ForgotPasswordRoute />);

    const [newPasswordInput, confirmPasswordInput] = screen.getAllByPlaceholderText("••••••••••••");

    fireEvent.change(newPasswordInput, {
      target: { value: "AnotherStrongPassword123!" },
    });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "AnotherStrongPassword123!" },
    });
    fireEvent.submit(screen.getByText("Reset password").closest("form")!);

    await waitFor(() => {
      expect(resetPasswordSpy).toHaveBeenCalled();
    });
    expect(toastErrorSpy).toHaveBeenCalledWith("Invalid or expired password reset token");
    expect(screen.getByText("Choose a new password")).toBeInTheDocument();
  });
});
