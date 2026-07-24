import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, SectionCard, EmptyState } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDashboard } from "@/lib/dashboard-context";
import {
  RelationshipPill, InvitationPill, VerificationPill, PassportPill, ClaimPill,
} from "@/components/app/workspace-pills";
import {
  ArrowLeft, ShieldCheck, FileSearch, ArrowRight, Lock, LockOpen, EyeOff,
  Pencil, Trash2, MessageCircle, ShieldOff, CalendarClock,
  UserRound, Mail, Phone, Users, Hash, Clock, Sparkles, ClipboardList, FileText,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/people/$id")({
  component: PersonDetail,
  notFoundComponent: PersonNotFound,
});

function PersonNotFound() {
  return (
    <div>
      <Link to="/app/people" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> All people
      </Link>
      <SectionCard title="Person not found" description="This person may have been removed or you don't have access.">
        <EmptyState
          icon={UserRound}
          title="We couldn't find this person"
          description="They may no longer be in your workspace, or your access may have been revoked."
        />
      </SectionCard>
    </div>
  );
}

function PersonDetail() {
  const { id } = Route.useParams();
  const { people, requests, addNote, editNote, deleteNote } = useDashboard();
  const p = people.find((x) => x.id === id);
  if (!p) throw notFound();
  const empRequests = requests.filter((r) => r.employeeId === p.id);

  const passportOpenable = p.sharedPassport === "Active" || p.sharedPassport === "Expiring Soon";
  // Legacy outbound create-request action removed; verifications are inbound-only.

  return (
    <div>
      <Link to="/app/people" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> All people
      </Link>

      <PageHeader
        eyebrow={p.id}
        title={p.name}
        description={p.email}
        actions={
          <>
            {passportOpenable && (
              <Button
                size="sm"
                className="btn-premium rounded-xl"
                onClick={() => toast.success("Opening Shared Trust Passport")}
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" /> Open Shared Trust Passport
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-8">
        <RelationshipPill value={p.relationship} />
        <InvitationPill value={p.invitationStatus} />
        <VerificationPill value={p.workspaceVerificationStatus} />
        <PassportPill value={p.sharedPassport} />
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="mb-4 bg-foreground/[0.03] rounded-xl h-10 p-1 flex-wrap">
          <TabsTrigger value="summary" className="rounded-lg">Summary</TabsTrigger>
          <TabsTrigger value="passport" className="rounded-lg">Shared Trust Passport</TabsTrigger>
          <TabsTrigger value="requests" className="rounded-lg">Employment Verifications</TabsTrigger>
          <TabsTrigger value="evidence" className="rounded-lg">Shared Evidence</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg">Activity</TabsTrigger>
          <TabsTrigger value="notes" className="rounded-lg">Internal Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <SectionCard title="Summary" description="Profile information for this person">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 p-6">
              <Field icon={UserRound} label="Full name" value={p.name} />
              <Field icon={Mail} label="Email" value={p.email} />
              <Field icon={Phone} label="Phone" value={p.phone || "—"} />
              <Field icon={Users} label="Relationship" value={p.relationship} />
              <Field icon={Hash} label="Person reference" value={p.id} mono />
              <Field icon={CalendarClock} label="Date added" value={format(new Date(p.addedAt), "MMM d, yyyy")} />
              <Field icon={UserRound} label="Invited or added by" value={p.addedBy} />
              <Field icon={Clock} label="Last activity" value={formatDistanceToNow(new Date(p.lastActivity), { addSuffix: true })} />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="passport">
          <PassportSection person={p} />
        </TabsContent>

        <TabsContent value="requests">
          <SectionCard title="Employment Verifications" description="Employment verifications received for this person from other organizations.">
            {empRequests.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No employment verifications yet"
                description="When another organization requests employment verification for this person, it will appear here."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {empRequests.map((r) => (
                  <Link
                    key={r.id}
                    to="/app/verifications/$id"
                    params={{ id: r.id }}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-foreground/[0.02] group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Employment Verification</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{r.id}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Requested by {r.requestedBy} · {formatDistanceToNow(new Date(r.requestedAt), { addSuffix: true })}
                      </div>
                    </div>
                    <VerificationPill value={mapLegacyStatus(r.status)} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="evidence">
          <SectionCard
            title="Shared Evidence"
            description="Shared Evidence — documents the candidate consented to share for a specific invitation or employment verification."
          >
            {p.sharedEvidence.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No shared evidence"
                description="Documents the candidate shares for a Trust Invitation or employment verification will appear here."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {p.sharedEvidence.map((e) => {
                  const restricted = e.status !== "Available";
                  return (
                    <div key={e.id} className="px-5 py-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center shrink-0">
                        {restricted ? <Lock className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{e.type}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {e.requestId} · shared {formatDistanceToNow(new Date(e.sharedAt), { addSuffix: true })}
                        </div>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                        e.status === "Available" ? "bg-success/15 text-success" :
                        e.status === "Expired" ? "bg-warning/15 text-warning-foreground" :
                        "bg-destructive/10 text-destructive"
                      }`}>{e.status}</span>
                      <Button variant="ghost" size="sm" className="rounded-lg h-8" disabled={restricted}>
                        View
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="activity">
          <SectionCard title="Activity" description="Chronological history of everything on this person">
            {p.personActivity.length === 0 ? (
              <EmptyState icon={Sparkles} title="No activity yet" description="Activity will appear here as things progress." />
            ) : (
              <ol className="p-6 relative border-l border-border/60 ml-3 space-y-5">
                {p.personActivity.map((a) => (
                  <li key={a.id} className="pl-6">
                    <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-foreground" />
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {a.actor} · {format(new Date(a.at), "MMM d, yyyy · HH:mm")}
                      {a.requestId && <> · <Link to="/app/verifications/$id" params={{ id: a.requestId }} className="hover:underline">{a.requestId}</Link></>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="notes">
          <NotesSection
            personId={p.id}
            notes={p.notes}
            addNote={addNote}
            editNote={editNote}
            deleteNote={deleteNote}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ icon: Icon, label, value, mono }: { icon: typeof UserRound; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`text-sm mt-1 font-medium ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function PassportSection({ person }: { person: ReturnType<typeof usePerson> }) {
  if (!person) return null;
  const status = person.sharedPassport;
  const restricted = status === "Expired" || status === "Access Revoked" || status === "Not Shared";

  return (
    <SectionCard
      title="Shared Trust Passport"
      description="This organization can only view information the candidate has chosen to share."
    >
      <div className="p-6 space-y-6">
        <div className="rounded-2xl border border-border/60 bg-foreground/[0.02] p-5 flex flex-wrap items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-background border border-border/60 flex items-center justify-center">
            {restricted ? <Lock className="h-5 w-5 text-muted-foreground" /> : <LockOpen className="h-5 w-5 text-success" />}
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="text-sm font-medium">Passport access</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {person.sharedAt ? <>Shared {format(new Date(person.sharedAt), "MMM d, yyyy")}</> : "Not shared with your organization yet"}
              {person.passportExpiresAt && <> · Expires {format(new Date(person.passportExpiresAt), "MMM d, yyyy")}</>}
            </div>
          </div>
          <PassportPill value={status} />
        </div>

        {restricted ? (
          <RestrictedPassport status={status} />
        ) : (
          <>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Shared claims</div>
              {person.passportSharedClaims.length === 0 ? (
                <div className="text-sm text-muted-foreground">No claims have been shared yet.</div>
              ) : (
                <div className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                  {person.passportSharedClaims.map((c, i) => (
                    <div key={i} className="px-4 py-3 flex flex-wrap items-center gap-3 bg-background">
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-sm font-medium">{c.label}</div>
                        {c.source && <div className="text-[11px] text-muted-foreground">Source · {c.source}</div>}
                      </div>
                      <ClaimPill value={c.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button className="btn-premium rounded-xl" onClick={() => toast.success("Opening Shared Trust Passport")}>
                <ShieldCheck className="h-4 w-4 mr-1.5" /> Open Shared Trust Passport
              </Button>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}

function usePerson() {
  const { id } = Route.useParams();
  const { people } = useDashboard();
  return people.find((x) => x.id === id);
}

function RestrictedPassport({ status }: { status: string }) {
  const map: Record<string, { icon: typeof Lock; title: string; body: string }> = {
    "Not Shared": { icon: EyeOff, title: "This candidate hasn't shared a Trust Passport yet", body: "You'll see shared claims here once the candidate grants access." },
    "Expired": { icon: CalendarClock, title: "Passport access has expired", body: "Ask the candidate to re-share their Trust Passport to view claims again." },
    "Access Revoked": { icon: ShieldOff, title: "Access to this Passport was revoked", body: "The candidate revoked your access. Reach out to request a new share." },
  };
  const { icon: Icon, title, body } = map[status] ?? map["Not Shared"];
  return (
    <div className="rounded-xl border border-dashed border-border/60 p-8 flex flex-col items-center text-center">
      <div className="h-12 w-12 rounded-xl bg-foreground/[0.04] flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-1 max-w-sm">{body}</div>
    </div>
  );
}

function mapLegacyStatus(s: string) {
  switch (s) {
    case "Verified": return "Completed" as const;
    case "Rejected": return "Unable to Verify" as const;
    case "Under Review": return "In Verification" as const;
    case "Documents Requested": return "Clarification Required" as const;
    case "Pending": return "Waiting for Candidate" as const;
    default: return "Not Started" as const;
  }
}

function NotesSection({
  personId, notes, addNote, editNote, deleteNote,
}: {
  personId: string;
  notes: Array<{ id: string; author: string; body: string; at: string; ownedByMe?: boolean }>;
  addNote: (id: string, body: string) => void;
  editNote: (id: string, noteId: string, body: string) => void;
  deleteNote: (id: string, noteId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  function submit() {
    if (!draft.trim()) return;
    addNote(personId, draft.trim());
    setDraft("");
    toast.success("Note added");
  }

  return (
    <SectionCard title="Internal Notes" description="These notes are visible only to your organization and are not part of the candidate's Trust Passport.">
      <div className="p-6 space-y-6">
        <div className="rounded-xl border border-border/60 p-3 bg-background">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a private note visible only to your team…"
            className="border-0 focus-visible:ring-0 shadow-none resize-none min-h-[72px] px-1 text-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Private to your organization
            </div>
            <Button size="sm" className="rounded-lg" onClick={submit} disabled={!draft.trim()}>
              <MessageCircle className="h-4 w-4 mr-1.5" /> Add note
            </Button>
          </div>
        </div>

        {notes.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No notes yet" description="Notes your team adds will show up here." />
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-border/60 p-4 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[10px] font-medium">
                    {n.author.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">{n.author}</span>{" "}
                    <span className="text-muted-foreground">· {formatDistanceToNow(new Date(n.at), { addSuffix: true })}</span>
                  </div>
                  {n.ownedByMe && editingId !== n.id && (
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                        aria-label="Edit note"
                        onClick={() => { setEditingId(n.id); setEditBody(n.body); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive"
                        aria-label="Delete note"
                        onClick={() => { deleteNote(personId, n.id); toast.success("Note deleted"); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {editingId === n.id ? (
                  <>
                    <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="text-sm" />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button
                        size="sm"
                        onClick={() => { editNote(personId, n.id, editBody); setEditingId(null); toast.success("Note updated"); }}
                      >Save</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
