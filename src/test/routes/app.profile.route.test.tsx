import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refetchProfileSpy = vi.fn();
const refetchAccountSpy = vi.fn();
const updateProfileSpy = vi.fn();
const uploadAvatarSpy = vi.fn();
const removeAvatarSpy = vi.fn();
const changePasswordSpy = vi.fn();
const syncCurrentUserSpy = vi.fn();
const toastSuccessSpy = vi.fn();
const toastErrorSpy = vi.fn();

const profileResponse = {
  id: "user_123",
  email: "aman@northstar.example",
  full_name: "Aman Jha",
  profile_slug: null,
  phone: "+91 9876543210",
  current_role: "HR Lead",
  industry: null,
  years_of_experience: null,
  location: null,
  location_city: null,
  location_region: null,
  location_country: null,
  headline: null,
  bio: null,
  date_of_birth: null,
  avatar_url: "https://cdn.example.com/avatar.png",
  role: "member",
  is_active: true,
  phone_verified_at: null,
  email_verified_at: "2026-07-24T10:00:00Z",
  employment_onboarding_completed_at: null,
  languages: [],
  professional_links: [],
  profile_completion_percentage: 40,
  created_at: "2026-07-01T10:00:00Z",
};

const profileQueryState = {
  data: profileResponse,
  isPending: false,
  error: null as unknown,
  refetch: refetchProfileSpy,
};

const accountSettingsQueryState = {
  data: {
    notification_preferences: [
      {
        public_id: "np_1",
        user_id: "user_123",
        event_type: "trust_invitation_created",
        enabled: true,
        preferred_channels: ["email"],
        quiet_hours: {},
        metadata: {},
        created_at: "2026-07-24T10:00:00Z",
        updated_at: "2026-07-24T10:00:00Z",
      },
    ],
  },
  isPending: false,
  error: null as unknown,
  refetch: refetchAccountSpy,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
  }),
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
  useBlocker: () => undefined,
}));

vi.mock("@/components/app/primitives", () => ({
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  ),
  SectionCard: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <button onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
  TableSkeleton: () => <div>table-skeleton</div>,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarImage: ({ alt }: { alt?: string }) => <img alt={alt} />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
  }) =>
    asChild ? (
      <div>{children}</div>
    ) : (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    disabled,
    type,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string; files?: File[] } }) => void;
    placeholder?: string;
    disabled?: boolean;
    type?: string;
  }) => (
    <input
      aria-label={placeholder ?? "input"}
      disabled={disabled}
      type={type}
      value={value}
      onChange={(event) =>
        onChange?.({
          target: {
            value: event.target.value,
            files: Array.from(event.target.files ?? []),
          },
        })
      }
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked }: { checked?: boolean }) => (
    <input type="checkbox" checked={checked} readOnly />
  ),
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => ({
    org: { name: "Northstar Talent" },
  }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    syncCurrentUser: syncCurrentUserSpy,
  }),
}));

vi.mock("@/lib/queries/user-settings", () => ({
  useCurrentUserProfileQuery: () => profileQueryState,
  useAccountSettingsQuery: () => accountSettingsQueryState,
  useUpdateCurrentUserProfileMutation: () => ({
    mutateAsync: updateProfileSpy,
    isPending: false,
  }),
  useAvatarUploadMutation: () => ({
    mutateAsync: uploadAvatarSpy,
    isPending: false,
  }),
  useRemoveAvatarMutation: () => ({
    mutateAsync: removeAvatarSpy,
    isPending: false,
  }),
  useChangePasswordMutation: () => ({
    mutateAsync: changePasswordSpy,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessSpy,
    error: toastErrorSpy,
  },
}));

const { Route } = await import("../../routes/app.profile");
const ProfilePage = Route.options.component as ComponentType;

describe("Profile route", () => {
  beforeEach(() => {
    refetchProfileSpy.mockReset();
    refetchAccountSpy.mockReset();
    updateProfileSpy.mockReset();
    updateProfileSpy.mockResolvedValue(profileResponse);
    uploadAvatarSpy.mockReset();
    removeAvatarSpy.mockReset();
    changePasswordSpy.mockReset();
    syncCurrentUserSpy.mockReset();
    toastSuccessSpy.mockReset();
    toastErrorSpy.mockReset();
    profileQueryState.data = profileResponse;
    profileQueryState.isPending = false;
    profileQueryState.error = null;
    accountSettingsQueryState.data = {
      notification_preferences: [
        {
          public_id: "np_1",
          user_id: "user_123",
          event_type: "trust_invitation_created",
          enabled: true,
          preferred_channels: ["email"],
          quiet_hours: {},
          metadata: {},
          created_at: "2026-07-24T10:00:00Z",
          updated_at: "2026-07-24T10:00:00Z",
        },
      ],
    };
    accountSettingsQueryState.isPending = false;
    accountSettingsQueryState.error = null;
  });

  it("renders a loading state while the profile is pending", () => {
    profileQueryState.isPending = true;
    profileQueryState.data = undefined as never;

    render(<ProfilePage />);

    expect(screen.getByText("table-skeleton")).toBeInTheDocument();
  });

  it("saves backend-driven personal information", async () => {
    render(<ProfilePage />);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Aman Kumar" } });
    fireEvent.click(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(updateProfileSpy).toHaveBeenCalledWith({
        full_name: "Aman Kumar",
        phone: "+91 9876543210",
        current_role: "HR Lead",
      });
    });
    expect(syncCurrentUserSpy).toHaveBeenCalledWith({
      id: "user_123",
      email: "aman@northstar.example",
      full_name: "Aman Jha",
    });
    expect(toastSuccessSpy).toHaveBeenCalledWith("Profile updated");
  });

  it("shows a retry state when profile loading fails", () => {
    profileQueryState.error = new Error("Backend unavailable");

    render(<ProfilePage />);
    fireEvent.click(screen.getByText("Retry"));

    expect(refetchProfileSpy).toHaveBeenCalledTimes(1);
  });
});
