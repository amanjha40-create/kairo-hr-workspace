import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { PermissionDenied } from "@/components/app/access/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { VerificationPreferenceCheck } from "@/lib/api/hr-v2";
import { getOrganizationPeopleErrorMessage } from "@/lib/organization-people";
import {
  useOrganizationVerificationPreferencesQuery,
  useUpdateOrganizationVerificationPreferencesMutation,
} from "@/lib/queries/hr-v2";

const CHECKS: Array<{ key: VerificationPreferenceCheck; label: string; description: string }> = [
  {
    key: "identity",
    label: "Identity",
    description: "Identity document and declared detail checks.",
  },
  {
    key: "employment",
    label: "Employment",
    description: "Employment history and employer confirmation.",
  },
  { key: "education", label: "Education", description: "Institution and qualification checks." },
  { key: "references", label: "References", description: "Professional reference requests." },
  { key: "address", label: "Address", description: "Privacy-safe address verification." },
];

type PreferenceForm = {
  checks: Record<VerificationPreferenceCheck, boolean>;
  referenceCount: number;
};

function toForm(data: {
  checks: Record<string, boolean>;
  reference_count: number;
}): PreferenceForm {
  return {
    checks: Object.fromEntries(
      CHECKS.map(({ key }) => [key, data.checks[key] === true]),
    ) as PreferenceForm["checks"],
    referenceCount: data.reference_count,
  };
}

export function VerificationPreferencesSettings({
  orgPublicId,
  canManage,
}: {
  orgPublicId: string;
  canManage: boolean;
}) {
  const query = useOrganizationVerificationPreferencesQuery(orgPublicId);
  const mutation = useUpdateOrganizationVerificationPreferencesMutation(orgPublicId);
  const [form, setForm] = useState<PreferenceForm | null>(null);
  const [saved, setSaved] = useState<PreferenceForm | null>(null);

  useEffect(() => {
    if (!query.data) return;
    const next = toForm(query.data);
    setForm(next);
    setSaved(next);
  }, [query.data]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  if (query.isPending && !query.data) {
    return (
      <SectionCard title="Verification preferences" description="Loading organization defaults">
        <TableSkeleton rows={5} />
      </SectionCard>
    );
  }
  if (query.error || !form) {
    return (
      <SectionCard
        title="Verification preferences"
        description="Defaults for new verification invitations"
      >
        <EmptyState
          icon={ShieldCheck}
          title="Preferences didn't load"
          description={getOrganizationPeopleErrorMessage(query.error, "Please try again.")}
          action={{ label: "Retry", onClick: () => void query.refetch() }}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Verification preferences"
      description="Organization defaults for new Trust Invitations and verification cases"
    >
      <div className="space-y-5 p-6">
        <div className="rounded-xl border border-info/20 bg-info/[0.06] p-4 text-sm text-muted-foreground">
          Changes apply only to new invitations and cases. Historical invitations and verification
          cases are never rewritten.
        </div>
        {!canManage ? (
          <PermissionDenied message="Only organization owners and admins can change verification defaults." />
        ) : null}
        <div className="divide-y divide-border/60 rounded-2xl border border-border/60">
          {CHECKS.map((check) => (
            <div key={check.key} className="flex items-start justify-between gap-4 p-4">
              <div>
                <div className="text-sm font-medium">{check.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">{check.description}</p>
              </div>
              <Switch
                checked={form.checks[check.key]}
                disabled={!canManage}
                aria-label={`Enable ${check.label}`}
                onCheckedChange={(checked) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          checks: { ...current.checks, [check.key]: checked },
                          referenceCount:
                            check.key === "references" && !checked ? 0 : current.referenceCount,
                        }
                      : current,
                  )
                }
              />
            </div>
          ))}
        </div>
        {form.checks.references ? (
          <div className="max-w-xs">
            <label htmlFor="reference-count" className="text-xs font-medium">
              Reference count
            </label>
            <Input
              id="reference-count"
              type="number"
              min={0}
              max={10}
              value={form.referenceCount}
              disabled={!canManage}
              className="mt-1.5 rounded-xl"
              onChange={(event) =>
                setForm((current) =>
                  current ? { ...current, referenceCount: Number(event.target.value) } : current,
                )
              }
            />
          </div>
        ) : null}
        {mutation.error ? (
          <p className="text-sm text-destructive" role="alert">
            {getOrganizationPeopleErrorMessage(
              mutation.error,
              "We couldn't save these preferences.",
            )}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div className="text-xs text-muted-foreground">
            {dirty ? "You have unsaved changes." : "Preferences are up to date."}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl"
              disabled={!dirty || mutation.isPending}
              onClick={() => setForm(saved)}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Discard
            </Button>
            <Button
              size="sm"
              className="btn-premium rounded-xl"
              disabled={!canManage || !dirty || mutation.isPending || form.referenceCount > 10}
              onClick={async () => {
                try {
                  const result = await mutation.mutateAsync({
                    checks: form.checks,
                    reference_count: form.checks.references ? form.referenceCount : 0,
                  });
                  const next = toForm(result);
                  setForm(next);
                  setSaved(next);
                  toast.success("Verification preferences saved");
                } catch {
                  // The mutation error is rendered above.
                }
              }}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Save preferences
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
