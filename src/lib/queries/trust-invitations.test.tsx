import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { workspaceBootstrapQueryKey } from "@/lib/queries/workspace";
import {
  trustInvitationQueryKeys,
  useCreateTrustInvitationMutation,
} from "@/lib/queries/trust-invitations";
import { makeTrustInvitationCreateResponse } from "@/test/trust-invitation-fixtures";

const { createTrustInvitation } = vi.hoisted(() => ({
  createTrustInvitation: vi.fn(),
}));

vi.mock("@/lib/api/trust-invitations", () => ({
  createTrustInvitation,
  cancelTrustInvitation: vi.fn(),
  deleteTrustInvitation: vi.fn(),
  getTrustInvitationDetail: vi.fn(),
  getTrustInvitationSummary: vi.fn(),
  listTrustInvitations: vi.fn(),
  resendTrustInvitation: vi.fn(),
  sendTrustInvitation: vi.fn(),
}));

describe("useCreateTrustInvitationMutation", () => {
  beforeEach(() => {
    createTrustInvitation.mockReset();
  });

  it("invalidates trust invitation and workspace bootstrap queries after success", async () => {
    createTrustInvitation.mockResolvedValue(makeTrustInvitationCreateResponse());

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateTrustInvitationMutation("org_123"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        subject_name: "Aman Joshi",
        subject_email: "aman@example.com",
        requested_verification_types: ["identity", "employment"],
        delivery_method: "email",
        mode: "send",
        expires_at: "2026-07-31T10:00:00.000Z",
      });
    });

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: trustInvitationQueryKeys.all,
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: workspaceBootstrapQueryKey,
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: trustInvitationQueryKeys.summary("org_123"),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: trustInvitationQueryKeys.detail("ti_123"),
      });
    });
  });
});
