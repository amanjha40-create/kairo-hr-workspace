import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import {
  seedEmployees, seedRequests, seedActivity, seedNotifications,
  Employee, VerificationRequest, ActivityItem, Notification, VerificationStatus,
} from "./dashboard-data";
import {
  workspacePeople as seedPeople,
  buildAttentionItems,
  WorkspacePerson,
  InternalNote,
  AttentionItem,
} from "./workspace-data";
import {
  seedInvitations,
  requestEnrichments as seedEnrichments,
  WorkspaceInvitation,
  RequestEnrichment,
  Clarification,
  VerificationTypeKey,
  PURPOSE_ROLL,
} from "./workspace-invitations";
import {
  inboundRequests as seedInbound,
  InboundVerificationRequest,
  InboundStatus,
  InboundSubmission,
  InboundTimelineEvent,
} from "./inbound-verifications";


interface InviteDraft {
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  purpose: string;
  internalReference?: string;
  department?: string;
  message?: string;
  requestedVerifications: VerificationTypeKey[];
  expiresInDays: number;
}

interface Ctx {
  employees: Employee[];
  people: WorkspacePerson[];
  requests: VerificationRequest[];
  invitations: WorkspaceInvitation[];
  enrichments: Record<string, RequestEnrichment>;
  activity: ActivityItem[];
  notifications: Notification[];
  attention: AttentionItem[];
  search: string;
  setSearch: (s: string) => void;
  inviteOpen: boolean;
  setInviteOpen: (b: boolean) => void;
  createRequestOpen: boolean;
  setCreateRequestOpen: (b: boolean) => void;
  emptyMode: boolean;
  setEmptyMode: (b: boolean) => void;
  addEmployee: (
    e: Omit<Employee, "updatedAt" | "verificationStatus" | "trustScore" | "employmentStatus" | "initials"> & Partial<Employee>,
  ) => void;
  updateRequestStatus: (id: string, status: VerificationStatus) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  unread: number;
  addNote: (personId: string, body: string) => void;
  editNote: (personId: string, noteId: string, body: string) => void;
  deleteNote: (personId: string, noteId: string) => void;
  createInvitation: (draft: InviteDraft, action: "send" | "draft") => WorkspaceInvitation;
  sendInvitationDraft: (id: string) => void;
  resendInvitation: (id: string) => void;
  cancelInvitation: (id: string) => void;
  deleteInvitationDraft: (id: string) => void;
  requestClarification: (
    requestId: string,
    payload: { subject: string; question: string; relatedField?: string; dueAt?: string; internalNote?: string },
  ) => void;
  cancelRequest: (requestId: string, reason: string) => void;
  sendReminder: (requestId: string) => void;
  createVerificationRequest: (payload: {
    personId?: string;
    invitationId?: string;
    type: VerificationTypeKey;
    reason?: string;
    priority?: "Standard" | "High";
  }) => VerificationRequest;
  // Inbound Employment Verifications (received from other organizations)
  inboundRequests: InboundVerificationRequest[];
  assignInboundReviewer: (id: string, reviewer: string) => void;
  requestInboundClarification: (id: string, question: string) => void;
  submitInboundVerification: (id: string, submission: Omit<InboundSubmission, "submittedAt" | "submittedBy">) => void;
  setInboundInternalNote: (id: string, note: string) => void;
}


const DashboardCtx = createContext<Ctx | null>(null);

const CURRENT_USER = "You";

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<WorkspacePerson[]>(seedPeople);
  const [requests, setRequests] = useState<VerificationRequest[]>(seedRequests);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>(seedInvitations);
  const [enrichments, setEnrichments] = useState<Record<string, RequestEnrichment>>(seedEnrichments);
  const [activity, setActivity] = useState<ActivityItem[]>(seedActivity);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifications);
  const [inbound, setInbound] = useState<InboundVerificationRequest[]>(seedInbound);

  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [emptyMode, setEmptyMode] = useState(false);

  const addEmployee = useCallback<Ctx["addEmployee"]>((e) => {
    const init = e.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const now = new Date().toISOString();
    const person: WorkspacePerson = {
      trustScore: 0,
      employmentStatus: "Invited",
      verificationStatus: "Pending",
      updatedAt: now,
      initials: init,
      relationship: "Candidate",
      invitationStatus: "Sent",
      workspaceVerificationStatus: "Not Started",
      sharedPassport: "Not Shared",
      addedBy: CURRENT_USER,
      addedAt: now,
      invitedAt: now,
      lastActivity: now,
      passportSharedClaims: [],
      personActivity: [
        { id: `pa-new-${Date.now()}-2`, kind: "invited", label: "Trust invitation sent", actor: CURRENT_USER, at: now },
        { id: `pa-new-${Date.now()}-1`, kind: "added", label: "Person added to workspace", actor: CURRENT_USER, at: now },
      ],
      notes: [],
      sharedEvidence: [],
      ...e,
    } as WorkspacePerson;
    setPeople((prev) => [person, ...prev]);
    setActivity((prev) => [{ id: `a-${Date.now()}`, kind: "invited", actor: "You", subject: e.name, at: "Just now" }, ...prev]);
    setNotifications((prev) => [{ id: `n-${Date.now()}`, kind: "invitation_opened", title: "Trust invitation sent", body: `${e.name} was invited to share their Trust Passport.`, at: "Just now", createdAt: new Date().toISOString(), read: false, target: { kind: "person", id: (e as { id?: string }).id, label: e.name } }, ...prev]);
  }, []);

  const updateRequestStatus = useCallback((id: string, status: VerificationStatus) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status, timeline: [...r.timeline, { at: new Date().toISOString(), label: `Status → ${status}`, actor: "You" }] } : r));
  }, []);

  const addNote = useCallback((personId: string, body: string) => {
    setPeople((prev) => prev.map((p) => p.id === personId ? { ...p, notes: [{ id: `n-${Date.now()}`, author: CURRENT_USER, body, at: new Date().toISOString(), ownedByMe: true }, ...p.notes] } : p));
  }, []);
  const editNote = useCallback((personId: string, noteId: string, body: string) => {
    setPeople((prev) => prev.map((p) => p.id === personId ? { ...p, notes: p.notes.map((n) => n.id === noteId ? { ...n, body, at: new Date().toISOString() } : n) } : p));
  }, []);
  const deleteNote = useCallback((personId: string, noteId: string) => {
    setPeople((prev) => prev.map((p) => p.id === personId ? { ...p, notes: p.notes.filter((n) => n.id !== noteId) } : p));
  }, []);

  const createInvitation = useCallback<Ctx["createInvitation"]>((draft, action) => {
    const now = new Date().toISOString();
    const id = `INV-${Math.floor(Math.random() * 9000) + 1000}`;
    const initials = draft.candidateName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const expires = new Date(Date.now() + draft.expiresInDays * 86400e3).toISOString();
    const inv: WorkspaceInvitation = {
      id,
      candidateName: draft.candidateName,
      candidateEmail: draft.candidateEmail,
      candidatePhone: draft.candidatePhone,
      candidateInitials: initials,
      relationship: "Candidate",
      purpose: draft.purpose,
      internalReference: draft.internalReference,
      department: draft.department,
      message: draft.message,
      requestedVerifications: draft.requestedVerifications,
      status: action === "send" ? "Sent" : "Draft",
      deliveryStatus: action === "send" ? "Delivered" : "Queued",
      sentBy: CURRENT_USER,
      sentAt: action === "send" ? now : undefined,
      expiresAt: expires,
      activity:
        action === "send"
          ? [
              { id: "e1", kind: "draft_created", label: "Draft created", actor: CURRENT_USER, at: now },
              { id: "e2", kind: "sent", label: "Invitation sent", actor: CURRENT_USER, at: now },
              { id: "e3", kind: "delivered", label: "Invitation delivered", actor: "System", at: now },
            ]
          : [{ id: "e1", kind: "draft_created", label: "Draft created", actor: CURRENT_USER, at: now }],
      lastActivity: now,
    };
    setInvitations((prev) => [inv, ...prev]);
    if (action === "send") {
      setNotifications((prev) => [{ id: `n-${Date.now()}`, kind: "invitation_opened", title: "Trust invitation sent", body: `Invitation sent to ${draft.candidateName}.`, at: "Just now", createdAt: now, read: false, target: { kind: "invitation", id: inv.id, label: inv.id } }, ...prev]);
    }
    return inv;
  }, []);

  const patchInvitation = (id: string, patch: (inv: WorkspaceInvitation) => WorkspaceInvitation) =>
    setInvitations((prev) => prev.map((i) => (i.id === id ? patch(i) : i)));

  const sendInvitationDraft = useCallback((id: string) => {
    const now = new Date().toISOString();
    patchInvitation(id, (i) => ({
      ...i,
      status: "Sent",
      sentAt: now,
      deliveryStatus: "Delivered",
      lastActivity: now,
      activity: [
        ...i.activity,
        { id: `e-${Date.now()}`, kind: "sent", label: "Invitation sent", actor: CURRENT_USER, at: now },
      ],
    }));
  }, []);

  const resendInvitation = useCallback((id: string) => {
    const now = new Date().toISOString();
    patchInvitation(id, (i) => ({
      ...i,
      status: i.status === "Expired" ? "Sent" : i.status,
      lastActivity: now,
      activity: [
        ...i.activity,
        { id: `e-${Date.now()}`, kind: "reminder", label: "Reminder sent", actor: CURRENT_USER, at: now },
      ],
    }));
  }, []);

  const cancelInvitation = useCallback((id: string) => {
    const now = new Date().toISOString();
    patchInvitation(id, (i) => ({
      ...i,
      status: "Cancelled",
      lastActivity: now,
      activity: [
        ...i.activity,
        { id: `e-${Date.now()}`, kind: "cancelled", label: "Invitation cancelled", actor: CURRENT_USER, at: now },
      ],
    }));
  }, []);

  const deleteInvitationDraft = useCallback((id: string) => {
    setInvitations((prev) => prev.filter((i) => !(i.id === id && i.status === "Draft")));
  }, []);

  const requestClarification = useCallback<Ctx["requestClarification"]>((requestId, payload) => {
    const now = new Date().toISOString();
    const clr: Clarification = {
      id: `clr-${Date.now()}`,
      subject: payload.subject,
      question: payload.question,
      relatedField: payload.relatedField,
      dueAt: payload.dueAt,
      internalNote: payload.internalNote,
      status: "Requested",
      requestedBy: CURRENT_USER,
      requestedAt: now,
    };
    setEnrichments((prev) => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] ?? { verificationType: "Employment", consent: { status: "Requested", sharedInformation: [] }, requestedFields: [], clarifications: [] }),
        clarifications: [clr, ...(prev[requestId]?.clarifications ?? [])],
      },
    }));
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: "Documents Requested", timeline: [...r.timeline, { at: now, label: `Clarification requested: ${payload.subject}`, actor: CURRENT_USER }] }
          : r,
      ),
    );
  }, []);

  const cancelRequest = useCallback((requestId: string, reason: string) => {
    const now = new Date().toISOString();
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: "Rejected", timeline: [...r.timeline, { at: now, label: `Request cancelled: ${reason}`, actor: CURRENT_USER }] }
          : r,
      ),
    );
    setEnrichments((prev) => ({
      ...prev,
      [requestId]: { ...(prev[requestId] as RequestEnrichment), cancellationReason: reason },
    }));
  }, []);

  const sendReminder = useCallback((requestId: string) => {
    const now = new Date().toISOString();
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, timeline: [...r.timeline, { at: now, label: "Reminder sent to candidate", actor: CURRENT_USER }] }
          : r,
      ),
    );
  }, []);

  const createVerificationRequest = useCallback<Ctx["createVerificationRequest"]>((payload) => {
    const now = new Date().toISOString();
    const person = payload.personId ? people.find((p) => p.id === payload.personId) : undefined;
    const inv = payload.invitationId ? invitations.find((i) => i.id === payload.invitationId) : undefined;
    const name = person?.name ?? inv?.candidateName ?? "New candidate";
    const email = person?.email ?? inv?.candidateEmail ?? "";
    const id = `REQ-${Math.floor(Math.random() * 9000) + 1000}`;
    const req: VerificationRequest = {
      id,
      employeeId: person?.id ?? inv?.internalReference ?? "—",
      employeeName: name,
      role: person?.role ?? "—",
      department: person?.department ?? inv?.department ?? "—",
      status: "Pending",
      requestedBy: CURRENT_USER,
      requestedAt: now,
      assignedHr: CURRENT_USER,
      documents: [],
      employmentHistory: [],
      notes: payload.reason ?? PURPOSE_ROLL[0],
      timeline: [{ at: now, label: "Verification request created", actor: CURRENT_USER }],
    };
    void email; void payload.priority;
    setRequests((prev) => [req, ...prev]);
    setEnrichments((prev) => ({
      ...prev,
      [id]: {
        verificationType: payload.type,
        invitationId: payload.invitationId ?? inv?.id,
        consent: {
          status: inv?.status === "Accepted" ? "Granted" : "Requested",
          grantedAt: inv?.status === "Accepted" ? now : undefined,
          accessExpiresAt: new Date(Date.now() + 30 * 86400e3).toISOString(),
          sharedInformation: [],
        },
        requestedFields: [],
        clarifications: [],
      },
    }));
    if (inv) {
      patchInvitation(inv.id, (i) => ({ ...i, linkedRequestId: id }));
    }
    setNotifications((prev) => [{ id: `n-${Date.now()}`, kind: "candidate_info_submitted", title: "Verification created", body: `${payload.type} verification created for ${name}.`, at: "Just now", createdAt: now, read: false, target: { kind: "verification", id: req.id, label: req.id } }, ...prev]);
    return req;
  }, [people, invitations]);

  // Inbound Employment Verifications
  const patchInbound = (id: string, patch: (r: InboundVerificationRequest) => InboundVerificationRequest) =>
    setInbound((prev) => prev.map((r) => (r.id === id ? patch(r) : r)));

  const pushInboundEvent = (r: InboundVerificationRequest, ev: Omit<InboundTimelineEvent, "id">): InboundVerificationRequest => ({
    ...r,
    lastUpdatedAt: ev.at,
    timeline: [...r.timeline, { id: `t-${Date.now()}`, ...ev }],
  });

  const assignInboundReviewer = useCallback((id: string, reviewer: string) => {
    const now = new Date().toISOString();
    patchInbound(id, (r) =>
      pushInboundEvent(
        { ...r, assignedReviewer: reviewer, status: r.status === "New" ? "In Review" : r.status },
        { at: now, label: `Assigned to ${reviewer}`, actor: CURRENT_USER, kind: "assigned" },
      ),
    );
  }, []);

  const requestInboundClarification = useCallback((id: string, question: string) => {
    const now = new Date().toISOString();
    patchInbound(id, (r) =>
      pushInboundEvent(
        { ...r, status: "Clarification Requested" },
        { at: now, label: "Clarification requested from candidate", actor: CURRENT_USER, kind: "clarification_requested", note: question },
      ),
    );
  }, []);

  const submitInboundVerification = useCallback<Ctx["submitInboundVerification"]>((id, s) => {
    const now = new Date().toISOString();
    const outcomeStatus: InboundStatus =
      s.outcome === "Confirmed" ? "Confirmed" : s.outcome === "Discrepancy" ? "Discrepancy Reported" : "Unable to Verify";
    patchInbound(id, (r) =>
      pushInboundEvent(
        {
          ...r,
          status: outcomeStatus,
          submission: { ...s, submittedAt: now, submittedBy: CURRENT_USER },
        },
        {
          at: now,
          label: `Verification submitted — ${s.outcome}`,
          actor: CURRENT_USER,
          kind: s.outcome === "Confirmed" ? "confirmed" : s.outcome === "Discrepancy" ? "discrepancy" : "unable",
          note: s.notes,
        },
      ),
    );
    setNotifications((prev) => [{ id: `n-${Date.now()}`, kind: "verification_completed", title: "Employment verification submitted", body: `Response delivered to requesting organization.`, at: "Just now", createdAt: now, read: false, target: { kind: "verification", id, label: id } }, ...prev]);
  }, []);

  const setInboundInternalNote = useCallback((id: string, note: string) => {
    patchInbound(id, (r) => ({ ...r, internalNote: note }));
  }, []);

  const markAllRead = useCallback(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);
  const markRead = useCallback((id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const markUnread = useCallback((id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n))), []);
  const unread = notifications.filter((n) => !n.read).length;

  const attention = useMemo(() => (emptyMode ? [] : buildAttentionItems(people)), [people, emptyMode]);

  const value = useMemo<Ctx>(() => ({
    employees: emptyMode ? [] : people,
    people: emptyMode ? [] : people,
    requests: emptyMode ? [] : requests,
    invitations: emptyMode ? [] : invitations,
    enrichments,
    activity: emptyMode ? [] : activity,
    notifications, attention,
    search, setSearch,
    inviteOpen, setInviteOpen,
    createRequestOpen, setCreateRequestOpen,
    emptyMode, setEmptyMode,
    addEmployee, updateRequestStatus, markAllRead, markRead, markUnread, unread,
    addNote, editNote, deleteNote,
    createInvitation, sendInvitationDraft, resendInvitation, cancelInvitation, deleteInvitationDraft,
    requestClarification, cancelRequest, sendReminder, createVerificationRequest,
    inboundRequests: emptyMode ? [] : inbound,
    assignInboundReviewer, requestInboundClarification, submitInboundVerification, setInboundInternalNote,
  }), [people, requests, invitations, enrichments, activity, notifications, attention, search, inviteOpen, createRequestOpen, emptyMode, inbound, addEmployee, updateRequestStatus, markAllRead, unread, addNote, editNote, deleteNote, createInvitation, sendInvitationDraft, resendInvitation, cancelInvitation, deleteInvitationDraft, requestClarification, cancelRequest, sendReminder, createVerificationRequest, assignInboundReviewer, requestInboundClarification, submitInboundVerification, setInboundInternalNote]);


  return <DashboardCtx.Provider value={value}>{children}</DashboardCtx.Provider>;
}

export function useDashboard() {
  const v = useContext(DashboardCtx);
  if (!v) throw new Error("useDashboard must be used inside DashboardProvider");
  return v;
}

export function useFilteredEmployees() {
  const { employees, search } = useDashboard();
  const q = search.trim().toLowerCase();
  if (!q) return employees;
  return employees.filter((e) =>
    [e.id, e.name, e.email, e.department, e.role].some((v) => v.toLowerCase().includes(q)),
  );
}

export function useFilteredPeople() {
  const { people, search } = useDashboard();
  const q = search.trim().toLowerCase();
  if (!q) return people;
  return people.filter((e) =>
    [e.id, e.name, e.email, e.department, e.role].some((v) => v.toLowerCase().includes(q)),
  );
}

export function useFilteredRequests() {
  const { requests, search } = useDashboard();
  const q = search.trim().toLowerCase();
  if (!q) return requests;
  return requests.filter((r) =>
    [r.id, r.employeeId, r.employeeName, r.department, r.role].some((v) => v.toLowerCase().includes(q)),
  );
}

export function useFilteredInvitations() {
  const { invitations, search } = useDashboard();
  const q = search.trim().toLowerCase();
  if (!q) return invitations;
  return invitations.filter((i) =>
    [i.id, i.candidateName, i.candidateEmail, i.purpose, i.department ?? "", i.internalReference ?? ""].some((v) =>
      v.toLowerCase().includes(q),
    ),
  );
}

export function useFilteredInboundRequests() {
  const { inboundRequests, search } = useDashboard();
  const q = search.trim().toLowerCase();
  if (!q) return inboundRequests;
  return inboundRequests.filter((r) =>
    [r.id, r.candidateName, r.requestingOrg.name, r.claim.jobTitle, r.assignedReviewer ?? ""].some((v) =>
      v.toLowerCase().includes(q),
    ),
  );
}


