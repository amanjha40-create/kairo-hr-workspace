import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboard } from "@/lib/dashboard-context";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { PURPOSE_ROLL, VERIFICATION_TYPES, VerificationTypeKey } from "@/lib/workspace-invitations";
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, Mail, MailPlus, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const DEPTS = ["Engineering", "Design", "Product", "Sales", "Operations", "Marketing", "Finance", "People"];

export function InviteEmployeeModal() {
  const { inviteOpen, setInviteOpen, createInvitation } = useDashboard();
  const [step, setStep] = useState<Step>(1);
  const [sentId, setSentId] = useState<string | null>(null);
  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    purpose: PURPOSE_ROLL[0],
    internalReference: "",
    department: "Engineering",
    requestedVerifications: ["Identity", "Employment"] as VerificationTypeKey[],
    message: "",
    expiresInDays: 7,
    autoRemind: true,
  });

  function reset() {
    setStep(1);
    setSentId(null);
    setForm({
      candidateName: "", candidateEmail: "", candidatePhone: "",
      purpose: PURPOSE_ROLL[0], internalReference: "", department: "Engineering",
      requestedVerifications: ["Identity", "Employment"], message: "", expiresInDays: 7, autoRemind: true,
    });
  }
  function close() { setInviteOpen(false); setTimeout(reset, 200); }

  const canNext = (() => {
    if (step === 1) return form.candidateName.trim() && /.+@.+\..+/.test(form.candidateEmail) && form.purpose.trim();
    if (step === 2) return form.requestedVerifications.length > 0;
    return true;
  })();

  function submit(action: "send" | "draft") {
    const inv = createInvitation(
      {
        candidateName: form.candidateName.trim(),
        candidateEmail: form.candidateEmail.trim(),
        candidatePhone: form.candidatePhone.trim() || undefined,
        purpose: form.purpose,
        internalReference: form.internalReference || undefined,
        department: form.department,
        message: form.message || undefined,
        requestedVerifications: form.requestedVerifications,
        expiresInDays: form.expiresInDays,
      },
      action,
    );
    setSentId(inv.id);
    toast.success(action === "send" ? "Invitation sent" : "Draft saved");
    if (action === "send") setStep(6);
    else close();
  }

  const invitationLink = `https://kairoid.com/i/${sentId ?? "INV-XXXX"}`;

  return (
    <Dialog open={inviteOpen} onOpenChange={(o) => (o ? setInviteOpen(true) : close())}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-gradient-to-br from-primary/5 to-transparent">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl tracking-tight">Invite Candidate</DialogTitle>
            <DialogDescription>
              Send a consent-first invitation. The candidate controls what to share.
            </DialogDescription>
          </DialogHeader>
          {step < 6 && (
            <div className="flex items-center gap-1.5 mt-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? "bg-primary" : "bg-border/70"}`} />
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <StepHeader n={1} title="Candidate & purpose" subtitle="Who are you inviting, and why?" />
                  <Field label="Full name" required>
                    <Input value={form.candidateName} onChange={(e) => setForm({ ...form, candidateName: e.target.value })} placeholder="Aman Joshi" />
                  </Field>
                  <Field label="Email" required>
                    <Input type="email" value={form.candidateEmail} onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })} placeholder="aman@example.com" />
                  </Field>
                  <Field label="Phone (optional)">
                    <Input value={form.candidatePhone} onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })} placeholder="+91 98…" />
                  </Field>
                  <Field label="Internal reference (optional)">
                    <Input value={form.internalReference} onChange={(e) => setForm({ ...form, internalReference: e.target.value })} placeholder="CAND-014" />
                  </Field>
                  <Field label="Purpose" required>
                    <Select value={form.purpose} onValueChange={(v) => setForm({ ...form, purpose: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PURPOSE_ROLL.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Department">
                    <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DEPTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <StepHeader n={2} title="Requested verifications" subtitle="Pick the categories to include on the candidate's Trust Passport request." />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {VERIFICATION_TYPES.map((t) => {
                      const on = form.requestedVerifications.includes(t.key);
                      return (
                        <label key={t.key} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${on ? "border-primary/60 bg-primary/[0.04]" : "border-border/70 hover:border-primary/30"}`}>
                          <Checkbox
                            checked={on}
                            onCheckedChange={(c) =>
                              setForm({
                                ...form,
                                requestedVerifications: c
                                  ? [...form.requestedVerifications, t.key]
                                  : form.requestedVerifications.filter((x) => x !== t.key),
                              })
                            }
                          />
                          <span className="text-sm">
                            <span className="font-medium">{t.label}</span>
                            <span className="block text-xs text-muted-foreground">{t.description}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <StepHeader n={3} title="Personal message (optional)" subtitle="Add a short note. Shown to the candidate on the invitation page." />
                  <Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={`Hi ${form.candidateName.split(" ")[0] || "there"}, we'd love to run a quick verification for the ${form.purpose} role.`} />
                </div>
              )}
              {step === 4 && (
                <div className="space-y-4">
                  <StepHeader n={4} title="Delivery preferences" subtitle="Control how long the invitation stays valid." />
                  <Field label="Invitation expires in">
                    <Select value={String(form.expiresInDays)} onValueChange={(v) => setForm({ ...form, expiresInDays: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{[3, 5, 7, 14, 21].map((d) => <SelectItem key={d} value={String(d)}>{d} days</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.autoRemind} onCheckedChange={(c) => setForm({ ...form, autoRemind: Boolean(c) })} />
                    Send a gentle reminder if the candidate hasn't opened after 3 days
                  </label>
                  <div className="rounded-xl border border-border/60 bg-foreground/[0.02] p-3 text-xs text-muted-foreground flex gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                    Kairo asks explicit consent before verifying anything. You'll never see data the candidate has not shared.
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="space-y-4">
                  <StepHeader n={5} title="Review" subtitle="Confirm the invitation details before sending." />
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <Summary label="Candidate" value={`${form.candidateName} · ${form.candidateEmail}`} />
                    <Summary label="Purpose" value={form.purpose} />
                    <Summary label="Department" value={form.department} />
                    <Summary label="Reference" value={form.internalReference || "—"} />
                    <Summary
                      label="Verifications"
                      value={form.requestedVerifications.join(", ")}
                      className="sm:col-span-2"
                    />
                    <Summary label="Expires in" value={`${form.expiresInDays} days`} />
                    <Summary label="Auto-remind" value={form.autoRemind ? "Yes" : "No"} />
                    {form.message && (
                      <Summary label="Message" value={form.message} className="sm:col-span-2" />
                    )}
                  </div>
                </div>
              )}
              {step === 6 && (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto h-14 w-14 rounded-full bg-success/15 text-success flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Invitation sent</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {form.candidateName} was invited to share a Kairo Trust Passport.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-foreground/[0.02] p-3 flex items-center gap-2 text-left">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">Invitation link</div>
                      <div className="text-sm truncate">{invitationLink}</div>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { navigator.clipboard?.writeText(invitationLink); toast.success("Link copied"); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-6 py-4 border-t border-border/60 bg-foreground/[0.02] flex items-center justify-between gap-2">
          {step === 6 ? (
            <>
              <Button variant="outline" className="rounded-xl" onClick={close}>Close</Button>
              <Link to="/app/invitations/$id" params={{ id: sentId ?? "" }} onClick={close}>
                <Button className="btn-premium rounded-xl">View invitation <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </>
          ) : (
            <>
              <Button variant="ghost" className="rounded-xl" onClick={() => (step > 1 ? setStep((step - 1) as Step) : close())}>
                {step > 1 && <ArrowLeft className="h-4 w-4 mr-1" />} {step > 1 ? "Back" : "Cancel"}
              </Button>
              <div className="flex items-center gap-2">
                {step < 5 && (
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={!form.candidateName || !form.candidateEmail}
                    onClick={() => submit("draft")}
                  >
                    Save as draft
                  </Button>
                )}
                {step < 5 ? (
                  <Button className="btn-premium rounded-xl" disabled={!canNext} onClick={() => setStep((step + 1) as Step)}>
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button className="btn-premium rounded-xl" onClick={() => submit("send")}>
                    <MailPlus className="h-4 w-4 mr-1" /> Send invitation
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepHeader({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <div className="sm:col-span-2 mb-1">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Step {n} of 5</div>
      <h3 className="text-base font-semibold mt-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Summary({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-border/60 bg-foreground/[0.02] p-3 ${className ?? ""}`}>
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm break-words">{value}</div>
    </div>
  );
}
