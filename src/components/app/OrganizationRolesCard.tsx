import { useState } from "react";
import { BriefcaseBusiness, Check, Loader2, Pencil, Plus, PowerOff, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrganizationJobRole } from "@/lib/api/hr-v2";
import { getOrganizationPeopleErrorMessage } from "@/lib/organization-people";
import {
  useApproveOrganizationJobRoleMutation,
  useCreateOrganizationJobRoleMutation,
  useDeactivateOrganizationJobRoleMutation,
  useOrganizationJobRolesQuery,
  useRejectOrganizationJobRoleMutation,
  useUpdateOrganizationJobRoleMutation,
} from "@/lib/queries/hr-v2";

export function OrganizationRolesCard({
  orgPublicId,
  canCreate = true,
  canManage,
}: {
  orgPublicId: string;
  canCreate?: boolean;
  canManage: boolean;
}) {
  const rolesQuery = useOrganizationJobRolesQuery(orgPublicId);
  const createMutation = useCreateOrganizationJobRoleMutation(orgPublicId);
  const updateMutation = useUpdateOrganizationJobRoleMutation(orgPublicId);
  const deactivateMutation = useDeactivateOrganizationJobRoleMutation(orgPublicId);
  const approveMutation = useApproveOrganizationJobRoleMutation(orgPublicId);
  const rejectMutation = useRejectOrganizationJobRoleMutation(orgPublicId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationJobRole | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState<"none" | "onsite" | "hybrid" | "remote">("none");

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deactivateMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending;

  function openEditor(role?: OrganizationJobRole) {
    setEditing(role ?? null);
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setDepartment(role?.department ?? "");
    setLocation(role?.location ?? "");
    setWorkMode(role?.work_mode ?? "none");
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) return;
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          rolePublicId: editing.public_id,
          payload: {
            name: name.trim(),
            description: description.trim() || null,
            department: department.trim() || null,
            location: location.trim() || null,
            work_mode: workMode === "none" ? null : workMode,
          },
        });
        toast.success("Role updated");
      } else {
        const created = await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || null,
          department: department.trim() || null,
          location: location.trim() || null,
          work_mode: workMode === "none" ? null : workMode,
          mode: "submit",
        });
        toast.success(
          created.status === "pending_approval"
            ? "Hiring Role proposed for approval"
            : "Hiring Role created",
        );
      }
      setOpen(false);
    } catch (error) {
      toast.error(getOrganizationPeopleErrorMessage(error, "We couldn't save that role."));
    }
  }

  async function decide(role: OrganizationJobRole, action: "approve" | "reject") {
    try {
      if (action === "approve") {
        await approveMutation.mutateAsync(role.public_id);
        toast.success("Hiring Role approved");
      } else {
        await rejectMutation.mutateAsync({ rolePublicId: role.public_id });
        toast.success("Hiring Role rejected");
      }
    } catch (error) {
      toast.error(getOrganizationPeopleErrorMessage(error, `We couldn't ${action} that role.`));
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
        title="Hiring Roles"
        description="Create roles for candidate invitations and review Member proposals"
      >
        <div className="border-b border-border/60 p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Job roles describe employees; they do not grant workspace permissions.
          </p>
          {canCreate ? (
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
                    {formatRoleStatus(role.status)}
                  </Badge>
                </div>
                {canManage ? (
                  <div className="mt-3 flex gap-1 border-t border-border/60 pt-3">
                    {role.status === "pending_approval" ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-success"
                          disabled={pending}
                          onClick={() => void decide(role, "approve")}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-destructive"
                          disabled={pending}
                          onClick={() => void decide(role, "reject")}
                        >
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg"
                      onClick={() => openEditor(role)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    {role.status === "active" ? (
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
            action={canCreate ? { label: "Create role", onClick: () => openEditor() } : undefined}
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
              <Label htmlFor="job-role-department">Department</Label>
              <Input
                id="job-role-department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="mt-1.5 rounded-xl"
                placeholder="Engineering"
              />
            </div>
            <div>
              <Label htmlFor="job-role-location">Location</Label>
              <Input
                id="job-role-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="mt-1.5 rounded-xl"
                placeholder="Bengaluru"
              />
            </div>
            <div>
              <Label>Work mode</Label>
              <Select
                value={workMode}
                onValueChange={(value) => setWorkMode(value as typeof workMode)}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!canManage && !editing ? (
              <p className="text-xs text-muted-foreground">
                Your role proposal will remain Pending approval until an Owner or Admin approves it.
              </p>
            ) : null}
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

function formatRoleStatus(status: OrganizationJobRole["status"]) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
