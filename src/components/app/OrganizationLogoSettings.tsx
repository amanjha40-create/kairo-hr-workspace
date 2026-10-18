import { useRef, useState } from "react";
import { Image, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PermissionDenied } from "@/components/app/access/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrganizationPeopleErrorMessage } from "@/lib/organization-people";
import { validateOrganizationLogo } from "@/lib/organization-logo";
import {
  useOrganizationLogoQuery,
  useRemoveOrganizationLogoMutation,
  useUploadOrganizationLogoMutation,
} from "@/lib/queries/hr-v2";

export function OrganizationLogoSettings({
  orgPublicId,
  canManage,
}: {
  orgPublicId: string;
  canManage: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const logoQuery = useOrganizationLogoQuery(orgPublicId);
  const uploadMutation = useUploadOrganizationLogoMutation(orgPublicId);
  const removeMutation = useRemoveOrganizationLogoMutation(orgPublicId);
  const [validationError, setValidationError] = useState<string | null>(null);
  const pending = uploadMutation.isPending || removeMutation.isPending;
  const error =
    validationError ??
    (uploadMutation.error
      ? getOrganizationPeopleErrorMessage(uploadMutation.error, "We couldn't upload that logo.")
      : removeMutation.error
        ? getOrganizationPeopleErrorMessage(removeMutation.error, "We couldn't remove that logo.")
        : logoQuery.error
          ? getOrganizationPeopleErrorMessage(logoQuery.error, "The current logo didn't load.")
          : null);

  async function selectFile(file: File | undefined) {
    if (!file) return;
    const nextError = validateOrganizationLogo(file);
    setValidationError(nextError);
    if (nextError) return;
    try {
      await uploadMutation.mutateAsync(file);
      toast.success(
        logoQuery.data?.has_logo ? "Organization logo replaced" : "Organization logo uploaded",
      );
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      // The mutation error is rendered below.
    }
  }

  return (
    <div>
      <div className="text-xs font-medium text-foreground">Organization logo</div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        PNG, JPEG, or WEBP · maximum 5 MB. Files remain private and are displayed with short-lived
        URLs.
      </p>
      {!canManage ? (
        <PermissionDenied
          className="mt-3 block"
          message="Only organization owners and admins can replace or remove the logo."
        />
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border/60 bg-foreground/[0.03] flex items-center justify-center">
          {logoQuery.data?.has_logo && logoQuery.data.display_url ? (
            <img
              src={logoQuery.data.display_url}
              alt="Organization logo"
              className="h-full w-full object-contain p-2"
            />
          ) : logoQuery.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Image className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={!canManage || pending}
            onClick={() => inputRef.current?.click()}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            {logoQuery.data?.has_logo ? "Replace logo" : "Upload logo"}
          </Button>
          {logoQuery.data?.has_logo ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-destructive"
              disabled={!canManage || pending}
              onClick={async () => {
                if (!window.confirm("Remove the organization logo?")) return;
                try {
                  await removeMutation.mutateAsync();
                  toast.success("Organization logo removed");
                } catch {
                  // The mutation error is rendered below.
                }
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Remove
            </Button>
          ) : null}
        </div>
        <Input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Choose organization logo"
          onChange={(event) => void selectFile(event.target.files?.[0])}
        />
      </div>
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
