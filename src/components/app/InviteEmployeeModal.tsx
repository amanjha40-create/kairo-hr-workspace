import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  useCreateTrustInvitationMutation,
  useSendTrustInvitationMutation,
  useTrustInvitationDetailQuery,
  useUpdateTrustInvitationDraftMutation,
} from "@/lib/queries/trust-invitations";
import {
  useCreateOrganizationJobRoleMutation,
  useOrganizationJobRolesQuery,
  useOrganizationVerificationPreferencesQuery,
} from "@/lib/queries/hr-v2";
import {
  getTrustInvitationErrorMessage,
  VERIFICATION_TYPES,
  type VerificationTypeKey,
} from "@/lib/trust-invitations";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export function InviteEmployeeModal() {
  const { inviteOpen, setInviteOpen, editingInvitationId, clearInvitationDraft } = useDashboard();
  const { org, can, membershipRole } = useAccess();
  const canInvite = can("invite_candidate");
  const createInvitationMutation = useCreateTrustInvitationMutation(org?.publicId);
  const updateDraftMutation = useUpdateTrustInvitationDraftMutation(org?.publicId);
  const sendInvitationMutation = useSendTrustInvitationMutation(org?.publicId);
  const draftQuery = useTrustInvitationDetailQuery(editingInvitationId ?? undefined);
  const rolesQuery = useOrganizationJobRolesQuery(org?.publicId);
  const createRoleMutation = useCreateOrganizationJobRoleMutation(org?.publicId);
  const preferencesQuery = useOrganizationVerificationPreferencesQuery(org?.publicId);
  const [step, setStep] = useState<Step>(1);
  const [sentInvitationId, setSentInvitationId] = useState<string | null>(null);
  const [sentInvitationUrl, setSentInvitationUrl] = useState<string | null>(null);
  const [messageEdited, setMessageEdited] = useState(false);
  const [verificationEdited, setVerificationEdited] = useState(false);
  const [showRoleCreator, setShowRoleCreator] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDepartment, setNewRoleDepartment] = useState("");
  const defaultsApplied = useRef(false);
  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    roleId: "",
    purpose: "",
    requestedVerifications: [] as VerificationTypeKey[],
    message: "",
    expiresInDays: 7,
  });

  const activeRoles = useMemo(
    () => (rolesQuery.data ?? []).filter((role) => role.is_active),
    [rolesQuery.data],
  );

  useEffect(() => {
    if (!inviteOpen || editingInvitationId || form.roleId || activeRoles.length === 0) return;
    const role = activeRoles[0];
    setForm((current) => ({ ...current, roleId: role.public_id, purpose: role.name }));
  }, [activeRoles, editingInvitationId, form.roleId, inviteOpen]);

  useEffect(() => {
    const draft = draftQuery.data;
    if (!inviteOpen || !editingInvitationId || !draft || draft.status !== "Draft") return;
    setForm({
      candidateName: draft.candidateName,
      candidateEmail: draft.candidateEmail === "Email unavailable" ? "" : draft.candidateEmail,
      candidatePhone: draft.candidatePhone ?? "",
      roleId: draft.roleId ?? "",
      purpose: draft.purpose ?? "",
      requestedVerifications: draft.requirements.map((item) => item.requirement_type),
      message: draft.message ?? "",
      expiresInDays: Math.max(
        1,
        Math.ceil((new Date(draft.expiresAt).getTime() - Date.now()) / 86400e3),
      ),
    });
    setVerificationEdited(true);
    setMessageEdited(true);
  }, [draftQuery.data, editingInvitationId, inviteOpen]);

  useEffect(() => {
    if (!inviteOpen || verificationEdited || defaultsApplied.current || !preferencesQuery.data)
      return;
    const checks = preferencesQuery.data.checks;
    const defaults: VerificationTypeKey[] = [];
    if (checks.identity) defaults.push("identity");
    if (checks.employment) defaults.push("employment");
    if (checks.education) defaults.push("education");
    if (checks.references) defaults.push("professional_reference");
    defaultsApplied.current = true;
    setForm((current) => ({ ...current, requestedVerifications: defaults }));
  }, [inviteOpen, preferencesQuery.data, verificationEdited]);

  function reset() {
    setStep(1);
    setSentInvitationId(null);
    setSentInvitationUrl(null);
    createInvitationMutation.reset();
    updateDraftMutation.reset();
    sendInvitationMutation.reset();
    setMessageEdited(false);
    setVerificationEdited(false);
    defaultsApplied.current = false;
    setShowRoleCreator(false);
    setNewRoleName("");
    setNewRoleDepartment("");
    clearInvitationDraft();
    setForm({
      candidateName: "",
      candidateEmail: "",
      candidatePhone: "",
      roleId: "",
      purpose: "",
      requestedVerifications: [],
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
      return form.candidateName.trim() && /.+@.+\..+/.test(form.candidateEmail) && form.roleId;
    if (step === 2) return true;
    return true;
  })();

  async function submit(action: "send" | "draft") {
    try {
      const requirements = form.requestedVerifications.map((requirementType) => {
        const existing = draftQuery.data?.requirements.find(
          (item) => item.requirement_type === requirementType,
        );
        return (
          existing ?? {
            requirement_type: requirementType,
            mandatory: true,
            configuration: {},
          }
        );
      });
      const expiresAt = new Date(Date.now() + form.expiresInDays * 86400e3).toISOString();
      const invitation = editingInvitationId
        ? await updateDraftMutation.mutateAsync({
            invitationPublicId: editingInvitationId,
            payload: {
              subject_name: form.candidateName.trim(),
              subject_email: form.candidateEmail.trim(),
              subject_phone: form.candidatePhone.trim() || null,
              purpose: form.purpose.trim() || null,
              role_id: form.roleId || null,
              requirements,
              message: form.message.trim() || null,
              expires_at: expiresAt,
            },
          })
        : await createInvitationMutation.mutateAsync({
            subject_name: form.candidateName.trim(),
            subject_email: form.candidateEmail.trim(),
            subject_phone: form.candidatePhone.trim() || undefined,
            purpose: form.purpose.trim() || undefined,
            role_id: form.roleId,
            ...(verificationEdited ? { requirements } : {}),
            message: form.message.trim() || undefined,
            delivery_method: "email",
            mode: action,
            expires_at: expiresAt,
          });
      const finalInvitation =
        editingInvitationId && action === "send"
          ? await sendInvitationMutation.mutateAsync(invitation.id)
          : invitation;
      setSentInvitationId(finalInvitation.id);
      setSentInvitationUrl(finalInvitation.invitationUrl ?? null);
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

  async function createHiringRole() {
    if (!newRoleName.trim()) return;
    try {
      const role = await createRoleMutation.mutateAsync({
        name: newRoleName.trim(),
        department: newRoleDepartment.trim() || null,
        mode: "submit",
      });
      if (role.status === "active") {
        setForm((current) => ({ ...current, roleId: role.public_id, purpose: role.name }));
        toast.success("Hiring Role created and selected");
      } else {
        toast.success("Hiring Role proposed for Owner/Admin approval");
      }
      setShowRoleCreator(false);
      setNewRoleName("");
      setNewRoleDepartment("");
    } catch (error) {
      toast.error(getTrustInvitationErrorMessage(error, "We couldn't create that Hiring Role."));
    }
  }

  const invitationLink = sentInvitationUrl ?? "Invitation URL will appear here after send";

  function continueToNextStep() {
    if (step === 2 && !messageEdited) {
      setForm((current) => ({
        ...current,
        message: buildDefaultInvitationMessage(
          org?.name ?? "Your organization",
          current.candidateName,
          current.purpose,
        ),
      }));
    }
    setStep((step + 1) as Step);
  }

  return (
    <Dialog open={inviteOpen} onOpenChange={(o) => (o ? setInviteOpen(true) : close())}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-gradient-to-br from-primary/5 to-transparent">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl tracking-tight">
              {editingInvitationId ? "Edit Invitation Draft" : "Invite Candidate"}
            </DialogTitle>
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
          {createInvitationMutation.isError || updateDraftMutation.isError ? (
            <Alert variant="destructive" className="mb-4">
              <MailPlus className="h-4 w-4" />
              <AlertTitle>We couldn't save this invitation</AlertTitle>
              <AlertDescription>
                {getTrustInvitationErrorMessage(
                  createInvitationMutation.error ?? updateDraftMutation.error,
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
                    title="Candidate & role"
                    subtitle="Who are you inviting, and which role are they being considered for?"
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
                  <Field label="Role" required>
                    <Select
                      value={form.roleId}
                      onValueChange={(value) => {
                        const role = activeRoles.find((item) => item.public_id === value);
                        setForm({
                          ...form,
                          roleId: value,
                          purpose: role?.name ?? form.purpose,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeRoles.map((role) => (
                          <SelectItem key={role.public_id} value={role.public_id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setShowRoleCreator((current) => !current)}
                    >
                      {showRoleCreator ? "Cancel new role" : "+ Create New Role"}
                    </Button>
                  </div>
                  {showRoleCreator ? (
                    <div className="sm:col-span-2 grid gap-3 rounded-xl border border-border/60 p-4 sm:grid-cols-2">
                      <Field label="New Hiring Role" required>
                        <Input
                          value={newRoleName}
                          onChange={(event) => setNewRoleName(event.target.value)}
                          placeholder="Senior Software Engineer"
                        />
                      </Field>
                      <Field label="Department">
                        <Input
                          value={newRoleDepartment}
                          onChange={(event) => setNewRoleDepartment(event.target.value)}
                          placeholder="Engineering"
                        />
                      </Field>
                      <div className="sm:col-span-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          {membershipRole === "owner" || membershipRole === "admin"
                            ? "This role becomes Active immediately."
                            : "This proposal remains Pending approval and cannot be selected until approved."}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl"
                          disabled={!newRoleName.trim() || createRoleMutation.isPending}
                          onClick={() => void createHiringRole()}
                        >
                          {createRoleMutation.isPending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : null}
                          Create role
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {activeRoles.length === 0 && !rolesQuery.isPending ? (
                    <div className="sm:col-span-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-muted-foreground">
                      Create an active organization job role in the People role area before sending
                      an invitation.{" "}
                      <Link to="/app/people" className="font-medium underline">
                        Manage roles
                      </Link>
                    </div>
                  ) : null}
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
                            onCheckedChange={(c) => {
                              setVerificationEdited(true);
                              setForm({
                                ...form,
                                requestedVerifications: c
                                  ? [...form.requestedVerifications, t.key]
                                  : form.requestedVerifications.filter((x) => x !== t.key),
                              });
                            }}
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
                  {!verificationEdited ? (
                    <p className="text-xs text-muted-foreground">
                      Organization defaults are shown here. Leaving them unchanged lets the backend
                      apply and snapshot the current defaults when the invitation is created.
                    </p>
                  ) : null}
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <StepHeader
                    n={3}
                    title="Invitation message"
                    subtitle="Review and edit the professional message shown to the candidate."
                  />
                  <Textarea
                    rows={5}
                    value={form.message}
                    onChange={(e) => {
                      setMessageEdited(true);
                      setForm({ ...form, message: e.target.value });
                    }}
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
                    KairoID asks explicit consent before verifying anything. You'll never see data
                    the candidate has not shared.
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
                    <Summary label="Role" value={form.purpose} />
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
                      {form.candidateName} was invited to share a KairoID Trust Passport.
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
                      updateDraftMutation.isPending ||
                      !canInvite
                    }
                    onClick={() => void submit("draft")}
                  >
                    {createInvitationMutation.isPending || updateDraftMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : null}
                    Save as draft
                  </Button>
                )}
                {step < 5 ? (
                  <Button
                    className="btn-premium rounded-xl"
                    disabled={!canNext || !canInvite}
                    onClick={continueToNextStep}
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    className="btn-premium rounded-xl"
                    onClick={() => void submit("send")}
                    disabled={
                      createInvitationMutation.isPending ||
                      updateDraftMutation.isPending ||
                      sendInvitationMutation.isPending ||
                      !canInvite
                    }
                  >
                    {createInvitationMutation.isPending ||
                    updateDraftMutation.isPending ||
                    sendInvitationMutation.isPending ? (
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

function buildDefaultInvitationMessage(
  organizationName: string,
  candidateName: string,
  role: string,
) {
  const firstName = candidateName.trim().split(/\s+/)[0] || "there";
  return `Hi ${firstName}, ${organizationName} has invited you to KairoID to complete verification for the ${role} role. KairoID lets you complete verification securely and reuse verified credentials where supported.`;
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
