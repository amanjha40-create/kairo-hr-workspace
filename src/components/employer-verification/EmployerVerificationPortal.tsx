import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getEmployerVerificationWorkspace,
  rejectEmployerEmployment,
  requestEmployerClarification,
  validateEmployerReportingManager,
  verifyEmployerEmployment,
  type EmployerPortalActionResponse,
  type EmployerPortalReportingManager,
  type EmployerPortalWorkspace,
  type HRReferenceStatus,
  type ManagerContactProvenance,
  type RehireEligibility,
} from "@/lib/api/employer-verification";
import {
  MANAGER_CONTACT_OPTIONS,
  MANAGER_RELATIONSHIP_OPTIONS,
  buildManagerValidation,
  createEmployerPortalForm,
  decisionLabel,
  getEmployerPortalError,
  isConfirmedManagerRelationship,
  managerContactLabel,
  managerRelationshipLabel,
  managerStatusLabel,
  validateManagerForm,
  type EmployerPortalFormState,
} from "@/lib/employer-verification";
import { cn } from "@/lib/utils";

type PortalStep = "employment" | "hr-reference" | "manager" | "review";

interface SubmissionResult {
  action: EmployerPortalActionResponse | null;
  hrReferenceStatus: HRReferenceStatus | null;
  manager: EmployerPortalReportingManager | null;
}

export function EmployerVerificationPortal({ token }: { token: string }) {
  const [workspace, setWorkspace] = useState<EmployerPortalWorkspace | null>(null);
  const [form, setForm] = useState<EmployerPortalFormState | null>(null);
  const [step, setStep] = useState<PortalStep>("employment");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmissionResult | null>(null);

  async function loadWorkspace() {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await getEmployerVerificationWorkspace(token);
      setWorkspace(next);
      setForm(createEmployerPortalForm(next.reporting_manager));
      setStep(isManagerOnlyReview(next) ? "manager" : "employment");
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    getEmployerVerificationWorkspace(token)
      .then((next) => {
        if (!active) return;
        setWorkspace(next);
        setForm(createEmployerPortalForm(next.reporting_manager));
        setStep(isManagerOnlyReview(next) ? "manager" : "employment");
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const managerOnly = workspace ? isManagerOnlyReview(workspace) : false;
  const steps = useMemo<PortalStep[]>(() => {
    if (managerOnly) return ["manager", "review"];
    return workspace?.reporting_manager
      ? ["employment", "hr-reference", "manager", "review"]
      : ["employment", "hr-reference", "review"];
  }, [managerOnly, workspace?.reporting_manager]);

  if (loading) return <PortalLoading />;

  if (loadError || !workspace || !form) {
    return <PortalError error={loadError} onRetry={() => void loadWorkspace()} />;
  }

  if (result || (workspace.state === "completed" && !managerOnly)) {
    return <CompletionView workspace={workspace} result={result} />;
  }

  const activeWorkspace = workspace;
  const activeForm = form;

  function updateForm(patch: Partial<EmployerPortalFormState>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setFieldErrors({});
    setSubmitError(null);
  }

  function move(direction: 1 | -1) {
    const currentIndex = steps.indexOf(step);
    if (direction === 1 && !validateStep(step, activeWorkspace, activeForm, setFieldErrors)) return;
    const next = steps[currentIndex + direction];
    if (next) {
      setFieldErrors({});
      setStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function submitConfirmedResponse() {
    const managerErrors = validateManagerForm(activeWorkspace.reporting_manager, activeForm);
    if (Object.keys(managerErrors).length > 0) {
      setFieldErrors(managerErrors);
      setStep("manager");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (managerOnly && activeWorkspace.reporting_manager) {
        const managerValidation = buildManagerValidation(
          activeWorkspace.reporting_manager,
          activeForm,
        );
        if (!managerValidation) return;
        const manager = await validateEmployerReportingManager(token, managerValidation);
        setWorkspace((current) => (current ? { ...current, reporting_manager: manager } : current));
        setResult({ action: null, hrReferenceStatus: null, manager });
        return;
      }

      const managerValidation = activeWorkspace.reporting_manager
        ? buildManagerValidation(activeWorkspace.reporting_manager, activeForm)
        : null;
      const action = await verifyEmployerEmployment(token, {
        employment_existed: true,
        dates_correct: true,
        role_correct: true,
        comments: activeForm.employmentComments.trim() || null,
        hr_reference: {
          status: activeForm.hrReferenceStatus,
          eligible_for_rehire: activeForm.rehireEligibility,
          comments: activeForm.hrComments.trim() || null,
        },
        manager_validation: managerValidation,
      });
      let refreshed = activeWorkspace;
      try {
        refreshed = await getEmployerVerificationWorkspace(token);
        setWorkspace(refreshed);
      } catch {
        // The successful action remains authoritative; a manual refresh can recover the summary.
      }
      setResult({
        action,
        hrReferenceStatus: activeForm.hrReferenceStatus,
        manager: refreshed.reporting_manager,
      });
    } catch (error) {
      setSubmitError(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDecision(kind: "clarification" | "reject") {
    const reason = activeForm.decisionReason.trim();
    if (reason.length < 3) {
      setFieldErrors({ decisionReason: "Explain what is incorrect or needs clarification." });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = { reason, comments: activeForm.decisionComments.trim() || null };
      const action =
        kind === "clarification"
          ? await requestEmployerClarification(token, payload)
          : await rejectEmployerEmployment(token, payload);
      const next: EmployerPortalWorkspace = {
        ...activeWorkspace,
        state: "completed",
        decision: action.decision,
        verification_request_status: action.verification_request_status,
      };
      setWorkspace(next);
      setResult({ action, hrReferenceStatus: null, manager: activeWorkspace.reporting_manager });
    } catch (error) {
      setSubmitError(error);
    } finally {
      setSubmitting(false);
    }
  }

  const currentIndex = steps.indexOf(step);

  return (
    <PortalShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <PortalHeading workspace={workspace} managerOnly={managerOnly} />
        <StepProgress steps={steps} current={step} />

        <div className="mt-6 rounded-3xl border border-border/70 bg-card shadow-[0_20px_70px_-45px_hsl(var(--foreground)/0.28)]">
          {step === "employment" ? (
            <EmploymentStep
              workspace={workspace}
              form={form}
              errors={fieldErrors}
              submitting={submitting}
              onChange={updateForm}
              onDecision={submitDecision}
            />
          ) : null}
          {step === "hr-reference" ? <HRReferenceStep form={form} onChange={updateForm} /> : null}
          {step === "manager" && workspace.reporting_manager ? (
            <ManagerStep
              manager={workspace.reporting_manager}
              form={form}
              errors={fieldErrors}
              onChange={updateForm}
            />
          ) : null}
          {step === "review" ? (
            <ReviewStep workspace={workspace} form={form} managerOnly={managerOnly} />
          ) : null}

          {submitError ? <SubmissionError error={submitError} /> : null}

          <div className="flex flex-col-reverse gap-3 border-t border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Button
              type="button"
              variant="ghost"
              onClick={() => move(-1)}
              disabled={currentIndex === 0 || submitting}
              className={cn(currentIndex === 0 && "invisible")}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step === "review" ? (
              <Button
                type="button"
                onClick={() => void submitConfirmedResponse()}
                disabled={submitting}
                className="min-w-40 rounded-xl"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck />}
                {managerOnly ? "Submit manager review" : "Submit verification"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => move(1)}
                disabled={submitting}
                className="rounded-xl"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

function EmploymentStep({
  workspace,
  form,
  errors,
  submitting,
  onChange,
  onDecision,
}: {
  workspace: EmployerPortalWorkspace;
  form: EmployerPortalFormState;
  errors: Record<string, string>;
  submitting: boolean;
  onChange: (patch: Partial<EmployerPortalFormState>) => void;
  onDecision: (kind: "clarification" | "reject") => Promise<void>;
}) {
  const employment = workspace.employment;
  const facts = [
    {
      key: "employmentExisted" as const,
      label: `${workspace.candidate.full_name} worked at ${employment.employer_name}.`,
    },
    {
      key: "roleCorrect" as const,
      label: `The role or title was ${employment.job_title}.`,
    },
    {
      key: "datesCorrect" as const,
      label: `The employment dates shown below are correct.`,
    },
  ];

  return (
    <section aria-labelledby="employment-heading" className="p-5 sm:p-8">
      <SectionHeading
        icon={BriefcaseBusiness}
        eyebrow="Step 1"
        title="Employment verification"
        description="Confirm the factual employment details supplied for this request."
        id="employment-heading"
      />

      <dl className="mt-6 grid gap-3 rounded-2xl bg-muted/35 p-4 sm:grid-cols-2 sm:p-5">
        <Fact label="Candidate" value={workspace.candidate.full_name} />
        <Fact label="Employer" value={employment.employer_name} />
        <Fact label="Role" value={employment.job_title} />
        <Fact label="Employment type" value={formatWords(employment.employment_type)} />
        <Fact label="Start date" value={formatDate(employment.start_date)} />
        <Fact
          label="End date"
          value={employment.end_date ? formatDate(employment.end_date) : "Present"}
        />
        {employment.region || employment.country ? (
          <Fact
            label="Location"
            value={[employment.region, employment.country].filter(Boolean).join(", ")}
          />
        ) : null}
      </dl>

      <fieldset
        className="mt-6 space-y-3"
        aria-describedby={errors.employment ? "employment-error" : undefined}
      >
        <legend className="text-sm font-semibold">Confirm each statement</legend>
        {facts.map((fact) => (
          <label
            key={fact.key}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 p-4 transition-colors hover:bg-muted/30"
          >
            <Checkbox
              checked={form[fact.key]}
              onCheckedChange={(checked) => onChange({ [fact.key]: checked === true })}
              className="mt-0.5"
            />
            <span className="text-sm leading-6">{fact.label}</span>
          </label>
        ))}
      </fieldset>
      {errors.employment ? (
        <FieldError id="employment-error">{errors.employment}</FieldError>
      ) : null}

      <label className="mt-6 block text-sm font-medium" htmlFor="employment-comments">
        Factual comments <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Textarea
        id="employment-comments"
        value={form.employmentComments}
        maxLength={4000}
        onChange={(event) => onChange({ employmentComments: event.target.value })}
        placeholder="Add concise context about the employment facts."
        className="mt-2 min-h-24"
      />

      <div className="mt-7 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <h3 className="text-sm font-semibold">Something is incorrect or unclear?</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Employment details cannot be edited from this link. Tell KairoID what needs attention,
          then request clarification or report a discrepancy.
        </p>
        <label className="mt-4 block text-sm font-medium" htmlFor="decision-reason">
          What needs attention?
        </label>
        <Textarea
          id="decision-reason"
          value={form.decisionReason}
          maxLength={2000}
          aria-invalid={Boolean(errors.decisionReason)}
          aria-describedby={errors.decisionReason ? "decision-reason-error" : undefined}
          onChange={(event) => onChange({ decisionReason: event.target.value })}
          placeholder="Describe the incorrect or missing information."
          className="mt-2 min-h-20 bg-background"
        />
        {errors.decisionReason ? (
          <FieldError id="decision-reason-error">{errors.decisionReason}</FieldError>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => void onDecision("clarification")}
          >
            Request clarification
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={() => void onDecision("reject")}
          >
            Report discrepancy
          </Button>
        </div>
      </div>
    </section>
  );
}

function HRReferenceStep({
  form,
  onChange,
}: {
  form: EmployerPortalFormState;
  onChange: (patch: Partial<EmployerPortalFormState>) => void;
}) {
  return (
    <section aria-labelledby="hr-reference-heading" className="p-5 sm:p-8">
      <SectionHeading
        icon={ShieldCheck}
        eyebrow="HR reference"
        title="A concise factual reference"
        description="Share only information you are authorized to provide. This is not a performance review."
        id="hr-reference-heading"
      />

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">Can you complete the HR reference?</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RadioCard
            name="hr-reference-status"
            value="completed"
            checked={form.hrReferenceStatus === "completed"}
            label="Yes, complete the reference"
            onChange={() => onChange({ hrReferenceStatus: "completed" })}
          />
          <RadioCard
            name="hr-reference-status"
            value="cannot_confirm"
            checked={form.hrReferenceStatus === "cannot_confirm"}
            label="I can't confirm this reference"
            onChange={() => onChange({ hrReferenceStatus: "cannot_confirm" })}
          />
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">Eligible for rehire</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["yes", "Yes"],
            ["no", "No"],
            ["prefer_not_to_answer", "Prefer not to answer"],
          ].map(([value, label]) => (
            <RadioCard
              key={value}
              name="rehire-eligibility"
              value={value}
              checked={form.rehireEligibility === value}
              label={label}
              onChange={() => onChange({ rehireEligibility: value as RehireEligibility })}
            />
          ))}
        </div>
      </fieldset>

      <label className="mt-6 block text-sm font-medium" htmlFor="hr-comments">
        HR comments <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Textarea
        id="hr-comments"
        value={form.hrComments}
        maxLength={2000}
        onChange={(event) => onChange({ hrComments: event.target.value })}
        placeholder="Add a brief factual comment."
        className="mt-2 min-h-28"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Comments are handled as private reference information and are not shown in public profiles.
      </p>
    </section>
  );
}

function ManagerStep({
  manager,
  form,
  errors,
  onChange,
}: {
  manager: EmployerPortalReportingManager;
  form: EmployerPortalFormState;
  errors: Record<string, string>;
  onChange: (patch: Partial<EmployerPortalFormState>) => void;
}) {
  const showContact = isConfirmedManagerRelationship(form.managerRelationship);
  const showCorrection = showContact && form.managerContactProvenance === "hr_corrected";

  return (
    <section aria-labelledby="manager-heading" className="p-5 sm:p-8">
      <SectionHeading
        icon={UserRoundCheck}
        eyebrow="Reporting manager"
        title="Confirm the relationship and contact details"
        description="The candidate listed this person as their reporting manager for this employment. Please confirm the relationship and contact details before KairoID sends a reference request."
        id="manager-heading"
      />

      <div className="mt-6 rounded-2xl bg-muted/35 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Candidate-provided details
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <Fact label="Name" value={manager.candidate_provided.full_name} />
          <Fact label="Role" value={manager.candidate_provided.designation} />
          {manager.candidate_provided.work_email ? (
            <Fact label="Work email" value={manager.candidate_provided.work_email} />
          ) : null}
          {manager.candidate_provided.phone ? (
            <Fact label="Phone" value={manager.candidate_provided.phone} />
          ) : null}
        </dl>
      </div>

      <fieldset
        className="mt-6 space-y-3"
        aria-describedby={errors.managerRelationship ? "manager-relationship-error" : undefined}
      >
        <legend className="text-sm font-semibold">What was their relationship?</legend>
        {MANAGER_RELATIONSHIP_OPTIONS.map((option) => (
          <RadioCard
            key={option.value}
            name="manager-relationship"
            value={option.value}
            checked={form.managerRelationship === option.value}
            label={option.label}
            onChange={() =>
              onChange({
                managerRelationship: option.value,
                managerContactProvenance: "",
              })
            }
          />
        ))}
      </fieldset>
      {errors.managerRelationship ? (
        <FieldError id="manager-relationship-error">{errors.managerRelationship}</FieldError>
      ) : null}

      {showContact ? (
        <fieldset
          className="mt-7 space-y-3 border-t border-border/70 pt-7"
          aria-describedby={
            errors.managerContactProvenance ? "manager-contact-option-error" : undefined
          }
        >
          <legend className="text-sm font-semibold">Confirm the contact information</legend>
          <p className="text-sm leading-6 text-muted-foreground">
            You do not have to disclose a private phone number. KairoID will determine invitation
            readiness after your response.
          </p>
          {MANAGER_CONTACT_OPTIONS.map((option) => (
            <RadioCard
              key={option.value}
              name="manager-contact"
              value={option.value}
              checked={form.managerContactProvenance === option.value}
              label={option.label}
              description={option.description}
              onChange={() =>
                onChange({ managerContactProvenance: option.value as ManagerContactProvenance })
              }
            />
          ))}
        </fieldset>
      ) : null}
      {errors.managerContactProvenance ? (
        <FieldError id="manager-contact-option-error">{errors.managerContactProvenance}</FieldError>
      ) : null}

      {showCorrection ? (
        <div className="mt-6 grid gap-4 rounded-2xl border border-border/70 p-4 sm:grid-cols-2 sm:p-5">
          <Field
            id="manager-name"
            label="Full name"
            value={form.correctedContact.full_name}
            error={errors.managerFullName}
            onChange={(value) =>
              onChange({ correctedContact: { ...form.correctedContact, full_name: value } })
            }
          />
          <Field
            id="manager-designation"
            label="Role or designation"
            value={form.correctedContact.designation}
            error={errors.managerDesignation}
            onChange={(value) =>
              onChange({ correctedContact: { ...form.correctedContact, designation: value } })
            }
          />
          <Field
            id="manager-email"
            label="Work email"
            type="email"
            value={form.correctedContact.work_email ?? ""}
            error={errors.managerEmail || errors.managerContact}
            onChange={(value) =>
              onChange({ correctedContact: { ...form.correctedContact, work_email: value } })
            }
          />
          <Field
            id="manager-phone"
            label="Phone (optional)"
            type="tel"
            value={form.correctedContact.phone ?? ""}
            error={errors.managerPhone}
            placeholder="+919876543210"
            onChange={(value) =>
              onChange({ correctedContact: { ...form.correctedContact, phone: value } })
            }
          />
        </div>
      ) : null}
    </section>
  );
}

function ReviewStep({
  workspace,
  form,
  managerOnly,
}: {
  workspace: EmployerPortalWorkspace;
  form: EmployerPortalFormState;
  managerOnly: boolean;
}) {
  return (
    <section aria-labelledby="review-heading" className="p-5 sm:p-8">
      <SectionHeading
        icon={CheckCircle2}
        eyebrow="Review"
        title="Review your response"
        description="Confirm the summary below before submitting your employer-side validation."
        id="review-heading"
      />

      <div className="mt-6 divide-y divide-border/70 rounded-2xl border border-border/70">
        {!managerOnly ? (
          <>
            <ReviewRow
              title="Employment verification"
              value="Employment, role and dates confirmed"
            />
            <ReviewRow
              title="HR reference"
              value={
                form.hrReferenceStatus === "completed"
                  ? `Completed · Rehire: ${formatWords(form.rehireEligibility)}`
                  : "Could not confirm"
              }
            />
          </>
        ) : (
          <ReviewRow title="Employment verification" value="Previously confirmed" />
        )}
        {workspace.reporting_manager ? (
          <>
            <ReviewRow
              title="Reporting manager"
              value={managerRelationshipLabel(form.managerRelationship)}
            />
            {isConfirmedManagerRelationship(form.managerRelationship) ? (
              <ReviewRow
                title="Contact decision"
                value={managerContactLabel(form.managerContactProvenance)}
              />
            ) : null}
          </>
        ) : (
          <ReviewRow title="Reporting manager" value="No manager was nominated" />
        )}
      </div>

      <div className="mt-6 flex gap-3 rounded-2xl bg-primary/[0.06] p-4 text-sm leading-6">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          Submitting records your response with KairoID. This page does not send a reporting-manager
          invitation; invitation readiness and delivery remain backend-controlled.
        </p>
      </div>
    </section>
  );
}

function CompletionView({
  workspace,
  result,
}: {
  workspace: EmployerPortalWorkspace;
  result: SubmissionResult | null;
}) {
  const decision = result?.action?.decision ?? workspace.decision;
  const manager = result?.manager ?? workspace.reporting_manager;
  const requestStatus =
    result?.action?.verification_request_status ?? workspace.verification_request_status;
  const employmentStatus =
    decision === "confirmed"
      ? requestStatus === "pending_admin_quality_review"
        ? "Confirmed · Awaiting KairoID quality review"
        : "Confirmed"
      : decisionLabel(decision);

  return (
    <PortalShell>
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-3xl border border-border/70 bg-card p-5 shadow-[0_20px_70px_-45px_hsl(var(--foreground)/0.28)] sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Response recorded
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Thank you. KairoID recorded the employer response for {workspace.candidate.full_name}.
          </p>

          <div className="mt-7 divide-y divide-border/70 rounded-2xl border border-border/70">
            <OutcomeRow title="Employment" value={employmentStatus} />
            <OutcomeRow
              title="HR Reference"
              value={
                result?.hrReferenceStatus === "completed"
                  ? "Completed"
                  : result?.hrReferenceStatus === "cannot_confirm"
                    ? "Could not be confirmed"
                    : decision === "confirmed"
                      ? "Response recorded"
                      : "Not completed"
              }
            />
            <OutcomeRow
              title="Reporting Manager"
              value={manager ? managerRelationshipOutcome(manager) : "Not nominated"}
            />
            <OutcomeRow
              title="Manager Reference"
              value={manager ? managerStatusLabel(manager.status) : "Not sent"}
            />
          </div>

          <p className="mt-6 rounded-2xl bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
            Employment confirmation and reporting-manager validation are separate outcomes. KairoID
            controls final verification and any manager-reference invitation.
          </p>
        </div>
      </main>
    </PortalShell>
  );
}

function PortalHeading({
  workspace,
  managerOnly,
}: {
  workspace: EmployerPortalWorkspace;
  managerOnly: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Employer verification
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {managerOnly ? "Review the reporting manager" : `Verify ${workspace.candidate.full_name}`}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {managerOnly
            ? "The factual employment response is already recorded. Review the candidate's current manager nomination."
            : `Confirm employment information for ${workspace.employment.employer_name}, then complete the concise reference sections.`}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="h-4 w-4" />
        Expires {format(new Date(workspace.expires_at), "MMM d, yyyy 'at' h:mm a")}
      </div>
    </div>
  );
}

function StepProgress({ steps, current }: { steps: PortalStep[]; current: PortalStep }) {
  const currentIndex = steps.indexOf(current);
  return (
    <nav aria-label="Verification progress" className="mt-6 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-2">
        {steps.map((item, index) => (
          <li key={item} className="flex items-center gap-2">
            <span
              aria-current={item === current ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
                index < currentIndex && "border-primary/20 bg-primary/10 text-primary",
                index === currentIndex && "border-foreground bg-foreground text-background",
                index > currentIndex && "border-border bg-background text-muted-foreground",
              )}
            >
              {index < currentIndex ? <Check className="h-3.5 w-3.5" /> : index + 1}
              {stepLabel(item)}
            </span>
            {index < steps.length - 1 ? <span className="h-px w-4 bg-border" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function PortalLoading() {
  return (
    <PortalShell>
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-16">
        <div role="status" className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium">Loading the secure verification…</p>
          <p className="mt-1 text-xs text-muted-foreground">No account is required.</p>
        </div>
      </main>
    </PortalShell>
  );
}

function PortalError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const state = getEmployerPortalError(error);
  return (
    <PortalShell>
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16">
        <div className="w-full rounded-3xl border border-border/70 bg-card p-6 text-center sm:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">{state.title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{state.message}</p>
          {state.kind === "temporary" || state.kind === "conflict" ? (
            <Button type="button" onClick={onRetry} className="mt-6 rounded-xl">
              Try again
            </Button>
          ) : null}
        </div>
      </main>
    </PortalShell>
  );
}

function SubmissionError({ error }: { error: unknown }) {
  const state = getEmployerPortalError(error);
  return (
    <div
      role="alert"
      className="mx-5 mb-5 rounded-2xl border border-destructive/20 bg-destructive/[0.05] p-4 text-sm sm:mx-8"
    >
      <p className="font-semibold text-destructive">{state.title}</p>
      <p className="mt-1 leading-6 text-muted-foreground">{state.message}</p>
    </div>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.09),transparent_34%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--muted)/0.35))]">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo className="h-5" />
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <LockKeyhole className="h-4 w-4 text-primary" /> Secure employer link
          </span>
        </div>
      </header>
      {children}
      <footer className="border-t border-border/60 px-4 py-5 text-center text-xs text-muted-foreground">
        Only submit information you are authorized to provide. Never forward this private link.
      </footer>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
  id,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        <h2 id={id} className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function RadioCard({
  name,
  value,
  checked,
  label,
  description,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description?: string;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
        checked ? "border-primary bg-primary/[0.06]" : "border-border/70 hover:bg-muted/30",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
      />
      <span>
        <span className="block text-sm font-medium leading-6">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function Field({
  id,
  label,
  value,
  type = "text",
  placeholder,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2"
      />
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 text-sm text-destructive">
      {children}
    </p>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function ReviewRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-4 sm:grid-cols-[180px_1fr] sm:px-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-sm font-medium sm:text-right">{value}</p>
    </div>
  );
}

function OutcomeRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function validateStep(
  step: PortalStep,
  workspace: EmployerPortalWorkspace,
  form: EmployerPortalFormState,
  setErrors: (errors: Record<string, string>) => void,
) {
  if (step === "employment") {
    if (!form.employmentExisted || !form.datesCorrect || !form.roleCorrect) {
      setErrors({
        employment:
          "Confirm all three factual statements to continue, or use a correction action below.",
      });
      return false;
    }
  }
  if (step === "manager") {
    const errors = validateManagerForm(workspace.reporting_manager, form);
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return false;
    }
  }
  return true;
}

function isManagerOnlyReview(workspace: EmployerPortalWorkspace) {
  return Boolean(
    workspace.state === "completed" &&
    workspace.decision === "confirmed" &&
    workspace.reporting_manager &&
    (workspace.reporting_manager.status === "awaiting_hr_validation" ||
      workspace.reporting_manager.revalidation_required),
  );
}

function managerRelationshipOutcome(manager: EmployerPortalReportingManager) {
  const decision = manager.validation.relationship_decision;
  if (!decision) return managerStatusLabel(manager.status);
  return managerRelationshipLabel(decision);
}

function stepLabel(step: PortalStep) {
  const labels: Record<PortalStep, string> = {
    employment: "Employment",
    "hr-reference": "HR reference",
    manager: "Manager",
    review: "Review",
  };
  return labels[step];
}

function formatDate(value: string | null) {
  if (!value) return "Not provided";
  return format(new Date(`${value}T00:00:00`), "MMM d, yyyy");
}

function formatWords(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
