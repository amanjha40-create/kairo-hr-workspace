import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import {
  seedEmployees,
  seedRequests,
  seedActivity,
  seedNotifications,
  Employee,
  VerificationRequest,
  ActivityItem,
  Notification,
  VerificationStatus,
} from "./dashboard-data";
import {
  workspacePeople as seedPeople,
  buildAttentionItems,
  WorkspacePerson,
  InternalNote,
  AttentionItem,
} from "./workspace-data";
import {
  requestEnrichments as seedEnrichments,
  RequestEnrichment,
  Clarification,
  VerificationTypeKey,
  PURPOSE_ROLL,
} from "./workspace-invitations";

interface Ctx {
  employees: Employee[];
  people: WorkspacePerson[];
  requests: VerificationRequest[];
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
    e: Omit<
      Employee,
      "updatedAt" | "verificationStatus" | "trustScore" | "employmentStatus" | "initials"
    > &
      Partial<Employee>,
  ) => void;
  updateRequestStatus: (id: string, status: VerificationStatus) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  unread: number;
  addNote: (personId: string, body: string) => void;
  editNote: (personId: string, noteId: string, body: string) => void;
  deleteNote: (personId: string, noteId: string) => void;
  requestClarification: (
    requestId: string,
    payload: {
      subject: string;
      question: string;
      relatedField?: string;
      dueAt?: string;
      internalNote?: string;
    },
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
}

const DashboardCtx = createContext<Ctx | null>(null);

const CURRENT_USER = "You";

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<WorkspacePerson[]>(seedPeople);
  const [requests, setRequests] = useState<VerificationRequest[]>(seedRequests);
  const [enrichments, setEnrichments] =
    useState<Record<string, RequestEnrichment>>(seedEnrichments);
  const [activity, setActivity] = useState<ActivityItem[]>(seedActivity);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifications);

  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [emptyMode, setEmptyMode] = useState(false);

  const addEmployee = useCallback<Ctx["addEmployee"]>((e) => {
    const init = e.name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
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
        {
          id: `pa-new-${Date.now()}-2`,
          kind: "invited",
          label: "Trust invitation sent",
          actor: CURRENT_USER,
          at: now,
        },
        {
          id: `pa-new-${Date.now()}-1`,
          kind: "added",
          label: "Person added to workspace",
          actor: CURRENT_USER,
          at: now,
        },
      ],
      notes: [],
      sharedEvidence: [],
      ...e,
    } as WorkspacePerson;
    setPeople((prev) => [person, ...prev]);
    setActivity((prev) => [
      { id: `a-${Date.now()}`, kind: "invited", actor: "You", subject: e.name, at: "Just now" },
      ...prev,
    ]);
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        kind: "invitation_opened",
        title: "Trust invitation sent",
        body: `${e.name} was invited to share their Trust Passport.`,
        at: "Just now",
        createdAt: new Date().toISOString(),
        read: false,
        target: { kind: "person", id: (e as { id?: string }).id, label: e.name },
      },
      ...prev,
    ]);
  }, []);

  const updateRequestStatus = useCallback((id: string, status: VerificationStatus) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              timeline: [
                ...r.timeline,
                { at: new Date().toISOString(), label: `Status → ${status}`, actor: "You" },
              ],
            }
          : r,
      ),
    );
  }, []);

  const addNote = useCallback((personId: string, body: string) => {
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId
          ? {
              ...p,
              notes: [
                {
                  id: `n-${Date.now()}`,
                  author: CURRENT_USER,
                  body,
                  at: new Date().toISOString(),
                  ownedByMe: true,
                },
                ...p.notes,
              ],
            }
          : p,
      ),
    );
  }, []);
  const editNote = useCallback((personId: string, noteId: string, body: string) => {
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId
          ? {
              ...p,
              notes: p.notes.map((n) =>
                n.id === noteId ? { ...n, body, at: new Date().toISOString() } : n,
              ),
            }
          : p,
      ),
    );
  }, []);
  const deleteNote = useCallback((personId: string, noteId: string) => {
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId ? { ...p, notes: p.notes.filter((n) => n.id !== noteId) } : p,
      ),
    );
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
        ...(prev[requestId] ?? {
          verificationType: "Employment",
          consent: { status: "Requested", sharedInformation: [] },
          requestedFields: [],
          clarifications: [],
        }),
        clarifications: [clr, ...(prev[requestId]?.clarifications ?? [])],
      },
    }));
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "Documents Requested",
              timeline: [
                ...r.timeline,
                {
                  at: now,
                  label: `Clarification requested: ${payload.subject}`,
                  actor: CURRENT_USER,
                },
              ],
            }
          : r,
      ),
    );
  }, []);

  const cancelRequest = useCallback((requestId: string, reason: string) => {
    const now = new Date().toISOString();
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "Rejected",
              timeline: [
                ...r.timeline,
                { at: now, label: `Request cancelled: ${reason}`, actor: CURRENT_USER },
              ],
            }
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
          ? {
              ...r,
              timeline: [
                ...r.timeline,
                { at: now, label: "Reminder sent to candidate", actor: CURRENT_USER },
              ],
            }
          : r,
      ),
    );
  }, []);

  const createVerificationRequest = useCallback<Ctx["createVerificationRequest"]>(
    (payload) => {
      const now = new Date().toISOString();
      const person = payload.personId ? people.find((p) => p.id === payload.personId) : undefined;
      const name = person?.name ?? "New candidate";
      const email = person?.email ?? "";
      const id = `REQ-${Math.floor(Math.random() * 9000) + 1000}`;
      const req: VerificationRequest = {
        id,
        employeeId: person?.id ?? "—",
        employeeName: name,
        role: person?.role ?? "—",
        department: person?.department ?? "—",
        status: "Pending",
        requestedBy: CURRENT_USER,
        requestedAt: now,
        assignedHr: CURRENT_USER,
        documents: [],
        employmentHistory: [],
        notes: payload.reason ?? PURPOSE_ROLL[0],
        timeline: [{ at: now, label: "Verification request created", actor: CURRENT_USER }],
      };
      void email;
      void payload.priority;
      setRequests((prev) => [req, ...prev]);
      setEnrichments((prev) => ({
        ...prev,
        [id]: {
          verificationType: payload.type,
          invitationId: payload.invitationId,
          consent: {
            status: "Requested",
            grantedAt: undefined,
            accessExpiresAt: new Date(Date.now() + 30 * 86400e3).toISOString(),
            sharedInformation: [],
          },
          requestedFields: [],
          clarifications: [],
        },
      }));
      setNotifications((prev) => [
        {
          id: `n-${Date.now()}`,
          kind: "candidate_info_submitted",
          title: "Verification created",
          body: `${payload.type} verification created for ${name}.`,
          at: "Just now",
          createdAt: now,
          read: false,
          target: { kind: "verification", id: req.id, label: req.id },
        },
        ...prev,
      ]);
      return req;
    },
    [people],
  );

  const markAllRead = useCallback(
    () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    [],
  );
  const markRead = useCallback(
    (id: string) =>
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
    [],
  );
  const markUnread = useCallback(
    (id: string) =>
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n))),
    [],
  );
  const unread = notifications.filter((n) => !n.read).length;

  const attention = useMemo(
    () => (emptyMode ? [] : buildAttentionItems(people)),
    [people, emptyMode],
  );

  const value = useMemo<Ctx>(
    () => ({
      employees: emptyMode ? [] : people,
      people: emptyMode ? [] : people,
      requests: emptyMode ? [] : requests,
      enrichments,
      activity: emptyMode ? [] : activity,
      notifications,
      attention,
      search,
      setSearch,
      inviteOpen,
      setInviteOpen,
      createRequestOpen,
      setCreateRequestOpen,
      emptyMode,
      setEmptyMode,
      addEmployee,
      updateRequestStatus,
      markAllRead,
      markRead,
      markUnread,
      unread,
      addNote,
      editNote,
      deleteNote,
      requestClarification,
      cancelRequest,
      sendReminder,
      createVerificationRequest,
    }),
    [
      people,
      requests,
      enrichments,
      activity,
      notifications,
      attention,
      search,
      inviteOpen,
      createRequestOpen,
      emptyMode,
      addEmployee,
      updateRequestStatus,
      markAllRead,
      unread,
      addNote,
      editNote,
      deleteNote,
      requestClarification,
      cancelRequest,
      sendReminder,
      createVerificationRequest,
    ],
  );

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
    [r.id, r.employeeId, r.employeeName, r.department, r.role].some((v) =>
      v.toLowerCase().includes(q),
    ),
  );
}
