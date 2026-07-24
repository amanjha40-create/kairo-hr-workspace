import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAssignVerificationReviewerMutation,
  verificationRequestQueryKeys,
} from "@/lib/queries/verification-requests";
import { makeBackendVerificationRequestResponse } from "@/test/employment-verification-fixtures";

const { assignVerificationReviewer } = vi.hoisted(() => ({
  assignVerificationReviewer: vi.fn(),
}));

vi.mock("@/lib/api/verification-requests", () => ({
  assignVerificationReviewer,
  cancelVerificationRequest: vi.fn(),
  getVerificationRequestDetail: vi.fn(),
  getVerificationRequestEvidence: vi.fn(),
  getVerificationRequestTimeline: vi.fn(),
  listVerificationRequests: vi.fn(),
  rejectVerificationRequest: vi.fn(),
  requestVerificationClarification: vi.fn(),
  updateVerificationInternalNote: vi.fn(),
  verifyVerificationRequest: vi.fn(),
}));

vi.mock("@/lib/api/organization-members", () => ({
  listOrganizationMembers: vi.fn(),
}));

describe("useAssignVerificationReviewerMutation", () => {
  beforeEach(() => {
    assignVerificationReviewer.mockReset();
  });

  it("invalidates verification list, detail, timeline, and evidence queries after success", async () => {
    assignVerificationReviewer.mockResolvedValue(makeBackendVerificationRequestResponse());

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAssignVerificationReviewerMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        verificationRequestPublicId: "vr_123",
        payload: { organization_member_public_id: "member_123" },
      });
    });

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: verificationRequestQueryKeys.all,
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: verificationRequestQueryKeys.detail("vr_123"),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: verificationRequestQueryKeys.timeline("vr_123"),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: verificationRequestQueryKeys.evidence("vr_123"),
      });
    });
  });
});
