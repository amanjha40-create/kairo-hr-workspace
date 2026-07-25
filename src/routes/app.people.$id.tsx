import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState, PageHeader, SectionCard, TableSkeleton } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccess } from "@/lib/access-context";
import {
  ClaimPill,
  InvitationPill,
  PassportPill,
  RelationshipPill,
  VerificationPill,
} from "@/components/app/workspace-pills";
import type {
  PeoplePassportStatus,
  PersonDetailRecord,
  PersonInternalNote,
} from "@/lib/organization-people";
import {
  canOpenSharedPassport,
  getOrganizationPeopleErrorMessage,
} from "@/lib/organization-people";
import {
  useAddOrganizationPersonNoteMutation,
  useDeleteOrganizationPersonNoteMutation,
  useOrganizationPersonDetailQuery,
  useUpdateOrganizationPersonNoteMutation,
} from "@/lib/queries/organization-people";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Clock,
  EyeOff,
  FileText,
  Lock,
  LockOpen,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  Hash,
  AlertTriangle,
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
      <Link
        to="/app/people"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> All people
      </Link>
      <SectionCard
        title="Person not found"
        description="This person may have been removed or you don't have access."
      >
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
  const { can, org } = useAccess();
  const canModify = can("modify_person");
  const detailQuery = useOrganizationPersonDetailQuery(org?.publicId, id);
  const addNoteMutation = useAddOrganizationPersonNoteMutation();
  const updateNoteMutation = useUpdateOrganizationPersonNoteMutation();
  const deleteNoteMutation = useDeleteOrganizationPersonNoteMutation();
  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== "undefined" && window.location.hash === "#passport" ? "passport" : "summary",
  );

  if (!org) {
    return (
      <EmptyState
        icon={Users}
        title="No active organization"
        description="People become available after your workspace organization is ready."
      />
    );
  }

  if (!canModify) {
    return (
      <EmptyState
        icon={Users}
        title="Permission denied"
        description="You don't have permission to view this person in your workspace."
      />
    );
  }

  if (detailQuery.isPending && !detailQuery.data) {
    return (
      <div>
        <Link
          to="/app/people"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> All people
        </Link>
        <SectionCard
          title="Loading person"
          description="Fetching the latest organization person record."
        >
          <TableSkeleton rows={4} />
        </SectionCard>
      </div>
    );
  }

  if (detailQuery.error) {
    const status = "status" in detailQuery.error ? detailQuery.error.status : undefined;
    if (status === 404) {
      return <PersonNotFound />;
    }

    return (
      <EmptyState
        icon={AlertTriangle}
        title={status === 403 ? "Permission denied" : "Person didn't load"}
        description={getOrganizationPeopleErrorMessage(detailQuery.error, "Please try again.")}
        action={{
          label: "Retry",
          onClick: () => {
            void detailQuery.refetch();
          },
        }}
      />
    );
  }

  const person = detailQuery.data;
  if (!person) {
    return <PersonNotFound />;
  }

  return (
    <div>
      <Link
        to="/app/people"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> All people
      </Link>

      <PageHeader
        eyebrow={person.publicId}
        title={person.fullName}
        description={person.email || "No email shared"}
        actions={
          canOpenSharedPassport(person.passportStatus) ? (
            <Button
              size="sm"
              className="btn-premium rounded-xl"
              onClick={() => setActiveTab("passport")}
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Open Shared Trust Passport
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-8">
        <RelationshipPill value={person.relationship} />
        <InvitationPill value={person.invitationStatus} />
        <VerificationPill value={person.verificationStatus} />
        <PassportPill value={person.passportStatus} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 bg-foreground/[0.03] rounded-xl h-10 p-1 flex-wrap">
          <TabsTrigger value="summary" className="rounded-lg">
            Summary
          </TabsTrigger>
          <TabsTrigger value="passport" className="rounded-lg">
            Shared Trust Passport
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-lg">
            Employment Verifications
          </TabsTrigger>
          <TabsTrigger value="evidence" className="rounded-lg">
            Shared Evidence
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg">
            Activity
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-lg">
            Internal Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <SectionCard title="Summary" description="Profile information for this person">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 p-6">
              <Field icon={UserRound} label="Full name" value={person.fullName} />
              <Field icon={Mail} label="Email" value={person.email || "—"} />
              <Field icon={Phone} label="Phone" value={person.phone || "—"} />
              <Field icon={Users} label="Relationship" value={person.relationship} />
              <Field icon={Hash} label="Person reference" value={person.publicId} mono />
              <Field
                icon={CalendarClock}
                label="Date added"
                value={format(new Date(person.addedAt), "MMM d, yyyy")}
              />
              <Field icon={UserRound} label="Invited or added by" value={person.addedBy} />
              <Field
                icon={Clock}
                label="Last activity"
                value={
                  person.lastActivityAt
                    ? formatDistanceToNow(new Date(person.lastActivityAt), { addSuffix: true })
                    : "No activity yet"
                }
              />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="passport">
          <PassportSection person={person} />
        </TabsContent>

        <TabsContent value="requests">
          <SectionCard
            title="Employment Verifications"
            description="Employment verifications received for this person from other organizations."
          >
            {person.employmentVerifications.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No employment verifications yet"
                description="When another organization requests employment verification for this person, it will appear here."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {person.employmentVerifications.map((verification) => (
                  <Link
                    key={verification.publicId}
                    to="/app/verifications/$id"
                    params={{ id: verification.requestPublicId }}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-foreground/[0.02] group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {verification.requestType || "Employment Verification"}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {verification.requestPublicId}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Requested by {verification.requestedBy} ·{" "}
                        {formatDistanceToNow(new Date(verification.requestedAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                    <VerificationPill value={verification.status} />
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
            {person.sharedEvidence.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No shared evidence"
                description="Documents the candidate shares for a Trust Invitation or employment verification will appear here."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {person.sharedEvidence.map((evidence) => {
                  const restricted = evidence.status !== "Available" || !evidence.downloadUrl;
                  return (
                    <div key={evidence.publicId} className="px-5 py-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center shrink-0">
                        {restricted ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {evidence.originalFilename ?? evidence.type}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {evidence.requestPublicId} · shared{" "}
                          {formatDistanceToNow(new Date(evidence.sharedAt), { addSuffix: true })}
                        </div>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          evidence.status === "Available"
                            ? "bg-success/15 text-success"
                            : evidence.status === "Expired"
                              ? "bg-warning/15 text-warning-foreground"
                              : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {evidence.status}
                      </span>
                      {restricted ? (
                        <Button variant="ghost" size="sm" className="rounded-lg h-8" disabled>
                          View
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="rounded-lg h-8" asChild>
                          <a
                            href={evidence.downloadUrl ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="activity">
          <SectionCard
            title="Activity"
            description="Chronological history of everything on this person"
          >
            {person.activity.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No activity yet"
                description="Activity will appear here as things progress."
              />
            ) : (
              <ol className="p-6 relative border-l border-border/60 ml-3 space-y-5">
                {person.activity.map((activity) => (
                  <li key={activity.id} className="pl-6">
                    <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-foreground" />
                    <div className="text-sm font-medium">{activity.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {activity.actor} · {format(new Date(activity.at), "MMM d, yyyy · HH:mm")}
                      {activity.requestPublicId ? (
                        <>
                          {" "}
                          ·{" "}
                          <Link
                            to="/app/verifications/$id"
                            params={{ id: activity.requestPublicId }}
                            className="hover:underline"
                          >
                            {activity.requestPublicId}
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="notes">
          <NotesSection
            notes={person.internalNotes}
            onAddNote={async (body) => {
              await addNoteMutation.mutateAsync({
                orgPublicId: org.publicId,
                personPublicId: person.publicId,
                body,
              });
            }}
            onUpdateNote={async (notePublicId, body) => {
              await updateNoteMutation.mutateAsync({
                orgPublicId: org.publicId,
                personPublicId: person.publicId,
                notePublicId,
                body,
              });
            }}
            onDeleteNote={async (notePublicId) => {
              await deleteNoteMutation.mutateAsync({
                orgPublicId: org.publicId,
                personPublicId: person.publicId,
                notePublicId,
              });
            }}
            isMutating={
              addNoteMutation.isPending ||
              updateNoteMutation.isPending ||
              deleteNoteMutation.isPending
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`text-sm mt-1 font-medium ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function PassportSection({ person }: { person: PersonDetailRecord }) {
  const status = person.passportStatus;
  const restricted = status === "Expired" || status === "Access Revoked" || status === "Not Shared";

  return (
    <SectionCard
      title="Shared Trust Passport"
      description="This organization can only view information the candidate has chosen to share."
    >
      <div className="p-6 space-y-6">
        <div className="rounded-2xl border border-border/60 bg-foreground/[0.02] p-5 flex flex-wrap items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-background border border-border/60 flex items-center justify-center">
            {restricted ? (
              <Lock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <LockOpen className="h-5 w-5 text-success" />
            )}
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="text-sm font-medium">Passport access</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {person.passportPreview.sharedAt ? (
                <>Shared {format(new Date(person.passportPreview.sharedAt), "MMM d, yyyy")}</>
              ) : (
                "Not shared with your organization yet"
              )}
              {person.passportPreview.expiresAt ? (
                <> · Expires {format(new Date(person.passportPreview.expiresAt), "MMM d, yyyy")}</>
              ) : null}
            </div>
          </div>
          <PassportPill value={status} />
        </div>

        {restricted ? (
          <RestrictedPassport status={status} />
        ) : (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
              Shared claims
            </div>
            {person.passportPreview.claims.length === 0 ? (
              <div className="text-sm text-muted-foreground">No claims have been shared yet.</div>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                {person.passportPreview.claims.map((claim) => (
                  <div
                    key={`${claim.label}-${claim.source ?? "claim"}`}
                    className="px-4 py-3 flex flex-wrap items-center gap-3 bg-background"
                  >
                    <div className="flex-1 min-w-[180px]">
                      <div className="text-sm font-medium">{claim.label}</div>
                      {claim.source ? (
                        <div className="text-[11px] text-muted-foreground">
                          Source · {claim.source}
                        </div>
                      ) : null}
                    </div>
                    <ClaimPill value={claim.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function RestrictedPassport({ status }: { status: PeoplePassportStatus }) {
  const map: Record<PeoplePassportStatus, { icon: typeof Lock; title: string; body: string }> = {
    "Not Shared": {
      icon: EyeOff,
      title: "This candidate hasn't shared a Trust Passport yet",
      body: "You'll see shared claims here once the candidate grants access.",
    },
    Active: {
      icon: LockOpen,
      title: "This passport is available",
      body: "Shared claims are available while the passport remains active.",
    },
    "Expiring Soon": {
      icon: CalendarClock,
      title: "Passport access is expiring soon",
      body: "Review the shared claims soon or request a new share before access expires.",
    },
    Expired: {
      icon: CalendarClock,
      title: "Passport access has expired",
      body: "Ask the candidate to re-share their Trust Passport to view claims again.",
    },
    "Access Revoked": {
      icon: ShieldOff,
      title: "Access to this Passport was revoked",
      body: "The candidate revoked your access. Reach out to request a new share.",
    },
  };
  const { icon: Icon, title, body } = map[status];
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

function NotesSection({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  isMutating,
}: {
  notes: PersonInternalNote[];
  onAddNote: (body: string) => Promise<void>;
  onUpdateNote: (notePublicId: string, body: string) => Promise<void>;
  onDeleteNote: (notePublicId: string) => Promise<void>;
  isMutating: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  async function submit() {
    if (!draft.trim()) return;

    try {
      await onAddNote(draft.trim());
      setDraft("");
      toast.success("Note added");
    } catch (error) {
      toast.error(getOrganizationPeopleErrorMessage(error, "We couldn't add this note."));
    }
  }

  return (
    <SectionCard
      title="Internal Notes"
      description="These notes are visible only to your organization and are not part of the candidate's Trust Passport."
    >
      <div className="p-6 space-y-6">
        <div className="rounded-xl border border-border/60 p-3 bg-background">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a private note visible only to your team…"
            className="border-0 focus-visible:ring-0 shadow-none resize-none min-h-[72px] px-1 text-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Private to your organization
            </div>
            <Button
              size="sm"
              className="rounded-lg"
              onClick={() => void submit()}
              disabled={!draft.trim() || isMutating}
            >
              <MessageCircle className="h-4 w-4 mr-1.5" /> Add note
            </Button>
          </div>
        </div>

        {notes.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No notes yet"
            description="Notes your team adds will show up here."
          />
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.publicId}
                className="rounded-xl border border-border/60 p-4 bg-background"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[10px] font-medium">
                    {note.author
                      .split(" ")
                      .map((segment) => segment[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">{note.author}</span>{" "}
                    <span className="text-muted-foreground">
                      · {formatDistanceToNow(new Date(note.at), { addSuffix: true })}
                    </span>
                  </div>
                  {note.ownedByCurrentUser && editingId !== note.publicId ? (
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        aria-label="Edit note"
                        onClick={() => {
                          setEditingId(note.publicId);
                          setEditBody(note.body);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-destructive"
                        aria-label="Delete note"
                        disabled={isMutating}
                        onClick={async () => {
                          try {
                            await onDeleteNote(note.publicId);
                            toast.success("Note deleted");
                          } catch (error) {
                            toast.error(
                              getOrganizationPeopleErrorMessage(
                                error,
                                "We couldn't delete this note.",
                              ),
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                {editingId === note.publicId ? (
                  <>
                    <Textarea
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      className="text-sm"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditBody("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!editBody.trim() || isMutating}
                        onClick={async () => {
                          try {
                            await onUpdateNote(note.publicId, editBody.trim());
                            setEditingId(null);
                            setEditBody("");
                            toast.success("Note updated");
                          } catch (error) {
                            toast.error(
                              getOrganizationPeopleErrorMessage(
                                error,
                                "We couldn't update this note.",
                              ),
                            );
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{note.body}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
