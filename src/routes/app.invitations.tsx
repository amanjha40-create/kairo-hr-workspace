import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { PageHeader, SectionCard, EmptyState, StatCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { InvitationPill } from "@/components/app/workspace-pills";
import { useDashboard, useFilteredInvitations } from "@/lib/dashboard-context";
import { invitationCounts, PURPOSE_ROLL } from "@/lib/workspace-invitations";
import {
  MailPlus, Search, Copy, MoreHorizontal, Send, RefreshCw, Ban, ChevronRight, Timer, AlertTriangle,
  Mailbox, MailCheck, MailOpen, MailWarning,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const schema = z.object({
  status: fallback(z.string(), "all").default("all"),
  purpose: fallback(z.string(), "all").default("all"),
  type: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/app/invitations")({
  validateSearch: zodValidator(schema),
  component: InvitationsPage,
});

function InvitationsPage() {
  const {
    setInviteOpen, resendInvitation, sendInvitationDraft, cancelInvitation, deleteInvitationDraft, search, setSearch,
    invitations: allInvitations,
  } = useDashboard();
  const nav = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();
  const invitations = useFilteredInvitations();
  const counts = useMemo(() => invitationCounts(allInvitations), [allInvitations]);

  const rows = invitations.filter((i) => {
    if (searchParams.status !== "all" && i.status !== searchParams.status) return false;
    if (searchParams.purpose !== "all" && i.purpose !== searchParams.purpose) return false;
    if (searchParams.type !== "all" && !i.requestedVerifications.includes(searchParams.type as any)) return false;
    return true;
  });

  const copyLink = (id: string) => {
    navigator.clipboard?.writeText(`https://kairoid.com/i/${id}`);
    toast.success("Invitation link copied");
  };

  const setFilter = (key: "status" | "purpose" | "type", value: string) =>
    nav({ search: (p: any) => ({ ...p, [key]: value }) });

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Trust Invitations"
        description="Send consent-first invitations. Track who's opened, accepted, or needs a nudge."
        actions={
          <Button onClick={() => setInviteOpen(true)} className="btn-premium rounded-xl" size="sm">
            <MailPlus className="h-4 w-4 mr-1.5" /> Invite Candidate
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Active Invitations" value={counts.active} icon={Mailbox} onClick={() => setFilter("status", "Sent")} />
        <StatCard label="Awaiting Response" value={counts.awaiting} icon={MailWarning} tone="warning" onClick={() => setFilter("status", "Sent")} />
        <StatCard label="Accepted" value={counts.accepted} icon={MailCheck} tone="success" onClick={() => setFilter("status", "Accepted")} />
        <StatCard label="Expiring Soon" value={counts.expiring} icon={Timer} tone="warning" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invitations…" className="pl-9 h-9 rounded-xl" />
        </div>
        <Select value={searchParams.status} onValueChange={(v) => setFilter("status", v)}>
          <SelectTrigger className="h-9 rounded-xl w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["Draft", "Sent", "Opened", "Accepted", "Expired", "Cancelled"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={searchParams.purpose} onValueChange={(v) => setFilter("purpose", v)}>
          <SelectTrigger className="h-9 rounded-xl w-[170px]"><SelectValue placeholder="Purpose" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All purposes</SelectItem>
            {PURPOSE_ROLL.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={searchParams.type} onValueChange={(v) => setFilter("type", v)}>
          <SelectTrigger className="h-9 rounded-xl w-[180px]"><SelectValue placeholder="Verification" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verifications</SelectItem>
            {["Identity", "Employment", "Education", "Certification", "Professional Reference"].map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{rows.length} of {allInvitations.length}</div>
      </div>

      <SectionCard title="Invitations" description="Newest first">
        {rows.length === 0 ? (
          <EmptyState
            icon={MailPlus}
            title="No invitations match"
            description="Adjust filters or send a new invitation to get started."
            action={{ label: "Invite Candidate", onClick: () => setInviteOpen(true) }}
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-foreground/[0.02] border-b border-border/60">
                  <tr>
                    <th className="text-left font-medium px-5 py-2.5">Candidate</th>
                    <th className="text-left font-medium px-3 py-2.5">Purpose</th>
                    <th className="text-left font-medium px-3 py-2.5">Requested</th>
                    <th className="text-left font-medium px-3 py-2.5">Status</th>
                    <th className="text-left font-medium px-3 py-2.5">Sent</th>
                    <th className="text-left font-medium px-3 py-2.5">Expires</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((inv) => {
                    const expiring = new Date(inv.expiresAt).getTime() - Date.now() < 2 * 86400e3
                      && (inv.status === "Sent" || inv.status === "Opened");
                    return (
                      <tr key={inv.id} className="hover:bg-foreground/[0.02] group cursor-pointer" onClick={() => nav({ to: "/app/invitations/$id", params: { id: inv.id } })}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-medium">
                              {inv.candidateInitials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{inv.candidateName}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{inv.candidateEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-sm truncate max-w-[180px]">{inv.purpose}</div>
                          {inv.internalReference && <div className="text-[11px] text-muted-foreground">Ref · {inv.internalReference}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {inv.requestedVerifications.slice(0, 3).map((t) => (
                              <Badge key={t} variant="outline" className="rounded-full text-[10px] px-2 py-0 font-normal">{t}</Badge>
                            ))}
                            {inv.requestedVerifications.length > 3 && (
                              <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0 font-normal">+{inv.requestedVerifications.length - 3}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3"><InvitationPill value={inv.status} /></td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          {inv.sentAt ? formatDistanceToNow(new Date(inv.sentAt), { addSuffix: true }) : "—"}
                        </td>
                        <td className="px-3 py-3 text-[12px]">
                          {inv.status === "Expired" ? (
                            <span className="text-destructive">Expired</span>
                          ) : expiring ? (
                            <span className="text-warning-foreground inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}</span>
                          ) : (
                            <span className="text-muted-foreground">{formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem asChild>
                                <Link to="/app/invitations/$id" params={{ id: inv.id }}>
                                  <ChevronRight className="h-3.5 w-3.5 mr-2" /> View invitation
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyLink(inv.id)}>
                                <Copy className="h-3.5 w-3.5 mr-2" /> Copy invitation link
                              </DropdownMenuItem>
                              {inv.status === "Draft" && (
                                <>
                                  <DropdownMenuItem onClick={() => { sendInvitationDraft(inv.id); toast.success("Invitation sent"); }}>
                                    <Send className="h-3.5 w-3.5 mr-2" /> Send invitation
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => { deleteInvitationDraft(inv.id); toast.success("Draft deleted"); }}>
                                    Delete draft
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(inv.status === "Sent" || inv.status === "Opened") && (
                                <>
                                  <DropdownMenuItem onClick={() => { resendInvitation(inv.id); toast.success("Reminder sent"); }}>
                                    <RefreshCw className="h-3.5 w-3.5 mr-2" /> Send reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => { cancelInvitation(inv.id); toast.success("Invitation cancelled"); }}>
                                    <Ban className="h-3.5 w-3.5 mr-2" /> Cancel invitation
                                  </DropdownMenuItem>
                                </>
                              )}
                              {inv.status === "Expired" && (
                                <DropdownMenuItem onClick={() => { resendInvitation(inv.id); toast.success("Invitation re-sent"); }}>
                                  <RefreshCw className="h-3.5 w-3.5 mr-2" /> Resend invitation
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border/60">
              {rows.map((inv) => (
                <Link key={inv.id} to="/app/invitations/$id" params={{ id: inv.id }} className="block px-5 py-4 hover:bg-foreground/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-medium">{inv.candidateInitials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{inv.candidateName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{inv.purpose}</div>
                    </div>
                    <InvitationPill value={inv.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {inv.requestedVerifications.map((t) => (
                      <Badge key={t} variant="outline" className="rounded-full text-[10px] px-2 py-0 font-normal">{t}</Badge>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {inv.sentAt ? `Sent ${formatDistanceToNow(new Date(inv.sentAt), { addSuffix: true })}` : "Not sent yet"}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
