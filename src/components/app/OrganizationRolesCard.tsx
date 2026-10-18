import { useState } from "react";
import { BriefcaseBusiness, Loader2, Pencil, Plus, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OrganizationJobRole } from "@/lib/api/hr-v2";
import { getOrganizationPeopleErrorMessage } from "@/lib/organization-people";
import {
  useCreateOrganizationJobRoleMutation,
  useDeactivateOrganizationJobRoleMutation,
  useOrganizationJobRolesQuery,
  useUpdateOrganizationJobRoleMutation,
} from "@/lib/queries/hr-v2";

export function OrganizationRolesCard({
  orgPublicId,
  canManage,
}: {
  orgPublicId: string;
  canManage: boolean;
}) {
  const rolesQuery = useOrganizationJobRolesQuery(orgPublicId);
  const createMutation = useCreateOrganizationJobRoleMutation(orgPublicId);
  const updateMutation = useUpdateOrganizationJobRoleMutation(orgPublicId);
  const deactivateMutation = useDeactivateOrganizationJobRoleMutation(orgPublicId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationJobRole | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const pending =
    createMutation.isPending || updateMutation.isPending || deactivateMutation.isPending;

  function openEditor(role?: OrganizationJobRole) {
    setEditing(role ?? null);
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) return;
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          rolePublicId: editing.public_id,
          payload: { name: name.trim(), description: description.trim() || null },
        });
        toast.success("Role updated");
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || null,
        });
        toast.success("Role created");
      }
      setOpen(false);
    } catch (error) {
      toast.error(getOrganizationPeopleErrorMessage(error, "We couldn't save that role."));
    }
  }

  async function deactivate(role: OrganizationJobRole) {
    if (!window.confirm(`Deactivate ${role.name}? Existing assignments will be preserved.`)) return;
    try {
      await deactivateMutation.mutateAsync(role.public_id);
      toast.success("Role deactivated; existing assignments were preserved");
    } catch (error) {
      toast.error(getOrganizationPeopleErrorMessage(error, "We couldn't deactivate that role."));
    }
  }

  return (
    <>
      <SectionCard
        title="People by role"
        description="Organization-wide counts from the canonical role projection"
      >
        <div className="border-b border-border/60 p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Job roles describe employees; they do not grant workspace permissions.
          </p>
          {canManage ? (
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openEditor()}>
              <Plus className="mr-1.5 h-4 w-4" /> Create role
            </Button>
          ) : null}
        </div>
        {rolesQuery.isPending && !rolesQuery.data ? (
          <TableSkeleton rows={3} />
        ) : rolesQuery.error ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title="Roles didn't load"
            description={getOrganizationPeopleErrorMessage(rolesQuery.error, "Please try again.")}
            action={{ label: "Retry", onClick: () => void rolesQuery.refetch() }}
          />
        ) : rolesQuery.data?.length ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {rolesQuery.data.map((role) => (
              <div key={role.public_id} className="rounded-xl border border-border/60 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{role.name}</div>
                    <div className="mt-2 text-2xl font-semibold tabular-nums">
                      {role.assigned_people_count}
                    </div>
                    <div className="text-[11px] text-muted-foreground">people assigned</div>
                  </div>
                  <Badge variant="outline" className="rounded-full">
                    {role.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {canManage ? (
                  <div className="mt-3 flex gap-1 border-t border-border/60 pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg"
                      onClick={() => openEditor(role)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    {role.is_active ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg text-destructive"
                        disabled={pending}
                        onClick={() => void deactivate(role)}
                      >
                        <PowerOff className="mr-1 h-3.5 w-3.5" /> Deactivate
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BriefcaseBusiness}
            title="No job roles yet"
            description="Create a role to assign structured job titles to People and invitations."
            action={canManage ? { label: "Create role", onClick: () => openEditor() } : undefined}
          />
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit role" : "Create role"}</DialogTitle>
            <DialogDescription>
              Role names are unique within this organization after whitespace and case
              normalization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="job-role-name">Role name</Label>
              <Input
                id="job-role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 rounded-xl"
                placeholder="Software Engineer"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="job-role-description">Description</Label>
              <Textarea
                id="job-role-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1.5"
                placeholder="Optional internal description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="btn-premium rounded-xl"
              disabled={!name.trim() || pending}
              onClick={() => void save()}
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Save role" : "Create role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
