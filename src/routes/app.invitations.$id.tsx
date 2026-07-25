import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, SectionCard, EmptyState, TableSkeleton } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InvitationPill } from "@/components/app/workspace-pills";
import { PermissionDenied } from "@/components/app/access/PermissionDenied";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAccess } from "@/lib/access-context";
import {
  ArrowLeft,
  Copy,
  Send,
  RefreshCw,
  Ban,
  Mail,
  User,
  ShieldCheck,
  MailPlus,
  FileEdit,
  MailCheck,
  MailOpen,
  Timer,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { formatVerificationList, getTrustInvitationErrorMessage } from "@/lib/trust-invitations";
import {
  useCancelTrustInvitationMutation,
  useDeleteTrustInvitationMutation,
  useResendTrustInvitationMutation,
  useSendTrustInvitationMutation,
  useTrustInvitationDetailQuery,
} from "@/lib/queries/trust-invitations";

export const Route = createFileRoute("/app/invitations/$id")({
  component: InvitationDetailPage,
});

function InvitationDetailPage() {
  const { id } = Route.useParams();
  const { org, can } = useAccess();
  const navigate = useNavigate({ from: Route.fullPath });
  const canInvite = can("invite_candidate");
  const canModify = can("modify_invitation");
  const [cancelOpen, setCancelOpen] = useState(false);
  const detailQuery = useTrustInvitationDetailQuery(id);
  const sendMutation = useSendTrustInvitationMutation(org?.publicId);
  const resendMutation = useResendTrustInvitationMutation(org?.publicId);
  const cancelMutation = useCancelTrustInvitationMutation(org?.publicId);
  const deleteMutation = useDeleteTrustInvitationMutation(org?.publicId);

  const invitation = detailQuery.data;

  const runAction = async (
    callback: () => Promise<unknown>,
    successMessage: string,
    failureMessage: string,
  ) => {
    try {
      await callback();
      toast.success(successMessage);
    } catch (error) {
      toast.error(getTrustInvitationErrorMessage(error, failureMessage));
    }
  };

  const copyLink = async () => {
    if (!invitation?.invitationUrl) return;
    await navigator.clipboard?.writeText(invitation.invitationUrl);
    toast.success("Invitation link copied");
  };

  if (!canModify) {
    return (
      <EmptyState
        icon={Ban}
        title="Permission denied"
        description="You don't have permission to view Trust Invitations in this workspace."
      />
    );
  }

  if (detailQuery.isPending && !invitation) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={3} />
      </div>
    );
  }

  if (detailQuery.error) {
    const status = "status" in detailQuery.error ? detailQuery.error.status : undefined;
    if (status === 404) {
      return (
        <EmptyState
          icon={MailPlus}
          title="Invitation not found"
          description="The invitation may have been deleted, cancelled, or you may not have access to it."
        />
      );
    }

    return (
      <EmptyState
        icon={AlertTriangle}
        title={status === 403 ? "Permission denied" : "Invitation didn't load"}
        description={getTrustInvitationErrorMessage(detailQuery.error, "Please try again.")}
        action={{
          label: "Retry",
          onClick: () => {
            void detailQuery.refetch();
          },
        }}
      />
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/app/invitations"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> Trust Invitations
        </Link>
      </div>

      <PageHeader
        eyebrow={`Invitation · ${invitation.id}`}
        title={invitation.candidateName}
        description={invitation.candidateEmail}
        actions={
          <div className="flex items-center gap-2">
            <InvitationPill value={invitation.status} />
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => void copyLink()}
              disabled={!invitation.invitationUrl}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy link
            </Button>
            {invitation.status === "Draft" && canInvite ? (
              <Button
                size="sm"
                className="btn-premium rounded-xl"
                onClick={() =>
                  void runAction(
                    () => sendMutation.mutateAsync(invitation.id),
                    "Invitation sent",
                    "We couldn't send this invitation.",
                  )
                }
                disabled={sendMutation.isPending}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" /> Send now
              </Button>
            ) : null}
            {(invitation.status === "Sent" || invitation.status === "Opened") && canModify ? (
              <Button
                size="sm"
                className="btn-premium rounded-xl"
                onClick={() =>
                  void runAction(
                    () => resendMutation.mutateAsync(invitation.id),
                    "Reminder sent",
                    "We couldn't resend this invitation.",
                  )
                }
                disabled={resendMutation.isPending}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Send reminder
              </Button>
            ) : null}
            {(invitation.status === "Sent" ||
              invitation.status === "Opened" ||
              invitation.status === "Draft") &&
            canModify ? (
              <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-destructive hover:text-destructive"
                  >
                    <Ban className="h-3.5 w-3.5 mr-1.5" />{" "}
                    {invitation.status === "Draft" ? "Delete draft" : "Cancel"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {invitation.status === "Draft" ? "Delete draft?" : "Cancel invitation?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {invitation.status === "Draft"
                        ? "This draft will be permanently removed. This cannot be undone."
                        : "The candidate can no longer accept this invitation. You can send a new invitation anytime."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Keep</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        if (invitation.status === "Draft") {
                          void (async () => {
                            await runAction(
                              () => deleteMutation.mutateAsync(invitation.id),
                              "Draft deleted",
                              "We couldn't delete this draft.",
                            );
                            navigate({ to: "/app/invitations" });
                          })();
                          return;
                        }
                        void runAction(
                          () => cancelMutation.mutateAsync(invitation.id),
                          "Invitation cancelled",
                          "We couldn't cancel this invitation.",
                        );
                      }}
                    >
                      {invitation.status === "Draft" ? "Delete" : "Cancel invitation"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        }
      />
      {!canInvite ? (
        <PermissionDenied
          className="mb-4"
          message="Only users with invite permission can create or send Trust Invitations."
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          <SectionCard title="Candidate details">
            <div className="p-5 grid gap-4 sm:grid-cols-2 text-sm">
              <Info icon={User} label="Full name" value={invitation.candidateName} />
              <Info icon={Mail} label="Email" value={invitation.candidateEmail} />
              {invitation.candidatePhone ? (
                <Info icon={User} label="Phone" value={invitation.candidatePhone} />
              ) : null}
              <Info icon={FileEdit} label="Purpose" value={invitation.purpose ?? "—"} />
              <Info icon={Timer} label="Created by" value={invitation.createdByName} />
              <Info
                icon={Timer}
                label="Created"
                value={format(new Date(invitation.createdAt), "MMM d, yyyy · h:mm a")}
              />
              {invitation.sentAt ? (
                <Info
                  icon={Timer}
                  label="Sent"
                  value={format(new Date(invitation.sentAt), "MMM d, yyyy · h:mm a")}
                />
              ) : null}
              <Info
                icon={Timer}
                label="Expires"
                value={format(new Date(invitation.expiresAt), "MMM d, yyyy")}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Requested verifications"
            description="Kairo will ask the candidate to consent to each of these."
          >
            <div className="p-5 flex flex-wrap gap-2">
              {formatVerificationList(invitation.requestedVerifications).map((label) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="rounded-full px-3 py-1 text-xs font-normal"
                >
                  {label}
                </Badge>
              ))}
            </div>
          </SectionCard>

          {invitation.message ? (
            <SectionCard title="Message to candidate">
              <div className="p-5 text-sm text-muted-foreground italic">"{invitation.message}"</div>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Consent notice"
            description="What the candidate sees before accepting."
          >
            <div className="p-5">
              <div className="rounded-xl border border-border/60 bg-foreground/[0.02] p-4 text-sm text-muted-foreground flex gap-3">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  {invitation.createdByName} has requested to verify{" "}
                  {invitation.requestedVerifications.length} categories on your Kairo Trust
                  Passport. You control what to share. You can decline or withdraw consent at any
                  time.
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Activity">
            <ol className="p-5 space-y-4">
              {invitation.timeline.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  No backend activity has been recorded for this invitation yet.
                </li>
              ) : (
                invitation.timeline.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <div className="h-7 w-7 rounded-full bg-foreground/[0.06] border border-border/60 flex items-center justify-center shrink-0">
                      <EventIcon kind={event.kind} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium">{event.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {event.actor} ·{" "}
                        {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
                      </div>
                      {event.note ? (
                        <div className="mt-1 text-xs text-muted-foreground">{event.note}</div>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ol>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Delivery">
            <div className="p-5 text-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <InvitationPill value={invitation.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>{invitation.deliveryLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span>
                  {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                </span>
              </div>
              {invitation.acceptedAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Accepted</span>
                  <span>{format(new Date(invitation.acceptedAt), "MMM d, yyyy")}</span>
                </div>
              ) : null}
              {invitation.cancelledAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cancelled</span>
                  <span>{format(new Date(invitation.cancelledAt), "MMM d, yyyy")}</span>
                </div>
              ) : null}
              {invitation.relatedVerificationRequestPublicId ? (
                <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                  Related verification request: {invitation.relatedVerificationRequestPublicId}
                </div>
              ) : null}
              {invitation.status === "Expired" ? (
                <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                  Expired invitations can no longer be resent. Create a new invitation from the list
                  page if you still need consent.
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Invitation link">
            <div className="p-5 space-y-2">
              <div className="rounded-lg border border-border/60 bg-foreground/[0.02] p-2.5 text-xs break-all text-muted-foreground">
                {invitation.invitationUrl ??
                  "The backend did not return a canonical invitation link."}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl w-full"
                onClick={() => void copyLink()}
                disabled={!invitation.invitationUrl}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy link
              </Button>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
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
  const iconClassName = "h-3.5 w-3.5 text-muted-foreground";
  if (kind === "sent") return <Send className={iconClassName} />;
  if (kind === "opened") return <MailOpen className={iconClassName} />;
  if (kind === "resent") return <RefreshCw className={iconClassName} />;
  if (kind === "accepted") return <CheckCircle2 className={iconClassName} />;
  if (kind === "expired") return <Timer className={iconClassName} />;
  if (kind === "cancelled") return <XCircle className={iconClassName} />;
  if (kind === "delivery_failed") return <AlertTriangle className={iconClassName} />;
  if (kind === "deleted") return <Ban className={iconClassName} />;
  if (kind === "created") return <FileEdit className={iconClassName} />;
  return <MessageSquare className={iconClassName} />;
}
