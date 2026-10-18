import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationLogoSettings } from "@/components/app/OrganizationLogoSettings";

const uploadSpy = vi.fn();
const removeSpy = vi.fn();
const uploadMutationState = { isPending: false, error: null as unknown };
const removeMutationState = { isPending: false, error: null as unknown };
const logoQuery: {
  data: { has_logo: boolean; display_url: string | null };
  isPending: boolean;
  error: unknown;
} = {
  data: { has_logo: false, display_url: null },
  isPending: false,
  error: null as unknown,
};

vi.mock("@/lib/queries/hr-v2", () => ({
  useOrganizationLogoQuery: () => logoQuery,
  useUploadOrganizationLogoMutation: () => ({
    mutateAsync: uploadSpy,
    isPending: uploadMutationState.isPending,
    error: uploadMutationState.error,
  }),
  useRemoveOrganizationLogoMutation: () => ({
    mutateAsync: removeSpy,
    isPending: removeMutationState.isPending,
    error: removeMutationState.error,
  }),
}));

describe("OrganizationLogoSettings", () => {
  beforeEach(() => {
    uploadSpy.mockReset();
    removeSpy.mockReset();
    uploadSpy.mockResolvedValue({ has_logo: true });
    removeSpy.mockResolvedValue({ has_logo: false });
    logoQuery.data = { has_logo: false, display_url: null };
    logoQuery.error = null;
    uploadMutationState.isPending = false;
    uploadMutationState.error = null;
    removeMutationState.isPending = false;
    removeMutationState.error = null;
  });

  it("rejects unsafe files before upload and uploads an allowed image", async () => {
    render(<OrganizationLogoSettings orgPublicId="org-1" canManage />);
    const input = screen.getByLabelText("Choose organization logo");

    fireEvent.change(input, {
      target: { files: [new File(["svg"], "logo.svg", { type: "image/svg+xml" })] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/not supported/i);
    expect(uploadSpy).not.toHaveBeenCalled();

    fireEvent.change(input, {
      target: { files: [new File(["png"], "logo.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(1));
  });

  it("supports removing the current logo", async () => {
    logoQuery.data = { has_logo: true, display_url: "https://signed.example/logo" };
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    render(<OrganizationLogoSettings orgPublicId="org-1" canManage />);

    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => expect(removeSpy).toHaveBeenCalledTimes(1));
  });

  it("uses the same upload flow to replace the current logo", async () => {
    logoQuery.data = { has_logo: true, display_url: "https://signed.example/logo" };
    render(<OrganizationLogoSettings orgPublicId="org-1" canManage />);

    expect(screen.getByText("Replace logo")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Choose organization logo"), {
      target: { files: [new File(["webp"], "replacement.webp", { type: "image/webp" })] },
    });
    await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(1));
  });

  it("renders server failures and disables mutations without manager permission", () => {
    uploadMutationState.error = new Error("Storage is temporarily unavailable");
    const { rerender } = render(<OrganizationLogoSettings orgPublicId="org-1" canManage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Storage is temporarily unavailable");

    uploadMutationState.error = null;
    rerender(<OrganizationLogoSettings orgPublicId="org-1" canManage={false} />);
    expect(screen.getByText(/only organization owners and admins/i)).toBeInTheDocument();
    expect(screen.getByText("Upload logo")).toBeDisabled();
  });
});
