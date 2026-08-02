import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import { EmptyState, PageHeader, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccess } from "@/lib/access-context";
import {
  canReviewVerification,
  formatFileSize,
  formatMetadataEntries,
  getVerificationErrorMessage,
  getVerificationNextAction,
  getVerificationStatusTone,
  type VerificationEvidenceItem,
  type VerificationInboxStatus,
  type VerificationTimelineItem,
} from "@/lib/employment-verifications";
import {
  useAssignVerificationReviewerMutation,
  useCancelVerificationRequestMutation,
  useRejectVerificationRequestMutation,
  useRequestVerificationClarificationMutation,
  useUpdateVerificationInternalNoteMutation,
  useVerificationRequestDetailQuery,
  useVerificationRequestEvidenceQuery,
  useVerificationRequestTimelineQuery,
  useVerificationReviewerOptionsQuery,
  useVerifyVerificationRequestMutation,
} from "@/lib/queries/verification-requests";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  HelpCircle,
  Inbox,
  Loader2,
  MapPin,
  MessageCircleWarning,
  RefreshCw,
  Save,
  ShieldCheck,
  User,
  UserCog,
  XCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/verifications/$id")({
  component: EmploymentVerificationDetailPage,
});

type ActionMode = "verify" | "reject" | "cancel";

function EmploymentVerificationDetailPage() {
  const { id } = Route.useParams();
  const { org, can } = useAccess();
  const canModify = can("modify_verification");

  const detailQuery = useVerificationRequestDetailQuery(id);
  const timelineQuery = useVerificationRequestTimelineQuery(id);
  const evidenceQuery = useVerificationRequestEvidenceQuery(id);
  const reviewersQuery = useVerificationReviewerOptionsQuery(org?.publicId);

  const assignReviewerMutation = useAssignVerificationReviewerMutation();
  const updateNoteMutation = useUpdateVerificationInternalNoteMutation();
  const clarificationMutation = useRequestVerificationClarificationMutation();
  const verifyMutation = useVerifyVerificationRequestMutation();
  const rejectMutation = useRejectVerificationRequestMutation();
  const cancelMutation = useCancelVerificationRequestMutation();

  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [clarifyText, setClarifyText] = useState("");
  const [actionMode, setActionMode] = useState<ActionMode | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [internalDraft, setInternalDraft] = useState("");

  const verification = detailQuery.data;
  const timeline = timelineQuery.data ?? [];
  const evidence = evidenceQuery.data ?? [];
  const reviewerOptions = reviewersQuery.data ?? [];
  const reviewable = verification ? canReviewVerification(verification) : false;
  const nextAction = verification ? getVerificationNextAction(verification) : null;
  const timelineError = timelineQuery.error;
  const evidenceError = evidenceQuery.error;
  const reviewerError = reviewersQuery.error;

  useEffect(() => {
    setInternalDraft(verification?.internalNote ?? "");
  }, [verification?.internalNote]);

  const latestDecisionNote = useMemo(() => {
    const event = timeline.find((item) =>
      [
        "verification_request_verified",
        "verification_request_rejected",
        "verification_request_cancelled",
      ].includes(item.eventType),
    );
    return event?.note;
  }, [timeline]);

  const assignedReviewerOptionId = useMemo(() => {
    if (!verification?.assignedReviewer) return "unassigned";
    return `assigned:${verification.assignedReviewer.userId}`;
  }, [verification?.assignedReviewer]);

  const runMutation = async (
    callback: () => Promise<unknown>,
    successMessage: string,
    fallbackMessage: string,
  ) => {
    try {
      await callback();
      toast.success(successMessage);
    } catch (error) {
      toast.error(getVerificationErrorMessage(error, fallbackMessage));
    }
  };

  const refetchAll = () => {
    void detailQuery.refetch();
    void timelineQuery.refetch();
    void evidenceQuery.refetch();
    void reviewersQuery.refetch();
  };

  if (!canModify) {
    return (
      <EmptyState
        icon={Ban}
        title="Permission denied"
        description="You don't have permission to view Employment Verifications in this workspace."
      />
    );
  }

  if (
    detailQuery.isPending &&
    !verification &&
    (timelineQuery.isPending || evidenceQuery.isPending)
  ) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (detailQuery.error) {
    const status = "status" in detailQuery.error ? detailQuery.error.status : undefined;
    if (status === 404) {
      return (
        <EmptyState
          icon={Inbox}
          title="Employment verification not found"
          description="This request may have been withdrawn or does not belong to your workspace."
        />
      );
    }

    return (
      <EmptyState
        icon={AlertTriangle}
        title={status === 403 ? "Permission denied" : "Employment Verification didn't load"}
        description={getVerificationErrorMessage(detailQuery.error, "Please try again.")}
        action={{ label: "Retry", onClick: refetchAll }}
      />
    );
  }

  if (!verification) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/app/verifications"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> Employment Verifications
        </Link>
      </div>

      <PageHeader
        eyebrow={`Employment verification · ${verification.id}`}
        title={verification.candidateName}
        description={verification.candidateEmail}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status={verification.status} />
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={refetchAll}
              disabled={
                detailQuery.isFetching ||
                timelineQuery.isFetching ||
                evidenceQuery.isFetching ||
                reviewersQuery.isFetching
              }
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        }
      />

      {reviewable ? (
        <div className="mb-8 flex flex-wrap items-center gap-2 pb-6 border-b border-border/60">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setClarifyOpen(true)}
            disabled={clarificationMutation.isPending}
          >
            <MessageCircleWarning className="h-3.5 w-3.5 mr-1.5" /> Request Clarification
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-destructive/40 text-destructive hover:text-destructive"
            onClick={() => {
              setActionMode("reject");
              setActionNote("");
            }}
            disabled={rejectMutation.isPending}
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              setActionMode("cancel");
              setActionNote("");
            }}
            disabled={cancelMutation.isPending}
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel
          </Button>
          <Button
            size="sm"
            className="btn-premium rounded-xl sm:ml-auto"
            onClick={() => {
              setActionMode("verify");
              setActionNote("");
            }}
            disabled={verifyMutation.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Verify
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          <SectionCard
            title="Organization summary"
            description="Backend-owned organization context for this verification request."
          >
            <div className="p-5 grid gap-4 sm:grid-cols-2 text-sm">
              <Info icon={Building2} label="Organization" value={verification.organizationName ?? "—"} />
              <Info icon={Building2} label="Type" value={verification.organizationType ?? "—"} />
              <Info
                icon={ShieldCheck}
                label="Verification state"
                value={verification.organizationVerificationState ?? "—"}
              />
              <Info
                icon={AlertTriangle}
                label="Suspension"
                value={verification.organizationSuspended ? "Suspended" : "Active"}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Verification target"
            description="Target organization metadata returned by the backend contract."
          >
            <div className="p-5 space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info icon={Building2} label="Organization" value={verification.targetName ?? "—"} />
                <Info icon={User} label="Contact email" value={verification.targetEmail ?? "—"} />
              </div>
              {formatMetadataEntries(verification.targetMetadata).length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {formatMetadataEntries(verification.targetMetadata).map((entry) => (
                    <Info key={entry.label} icon={FileText} label={entry.label} value={entry.value} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-foreground/[0.02] p-3 text-muted-foreground">
                  No additional target metadata is attached to this verification request.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Employment claim"
            description="What the candidate claims. Verify these fields against your records."
          >
            <div className="p-5 grid gap-4 sm:grid-cols-2 text-sm">
              <Info icon={Briefcase} label="Employer" value={verification.claim.employerName ?? "—"} />
              <Info icon={User} label="Role" value={verification.claim.role ?? "—"} />
              <Info
                icon={Calendar}
                label="Start date"
                value={verification.claim.startDate ? format(new Date(verification.claim.startDate), "MMM d, yyyy") : "—"}
              />
              <Info
                icon={Calendar}
                label="End date"
                value={
                  verification.claim.endDate
                    ? format(new Date(verification.claim.endDate), "MMM d, yyyy")
                    : "Current / not provided"
                }
              />
              <Info
                icon={ClipboardCheck}
                label="Employment type"
                value={verification.claim.employmentType ?? "—"}
              />
              <Info
                icon={MapPin}
                label="Location"
                value={
                  verification.claim.workLocationRegion || verification.claim.workLocationCountry
                    ? [verification.claim.workLocationRegion, verification.claim.workLocationCountry]
                        .filter(Boolean)
                        .join(", ")
                    : "—"
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Candidate shared information"
            description="Only backend-authoritative consented fields and evidence scope."
          >
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 flex gap-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-muted-foreground">
                  <div className="text-foreground font-medium">
                    {verification.consentedFields.length} consented fields
                  </div>
                  {verification.candidateResponseSubmittedAt ? (
                    <div className="text-[12px] mt-0.5">
                      Candidate response submitted{" "}
                      {formatDistanceToNow(new Date(verification.candidateResponseSubmittedAt), {
                        addSuffix: true,
                      })}
                      .
                    </div>
                  ) : (
                    <div className="text-[12px] mt-0.5">
                      No candidate clarification response has been submitted yet.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Consented fields
                </div>
                <div className="flex flex-wrap gap-2">
                  {verification.consentedFields.length > 0 ? (
                    verification.consentedFields.map((field) => (
                      <Badge key={field} variant="outline" className="rounded-full px-3 py-1 text-xs font-normal">
                        {field}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No consented fields returned.</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Evidence scope
                </div>
                <div className="flex flex-wrap gap-2">
                  {verification.consentedEvidenceScope.length > 0 ? (
                    verification.consentedEvidenceScope.map((field) => (
                      <Badge key={field} variant="outline" className="rounded-full px-3 py-1 text-xs font-normal">
                        {field}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No evidence scope returned.</span>
                  )}
                </div>
              </div>

              {verification.candidateResponse ? (
                <div className="rounded-lg border border-border/60 bg-foreground/[0.02] p-3 text-sm text-muted-foreground">
                  {verification.candidateResponse}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Evidence"
            description="Authoritative evidence and downloads returned by the backend."
          >
            {evidenceQuery.isPending && !evidenceQuery.data ? (
              <TableSkeleton rows={3} />
            ) : evidenceError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Evidence didn't load"
                description={getVerificationErrorMessage(evidenceError, "Please try again.")}
                action={{ label: "Retry", onClick: () => void evidenceQuery.refetch() }}
              />
            ) : evidence.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No evidence attached"
                description="This verification request does not currently have evidence to review."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {evidence.map((item) => (
                  <EvidenceRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Timeline" description="Immutable backend activity for this request.">
            {timelineQuery.isPending && !timelineQuery.data ? (
              <TableSkeleton rows={4} />
            ) : timelineError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Timeline didn't load"
                description={getVerificationErrorMessage(timelineError, "Please try again.")}
                action={{ label: "Retry", onClick: () => void timelineQuery.refetch() }}
              />
            ) : timeline.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No timeline activity yet"
                description="Backend activity will appear here as the verification progresses."
              />
            ) : (
              <ol className="p-5 space-y-4">
                {timeline.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <div className="h-7 w-7 rounded-full bg-foreground/[0.06] border border-border/60 flex items-center justify-center shrink-0">
                      <TimelineIcon eventType={event.eventType} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium">{event.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {event.source} · {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
                      </div>
                      {event.note ? (
                        <div className="mt-1 text-xs text-muted-foreground">{event.note}</div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Summary">
            <div className="p-5 text-sm space-y-3">
              <Row label="Status">
                <StatusPill status={verification.status} />
              </Row>
              <Row label="Next action">
                <span className="text-right">{nextAction?.text ?? "—"}</span>
              </Row>
              <Row label="Owner">
                <span className="text-muted-foreground">{nextAction?.owner ?? "—"}</span>
              </Row>
              <Row label="Reviewer">
                <span>{verification.assignedReviewer?.fullName ?? verification.assignedReviewer?.email ?? "—"}</span>
              </Row>
              <Row label="Review status">
                <span className="text-muted-foreground">{verification.reviewStatus ?? "—"}</span>
              </Row>
              <Row label="Received">
                <span className="text-muted-foreground">
                  {format(new Date(verification.receivedAt), "MMM d, yyyy")}
                </span>
              </Row>
              <Row label="Updated">
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(verification.updatedAt), { addSuffix: true })}
                </span>
              </Row>
              {verification.dueDate ? (
                <Row label="Due">
                  <span className="text-muted-foreground">
                    {format(new Date(verification.dueDate), "MMM d, yyyy")}
                  </span>
                </Row>
              ) : null}
              <Row label="Evidence items">
                <span>{verification.evidenceSummary.totalItems}</span>
              </Row>
              <Row label="Document items">
                <span>{verification.evidenceSummary.documentItems}</span>
              </Row>
            </div>
          </SectionCard>

          <SectionCard title="Reviewer assignment" description="Assign the workspace reviewer from active organization members.">
            <div className="p-5 space-y-3">
              {reviewerError ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="Reviewers didn't load"
                  description={getVerificationErrorMessage(reviewerError, "Please try again.")}
                  action={{ label: "Retry", onClick: () => void reviewersQuery.refetch() }}
                />
              ) : (
                <>
                  <Select
                    value={assignedReviewerOptionId}
                    onValueChange={(value) =>
                      void runMutation(
                        () =>
                          assignReviewerMutation.mutateAsync({
                            verificationRequestPublicId: verification.id,
                            payload:
                              value === "unassigned"
                                ? { organization_member_public_id: null }
                                : { organization_member_public_id: value },
                          }),
                        value === "unassigned" ? "Reviewer cleared" : "Reviewer assigned",
                        "We couldn't update the reviewer assignment.",
                      )
                    }
                    disabled={
                      !reviewable ||
                      reviewersQuery.isPending ||
                      assignReviewerMutation.isPending ||
                      reviewerOptions.length === 0
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl w-full">
                      <SelectValue
                        placeholder={
                          reviewersQuery.isPending ? "Loading reviewers…" : "Assign reviewer"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {verification.assignedReviewer ? (
                        <SelectItem value={assignedReviewerOptionId} disabled>
                          {verification.assignedReviewer.fullName ??
                            verification.assignedReviewer.email}
                        </SelectItem>
                      ) : null}
                      {reviewerOptions.map((reviewer) => (
                        <SelectItem key={reviewer.id} value={reviewer.id}>
                          {reviewer.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {verification.isAssignedToCurrentUser ? (
                    <div className="text-xs text-muted-foreground">
                      This verification is currently assigned to you.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Internal note" description="Private to your organization">
            <div className="p-5 space-y-2">
              <Textarea
                value={internalDraft}
                onChange={(event) => setInternalDraft(event.target.value)}
                placeholder="Add a private note for reviewers…"
                className="rounded-xl min-h-[120px] text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl w-full"
                disabled={updateNoteMutation.isPending}
                onClick={() =>
                  void runMutation(
                    () =>
                      updateNoteMutation.mutateAsync({
                        verificationRequestPublicId: verification.id,
                        note: internalDraft.trim() || null,
                      }),
                    "Internal note saved",
                    "We couldn't save this internal note.",
                  )
                }
              >
                {updateNoteMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save note
              </Button>
            </div>
          </SectionCard>

          {latestDecisionNote ? (
            <SectionCard title="Decision note">
              <div className="p-5 text-sm text-muted-foreground">{latestDecisionNote}</div>
            </SectionCard>
          ) : null}
        </aside>
      </div>

      <Dialog open={clarifyOpen} onOpenChange={setClarifyOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request clarification</DialogTitle>
            <DialogDescription>
              The candidate will be asked to clarify this verification request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Question for candidate</Label>
            <Textarea
              value={clarifyText}
              onChange={(event) => setClarifyText(event.target.value)}
              placeholder="Explain what needs clarification before this verification can continue."
              className="rounded-xl min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setClarifyOpen(false)}>
              Cancel
            </Button>
            <Button
              className="btn-premium rounded-xl"
              disabled={!clarifyText.trim() || clarificationMutation.isPending}
              onClick={() =>
                void runMutation(
                  async () => {
                    await clarificationMutation.mutateAsync({
                      verificationRequestPublicId: verification.id,
                      payload: { note: clarifyText.trim() },
                    });
                    setClarifyOpen(false);
                    setClarifyText("");
                  },
                  "Clarification requested",
                  "We couldn't request clarification.",
                )
              }
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionMode !== null} onOpenChange={(open) => !open && setActionMode(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionMode === "verify" ? "Verify employment details" : null}
              {actionMode === "reject" ? "Reject verification" : null}
              {actionMode === "cancel" ? "Cancel verification" : null}
            </DialogTitle>
            <DialogDescription>
              Submit the backend verification outcome for this request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Note
              {actionMode === "reject" || actionMode === "cancel" ? (
                <span className="text-destructive"> *</span>
              ) : null}
            </Label>
            <Textarea
              value={actionNote}
              onChange={(event) => setActionNote(event.target.value)}
              placeholder={
                actionMode === "verify"
                  ? "Optional supporting context for the completed verification."
                  : actionMode === "reject"
                    ? "Explain why this verification is being rejected."
                    : "Explain why this verification is being cancelled."
              }
              className="rounded-xl min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setActionMode(null)}>
              Keep open
            </Button>
            <Button
              className="btn-premium rounded-xl"
              disabled={
                !actionMode ||
                ((actionMode === "reject" || actionMode === "cancel") && !actionNote.trim()) ||
                verifyMutation.isPending ||
                rejectMutation.isPending ||
                cancelMutation.isPending
              }
              onClick={() => {
                if (!actionMode) return;
                const payload = { note: actionNote.trim() || undefined };

                if (actionMode === "verify") {
                  void runMutation(
                    async () => {
                      await verifyMutation.mutateAsync({
                        verificationRequestPublicId: verification.id,
                        payload,
                      });
                      setActionMode(null);
                    },
                    "Verification completed",
                    "We couldn't verify this request.",
                  );
                  return;
                }

                if (actionMode === "reject") {
                  void runMutation(
                    async () => {
                      await rejectMutation.mutateAsync({
                        verificationRequestPublicId: verification.id,
                        payload,
                      });
                      setActionMode(null);
                    },
                    "Verification rejected",
                    "We couldn't reject this request.",
                  );
                  return;
                }

                void runMutation(
                  async () => {
                    await cancelMutation.mutateAsync({
                      verificationRequestPublicId: verification.id,
                      payload,
                    });
                    setActionMode(null);
                  },
                  "Verification cancelled",
                  "We couldn't cancel this request.",
                );
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EvidenceRow({ item }: { item: VerificationEvidenceItem }) {
  const valueEntries = formatMetadataEntries(item.value ?? {});

  return (
    <div className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-medium">{item.evidenceType}</div>
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-normal">
            {item.status}
          </Badge>
        </div>
        <div className="text-[12px] text-muted-foreground mt-1">
          Field: {item.fieldKey} · Updated{" "}
          {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
        </div>
        <div className="text-[12px] text-muted-foreground mt-1 flex flex-wrap gap-3">
          {item.fileName ? <span>{item.fileName}</span> : null}
          {item.documentType ? <span>{item.documentType}</span> : null}
          {item.mimeType ? <span>{item.mimeType}</span> : null}
          {item.fileSize ? <span>{formatFileSize(item.fileSize)}</span> : null}
          {item.uploadStatus ? <span>{item.uploadStatus}</span> : null}
        </div>
        {valueEntries.length > 0 ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {valueEntries.map((entry) => (
              <div key={entry.label} className="text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground">{entry.label}:</span> {entry.value}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {item.downloadUrl ? (
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <a href={item.downloadUrl} target="_blank" rel="noreferrer">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download
          </a>
        </Button>
      ) : (
        <div className="text-xs text-muted-foreground">No download available</div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-[12px]">{label}</span>
      <div className="text-sm text-right">{children}</div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
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
        <div className="text-sm mt-0.5 break-words">{value}</div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: VerificationInboxStatus }) {
  const tone = getVerificationStatusTone(status);
  const className =
    tone === "success"
      ? "bg-success/15 text-success border-success/25"
      : tone === "destructive"
        ? "bg-destructive/10 text-destructive border-destructive/25"
        : tone === "warning"
          ? "bg-warning/15 text-warning-foreground border-warning/25"
          : tone === "info"
            ? "bg-info/15 text-info-foreground border-info/25"
            : "bg-primary/10 text-primary border-primary/25";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

function TimelineIcon({ eventType }: { eventType: VerificationTimelineItem["eventType"] }) {
  const className = "h-3.5 w-3.5 text-muted-foreground";
  if (eventType.includes("information_requested")) {
    return <MessageCircleWarning className={className} />;
  }
  if (eventType.includes("verified")) {
    return <CheckCircle2 className={className} />;
  }
  if (eventType.includes("rejected")) {
    return <XCircle className={className} />;
  }
  if (eventType.includes("cancelled")) {
    return <HelpCircle className={className} />;
  }
  if (eventType.includes("reviewer")) {
    return <UserCog className={className} />;
  }
  if (eventType.includes("evidence")) {
    return <FileText className={className} />;
  }
  return <Clock className={className} />;
}
