import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VerificationPreferencesSettings } from "@/components/app/VerificationPreferencesSettings";

const updateSpy = vi.fn();
const mutationState = { isPending: false, error: null as unknown };
const queryState = {
  data: {
    version: 1,
    checks: {
      identity: true,
      employment: false,
      education: false,
      references: false,
      address: false,
    },
    reference_count: 0,
    updated_at: null,
  },
  isPending: false,
  error: null as unknown,
  refetch: vi.fn(),
};

vi.mock("@/lib/queries/hr-v2", () => ({
  useOrganizationVerificationPreferencesQuery: () => queryState,
  useUpdateOrganizationVerificationPreferencesMutation: () => ({
    mutateAsync: updateSpy,
    isPending: mutationState.isPending,
    error: mutationState.error,
  }),
}));

describe("VerificationPreferencesSettings", () => {
  beforeEach(() => {
    updateSpy.mockReset();
    updateSpy.mockResolvedValue({
      ...queryState.data,
      checks: { ...queryState.data.checks, employment: true },
    });
    queryState.error = null;
    mutationState.isPending = false;
    mutationState.error = null;
  });

  it("loads defaults, tracks changes, and saves the certified payload", async () => {
    render(<VerificationPreferencesSettings orgPublicId="org-1" canManage />);

    expect(screen.getByText(/apply only to new invitations/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Enable Employment"));
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Save preferences"));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith({
        checks: {
          identity: true,
          employment: true,
          education: false,
          references: false,
          address: false,
        },
        reference_count: 0,
      }),
    );
  });

  it("keeps the settings read-only without manager permission", () => {
    render(<VerificationPreferencesSettings orgPublicId="org-1" canManage={false} />);
    expect(screen.getByText(/only organization owners and admins/i)).toBeInTheDocument();
    expect(screen.getByText("Save preferences")).toBeDisabled();
  });

  it("renders a retryable load error", () => {
    queryState.error = new Error("Preferences unavailable");
    render(<VerificationPreferencesSettings orgPublicId="org-1" canManage />);

    expect(screen.getByText("Preferences didn't load")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(queryState.refetch).toHaveBeenCalledTimes(1);
  });

  it("renders backend save errors without losing the edited form", () => {
    mutationState.error = new Error("Preference update rejected");
    render(<VerificationPreferencesSettings orgPublicId="org-1" canManage />);
    fireEvent.click(screen.getByLabelText("Enable Employment"));

    expect(screen.getByRole("alert")).toHaveTextContent("Preference update rejected");
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();
  });
});
