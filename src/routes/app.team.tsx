import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { PermissionDenied } from "@/components/app/access/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Crown,
  Filter,
  Mail,
  MoreHorizontal,
  RotateCcw,
  Search,
  SearchX,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAccess } from "@/lib/access-context";
import { ApiError } from "@/lib/api/client";
import type {
  BackendOrganizationInvitationResponse,
  BackendOrganizationMemberResponse,
} from "@/lib/api/organization-members";
import { mapTeamRoleToBackend } from "@/lib/team";
import {
  TEAM_ASSIGNABLE_ROLES,
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLES,
  TEAM_ROLE_STYLE,
  TEAM_STATUSES,
  TEAM_STATUS_STYLE,
  buildTeamRecords,
  getTeamErrorMessage,
  initials,
  type TeamRecord,
  type TeamRole,
  type TeamStatus,
} from "@/lib/team";
import {
  useCancelOrganizationInvitationMutation,
  useCreateOrganizationInvitationMutation,
  useOrganizationInvitationsQuery,
  useOrganizationMembersQuery,
  useRemoveOrganizationMemberMutation,
  useResendOrganizationInvitationMutation,
  useRestoreOrganizationMemberMutation,
  useSuspendOrganizationMemberMutation,
  useTransferOrganizationOwnershipMutation,
  useUpdateOrganizationMemberMutation,
} from "@/lib/queries/team";

export const Route = createFileRoute("/app/team")({ component: TeamPage });

interface InviteFormValue {
  name: string;
  email: string;
  role: TeamRole;
  message: string;
}

interface RoleDialogState {
  open: boolean;
  record?: TeamRecord;
  nextRole: TeamRole;
}

interface TransferDialogState {
  open: boolean;
  ownerRecord?: TeamRecord;
  toMemberPublicId?: string;
}

interface ConfirmState {
  open: boolean;
  kind?: "suspend" | "restore" | "remove" | "cancel";
  record?: TeamRecord;
}

const DEFAULT_INVITE_FORM: InviteFormValue = {
  name: "",
  email: "",
  role: "Member",
  message: "",
};

const EMPTY_MEMBERS: BackendOrganizationMemberResponse[] = [];
const EMPTY_INVITATIONS: BackendOrganizationInvitationResponse[] = [];

function TeamPage() {
  const { org, can, role: currentRole } = useAccess();
  const canManageTeam = can("manage_team");
  const canTransferOwnership = can("transfer_ownership");
  const orgPublicId = org?.publicId;

  const membersQuery = useOrganizationMembersQuery(orgPublicId);
  const invitationsQuery = useOrganizationInvitationsQuery(orgPublicId);
  const inviteMutation = useCreateOrganizationInvitationMutation(orgPublicId);
  const updateRoleMutation = useUpdateOrganizationMemberMutation(orgPublicId);
  const suspendMutation = useSuspendOrganizationMemberMutation(orgPublicId);
  const restoreMutation = useRestoreOrganizationMemberMutation(orgPublicId);
  const removeMutation = useRemoveOrganizationMemberMutation(orgPublicId);
  const transferMutation = useTransferOrganizationOwnershipMutation(orgPublicId);
  const resendInvitationMutation = useResendOrganizationInvitationMutation(orgPublicId);
  const cancelInvitationMutation = useCancelOrganizationInvitationMutation(orgPublicId);

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<TeamRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TeamStatus | "all">("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState<"form" | "success">("form");
  const [inviteForm, setInviteForm] = useState<InviteFormValue>(DEFAULT_INVITE_FORM);
  const [roleDialog, setRoleDialog] = useState<RoleDialogState>({
    open: false,
    nextRole: "Member",
  });
  const [transferDialog, setTransferDialog] = useState<TransferDialogState>({
    open: false,
  });
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });

  const members = membersQuery.data ?? EMPTY_MEMBERS;
  const invitations = invitationsQuery.data ?? EMPTY_INVITATIONS;
  const records = useMemo(() => buildTeamRecords(members, invitations), [invitations, members]);

  const activeOwnerCount = useMemo(
    () =>
      members.filter((member) => member.role === "owner" && member.suspended_at === null).length,
    [members],
  );

  const eligibleForOwnership = useMemo(
    () =>
      records.filter(
        (record) =>
          record.kind === "member" &&
          record.memberPublicId &&
          record.role !== "Owner" &&
          record.status === "Active",
      ),
    [records],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return records.filter((record) => {
      if (
        query &&
        !record.name.toLowerCase().includes(query) &&
        !record.email.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (roleFilter !== "all" && record.role !== roleFilter) return false;
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      return true;
    });
  }, [q, records, roleFilter, statusFilter]);

  const stats = useMemo(
    () => [
      { label: "Total members", value: members.length },
      {
        label: "Active",
        value: members.filter((member) => member.suspended_at === null).length,
      },
      {
        label: "Pending",
        value: invitations.filter((invitation) => invitation.status === "pending").length,
      },
      {
        label: "Owners & Admins",
        value: members.filter((member) => member.role === "owner" || member.role === "admin")
          .length,
      },
    ],
    [invitations, members],
  );

  const pending =
    inviteMutation.isPending ||
    updateRoleMutation.isPending ||
    suspendMutation.isPending ||
    restoreMutation.isPending ||
    removeMutation.isPending ||
    transferMutation.isPending ||
    resendInvitationMutation.isPending ||
    cancelInvitationMutation.isPending;

  const loadError = membersQuery.error ?? invitationsQuery.error;
  const isLoading =
    (membersQuery.isPending && !membersQuery.data) ||
    (invitationsQuery.isPending && !invitationsQuery.data);
  const hasFilters = q !== "" || roleFilter !== "all" || statusFilter !== "all";

  if (!orgPublicId) {
    return (
      <EmptyState
        icon={Users}
        title="No active organization"
        description="Team management becomes available once an organization is active in this workspace."
      />
    );
  }

  if (!canManageTeam) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Permission denied"
        description="You don't have permission to manage team access for this workspace."
      />
    );
  }

  const clearFilters = () => {
    setQ("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const retry = () => {
    void membersQuery.refetch();
    void invitationsQuery.refetch();
  };

  const isLastActiveOwner = (record: TeamRecord) =>
    record.kind === "member" &&
    record.role === "Owner" &&
    record.status === "Active" &&
    activeOwnerCount <= 1;

  const ownerProtected = (record: TeamRecord) =>
    record.kind === "member" && record.role === "Owner" && currentRole !== "Owner";

  const openInvite = () => {
    setInviteForm(DEFAULT_INVITE_FORM);
    setInviteStep("form");
    setInviteOpen(true);
  };

  const handleSendInvite = async () => {
    if (!inviteForm.email.trim()) {
      toast.error("Work email is required");
      return;
    }

    try {
      await inviteMutation.mutateAsync({
        invitee_email: inviteForm.email.trim(),
        role: mapTeamRoleToBackend(inviteForm.role),
      });
      setInviteStep("success");
      toast.success("Team invitation sent");
    } catch (error) {
      toast.error(getTeamErrorMessage(error, "We couldn't send that team invitation."));
    }
  };

  const handleChangeRole = (record: TeamRecord, nextRole: TeamRole) => {
    if (record.kind !== "member" || !record.memberPublicId || record.role === nextRole) {
      return;
    }
    if (record.role === "Owner") {
      toast.error("Owner role changes must happen through ownership transfer.");
      return;
    }
    setRoleDialog({ open: true, record, nextRole });
  };

  const applyRoleChange = async () => {
    if (!roleDialog.record?.memberPublicId) return;

    try {
      await updateRoleMutation.mutateAsync({
        memberPublicId: roleDialog.record.memberPublicId,
        payload: { role: mapTeamRoleToBackend(roleDialog.nextRole) },
      });
      toast.success(`Role updated to ${roleDialog.nextRole}`);
      setRoleDialog({ open: false, nextRole: "Member" });
    } catch (error) {
      toast.error(getTeamErrorMessage(error, "We couldn't update that role."));
    }
  };

  const applyConfirm = async () => {
    const record = confirm.record;
    const kind = confirm.kind;

    if (!record || !kind) return;

    try {
      if (kind === "suspend" && record.memberPublicId) {
        await suspendMutation.mutateAsync({
          memberPublicId: record.memberPublicId,
          payload: { reason: null },
        });
        toast.success(`${record.name} suspended`);
      }

      if (kind === "restore" && record.memberPublicId) {
        await restoreMutation.mutateAsync(record.memberPublicId);
        toast.success(`${record.name} restored`);
      }

      if (kind === "remove" && record.memberPublicId) {
        await removeMutation.mutateAsync(record.memberPublicId);
        toast.success(`${record.name} removed from workspace`);
      }

      if (kind === "cancel" && record.invitationPublicId) {
        await cancelInvitationMutation.mutateAsync(record.invitationPublicId);
        toast.success("Invitation cancelled");
      }

      setConfirm({ open: false });
    } catch (error) {
      toast.error(getTeamErrorMessage(error, "We couldn't complete that team action."));
    }
  };

  const handleResendInvitation = async (record: TeamRecord) => {
    if (!record.invitationPublicId) return;

    if (record.status !== "Invitation Pending") {
      toast.error("Only pending invitations can be resent with the current backend contract.");
      return;
    }

    try {
      await resendInvitationMutation.mutateAsync(record.invitationPublicId);
      toast.success(`Invitation resent to ${record.email}`);
    } catch (error) {
      toast.error(getTeamErrorMessage(error, "We couldn't resend that invitation."));
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferDialog.toMemberPublicId) return;

    try {
      await transferMutation.mutateAsync(transferDialog.toMemberPublicId);
      toast.success("Ownership transferred");
      setTransferDialog({ open: false });
    } catch (error) {
      toast.error(getTeamErrorMessage(error, "We couldn't transfer ownership."));
    }
  };

  if (loadError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={
          loadError instanceof ApiError && loadError.status === 403
            ? "Permission denied"
            : "Team didn't load"
        }
        description={getTeamErrorMessage(loadError, "Please try again.")}
        action={{ label: "Retry", onClick: retry }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Team"
        description="Manage teammates, roles, and access to the Kairo Trust Workspace."
        actions={
          <Button
            onClick={openInvite}
            className="btn-premium rounded-xl"
            size="sm"
            disabled={!canManageTeam}
          >
            <UserPlus className="h-4 w-4 mr-1.5" /> Invite team member
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/60 bg-background p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </div>
            <div className="text-2xl font-semibold tabular-nums mt-2">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search by name or email…"
            className="pl-9 h-9 rounded-xl"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as TeamRole | "all")}
        >
          <SelectTrigger className="h-9 w-[150px] rounded-xl">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {TEAM_ROLES.map((teamRole) => (
              <SelectItem key={teamRole} value={teamRole}>
                {teamRole}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as TeamStatus | "all")}
        >
          <SelectTrigger className="h-9 w-[190px] rounded-xl">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TEAM_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters ? (
          <Button variant="ghost" size="sm" className="h-9 rounded-xl" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear filters
          </Button>
        ) : null}
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {records.length}
        </div>
      </div>

      <SectionCard title="Members" description="Everyone with access to this workspace">
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Invite people from your team to collaborate on trust and verification."
            action={{ label: "Invite team member", onClick: openInvite }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={q ? "No results found" : "No members match those filters"}
            description={
              q
                ? `We couldn't find anyone matching "${q}".`
                : "Try changing or clearing the role and status filters."
            }
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-medium px-5 py-3">Member</th>
                    <th className="text-left font-medium py-3">Role</th>
                    <th className="text-left font-medium py-3">Status</th>
                    <th className="text-left font-medium py-3">Last active</th>
                    <th className="text-left font-medium py-3">Joined</th>
                    <th className="text-left font-medium py-3">Invited by</th>
                    <th className="w-10 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr
                      key={`${record.kind}-${record.id}`}
                      className="border-b border-border/40 hover:bg-foreground/[0.02]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 shrink-0 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-medium">
                            {initials(record.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{record.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {record.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge
                          variant="outline"
                          className={`rounded-full ${TEAM_ROLE_STYLE[record.role]}`}
                        >
                          {record.role}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Badge
                          variant="outline"
                          className={`rounded-full ${TEAM_STATUS_STYLE[record.status]}`}
                        >
                          {record.status}
                        </Badge>
                      </td>
                      <td className="py-4 text-[12px] text-muted-foreground">
                        {record.lastActive}
                      </td>
                      <td className="py-4 text-[12px] text-muted-foreground">{record.joinedAt}</td>
                      <td className="py-4 text-[12px] text-muted-foreground">{record.invitedBy}</td>
                      <td className="py-4 pr-4">
                        <TeamRecordMenu
                          canTransferOwnership={canTransferOwnership}
                          isLastOwner={isLastActiveOwner(record)}
                          ownerProtected={ownerProtected(record)}
                          pending={pending}
                          record={record}
                          onCancelInvitation={() =>
                            setConfirm({ open: true, kind: "cancel", record })
                          }
                          onChangeRole={(nextRole) => handleChangeRole(record, nextRole)}
                          onResendInvitation={() => void handleResendInvitation(record)}
                          onRestore={() => setConfirm({ open: true, kind: "restore", record })}
                          onSuspend={() => setConfirm({ open: true, kind: "suspend", record })}
                          onTransfer={() => setTransferDialog({ open: true, ownerRecord: record })}
                          onRemove={() => setConfirm({ open: true, kind: "remove", record })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-border/60">
              {filtered.map((record) => (
                <div key={`${record.kind}-${record.id}`} className="px-4 py-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-medium">
                        {initials(record.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{record.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {record.email}
                        </div>
                      </div>
                    </div>
                    <TeamRecordMenu
                      canTransferOwnership={canTransferOwnership}
                      isLastOwner={isLastActiveOwner(record)}
                      ownerProtected={ownerProtected(record)}
                      pending={pending}
                      record={record}
                      onCancelInvitation={() => setConfirm({ open: true, kind: "cancel", record })}
                      onChangeRole={(nextRole) => handleChangeRole(record, nextRole)}
                      onResendInvitation={() => void handleResendInvitation(record)}
                      onRestore={() => setConfirm({ open: true, kind: "restore", record })}
                      onSuspend={() => setConfirm({ open: true, kind: "suspend", record })}
                      onTransfer={() => setTransferDialog({ open: true, ownerRecord: record })}
                      onRemove={() => setConfirm({ open: true, kind: "remove", record })}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`rounded-full ${TEAM_ROLE_STYLE[record.role]}`}
                    >
                      {record.role}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`rounded-full ${TEAM_STATUS_STYLE[record.status]}`}
                    >
                      {record.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <div>
                      <div className="uppercase tracking-wider">Last active</div>
                      <div className="text-foreground/80 mt-0.5">{record.lastActive}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-wider">{record.joinedAtLabel}</div>
                      <div className="text-foreground/80 mt-0.5">{record.joinedAt}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="uppercase tracking-wider">{record.invitedByLabel}</div>
                      <div className="text-foreground/80 mt-0.5">{record.invitedBy}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteStep("form");
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          {inviteStep === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle>Invite team member</DialogTitle>
                <DialogDescription>
                  They'll receive an email to join the Kairo Trust Workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 pt-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Full name</Label>
                  <Input
                    value={inviteForm.name}
                    onChange={(event) =>
                      setInviteForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Alex Doe"
                    disabled
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Invitee names aren't currently stored by the backend invitation contract.
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Work email</Label>
                  <Input
                    type="email"
                    value={inviteForm.email}
                    onChange={(event) =>
                      setInviteForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="alex@company.com"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Role</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value) =>
                      setInviteForm((current) => ({ ...current, role: value as TeamRole }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_ASSIGNABLE_ROLES.map((teamRole) => (
                        <SelectItem key={teamRole} value={teamRole}>
                          {teamRole}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {TEAM_ROLE_DESCRIPTIONS[inviteForm.role]}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Personal message <span className="text-muted-foreground/60">(optional)</span>
                  </Label>
                  <Textarea
                    value={inviteForm.message}
                    onChange={(event) =>
                      setInviteForm((current) => ({ ...current, message: event.target.value }))
                    }
                    placeholder="Welcome to the team — looking forward to working together."
                    rows={3}
                    disabled
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Personal invite messages aren't supported by the current backend contract yet.
                  </p>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="btn-premium rounded-xl"
                  onClick={() => void handleSendInvite()}
                  disabled={inviteMutation.isPending}
                >
                  <Mail className="h-4 w-4 mr-1.5" /> Send team invitation
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="mx-auto h-12 w-12 rounded-full bg-success/15 flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <DialogTitle className="text-center">Invitation sent</DialogTitle>
                <DialogDescription className="text-center">
                  We've emailed {inviteForm.email} an invitation to join your workspace.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="pt-4 sm:justify-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setInviteOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="btn-premium rounded-xl"
                  onClick={() => {
                    setInviteForm(DEFAULT_INVITE_FORM);
                    setInviteStep("form");
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-1.5" /> Invite another member
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={roleDialog.open}
        onOpenChange={(open) => setRoleDialog((current) => ({ ...current, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Update {roleDialog.record?.name}'s role and access permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">New role</Label>
            <Select
              value={roleDialog.nextRole}
              onValueChange={(value) =>
                setRoleDialog((current) => ({
                  ...current,
                  nextRole: value as TeamRole,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ASSIGNABLE_ROLES.map((teamRole) => (
                  <SelectItem key={teamRole} value={teamRole}>
                    {teamRole}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {TEAM_ROLE_DESCRIPTIONS[roleDialog.nextRole]}
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setRoleDialog({ open: false, nextRole: "Member" })}
            >
              Cancel
            </Button>
            <Button
              className="btn-premium rounded-xl"
              onClick={() => void applyRoleChange()}
              disabled={updateRoleMutation.isPending}
            >
              Update role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialog.open} onOpenChange={(open) => setTransferDialog({ open })}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogDescription>
              The current Owner will become an Admin. Only one Owner exists at a time.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Transfer to</Label>
            {eligibleForOwnership.length === 0 ? (
              <div className="text-xs text-muted-foreground rounded-xl border border-border/60 p-3">
                No active teammates are eligible. Invite or restore someone first.
              </div>
            ) : (
              <Select
                value={transferDialog.toMemberPublicId ?? ""}
                onValueChange={(value) =>
                  setTransferDialog((current) => ({
                    ...current,
                    open: true,
                    toMemberPublicId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teammate" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleForOwnership.map((record) => (
                    <SelectItem
                      key={record.memberPublicId}
                      value={record.memberPublicId ?? record.id}
                    >
                      {record.name} · {record.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!canTransferOwnership ? (
              <PermissionDenied
                className="mt-2"
                message="Only the current Owner can transfer ownership."
              />
            ) : null}
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setTransferDialog({ open: false })}
            >
              Cancel
            </Button>
            <Button
              className="btn-premium rounded-xl"
              disabled={
                !transferDialog.toMemberPublicId ||
                transferMutation.isPending ||
                !canTransferOwnership
              }
              onClick={() => void handleTransferOwnership()}
            >
              <Crown className="h-4 w-4 mr-1.5" /> Transfer ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm((current) => ({ ...current, open }))}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.kind === "suspend" && `Suspend ${confirm.record?.name}?`}
              {confirm.kind === "restore" && `Restore ${confirm.record?.name}?`}
              {confirm.kind === "remove" && `Remove ${confirm.record?.name}?`}
              {confirm.kind === "cancel" && `Cancel ${confirm.record?.email}'s invitation?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.kind === "suspend" &&
                "They will immediately lose access to the workspace. You can restore access later."}
              {confirm.kind === "restore" &&
                "They will regain workspace access with their previous role."}
              {confirm.kind === "remove" &&
                "This permanently removes their access. Verification history they created will be retained."}
              {confirm.kind === "cancel" &&
                "This invitation will no longer be actionable. You can create a new one later if needed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={`rounded-xl ${
                confirm.kind === "remove"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }`}
              onClick={() => void applyConfirm()}
            >
              {confirm.kind === "suspend" && "Suspend access"}
              {confirm.kind === "restore" && "Restore access"}
              {confirm.kind === "remove" && "Remove member"}
              {confirm.kind === "cancel" && "Cancel invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TeamRecordMenu({
  record,
  isLastOwner,
  ownerProtected,
  canTransferOwnership,
  pending,
  onChangeRole,
  onResendInvitation,
  onCancelInvitation,
  onSuspend,
  onRestore,
  onRemove,
  onTransfer,
}: {
  record: TeamRecord;
  isLastOwner: boolean;
  ownerProtected: boolean;
  canTransferOwnership: boolean;
  pending: boolean;
  onChangeRole: (role: TeamRole) => void;
  onResendInvitation: () => void;
  onCancelInvitation: () => void;
  onSuspend: () => void;
  onRestore: () => void;
  onRemove: () => void;
  onTransfer: () => void;
}) {
  const isInvitation = record.kind === "invitation";
  const isPendingInvitation = record.status === "Invitation Pending";
  const isExpiredInvitation = record.status === "Invitation Expired";
  const isHistoricalInvitation =
    record.status === "Invitation Cancelled" ||
    record.status === "Invitation Declined" ||
    record.status === "Invitation Accepted";
  const isSuspended = record.status === "Suspended";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        {!isInvitation ? (
          <>
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Change role
            </DropdownMenuLabel>
            {TEAM_ASSIGNABLE_ROLES.map((teamRole) => (
              <DropdownMenuItem
                key={teamRole}
                disabled={pending || ownerProtected || isLastOwner || record.role === teamRole}
                onClick={() => onChangeRole(teamRole)}
              >
                <Shield className="h-3.5 w-3.5 mr-2" /> {teamRole}
                {record.role === teamRole ? (
                  <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                ) : null}
              </DropdownMenuItem>
            ))}
            {record.role === "Owner" ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={!canTransferOwnership || pending} onClick={onTransfer}>
                  <Crown className="h-3.5 w-3.5 mr-2" /> Transfer ownership
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            {!isSuspended ? (
              <DropdownMenuItem
                disabled={pending || ownerProtected || isLastOwner}
                onClick={onSuspend}
              >
                <Ban className="h-3.5 w-3.5 mr-2" /> Suspend access
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled={pending || ownerProtected} onClick={onRestore}>
                <RotateCcw className="h-3.5 w-3.5 mr-2" /> Restore access
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={pending || ownerProtected || isLastOwner}
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove access
            </DropdownMenuItem>
            {ownerProtected ? (
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                Admins cannot change or remove the current Owner.
              </div>
            ) : null}
            {isLastOwner ? (
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                The last active Owner cannot be suspended or removed.
              </div>
            ) : null}
          </>
        ) : (
          <>
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Invitation actions
            </DropdownMenuLabel>
            <DropdownMenuItem
              disabled={pending || !isPendingInvitation}
              onClick={onResendInvitation}
            >
              <Mail className="h-3.5 w-3.5 mr-2" /> Resend invitation
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={pending || !isPendingInvitation}
              onClick={onCancelInvitation}
            >
              <X className="h-3.5 w-3.5 mr-2" /> Cancel invitation
            </DropdownMenuItem>
            {isExpiredInvitation ? (
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                Expired invitations are historical. Create a new invitation instead of resending.
              </div>
            ) : null}
            {isHistoricalInvitation ? (
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                Historical invitations are read-only in the current backend contract.
              </div>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
