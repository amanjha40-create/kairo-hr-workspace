import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VerificationReportModel } from "@/lib/verification-report";

const printSpy = vi.fn();
const refetchSpy = vi.fn();
const accessState = {
  org: { publicId: "org-123", name: "Acme Limited" },
  membershipRole: "owner",
  can: () => true,
};
const queryState: {
  data: VerificationReportModel | undefined;
  isPending: boolean;
  error: (Error & { status?: number }) | null;
  refetch: () => void;
} = {
  data: undefined,
  isPending: false,
  error: null,
  refetch: refetchSpy,
};

const report: VerificationReportModel = {
  personPublicId: "person-123",
  candidateName: "Aman Joshi",
  candidateRole: "Software Engineer",
  maskedEmail: "am******@example.com",
  maskedPhone: "******3210",
  organizationName: "Acme Limited",
  initiatedAt: "2026-08-01T00:00:00Z",
  consentedAt: "2026-08-01T01:00:00Z",
  updatedAt: "2026-08-03T00:00:00Z",
  state: "Interim",
  trustScore: 82,
  checks: [
    {
      id: "request-identity",
      type: "identity",
      title: "Identity",
      outcome: "matched",
      outcomeLabel: "Details matched",
      requestedAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-03T00:00:00Z",
      fields: [],
      evidence: [],
      notes: [],
    },
  ],
  openItems: ["References: Awaiting response"],
  requiresHrReview: true,
  roster: null,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
    fullPath: path,
    options,
    useParams: () => ({ id: "person-123" }),
  }),
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/Logo", () => ({ Logo: () => <div>KairoID</div> }));

vi.mock("@/components/app/primitives", () => ({
  TableSkeleton: () => <div>report-skeleton</div>,
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <button onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    asChild,
  }: {
    children: ReactNode;
    onClick?: () => void;
    asChild?: boolean;
  }) => (asChild ? <div>{children}</div> : <button onClick={onClick}>{children}</button>),
}));

vi.mock("@/lib/access-context", () => ({ useAccess: () => accessState }));
vi.mock("@/lib/queries/verification-report", () => ({
  useVerificationReportQuery: () => queryState,
}));

const { Route } = await import("../../routes/app.reports.$id");
const ReportPage = Route.options.component as ComponentType;

describe("Verification report route", () => {
  beforeEach(() => {
    queryState.data = report;
    queryState.isPending = false;
    queryState.error = null;
    refetchSpy.mockReset();
    printSpy.mockReset();
    vi.stubGlobal("print", printSpy);
  });

  it("renders the KairoID report and invokes the shared print/PDF action", () => {
    render(<ReportPage />);

    expect(screen.getByText("Candidate Verification Report")).toBeInTheDocument();
    expect(screen.getAllByText("Details matched")).toHaveLength(2);
    expect(screen.getByText("HR review required")).toBeInTheDocument();
    expect(screen.queryByText("Education")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Download PDF"));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("renders loading and not-found states truthfully", () => {
    queryState.data = undefined;
    queryState.isPending = true;
    const { rerender } = render(<ReportPage />);
    expect(screen.getByText("report-skeleton")).toBeInTheDocument();

    queryState.isPending = false;
    queryState.error = Object.assign(new Error("missing"), { status: 404 });
    rerender(<ReportPage />);
    expect(screen.getByText("Report not found")).toBeInTheDocument();
  });
});
