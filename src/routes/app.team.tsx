import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, SectionCard, EmptyState } from "@/components/app/primitives";
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
  UserPlus,
  Shield,
  Search,
  MoreHorizontal,
  Mail,
  Ban,
  RotateCcw,
  Trash2,
  Crown,
  CheckCircle2,
  X,
  Users,
  SearchX,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/team")({ component: TeamPage });

type Role = "Owner" | "Admin" | "Hiring Manager" | "Recruiter" | "Viewer";
type Status = "Active" | "Invitation Pending" | "Invitation Expired" | "Suspended";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  lastActive: string;
  joinedAt: string;
  invitedBy: string;
}

const ROLES: Role[] = ["Owner", "Admin", "Hiring Manager", "Recruiter", "Viewer"];
const STATUSES: Status[] = ["Active", "Invitation Pending", "Invitation Expired", "Suspended"];

const roleStyle: Record<Role, string> = {
  Owner: "bg-foreground text-background border-transparent",
  Admin: "bg-info/15 text-info-foreground border-info/25",
  "Hiring Manager": "bg-primary/10 text-primary border-primary/25",
  Recruiter: "bg-success/15 text-success border-success/25",
  Viewer: "bg-foreground/[0.06] text-foreground border-border/60",
};

const statusStyle: Record<Status, string> = {
  Active: "bg-success/15 text-success border-success/25",
  "Invitation Pending": "bg-warning/15 text-warning-foreground border-warning/25",
  "Invitation Expired": "bg-destructive/10 text-destructive border-destructive/25",
  Suspended: "bg-foreground/[0.06] text-muted-foreground border-border/60",
};

const roleDescriptions: Record<Role, string> = {
  Owner: "Full control including billing and ownership transfer.",
  Admin: "Manage team, workspace settings, and all verification activity.",
  "Hiring Manager": "Invite candidates and review verification results.",
  Recruiter: "Create invitations and manage assigned candidates.",
  Viewer: "Read-only access to people and verification results.",
};

const seed: Member[] = [
  { id: "U-001", name: "Riya Kapoor", email: "riya@acme.co", role: "Owner", status: "Active", lastActive: "Just now", joinedAt: "2024-08-14", invitedBy: "—" },
  { id: "U-002", name: "Arjun Sethi", email: "arjun@acme.co", role: "Admin", status: "Active", lastActive: "3m ago", joinedAt: "2024-09-02", invitedBy: "Riya Kapoor" },
  { id: "U-003", name: "Nikhil Bose", email: "nikhil@acme.co", role: "Hiring Manager", status: "Active", lastActive: "1h ago", joinedAt: "2024-10-11", invitedBy: "Arjun Sethi" },
  { id: "U-004", name: "Meera Shah", email: "meera@acme.co", role: "Recruiter", status: "Active", lastActive: "Yesterday", joinedAt: "2024-11-20", invitedBy: "Arjun Sethi" },
  { id: "U-005", name: "Devika Rao", email: "devika@acme.co", role: "Viewer", status: "Invitation Pending", lastActive: "—", joinedAt: "2026-07-10", invitedBy: "Riya Kapoor" },
  { id: "U-006", name: "Kabir Menon", email: "kabir@acme.co", role: "Recruiter", status: "Invitation Expired", lastActive: "—", joinedAt: "2026-06-22", invitedBy: "Meera Shah" },
  { id: "U-007", name: "Ishaan Verma", email: "ishaan@acme.co", role: "Viewer", status: "Suspended", lastActive: "12d ago", joinedAt: "2025-02-15", invitedBy: "Riya Kapoor" },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function TeamPage() {
  const [members, setMembers] = useState<Member[]>(seed);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState<"form" | "success">("form");
  const [form, setForm] = useState<{ name: string; email: string; role: Role; message: string }>({
    name: "",
    email: "",
    role: "Recruiter",
    message: "",
  });

  const [roleDialog, setRoleDialog] = useState<{ open: boolean; member?: Member; nextRole: Role }>({
    open: false,
    nextRole: "Recruiter",
  });
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; toId?: string }>({ open: false });
  const [confirm, setConfirm] = useState<{
    open: boolean;
    kind?: "suspend" | "restore" | "remove";
    member?: Member;
  }>({ open: false });

  const owners = members.filter((m) => m.role === "Owner" && m.status === "Active");
  const isLastActiveOwner = (m: Member) => m.role === "Owner" && owners.length <= 1;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return members.filter((m) => {
      if (query && !m.name.toLowerCase().includes(query) && !m.email.toLowerCase().includes(query)) return false;
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      return true;
    });
  }, [members, q, roleFilter, statusFilter]);

  const hasFilters = q !== "" || roleFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => {
    setQ("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const openInvite = () => {
    setForm({ name: "", email: "", role: "Recruiter", message: "" });
    setInviteStep("form");
    setInviteOpen(true);
  };

  const sendInvite = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    const newMember: Member = {
      id: `U-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: "Invitation Pending",
      lastActive: "—",
      joinedAt: new Date().toISOString().slice(0, 10),
      invitedBy: "Riya Kapoor",
    };
    setMembers((prev) => [newMember, ...prev]);
    setInviteStep("success");
    toast.success("Team invitation sent");
  };

  const changeRole = (m: Member, next: Role) => {
    if (m.role === next) return;
    if (m.role === "Owner" && isLastActiveOwner(m)) {
      toast.error("Transfer ownership before changing the last Owner's role.");
      return;
    }
    setRoleDialog({ open: true, member: m, nextRole: next });
  };

  const applyRole = () => {
    if (!roleDialog.member) return;
    const memberId = roleDialog.member.id;
    setMembers((prev) => prev.map((x) => (x.id === memberId ? { ...x, role: roleDialog.nextRole } : x)));
    toast.success(`Role updated to ${roleDialog.nextRole}`);
    setRoleDialog({ open: false, nextRole: "Recruiter" });
  };

  const resend = (m: Member) => {
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "Invitation Pending" } : x)));
    toast.success(`Invitation resent to ${m.email}`);
  };

  const requestSuspend = (m: Member) => {
    if (isLastActiveOwner(m)) {
      toast.error("You cannot suspend the last Owner. Transfer ownership first.");
      return;
    }
    setConfirm({ open: true, kind: "suspend", member: m });
  };

  const requestRestore = (m: Member) => setConfirm({ open: true, kind: "restore", member: m });

  const requestRemove = (m: Member) => {
    if (isLastActiveOwner(m)) {
      toast.error("You cannot remove the last Owner. Transfer ownership first.");
      return;
    }
    setConfirm({ open: true, kind: "remove", member: m });
  };

  const applyConfirm = () => {
    const { kind, member } = confirm;
    if (!member || !kind) return;
    if (kind === "suspend") {
      setMembers((prev) => prev.map((x) => (x.id === member.id ? { ...x, status: "Suspended" } : x)));
      toast.success(`${member.name} suspended`);
    } else if (kind === "restore") {
      setMembers((prev) => prev.map((x) => (x.id === member.id ? { ...x, status: "Active" } : x)));
      toast.success(`${member.name} restored`);
    } else if (kind === "remove") {
      setMembers((prev) => prev.filter((x) => x.id !== member.id));
      toast.success(`${member.name} removed from workspace`);
    }
    setConfirm({ open: false });
  };

  const eligibleForOwnership = members.filter(
    (m) => m.status === "Active" && m.role !== "Owner",
  );

  const applyTransfer = () => {
    if (!transferDialog.toId) return;
    const toId = transferDialog.toId;
    setMembers((prev) => {
      const current = prev.find((m) => m.role === "Owner");
      return prev.map((m) => {
        if (m.id === toId) return { ...m, role: "Owner" as Role };
        if (current && m.id === current.id) return { ...m, role: "Admin" as Role };
        return m;
      });
    });
    toast.success("Ownership transferred");
    setTransferDialog({ open: false });
  };

  const stats = [
    { label: "Total members", value: members.length },
    { label: "Active", value: members.filter((m) => m.status === "Active").length },
    { label: "Pending", value: members.filter((m) => m.status === "Invitation Pending").length },
    { label: "Owners & Admins", value: members.filter((m) => m.role === "Owner" || m.role === "Admin").length },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Team"
        description="Manage teammates, roles, and access to the Kairo Trust Workspace."
        actions={
          <Button onClick={openInvite} className="btn-premium rounded-xl" size="sm">
            <UserPlus className="h-4 w-4 mr-1.5" /> Invite team member
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-background p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-semibold tabular-nums mt-2">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9 h-9 rounded-xl"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "all")}>
          <SelectTrigger className="h-9 w-[150px] rounded-xl">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
          <SelectTrigger className="h-9 w-[170px] rounded-xl">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
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
          {filtered.length} of {members.length}
        </div>
      </div>

      <SectionCard title="Members" description="Everyone with access to this workspace">
        {members.length === 0 ? (
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
            {/* Desktop table */}
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
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-b border-border/40 hover:bg-foreground/[0.02]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 shrink-0 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-medium">
                            {initials(m.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{m.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge variant="outline" className={`rounded-full ${roleStyle[m.role]}`}>
                          {m.role}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Badge variant="outline" className={`rounded-full ${statusStyle[m.status]}`}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="py-4 text-[12px] text-muted-foreground">{m.lastActive}</td>
                      <td className="py-4 text-[12px] text-muted-foreground">{m.joinedAt}</td>
                      <td className="py-4 text-[12px] text-muted-foreground">{m.invitedBy}</td>
                      <td className="py-4 pr-4">
                        <MemberMenu
                          member={m}
                          isLastOwner={isLastActiveOwner(m)}
                          onChangeRole={(r) => changeRole(m, r)}
                          onResend={() => resend(m)}
                          onSuspend={() => requestSuspend(m)}
                          onRestore={() => requestRestore(m)}
                          onRemove={() => requestRemove(m)}
                          onTransfer={() => setTransferDialog({ open: true })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border/60">
              {filtered.map((m) => (
                <div key={m.id} className="px-4 py-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-medium">
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>
                      </div>
                    </div>
                    <MemberMenu
                      member={m}
                      isLastOwner={isLastActiveOwner(m)}
                      onChangeRole={(r) => changeRole(m, r)}
                      onResend={() => resend(m)}
                      onSuspend={() => requestSuspend(m)}
                      onRestore={() => requestRestore(m)}
                      onRemove={() => requestRemove(m)}
                      onTransfer={() => setTransferDialog({ open: true })}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`rounded-full ${roleStyle[m.role]}`}>
                      {m.role}
                    </Badge>
                    <Badge variant="outline" className={`rounded-full ${statusStyle[m.status]}`}>
                      {m.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <div>
                      <div className="uppercase tracking-wider">Last active</div>
                      <div className="text-foreground/80 mt-0.5">{m.lastActive}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-wider">Joined</div>
                      <div className="text-foreground/80 mt-0.5">{m.joinedAt}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="uppercase tracking-wider">Invited by</div>
                      <div className="text-foreground/80 mt-0.5">{m.invitedBy}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* Invite dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(o) => {
          setInviteOpen(o);
          if (!o) setInviteStep("form");
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
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Alex Doe"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Work email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="alex@company.com"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["Admin", "Hiring Manager", "Recruiter", "Viewer"] as Role[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1.5">{roleDescriptions[form.role]}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Personal message <span className="text-muted-foreground/60">(optional)</span>
                  </Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Welcome to the team — looking forward to working together."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button className="btn-premium rounded-xl" onClick={sendInvite}>
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
                  We've emailed {form.email} an invitation to join your workspace.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="pt-4 sm:justify-center gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setInviteOpen(false)}>
                  Close
                </Button>
                <Button
                  className="btn-premium rounded-xl"
                  onClick={() => {
                    setForm({ name: "", email: "", role: "Recruiter", message: "" });
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

      {/* Change role dialog */}
      <Dialog
        open={roleDialog.open}
        onOpenChange={(o) => setRoleDialog((prev) => ({ ...prev, open: o }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Update {roleDialog.member?.name}'s role and access permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">New role</Label>
            <Select
              value={roleDialog.nextRole}
              onValueChange={(v) => setRoleDialog((prev) => ({ ...prev, nextRole: v as Role }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Admin", "Hiring Manager", "Recruiter", "Viewer"] as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1.5">{roleDescriptions[roleDialog.nextRole]}</p>
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setRoleDialog({ open: false, nextRole: "Recruiter" })}
            >
              Cancel
            </Button>
            <Button className="btn-premium rounded-xl" onClick={applyRole}>
              Update role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer ownership dialog */}
      <Dialog
        open={transferDialog.open}
        onOpenChange={(o) => setTransferDialog({ open: o })}
      >
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
                No active teammates are eligible. Invite or activate someone first.
              </div>
            ) : (
              <Select
                value={transferDialog.toId ?? ""}
                onValueChange={(v) => setTransferDialog({ open: true, toId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teammate" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleForOwnership.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} · {m.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setTransferDialog({ open: false })}>
              Cancel
            </Button>
            <Button
              className="btn-premium rounded-xl"
              disabled={!transferDialog.toId}
              onClick={applyTransfer}
            >
              <Crown className="h-4 w-4 mr-1.5" /> Transfer ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm destructive actions */}
      <AlertDialog
        open={confirm.open}
        onOpenChange={(o) => setConfirm((prev) => ({ ...prev, open: o }))}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.kind === "suspend" && `Suspend ${confirm.member?.name}?`}
              {confirm.kind === "restore" && `Restore ${confirm.member?.name}?`}
              {confirm.kind === "remove" && `Remove ${confirm.member?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.kind === "suspend" &&
                "They will immediately lose access to the workspace. You can restore access later."}
              {confirm.kind === "restore" &&
                "They will regain workspace access with their previous role."}
              {confirm.kind === "remove" &&
                "This permanently removes their access. Verification history they created will be retained."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={`rounded-xl ${confirm.kind === "remove" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
              onClick={applyConfirm}
            >
              {confirm.kind === "suspend" && "Suspend access"}
              {confirm.kind === "restore" && "Restore access"}
              {confirm.kind === "remove" && "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MemberMenu({
  member,
  isLastOwner,
  onChangeRole,
  onResend,
  onSuspend,
  onRestore,
  onRemove,
  onTransfer,
}: {
  member: Member;
  isLastOwner: boolean;
  onChangeRole: (r: Role) => void;
  onResend: () => void;
  onSuspend: () => void;
  onRestore: () => void;
  onRemove: () => void;
  onTransfer: () => void;
}) {
  const isPending = member.status === "Invitation Pending" || member.status === "Invitation Expired";
  const isSuspended = member.status === "Suspended";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Change role
        </DropdownMenuLabel>
        {(["Admin", "Hiring Manager", "Recruiter", "Viewer"] as Role[]).map((r) => (
          <DropdownMenuItem
            key={r}
            disabled={isLastOwner || member.role === r}
            onClick={() => onChangeRole(r)}
          >
            <Shield className="h-3.5 w-3.5 mr-2" /> {r}
            {member.role === r ? (
              <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
            ) : null}
          </DropdownMenuItem>
        ))}
        {isLastOwner ? (
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
            Transfer ownership before changing this Owner's role.
          </div>
        ) : null}
        <DropdownMenuSeparator />
        {isPending ? (
          <DropdownMenuItem onClick={onResend}>
            <Mail className="h-3.5 w-3.5 mr-2" /> Resend invitation
          </DropdownMenuItem>
        ) : null}
        {member.role === "Owner" ? (
          <DropdownMenuItem onClick={onTransfer}>
            <Crown className="h-3.5 w-3.5 mr-2" /> Transfer ownership
          </DropdownMenuItem>
        ) : null}
        {!isSuspended ? (
          <DropdownMenuItem
            disabled={isLastOwner}
            onClick={onSuspend}
          >
            <Ban className="h-3.5 w-3.5 mr-2" /> Suspend access
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onRestore}>
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Restore access
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={isLastOwner}
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove access
        </DropdownMenuItem>
        {isLastOwner ? (
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
            The last Owner cannot be suspended or removed.
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
