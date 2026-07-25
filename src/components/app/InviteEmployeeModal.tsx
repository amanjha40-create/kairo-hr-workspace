import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboard } from "@/lib/dashboard-context";
import { useAccess } from "@/lib/access-context";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  MailPlus,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCreateTrustInvitationMutation } from "@/lib/queries/trust-invitations";
import {
  getTrustInvitationErrorMessage,
  PURPOSE_ROLL,
  VERIFICATION_TYPES,
  type VerificationTypeKey,
} from "@/lib/trust-invitations";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export function InviteEmployeeModal() {
  const { inviteOpen, setInviteOpen } = useDashboard();
  const { org, can } = useAccess();
  const canInvite = can("invite_candidate");
  const createInvitationMutation = useCreateTrustInvitationMutation(org?.publicId);
  const [step, setStep] = useState<Step>(1);
  const [sentInvitationId, setSentInvitationId] = useState<string | null>(null);
  const [sentInvitationUrl, setSentInvitationUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    purpose: PURPOSE_ROLL[0],
    requestedVerifications: ["identity", "employment"] as VerificationTypeKey[],
    message: "",
    expiresInDays: 7,
  });

  function reset() {
    setStep(1);
    setSentInvitationId(null);
    setSentInvitationUrl(null);
    createInvitationMutation.reset();
    setForm({
      candidateName: "",
      candidateEmail: "",
      candidatePhone: "",
      purpose: PURPOSE_ROLL[0],
      requestedVerifications: ["identity", "employment"],
      message: "",
      expiresInDays: 7,
    });
  }
  function close() {
    setInviteOpen(false);
    setTimeout(reset, 200);
  }

  const canNext = (() => {
    if (step === 1)
      return (
        form.candidateName.trim() && /.+@.+\..+/.test(form.candidateEmail) && form.purpose.trim()
      );
    if (step === 2) return form.requestedVerifications.length > 0;
    return true;
  })();

  async function submit(action: "send" | "draft") {
    try {
      const invitation = await createInvitationMutation.mutateAsync({
        subject_name: form.candidateName.trim(),
        subject_email: form.candidateEmail.trim(),
        subject_phone: form.candidatePhone.trim() || undefined,
        purpose: form.purpose.trim() || undefined,
        requested_verification_types: form.requestedVerifications,
        message: form.message.trim() || undefined,
        delivery_method: "email",
        mode: action,
        expires_at: new Date(Date.now() + form.expiresInDays * 86400e3).toISOString(),
      });
      setSentInvitationId(invitation.id);
      setSentInvitationUrl(invitation.invitationUrl ?? null);
      toast.success(action === "send" ? "Invitation sent" : "Draft saved");
      if (action === "send") {
        setStep(6);
        return;
      }
      close();
    } catch (error) {
      toast.error(
        getTrustInvitationErrorMessage(
          error,
          action === "send" ? "We couldn't send this invitation." : "We couldn't save this draft.",
        ),
      );
    }
  }

  const invitationLink = sentInvitationUrl ?? "Invitation URL will appear here after send";

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
                <div
                  key={n}
                  className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? "bg-primary" : "bg-border/70"}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          {!canInvite ? (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Invitation access is read-only</AlertTitle>
              <AlertDescription>
                Your role can view Trust Invitations, but only users with invite permission can
                create new ones.
              </AlertDescription>
            </Alert>
          ) : null}
          {createInvitationMutation.isError ? (
            <Alert variant="destructive" className="mb-4">
              <MailPlus className="h-4 w-4" />
              <AlertTitle>We couldn't save this invitation</AlertTitle>
              <AlertDescription>
                {getTrustInvitationErrorMessage(
                  createInvitationMutation.error,
                  "Please review the form and try again.",
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <StepHeader
                    n={1}
                    title="Candidate & purpose"
                    subtitle="Who are you inviting, and why?"
                  />
                  <Field label="Full name" required>
                    <Input
                      value={form.candidateName}
                      onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                      placeholder="Aman Joshi"
                    />
                  </Field>
                  <Field label="Email" required>
                    <Input
                      type="email"
                      value={form.candidateEmail}
                      onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
                      placeholder="aman@example.com"
                    />
                  </Field>
                  <Field label="Phone (optional)">
                    <Input
                      value={form.candidatePhone}
                      onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })}
                      placeholder="+91 98…"
                    />
                  </Field>
                  <Field label="Purpose" required>
                    <Select
                      value={form.purpose}
                      onValueChange={(v) => setForm({ ...form, purpose: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PURPOSE_ROLL.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="sm:col-span-2 rounded-xl border border-border/60 bg-foreground/[0.02] p-3 text-xs text-muted-foreground">
                    Department and internal reference remain part of the current UX, but the backend
                    contract does not persist them yet, so they are not collected here.
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <StepHeader
                    n={2}
                    title="Requested verifications"
                    subtitle="Pick the categories to include on the candidate's Trust Passport request."
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {VERIFICATION_TYPES.map((t) => {
                      const on = form.requestedVerifications.includes(t.key);
                      return (
                        <label
                          key={t.key}
                          className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${on ? "border-primary/60 bg-primary/[0.04]" : "border-border/70 hover:border-primary/30"}`}
                        >
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
                            <span className="block text-xs text-muted-foreground">
                              {t.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <StepHeader
                    n={3}
                    title="Personal message (optional)"
                    subtitle="Add a short note. Shown to the candidate on the invitation page."
                  />
                  <Textarea
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder={`Hi ${form.candidateName.split(" ")[0] || "there"}, we'd love to run a quick verification for the ${form.purpose} role.`}
                  />
                </div>
              )}
              {step === 4 && (
                <div className="space-y-4">
                  <StepHeader
                    n={4}
                    title="Delivery preferences"
                    subtitle="Control how long the invitation stays valid."
                  />
                  <Field label="Invitation expires in">
                    <Select
                      value={String(form.expiresInDays)}
                      onValueChange={(v) => setForm({ ...form, expiresInDays: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 5, 7, 14, 21].map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d} days
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm cursor-not-allowed opacity-70">
                    <Checkbox checked={false} disabled />
                    Reminder scheduling is not part of the current backend Trust Invitation
                    contract.
                  </label>
                  <div className="rounded-xl border border-border/60 bg-foreground/[0.02] p-3 text-xs text-muted-foreground flex gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                    Kairo asks explicit consent before verifying anything. You'll never see data the
                    candidate has not shared.
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="space-y-4">
                  <StepHeader
                    n={5}
                    title="Review"
                    subtitle="Confirm the invitation details before sending."
                  />
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <Summary
                      label="Candidate"
                      value={`${form.candidateName} · ${form.candidateEmail}`}
                    />
                    <Summary label="Purpose" value={form.purpose} />
                    <Summary
                      label="Verifications"
                      value={form.requestedVerifications
                        .map(
                          (value) =>
                            VERIFICATION_TYPES.find((type) => type.key === value)?.label ?? value,
                        )
                        .join(", ")}
                      className="sm:col-span-2"
                    />
                    <Summary label="Expires in" value={`${form.expiresInDays} days`} />
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => {
                        navigator.clipboard?.writeText(invitationLink);
                        toast.success("Link copied");
                      }}
                      disabled={!sentInvitationUrl}
                    >
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
              <Button variant="outline" className="rounded-xl" onClick={close}>
                Close
              </Button>
              <Link
                to="/app/invitations/$id"
                params={{ id: sentInvitationId ?? "" }}
                onClick={close}
              >
                <Button className="btn-premium rounded-xl">
                  View invitation <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={() => (step > 1 ? setStep((step - 1) as Step) : close())}
              >
                {step > 1 && <ArrowLeft className="h-4 w-4 mr-1" />} {step > 1 ? "Back" : "Cancel"}
              </Button>
              <div className="flex items-center gap-2">
                {step < 5 && (
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={
                      !form.candidateName ||
                      !form.candidateEmail ||
                      createInvitationMutation.isPending ||
                      !canInvite
                    }
                    onClick={() => void submit("draft")}
                  >
                    {createInvitationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : null}
                    Save as draft
                  </Button>
                )}
                {step < 5 ? (
                  <Button
                    className="btn-premium rounded-xl"
                    disabled={!canNext || !canInvite}
                    onClick={() => setStep((step + 1) as Step)}
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    className="btn-premium rounded-xl"
                    onClick={() => void submit("send")}
                    disabled={createInvitationMutation.isPending || !canInvite}
                  >
                    {createInvitationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <MailPlus className="h-4 w-4 mr-1" />
                    )}
                    Send invitation
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
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Step {n} of 5
      </div>
      <h3 className="text-base font-semibold mt-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Summary({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border/60 bg-foreground/[0.02] p-3 ${className ?? ""}`}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm break-words">{value}</div>
    </div>
  );
}
