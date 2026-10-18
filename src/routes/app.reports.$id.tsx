import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  FileSearch,
  ShieldAlert,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { EmptyState, TableSkeleton } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/lib/access-context";
import { useVerificationReportQuery } from "@/lib/queries/verification-report";
import type {
  VerificationReportCheck,
  VerificationReportModel,
  VerificationReportOutcome,
} from "@/lib/verification-report";

export const Route = createFileRoute("/app/reports/$id")({
  component: VerificationReportPage,
});

const OUTCOME_STYLE: Record<VerificationReportOutcome, string> = {
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  matched: "border-emerald-200 bg-emerald-50 text-emerald-800",
  discrepancy: "border-amber-200 bg-amber-50 text-amber-900",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  awaiting_response: "border-slate-200 bg-slate-50 text-slate-700",
  unable: "border-orange-200 bg-orange-50 text-orange-900",
  rejected: "border-red-200 bg-red-50 text-red-800",
};

function VerificationReportPage() {
  const { id } = Route.useParams();
  const { org, can, membershipRole } = useAccess();
  const canView = can("modify_person");
  const reportQuery = useVerificationReportQuery({
    orgPublicId: org?.publicId,
    organizationName: org?.name,
    personPublicId: id,
    includeRoster: membershipRole === "owner" || membershipRole === "admin",
  });

  if (!org) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No active organization"
        description="A workspace organization is required to view verification reports."
      />
    );
  }
  if (!canView) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Permission denied"
        description="You don't have permission to view reports for people in this workspace."
      />
    );
  }
  if (reportQuery.isPending && !reportQuery.data) {
    return <TableSkeleton rows={8} />;
  }
  if (reportQuery.error || !reportQuery.data) {
    const status =
      reportQuery.error && "status" in reportQuery.error ? reportQuery.error.status : undefined;
    return (
      <EmptyState
        icon={AlertTriangle}
        title={status === 404 ? "Report not found" : "Verification report didn't load"}
        description={
          status === 403
            ? "You don't have permission to view this report."
            : "The latest verification data could not be loaded. Please try again."
        }
        action={{ label: "Retry", onClick: () => void reportQuery.refetch() }}
      />
    );
  }

  return <VerificationReport report={reportQuery.data} />;
}

export function VerificationReport({ report }: { report: VerificationReportModel }) {
  return (
    <div className="pb-12">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="rounded-xl" asChild>
          <Link to="/app/people/$id" params={{ id: report.personPublicId }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
          </Link>
        </Button>
        <Button className="btn-premium rounded-xl" onClick={() => window.print()}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
      </div>

      <article
        id="verification-report"
        className="mx-auto max-w-[1100px] overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-950 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none"
      >
        <header className="border-b border-slate-200 bg-[linear-gradient(135deg,#f7fbfb_0%,#ffffff_58%,#eef7f6_100%)] px-6 py-7 sm:px-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <Logo className="h-6" />
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-700">
                Confidential · Authorized HR use only
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Candidate Verification Report
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Updated {format(new Date(report.updatedAt), "dd MMM yyyy, HH:mm")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Report state
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-950">{report.state}</div>
              <div className="mt-1 font-mono text-[10px] text-slate-500">
                {report.personPublicId}
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-7 px-6 py-7 sm:px-10">
          <section className="report-section grid gap-5 rounded-2xl border border-slate-200 p-5 lg:grid-cols-[1.5fr_0.5fr]">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Candidate
              </div>
              <h2 className="mt-1 text-2xl font-semibold">{report.candidateName}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {report.candidateRole ?? "Role not provided"} · Requested by{" "}
                {report.organizationName}
              </p>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <Meta label="Email" value={report.maskedEmail ?? "Not shared"} />
                <Meta label="Phone" value={report.maskedPhone ?? "Not shared"} />
                <Meta label="Initiated" value={formatDate(report.initiatedAt)} />
                <Meta label="Consent recorded" value={formatDate(report.consentedAt)} />
              </dl>
            </div>
            <div className="flex flex-col justify-center rounded-2xl bg-slate-950 p-5 text-white">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200">
                Trust Score
              </div>
              <div className="mt-2 text-4xl font-semibold tabular-nums">
                {report.trustScore ?? "—"}
                {report.trustScore !== null ? (
                  <span className="text-base text-slate-400">/100</span>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {report.trustScore === null
                  ? "Not shared through the current organization contract."
                  : "Shared through the candidate's authorized Trust Passport."}
              </p>
            </div>
          </section>

          <section className="report-section">
            <SectionHeading eyebrow="Executive overview" title="Verification outcomes" />
            {report.checks.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
                No verification checks are available for this person. This report remains Interim.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.checks.map((check) => (
                  <div key={check.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold">{check.title}</div>
                      <OutcomeBadge check={check} />
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-500">
                      Updated {format(new Date(check.updatedAt), "dd MMM yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {report.requiresHrReview ? (
            <section className="report-section rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-900">
                    HR review required
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-amber-950">
                    Review pending, discrepant, rejected, or unable-to-verify checks before making
                    an employment decision.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {report.checks.map((check) => (
            <CheckSection key={check.id} check={check} />
          ))}

          <section className="report-section border-t border-slate-200 pt-6">
            <SectionHeading eyebrow="Follow-up" title="Open items" />
            {report.openItems.length ? (
              <ul className="mt-4 space-y-2">
                {report.openItems.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                    <Clock3 className="h-4 w-4 text-amber-700" /> {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" /> No open items in the current
                verification package.
              </p>
            )}
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-[10px] leading-relaxed text-slate-500 sm:px-10">
          This confidential report reflects only checks ordered and data shared through authorized
          KairoID workflows. Missing or pending information is not a verified finding. Evidence
          references are safe identifiers; raw storage paths and private credentials are never
          included.
        </footer>
      </article>
    </div>
  );
}

function CheckSection({ check }: { check: VerificationReportCheck }) {
  return (
    <section className="report-section border-t border-slate-200 pt-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading eyebrow="Verification detail" title={check.title} />
        <OutcomeBadge check={check} />
      </div>
      {check.fields.length ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Field</th>
                <th className="px-4 py-3 font-semibold">Candidate-declared</th>
                <th className="px-4 py-3 font-semibold">Verified / document value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {check.fields.map((field) => (
                <tr key={field.label}>
                  <td className="px-4 py-3 font-medium">{field.label}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {field.declaredValue ?? "Not provided"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {field.verifiedValue ?? "Not returned by current contract"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          The current contract provides the check outcome but no structured declared-versus-verified
          field comparison.
        </p>
      )}
      {check.evidence.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {check.evidence.map((evidence) => (
            <div key={evidence.id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="text-sm font-medium">{evidence.label}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                Evidence ID {evidence.id} · {evidence.status} ·{" "}
                {format(new Date(evidence.recordedAt), "dd MMM yyyy")}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {check.notes.length ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          {check.notes.join(" · ")}
        </div>
      ) : null}
      {check.type === "reference" && check.outcome === "awaiting_response" ? (
        <p className="mt-3 text-xs text-slate-500">Non-response is not an adverse finding.</p>
      ) : null}
    </section>
  );
}

function OutcomeBadge({ check }: { check: VerificationReportCheck }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${OUTCOME_STYLE[check.outcome]}`}
    >
      {check.outcomeLabel}
    </span>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null) {
  return value ? format(new Date(value), "dd MMM yyyy") : "Not available";
}
