import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { SectionCard, EmptyState } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDashboard } from "@/lib/dashboard-context";
import { nextActionFor } from "@/lib/inbound-verifications";
import type { InboundStatus } from "@/lib/inbound-verifications";
import {
  ArrowLeft, Building2, ShieldCheck, User, Briefcase, Calendar, MapPin,
  UserCog, CheckCircle2, AlertTriangle, HelpCircle, XCircle, MessageCircleWarning,
  Inbox, FileText, ClipboardCheck, Save, Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/verifications/$id")({
  component: InboundVerificationDetail,
  notFoundComponent: NotFoundPage,
  errorComponent: NotFoundPage,
});

function NotFoundPage() {
  return (
    <EmptyState
      icon={Inbox}
      title="Employment verification not found"
      description="This request may have been withdrawn or does not belong to your workspace."
    />
  );
}

const REVIEWERS = ["You", "Nisha Patel", "Ankit Sharma", "Rhea Kapoor"];

function InboundVerificationDetail() {
  const { id } = Route.useParams();
  const { inboundRequests, assignInboundReviewer, requestInboundClarification, submitInboundVerification, setInboundInternalNote } = useDashboard();
  const nav = useNavigate();
  const r = inboundRequests.find((x) => x.id === id);
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [clarifyText, setClarifyText] = useState("");
  const [submitOpen, setSubmitOpen] = useState<null | "Confirmed" | "Discrepancy" | "Unable to Verify">(null);
  const [notes, setNotes] = useState("");
  const [internalDraft, setInternalDraft] = useState(r?.internalNote ?? "");

  if (!r) throw notFound();

  const isFinal = r.status === "Confirmed" || r.status === "Discrepancy Reported" || r.status === "Unable to Verify";
  const next = nextActionFor(r);

  return (
    <div>
      {/* Row 1 — Back link + record label */}
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <Link to="/app/verifications" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Employment Verifications
        </Link>
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
          Employment verification · {r.id}
        </div>
      </div>

      {/* Row 2 — Title, supporting text, status + reviewer */}
      <div className="mb-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">{r.candidateName}</h1>
            <StatusPill status={r.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed break-words">
            <span className="font-medium text-foreground">{r.requestingOrg.name}</span> requested employment verification.
          </p>
        </div>
        {!isFinal && (
          <div className="lg:shrink-0">
            <Select value={r.assignedReviewer ?? ""} onValueChange={(v) => { assignInboundReviewer(r.id, v); toast.success(`Assigned to ${v}`); }}>
              <SelectTrigger className="h-9 rounded-xl w-full sm:w-[200px]">
                <SelectValue placeholder="Assign reviewer" />
              </SelectTrigger>
              <SelectContent>
                {REVIEWERS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Row 3 — Action bar */}
      {!isFinal && (
        <div className="mb-8 flex flex-wrap items-center gap-2 pb-6 border-b border-border/60">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setClarifyOpen(true)}>
            <MessageCircleWarning className="h-3.5 w-3.5 mr-1.5" /> Request Clarification
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setSubmitOpen("Unable to Verify"); setNotes(""); }}>
            <HelpCircle className="h-3.5 w-3.5 mr-1.5" /> Unable to Verify
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl border-destructive/40 text-destructive hover:text-destructive" onClick={() => { setSubmitOpen("Discrepancy"); setNotes(""); }}>
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Report Discrepancy
          </Button>
          <Button size="sm" className="btn-premium rounded-xl sm:ml-auto" onClick={() => { setSubmitOpen("Confirmed"); setNotes(""); }}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm Employment Details
          </Button>
        </div>
      )}


      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          <SectionCard title="Requesting organization" description="You are being asked to verify — you don't make hiring decisions.">
            <div className="p-5 flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-foreground/[0.06] flex items-center justify-center text-sm font-medium shrink-0">
                {r.requestingOrg.logoInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> {r.requestingOrg.name}
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{r.requestingOrg.contact} · {r.requestingOrg.contactEmail}</div>
                <div className="mt-3 rounded-lg border border-border/60 bg-foreground/[0.02] p-3 text-sm text-muted-foreground">
                  <span className="text-[11px] uppercase tracking-wider block mb-1">Purpose</span>
                  {r.requestingOrg.purpose}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Employment claim" description="What the candidate claims — verify these against your records.">
            <div className="p-5 grid gap-4 sm:grid-cols-2 text-sm">
              <Info icon={Briefcase} label="Job title" value={r.claim.jobTitle} />
              <Info icon={User} label="Department" value={r.claim.department ?? "—"} />
              <Info icon={Calendar} label="Start date" value={format(new Date(r.claim.startDate), "MMM d, yyyy")} />
              <Info icon={Calendar} label="End date" value={r.claim.endDate ? format(new Date(r.claim.endDate), "MMM d, yyyy") : "Current"} />
              <Info icon={ClipboardCheck} label="Status" value={r.claim.employmentStatus} />
              <Info icon={MapPin} label="Location" value={r.claim.location ?? "—"} />
              <Info icon={UserCog} label="Reporting manager" value={r.claim.reportingManager ?? "—"} />
              <Info icon={FileText} label="Reason for leaving" value={r.claim.reasonForLeaving ?? "—"} />
            </div>
          </SectionCard>

          <SectionCard title="Candidate shared information" description="Only the fields the candidate has consented to share.">
            <div className="p-5">
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 mb-4 flex gap-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-muted-foreground">
                  <div className="text-foreground font-medium">Consent: {r.consent.status}</div>
                  {r.consent.grantedAt && <div className="text-[12px] mt-0.5">Granted {formatDistanceToNow(new Date(r.consent.grantedAt), { addSuffix: true })}. You cannot see the candidate's full Trust Passport or private vault.</div>}
                  {r.consent.status === "Pending" && <div className="text-[12px] mt-0.5">Awaiting candidate consent — you cannot access shared fields until consent is granted.</div>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.sharedInformation.map((f) => (
                  <Badge key={f} variant="outline" className="rounded-full px-3 py-1 text-xs font-normal">{f}</Badge>
                ))}
              </div>
            </div>
          </SectionCard>

          {r.submission && (
            <SectionCard title="Submitted verification" description={`Delivered ${formatDistanceToNow(new Date(r.submission.submittedAt), { addSuffix: true })} by ${r.submission.submittedBy}`}>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <OutcomeBadge outcome={r.submission.outcome} />
                </div>
                <div className="rounded-lg border border-border/60 bg-foreground/[0.02] p-3 text-muted-foreground">{r.submission.notes}</div>
                {r.submission.correctedFields && (
                  <div className="text-[12px] text-muted-foreground">
                    Corrected fields: {Object.entries(r.submission.correctedFields).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Timeline">
            <ol className="p-5 space-y-4">
              {[...r.timeline].reverse().map((ev) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <div className="h-7 w-7 rounded-full bg-foreground/[0.06] border border-border/60 flex items-center justify-center shrink-0">
                    <TimelineIcon kind={ev.kind} />
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
          <SectionCard title="Summary">
            <div className="p-5 text-sm space-y-3">
              <Row label="Status"><StatusPill status={r.status} /></Row>
              <Row label="Next action"><span className="text-right">{next.text}</span></Row>
              <Row label="Owner"><span className="text-muted-foreground">{next.owner}</span></Row>
              <Row label="Reviewer"><span>{r.assignedReviewer ?? "—"}</span></Row>
              <Row label="Received"><span className="text-muted-foreground">{format(new Date(r.receivedAt), "MMM d, yyyy")}</span></Row>
              <Row label="Updated"><span className="text-muted-foreground">{formatDistanceToNow(new Date(r.lastUpdatedAt), { addSuffix: true })}</span></Row>
              {r.formerEmployeeId && <Row label="Employee ID"><span className="font-mono text-[12px]">{r.formerEmployeeId}</span></Row>}
            </div>
          </SectionCard>

          <SectionCard title="Internal note" description="Private to your team">
            <div className="p-5 space-y-2">
              <Textarea
                value={internalDraft}
                onChange={(e) => setInternalDraft(e.target.value)}
                placeholder="Add a private note for reviewers…"
                className="rounded-xl min-h-[100px] text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl w-full"
                onClick={() => { setInboundInternalNote(r.id, internalDraft); toast.success("Note saved"); }}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" /> Save note
              </Button>
            </div>
          </SectionCard>
        </aside>
      </div>

      {/* Clarification dialog */}
      <Dialog open={clarifyOpen} onOpenChange={setClarifyOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request clarification</DialogTitle>
            <DialogDescription>The candidate will be asked to clarify. The requesting organization is notified that this request is pending clarification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Question for candidate</Label>
            <Textarea value={clarifyText} onChange={(e) => setClarifyText(e.target.value)} placeholder="e.g. Employment dates on our records differ from your claim — please confirm start month." className="rounded-xl min-h-[110px]" />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setClarifyOpen(false)}>Cancel</Button>
            <Button
              className="btn-premium rounded-xl"
              disabled={!clarifyText.trim()}
              onClick={() => {
                requestInboundClarification(r.id, clarifyText.trim());
                setClarifyOpen(false);
                setClarifyText("");
                toast.success("Clarification requested");
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit dialog */}
      <Dialog open={submitOpen !== null} onOpenChange={(o) => !o && setSubmitOpen(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {submitOpen === "Confirmed" && "Confirm employment details"}
              {submitOpen === "Discrepancy" && "Report discrepancy"}
              {submitOpen === "Unable to Verify" && "Mark as unable to verify"}
            </DialogTitle>
            <DialogDescription>
              You are submitting a verification response to {r.requestingOrg.name}. This does not represent a hiring decision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Notes {submitOpen !== "Confirmed" && <span className="text-destructive">*</span>}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={submitOpen === "Discrepancy" ? "Describe what differs from the claim…" : submitOpen === "Unable to Verify" ? "Explain why verification isn't possible (no record, retention window elapsed, etc.)…" : "Optional — add supporting context."}
              className="rounded-xl min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setSubmitOpen(null)}>Cancel</Button>
            <Button
              className="btn-premium rounded-xl"
              disabled={submitOpen !== "Confirmed" && !notes.trim()}
              onClick={() => {
                if (!submitOpen) return;
                submitInboundVerification(r.id, { outcome: submitOpen, notes: notes.trim() });
                setSubmitOpen(null);
                toast.success("Verification submitted");
                nav({ to: "/app/verifications" });
              }}
            >
              Submit verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-[12px]">{label}</span>
      <div className="text-sm">{children}</div>
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

function StatusPill({ status }: { status: InboundStatus }) {
  const tone =
    status === "Confirmed" ? "bg-success/15 text-success border-success/25"
    : status === "Discrepancy Reported" || status === "Unable to Verify" ? "bg-destructive/10 text-destructive border-destructive/25"
    : status === "Clarification Requested" ? "bg-warning/15 text-warning-foreground border-warning/25"
    : status === "In Review" ? "bg-info/15 text-info-foreground border-info/25"
    : status === "New" ? "bg-primary/10 text-primary border-primary/25"
    : "bg-foreground/[0.04] text-foreground border-border/60";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{status}</span>;
}

function OutcomeBadge({ outcome }: { outcome: "Confirmed" | "Discrepancy" | "Unable to Verify" }) {
  if (outcome === "Confirmed") return <span className="inline-flex items-center gap-1.5 text-success text-sm font-medium"><CheckCircle2 className="h-4 w-4" /> Confirmed</span>;
  if (outcome === "Discrepancy") return <span className="inline-flex items-center gap-1.5 text-destructive text-sm font-medium"><AlertTriangle className="h-4 w-4" /> Discrepancy reported</span>;
  return <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm font-medium"><HelpCircle className="h-4 w-4" /> Unable to verify</span>;
}

function TimelineIcon({ kind }: { kind: string }) {
  const cls = "h-3.5 w-3.5 text-muted-foreground";
  if (kind === "received") return <Inbox className={cls} />;
  if (kind === "assigned") return <UserCog className={cls} />;
  if (kind === "clarification_requested") return <MessageCircleWarning className={cls} />;
  if (kind === "clarification_received") return <MessageCircleWarning className={cls} />;
  if (kind === "confirmed") return <CheckCircle2 className={cls} />;
  if (kind === "discrepancy") return <AlertTriangle className={cls} />;
  if (kind === "unable") return <HelpCircle className={cls} />;
  if (kind === "submitted") return <ClipboardCheck className={cls} />;
  return <Clock className={cls} />;
}
