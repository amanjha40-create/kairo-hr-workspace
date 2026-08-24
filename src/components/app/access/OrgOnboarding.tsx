import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Globe,
  UserCheck,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccess, type OrgType, type WorkspaceRole } from "@/lib/access-context";

type Step = 1 | 2 | 3 | 4 | 5;

const ORG_TYPES: OrgType[] = [
  "Employer",
  "Staffing or Recruitment Firm",
  "Background Verification Partner",
  "Contractor Platform",
  "Other",
];

const SETUP_ROLE_DESC: Record<Exclude<WorkspaceRole, "Viewer">, string> = {
  Owner: "Full workspace control, including billing and ownership transfer.",
  Admin: "Manage members, invitations, and workspace configuration.",
  Reviewer: "Review verification work and assigned organization workflows.",
  Member: "Standard team access for day-to-day workspace collaboration.",
};

function getSetupRole(role: WorkspaceRole): Exclude<WorkspaceRole, "Viewer"> {
  return role === "Viewer" ? "Owner" : role;
}

export function OrgOnboarding() {
  const { onboarding, updateOnboarding, completeOnboarding, org, role: currentRole } = useAccess();
  const setupRole = getSetupRole(currentRole);
  const orgTypeOptions = org ? ORG_TYPES : (["Employer"] as OrgType[]);
  const [step, setStep] = useState<Step>((onboarding?.step as Step) ?? 1);
  const [form, setForm] = useState({
    name: onboarding?.name ?? "",
    type: onboarding?.type ?? ("Employer" as OrgType),
    website: onboarding?.website ?? "",
    industry: onboarding?.industry ?? "",
    location: onboarding?.location ?? "",
    workEmail: onboarding?.workEmail ?? "",
    domain: onboarding?.domain ?? "",
    role: onboarding?.role ?? setupRole,
  });
  const [finishing, setFinishing] = useState(false);

  const canNext = (() => {
    if (step === 1) return true;
    if (step === 2) return form.name.trim().length > 1 && !!form.type;
    if (step === 3) return /.+@.+\..+/.test(form.workEmail) && form.domain.trim().length > 2;
    if (step === 4) return !!form.role;
    return true;
  })();

  function next() {
    updateOnboarding({ ...form, step: Math.min(5, step + 1) });
    setStep((s) => Math.min(5, (s + 1) as Step) as Step);
  }
  function back() {
    setStep((s) => Math.max(1, (s - 1) as Step) as Step);
  }
  async function finish() {
    setFinishing(true);
    try {
      await completeOnboarding({ ...form, step: 5 });
    } catch {
      // Error state is surfaced by the shared mutation layer.
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Logo className="h-5" />
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium border-l border-border/60 pl-2 ml-1">
            Set up organization
          </span>
        </div>
        <div className="text-xs text-muted-foreground">Step {step} of 5</div>
      </header>

      <div className="px-6 pt-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-1.5" aria-label="Progress">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx < step ? "bg-foreground" : "bg-foreground/10"}`}
            />
          ))}
        </div>
      </div>

      <main className="flex-1 flex items-start justify-center p-6 sm:p-10">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {step === 1 && (
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                    <Sparkles className="h-3.5 w-3.5" /> Welcome
                  </div>
                  <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tight leading-[1.05] text-foreground">
                    Welcome to Kairo Trust Workspace.
                  </h1>
                  <p className="mt-4 text-base text-muted-foreground max-w-xl leading-relaxed">
                    Kairo Trust Workspace helps your organization invite candidates, manage
                    consented Trust Passport access, and respond to employment verification
                    requests.
                  </p>
                  <div className="mt-8">
                    <button
                      onClick={next}
                      className="w-full text-left rounded-2xl border border-border/70 bg-background p-5 hover:border-foreground/40 hover:shadow-sm transition-all"
                    >
                      <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center mb-3">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="font-semibold">Set up organization</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Create a new workspace for your team.
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                    <Building2 className="h-3.5 w-3.5" /> Organization details
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Tell us about your organization.
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This appears on invitations and verification responses.
                  </p>

                  <div className="mt-8 grid sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <Label>Organization name</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Acme Inc."
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Organization type</Label>
                      <Select
                        value={form.type}
                        onValueChange={(v) => setForm({ ...form, type: v as OrgType })}
                      >
                        <SelectTrigger className="mt-1.5 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {orgTypeOptions.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!org ? (
                        <div className="text-xs text-muted-foreground mt-2">
                          HR Workspace creates employer organizations. Other organization types are
                          handled in their dedicated workspace.
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input
                        value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        placeholder="https://"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Industry</Label>
                      <Input
                        value={form.industry}
                        onChange={(e) => setForm({ ...form, industry: e.target.value })}
                        placeholder="Software"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Location</Label>
                      <Input
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="Bengaluru, IN"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                    <Globe className="h-3.5 w-3.5" /> Work identity
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Verify your work identity.
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We link your workspace to a corporate domain. You can complete domain
                    verification later.
                  </p>

                  <div className="mt-8 grid sm:grid-cols-2 gap-5">
                    <div>
                      <Label>Work email</Label>
                      <Input
                        value={form.workEmail}
                        onChange={(e) => setForm({ ...form, workEmail: e.target.value })}
                        placeholder="you@company.com"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Organization domain</Label>
                      <Input
                        value={form.domain}
                        onChange={(e) => setForm({ ...form, domain: e.target.value })}
                        placeholder="company.com"
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-border/70 bg-foreground/[0.02] p-4 flex items-start gap-3">
                    <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm">
                      <div className="font-medium flex items-center gap-2">
                        Domain verification
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Pending · Complete later
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Domain verification confirms you control this domain. You can finish this in
                        Settings after setup.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                    <UserCheck className="h-3.5 w-3.5" /> Your role
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {org ? "Your workspace role" : "You're the first workspace owner."}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {org
                      ? "Your access is already assigned by the backend. Team roles can be managed after setup is complete."
                      : "The account creating a new organization is set up as the owner. You can invite admins, reviewers, and members after setup."}
                  </p>

                  <div className="mt-8 grid gap-3">
                    <div className="text-left rounded-2xl border border-foreground bg-foreground/[0.03] shadow-sm p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{form.role}</div>
                        <CheckCircle2 className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {SETUP_ROLE_DESC[form.role]}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-foreground/[0.02] p-4 text-sm text-muted-foreground">
                      Additional workspace roles become available in Team management after setup is
                      complete.
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Workspace ready
                  </div>
                  <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tight leading-[1.05]">
                    Your workspace is ready.
                  </h1>
                  <p className="mt-3 text-base text-muted-foreground max-w-xl">
                    Invite your first candidate to send a Trust Passport request, or explore the
                    workspace first.
                  </p>

                  <div className="mt-8 rounded-2xl border border-border/70 bg-background p-6 space-y-4">
                    <Row label="Organization created" value={form.name || "New organization"} />
                    <Row label="Your role" value={form.role} />
                    <Row
                      label="Organization verification"
                      value={
                        <Badge variant="outline" className="text-[10px]">
                          Pending review
                        </Badge>
                      }
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {step > 1 && (
            <div className="mt-10 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={back} className="rounded-xl">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              {step < 5 ? (
                <Button
                  onClick={next}
                  disabled={!canNext}
                  className="btn-premium rounded-xl h-11 px-5"
                >
                  Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={finish}
                    disabled={finishing}
                    className="rounded-xl h-11"
                  >
                    Explore workspace
                  </Button>
                  <Button
                    onClick={finish}
                    disabled={finishing}
                    className="btn-premium rounded-xl h-11 px-5"
                  >
                    {finishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Invite first candidate <ArrowRight className="ml-1.5 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
