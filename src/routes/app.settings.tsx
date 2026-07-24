import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, SectionCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2, ShieldCheck, Bell, Lock, CheckCircle2, Clock, AlertTriangle,
  Ban, Circle, Laptop, Smartphone, LogOut, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

const SECTIONS = [
  { id: "org", label: "Organization", icon: Building2 },
  { id: "prefs", label: "Verification preferences", icon: ShieldCheck },
  { id: "notif", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ---------- default state ----------
const DEFAULT_ORG = {
  name: "Acme Inc.",
  type: "Private Limited",
  website: "https://acme.co",
  emailDomain: "acme.co",
  industry: "Technology",
  headquarters: "Bengaluru, KA",
  verificationStatus: "Verified" as OrgVerificationStatus,
};

type OrgVerificationStatus =
  | "Setup Incomplete"
  | "Verification Pending"
  | "Verified"
  | "Additional Information Required"
  | "Suspended";

const DEFAULT_PREFS = {
  invitationExpiry: "7",
  reminderSchedule: "every-3-days",
  priority: "standard",
  notificationRecipient: "requester",
  candidateComms: "email",
};

const NOTIF_ROWS = [
  { key: "invAccepted", label: "Trust Invitation accepted" },
  { key: "invExpiring", label: "Trust Invitation expiring" },
  { key: "candidateSubmitted", label: "Candidate information submitted" },
  { key: "clarificationReceived", label: "Clarification received" },
  { key: "empVerReceived", label: "Employment Verification received" },
  { key: "empVerCompleted", label: "Employment Verification completed" },
  { key: "teamInviteAccepted", label: "Team invitation accepted" },
  { key: "weeklySummary", label: "Weekly summary" },
] as const;

type NotifKey = (typeof NOTIF_ROWS)[number]["key"];
type NotifPrefs = Record<NotifKey, { inApp: boolean; email: boolean }>;

const DEFAULT_NOTIFS: NotifPrefs = NOTIF_ROWS.reduce((acc, r) => {
  acc[r.key] = { inApp: true, email: r.key !== "weeklySummary" };
  return acc;
}, {} as NotifPrefs);

const MOCK_SESSIONS = [
  { id: "s1", device: "MacBook Pro · Chrome", location: "Bengaluru, IN", lastActive: "Active now", current: true, icon: Laptop },
  { id: "s2", device: "iPhone 15 · Safari", location: "Bengaluru, IN", lastActive: "2 hours ago", current: false, icon: Smartphone },
  { id: "s3", device: "Windows · Firefox", location: "Mumbai, IN", lastActive: "Yesterday", current: false, icon: Laptop },
];

const MOCK_SECURITY_ACTIVITY = [
  { id: "a1", label: "Password changed", when: "12 days ago", tone: "muted" as const },
  { id: "a2", label: "New sign-in from Chrome on macOS", when: "2 weeks ago", tone: "muted" as const },
  { id: "a3", label: "Failed sign-in attempt blocked", when: "3 weeks ago", tone: "warn" as const },
];

// ---------- main page ----------
function SettingsPage() {
  const [tab, setTab] = useState<SectionId>("org");

  const [org, setOrg] = useState(DEFAULT_ORG);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [notifs, setNotifs] = useState<NotifPrefs>(DEFAULT_NOTIFS);

  // saved snapshots (what "the server" has)
  const [savedOrg, setSavedOrg] = useState(DEFAULT_ORG);
  const [savedPrefs, setSavedPrefs] = useState(DEFAULT_PREFS);
  const [savedNotifs, setSavedNotifs] = useState<NotifPrefs>(DEFAULT_NOTIFS);

  const dirty = useMemo(
    () =>
      JSON.stringify(org) !== JSON.stringify(savedOrg) ||
      JSON.stringify(prefs) !== JSON.stringify(savedPrefs) ||
      JSON.stringify(notifs) !== JSON.stringify(savedNotifs),
    [org, savedOrg, prefs, savedPrefs, notifs, savedNotifs],
  );

  // block route navigation on unsaved changes
  useBlocker({
    shouldBlockFn: ({ current, next }) => {
      if (!dirty) return false;
      if (current.pathname === next.pathname) return false;
      return !window.confirm("You have unsaved changes. Leave without saving?");
    },
  });

  // block full page unload
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const handleSave = () => {
    setSavedOrg(org);
    setSavedPrefs(prefs);
    setSavedNotifs(notifs);
    toast.success("Settings saved", { description: "Your changes are now live in this workspace." });
  };

  const handleCancel = () => {
    setOrg(savedOrg);
    setPrefs(savedPrefs);
    setNotifs(savedNotifs);
    toast.message("Changes discarded");
  };

  return (
    <div className="pb-32 lg:pb-8">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your organization, verification defaults, notifications, and account security."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Desktop rail */}
        <nav className="hidden lg:block space-y-0.5 sticky top-24 self-start">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                tab === s.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]",
              )}
            >
              <s.icon className="h-4 w-4" /> {s.label}
            </button>
          ))}
        </nav>

        {/* Mobile / tablet section picker */}
        <div className="lg:hidden">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Section</Label>
          <Select value={tab} onValueChange={(v) => setTab(v as SectionId)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-6">
          {tab === "org" && <OrgSection value={org} onChange={setOrg} />}
          {tab === "prefs" && <PrefsSection value={prefs} onChange={setPrefs} />}
          {tab === "notif" && <NotifSection value={notifs} onChange={setNotifs} />}
          {tab === "security" && <SecuritySection />}
        </div>
      </div>

      {/* Save bar — sticky on all breakpoints when dirty */}
      {dirty && tab !== "security" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-warning" />
              You have unsaved changes.
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={handleCancel}>Cancel</Button>
              <Button size="sm" className="btn-premium rounded-lg" onClick={handleSave}>Save changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

// ---------- Organization ----------
function OrgVerificationBadge({ status }: { status: OrgVerificationStatus }) {
  const config: Record<OrgVerificationStatus, { icon: typeof CheckCircle2; className: string; description: string }> = {
    "Setup Incomplete": {
      icon: Circle,
      className: "bg-muted text-muted-foreground border-border",
      description: "Finish organization details to begin verification.",
    },
    "Verification Pending": {
      icon: Clock,
      className: "bg-warning/10 text-warning-foreground border-warning/30",
      description: "Kairo is reviewing your organization. This typically takes a few business days.",
    },
    Verified: {
      icon: CheckCircle2,
      className: "bg-success/10 text-success border-success/30",
      description: "Your organization is verified. You can send Trust Invitations and receive employment verifications.",
    },
    "Additional Information Required": {
      icon: AlertTriangle,
      className: "bg-warning/15 text-warning-foreground border-warning/40",
      description: "Our team requested additional information. Check your inbox for details.",
    },
    Suspended: {
      icon: Ban,
      className: "bg-destructive/10 text-destructive border-destructive/30",
      description: "This workspace is suspended. Contact support to restore access.",
    },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <div className={cn("rounded-xl border p-4 flex items-start gap-3", c.className)}>
      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-sm font-medium">{status}</div>
        <p className="text-xs mt-0.5 opacity-80">{c.description}</p>
      </div>
    </div>
  );
}

function OrgSection({ value, onChange }: { value: typeof DEFAULT_ORG; onChange: (v: typeof DEFAULT_ORG) => void }) {
  const set = <K extends keyof typeof DEFAULT_ORG>(k: K, v: (typeof DEFAULT_ORG)[K]) => onChange({ ...value, [k]: v });
  return (
    <SectionCard title="Organization" description="Public information shown to candidates and other employers.">
      <div className="p-6 space-y-6">
        <OrgVerificationBadge status={value.verificationStatus} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Organization name">
            <Input value={value.name} onChange={(e) => set("name", e.target.value)} className="rounded-xl" />
          </Field>
          <Field label="Organization type">
            <Select value={value.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Private Limited", "Public Limited", "LLP", "Partnership", "Sole Proprietorship", "Non-profit", "Government"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Website">
            <Input value={value.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" className="rounded-xl" />
          </Field>
          <Field label="Work email domain" hint="Team members signing in with this domain are auto-linked to your workspace.">
            <Input value={value.emailDomain} onChange={(e) => set("emailDomain", e.target.value)} className="rounded-xl" />
          </Field>
          <Field label="Industry">
            <Select value={value.industry} onValueChange={(v) => set("industry", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Technology", "Financial Services", "Healthcare", "Retail & E-commerce", "Manufacturing", "Education", "Logistics", "Media", "Other"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Headquarters">
            <Input value={value.headquarters} onChange={(e) => set("headquarters", e.target.value)} className="rounded-xl" />
          </Field>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Organization logo</Label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-foreground/[0.06] border border-border/60 flex items-center justify-center text-xs text-muted-foreground">Logo</div>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => toast.message("Logo upload is a UI preview")}>Upload logo</Button>
            <p className="text-[11px] text-muted-foreground">PNG or SVG, at least 256×256.</p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------- Verification preferences ----------
function PrefsSection({ value, onChange }: { value: typeof DEFAULT_PREFS; onChange: (v: typeof DEFAULT_PREFS) => void }) {
  const set = <K extends keyof typeof DEFAULT_PREFS>(k: K, v: (typeof DEFAULT_PREFS)[K]) => onChange({ ...value, [k]: v });
  return (
    <SectionCard title="Verification preferences" description="Defaults applied to new Trust Invitations and verification workflows.">
      <div className="p-6 grid gap-5 sm:grid-cols-2">
        <Field label="Default Trust Invitation expiry">
          <Select value={value.invitationExpiry} onValueChange={(v) => set("invitationExpiry", v)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Reminder schedule">
          <Select value={value.reminderSchedule} onValueChange={(v) => set("reminderSchedule", v)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="off">No reminders</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="every-3-days">Every 3 days</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Default verification priority">
          <Select value={value.priority} onValueChange={(v) => set("priority", v)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Default notification recipient" hint="Who receives updates when a request progresses.">
          <Select value={value.notificationRecipient} onValueChange={(v) => set("notificationRecipient", v)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="requester">Requester only</SelectItem>
              <SelectItem value="hiring-manager">Requester + hiring manager</SelectItem>
              <SelectItem value="workspace-admins">All Organization Admins</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Candidate communication preference">
          <Select value={value.candidateComms} onValueChange={(v) => set("candidateComms", v)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email only</SelectItem>
              <SelectItem value="email-inapp">Email + in-app</SelectItem>
              <SelectItem value="inapp">In-app only</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </SectionCard>
  );
}

// ---------- Notifications ----------
function NotifSection({ value, onChange }: { value: NotifPrefs; onChange: (v: NotifPrefs) => void }) {
  const toggle = (k: NotifKey, channel: "inApp" | "email") =>
    onChange({ ...value, [k]: { ...value[k], [channel]: !value[k][channel] } });
  return (
    <SectionCard title="Notifications" description="Choose how you'd like to be notified about workspace activity.">
      <div>
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_80px_80px] px-6 py-3 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
          <div>Event</div>
          <div className="text-center">In-app</div>
          <div className="text-center">Email</div>
        </div>
        <div className="divide-y divide-border/60">
          {NOTIF_ROWS.map((row) => (
            <div
              key={row.key}
              className="px-6 py-3.5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_80px_80px] sm:items-center"
            >
              <div className="text-sm">{row.label}</div>
              <div className="flex items-center gap-2 sm:justify-center">
                <Switch checked={value[row.key].inApp} onCheckedChange={() => toggle(row.key, "inApp")} />
                <span className="text-xs text-muted-foreground sm:hidden">In-app</span>
              </div>
              <div className="flex items-center gap-2 sm:justify-center">
                <Switch checked={value[row.key].email} onCheckedChange={() => toggle(row.key, "email")} />
                <span className="text-xs text-muted-foreground sm:hidden">Email</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// ---------- Security ----------
function SecuritySection() {
  const [pwOpen, setPwOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sessions, setSessions] = useState(MOCK_SESSIONS);

  const submitPassword = () => {
    if (!current || !next || next !== confirm) {
      toast.error("Please fill all fields and confirm the new password.");
      return;
    }
    setPwOpen(false);
    setCurrent(""); setNext(""); setConfirm("");
    toast.success("Password updated");
  };

  const revokeSession = (id: string) => {
    setSessions((s) => s.filter((x) => x.id !== id));
    toast.success("Session signed out");
  };

  const signOutAll = () => {
    setSessions((s) => s.filter((x) => x.current));
    setSignOutOpen(false);
    toast.success("All other sessions signed out");
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Password" description="Update the password for your Kairo account.">
        <div className="p-6">
          <Button variant="outline" className="rounded-xl" onClick={() => setPwOpen(true)}>Change password</Button>
        </div>
      </SectionCard>

      <SectionCard title="Multi-factor authentication" description="Add a second layer of security to sign-in.">
        <div className="p-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium">Authenticator app</div>
              <div className="text-[11px] text-muted-foreground">Time-based one-time passcodes.</div>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-foreground/[0.05] text-muted-foreground">Coming soon</span>
        </div>
      </SectionCard>

      <SectionCard
        title="Active sessions"
        description="Devices currently signed in to your Kairo account."
        action={
          <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => setSignOutOpen(true)}>
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out all other sessions
          </Button>
        }
      >
        <div className="divide-y divide-border/60">
          {sessions.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="px-5 py-3.5 flex flex-wrap items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {s.device}
                    {s.current && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success">This device</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{s.location} · {s.lastActive}</div>
                </div>
                {!s.current && (
                  <Button variant="ghost" size="sm" className="rounded-lg h-8" onClick={() => revokeSession(s.id)}>
                    Sign out
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Recent security activity" description="Sign-ins and security events on your account.">
        <div className="divide-y divide-border/60">
          {MOCK_SECURITY_ACTIVITY.map((a) => (
            <div key={a.id} className="px-5 py-3.5 flex items-center gap-3">
              <div
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center",
                  a.tone === "warn" ? "bg-warning/10 text-warning-foreground" : "bg-foreground/[0.05] text-muted-foreground",
                )}
              >
                {a.tone === "warn" ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{a.label}</div>
                <div className="text-[11px] text-muted-foreground">{a.when}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Change password dialog */}
      <AlertDialog open={pwOpen} onOpenChange={setPwOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change password</AlertDialogTitle>
            <AlertDialogDescription>Enter your current password and choose a new one.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Current password">
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label="New password">
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label="Confirm new password">
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="rounded-xl" />
            </Field>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitPassword}>Update password</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign-out all confirm */}
      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll stay signed in on this device. All other devices will need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={signOutAll}>Sign out others</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
