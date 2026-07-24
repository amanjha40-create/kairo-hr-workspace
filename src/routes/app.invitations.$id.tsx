import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, SectionCard, EmptyState } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InvitationPill } from "@/components/app/workspace-pills";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDashboard } from "@/lib/dashboard-context";
import {
  ArrowLeft, Copy, Send, RefreshCw, Ban, Mail, User, Building2, ShieldCheck, ArrowUpRight, MailPlus,
  FileEdit, MailCheck, MailOpen, Timer, CheckCircle2, XCircle, MessageSquare,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/invitations/$id")({
  component: InvitationDetailPage,
  notFoundComponent: NotFound,
  errorComponent: NotFound,
});

function NotFound() {
  return (
    <EmptyState
      icon={MailPlus}
      title="Invitation not found"
      description="The invitation may have been cancelled or removed."
    />
  );
}

function InvitationDetailPage() {
  const { id } = Route.useParams();
  const { invitations, sendInvitationDraft, resendInvitation, cancelInvitation, deleteInvitationDraft } = useDashboard();
  const nav = useNavigate();
  const inv = invitations.find((i) => i.id === id);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!inv) {
    throw notFound();
  }

  const invitationLink = `https://kairoid.com/i/${inv.id}`;
  const copyLink = () => { navigator.clipboard?.writeText(invitationLink); toast.success("Invitation link copied"); };

  return (
    <div>
      <div className="mb-6">
        <Link to="/app/invitations" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3 w-3" /> Trust Invitations
        </Link>
      </div>

      <PageHeader
        eyebrow={`Invitation · ${inv.id}`}
        title={inv.candidateName}
        description={inv.candidateEmail}
        actions={
          <div className="flex items-center gap-2">
            <InvitationPill value={inv.status} />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy link
            </Button>
            {inv.status === "Draft" && (
              <Button size="sm" className="btn-premium rounded-xl" onClick={() => { sendInvitationDraft(inv.id); toast.success("Invitation sent"); }}>
                <Send className="h-3.5 w-3.5 mr-1.5" /> Send now
              </Button>
            )}
            {(inv.status === "Sent" || inv.status === "Opened") && (
              <Button size="sm" className="btn-premium rounded-xl" onClick={() => { resendInvitation(inv.id); toast.success("Reminder sent"); }}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Send reminder
              </Button>
            )}
            {inv.status === "Expired" && (
              <Button size="sm" className="btn-premium rounded-xl" onClick={() => { resendInvitation(inv.id); toast.success("Invitation re-sent"); }}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Resend
              </Button>
            )}
            {(inv.status === "Sent" || inv.status === "Opened" || inv.status === "Draft") && (
              <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-xl text-destructive hover:text-destructive">
                    <Ban className="h-3.5 w-3.5 mr-1.5" /> {inv.status === "Draft" ? "Delete draft" : "Cancel"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{inv.status === "Draft" ? "Delete draft?" : "Cancel invitation?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {inv.status === "Draft"
                        ? "This draft will be permanently removed. This cannot be undone."
                        : "The candidate can no longer accept this invitation. You can send a new invitation anytime."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Keep</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        if (inv.status === "Draft") { deleteInvitationDraft(inv.id); toast.success("Draft deleted"); nav({ to: "/app/invitations" }); }
                        else { cancelInvitation(inv.id); toast.success("Invitation cancelled"); }
                      }}
                    >
                      {inv.status === "Draft" ? "Delete" : "Cancel invitation"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          <SectionCard title="Candidate details">
            <div className="p-5 grid gap-4 sm:grid-cols-2 text-sm">
              <Info icon={User} label="Full name" value={inv.candidateName} />
              <Info icon={Mail} label="Email" value={inv.candidateEmail} />
              {inv.candidatePhone && <Info icon={User} label="Phone" value={inv.candidatePhone} />}
              <Info icon={Building2} label="Department" value={inv.department ?? "—"} />
              <Info icon={FileEdit} label="Purpose" value={inv.purpose} />
              <Info icon={ShieldCheck} label="Internal reference" value={inv.internalReference ?? "—"} />
              <Info icon={Timer} label="Sent by" value={`${inv.sentBy}${inv.sentAt ? " · " + format(new Date(inv.sentAt), "MMM d, yyyy · h:mm a") : ""}`} />
              <Info icon={Timer} label="Expires" value={format(new Date(inv.expiresAt), "MMM d, yyyy")} />
            </div>
          </SectionCard>

          <SectionCard title="Requested verifications" description="Kairo will ask the candidate to consent to each of these.">
            <div className="p-5 flex flex-wrap gap-2">
              {inv.requestedVerifications.map((t) => (
                <Badge key={t} variant="outline" className="rounded-full px-3 py-1 text-xs font-normal">{t}</Badge>
              ))}
            </div>
          </SectionCard>

          {inv.message && (
            <SectionCard title="Message to candidate">
              <div className="p-5 text-sm text-muted-foreground italic">"{inv.message}"</div>
            </SectionCard>
          )}

          <SectionCard title="Consent notice" description="What the candidate sees before accepting.">
            <div className="p-5">
              <div className="rounded-xl border border-border/60 bg-foreground/[0.02] p-4 text-sm text-muted-foreground flex gap-3">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  {inv.sentBy} has requested to verify {inv.requestedVerifications.length} categories on your Kairo Trust Passport. You control what to share. You can decline or withdraw consent at any time.
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Activity">
            <ol className="p-5 space-y-4">
              {[...inv.activity].reverse().map((ev) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <div className="h-7 w-7 rounded-full bg-foreground/[0.06] border border-border/60 flex items-center justify-center shrink-0">
                    <EventIcon kind={ev.kind} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{ev.label}</div>
                    <div className="text-[11px] text-muted-foreground">{ev.actor} · {formatDistanceToNow(new Date(ev.at), { addSuffix: true })}</div>
                    {ev.note && <div className="mt-1 text-xs text-muted-foreground">{ev.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Delivery">
            <div className="p-5 text-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <InvitationPill value={inv.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>{inv.deliveryStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span>{formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}</span>
              </div>
              {inv.personId && (
                <div className="pt-2 border-t border-border/60">
                  <Link to="/app/people/$id" params={{ id: inv.personId }} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                    View person profile <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
              {inv.linkedRequestId && (
                <div className="text-[11px] text-muted-foreground">
                  Verification progress is tracked on this invitation.
                </div>
              )}

            </div>
          </SectionCard>

          <SectionCard title="Invitation link">
            <div className="p-5 space-y-2">
              <div className="rounded-lg border border-border/60 bg-foreground/[0.02] p-2.5 text-xs break-all text-muted-foreground">
                {invitationLink}
              </div>
              <Button variant="outline" size="sm" className="rounded-xl w-full" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy link
              </Button>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-foreground/[0.04] flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}

function EventIcon({ kind }: { kind: string }) {
  const cls = "h-3.5 w-3.5 text-muted-foreground";
  if (kind === "sent") return <Send className={cls} />;
  if (kind === "delivered") return <MailCheck className={cls} />;
  if (kind === "opened") return <MailOpen className={cls} />;
  if (kind === "reminder") return <RefreshCw className={cls} />;
  if (kind === "accepted") return <CheckCircle2 className={cls} />;
  if (kind === "consent") return <ShieldCheck className={cls} />;
  if (kind === "request_created") return <MessageSquare className={cls} />;
  if (kind === "expired") return <Timer className={cls} />;
  if (kind === "cancelled") return <XCircle className={cls} />;
  return <FileEdit className={cls} />;
}
