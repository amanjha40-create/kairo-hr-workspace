import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type {
  Relationship,
  InvitationStatus,
  WorkspaceVerificationStatus,
  SharedPassportStatus,
  ClaimStatus,
} from "@/lib/workspace-data";
import {
  Briefcase,
  UserCircle2,
  Clock3,
  Wrench,
  MailPlus,
  MailOpen,
  MailCheck,
  MailX,
  Ban,
  Play,
  Hourglass,
  Loader2,
  MessageCircleWarning,
  CheckCircle2,
  ShieldOff,
  ShieldCheck,
  Timer,
  Slash,
  RefreshCcwDot,
  Circle,
  FileEdit,
} from "lucide-react";

function Pill({
  tone,
  children,
  icon,
}: {
  tone: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tone,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const REL_TONE: Record<Relationship, string> = {
  Candidate: "bg-info/15 text-info-foreground border-info/25",
  Employee: "bg-success/15 text-success border-success/25",
  "Former Employee": "bg-foreground/[0.06] text-muted-foreground border-border/60",
  Contractor: "bg-warning/15 text-warning-foreground border-warning/25",
};
const REL_ICON: Record<Relationship, ReactNode> = {
  Candidate: <UserCircle2 className="h-3 w-3" />,
  Employee: <Briefcase className="h-3 w-3" />,
  "Former Employee": <Clock3 className="h-3 w-3" />,
  Contractor: <Wrench className="h-3 w-3" />,
};

export function RelationshipPill({ value }: { value: Relationship }) {
  return (
    <Pill tone={REL_TONE[value]} icon={REL_ICON[value]}>
      {value}
    </Pill>
  );
}

const INV_TONE: Record<InvitationStatus, string> = {
  "Not Invited": "bg-foreground/[0.04] text-muted-foreground border-border/60",
  Draft: "bg-foreground/[0.06] text-foreground border-border/60",
  Sent: "bg-info/15 text-info-foreground border-info/25",
  Opened: "bg-warning/15 text-warning-foreground border-warning/25",
  Accepted: "bg-success/15 text-success border-success/25",
  Expired: "bg-destructive/10 text-destructive border-destructive/25",
  Cancelled: "bg-foreground/[0.06] text-muted-foreground border-border/60",
};
const INV_ICON: Record<InvitationStatus, ReactNode> = {
  "Not Invited": <Circle className="h-3 w-3" />,
  Draft: <FileEdit className="h-3 w-3" />,
  Sent: <MailPlus className="h-3 w-3" />,
  Opened: <MailOpen className="h-3 w-3" />,
  Accepted: <MailCheck className="h-3 w-3" />,
  Expired: <MailX className="h-3 w-3" />,
  Cancelled: <Ban className="h-3 w-3" />,
};

export function InvitationPill({ value }: { value: InvitationStatus }) {
  return (
    <Pill tone={INV_TONE[value]} icon={INV_ICON[value]}>
      {value}
    </Pill>
  );
}

const WVS_TONE: Record<WorkspaceVerificationStatus, string> = {
  "Not Started": "bg-foreground/[0.04] text-muted-foreground border-border/60",
  "Waiting for Candidate": "bg-warning/15 text-warning-foreground border-warning/25",
  "In Verification": "bg-info/15 text-info-foreground border-info/25",
  "Clarification Required": "bg-warning/20 text-warning-foreground border-warning/30",
  Completed: "bg-success/15 text-success border-success/25",
  "Unable to Verify": "bg-destructive/10 text-destructive border-destructive/25",
  Cancelled: "bg-foreground/[0.06] text-muted-foreground border-border/60",
};
const WVS_ICON: Record<WorkspaceVerificationStatus, ReactNode> = {
  "Not Started": <Play className="h-3 w-3" />,
  "Waiting for Candidate": <Hourglass className="h-3 w-3" />,
  "In Verification": <Loader2 className="h-3 w-3" />,
  "Clarification Required": <MessageCircleWarning className="h-3 w-3" />,
  Completed: <CheckCircle2 className="h-3 w-3" />,
  "Unable to Verify": <ShieldOff className="h-3 w-3" />,
  Cancelled: <Ban className="h-3 w-3" />,
};

export function VerificationPill({ value }: { value: WorkspaceVerificationStatus }) {
  return (
    <Pill tone={WVS_TONE[value]} icon={WVS_ICON[value]}>
      {value}
    </Pill>
  );
}

const SP_TONE: Record<SharedPassportStatus, string> = {
  "Not Shared": "bg-foreground/[0.04] text-muted-foreground border-border/60",
  Active: "bg-success/15 text-success border-success/25",
  "Expiring Soon": "bg-warning/15 text-warning-foreground border-warning/25",
  Expired: "bg-destructive/10 text-destructive border-destructive/25",
  "Access Revoked": "bg-destructive/10 text-destructive border-destructive/25",
};
const SP_ICON: Record<SharedPassportStatus, ReactNode> = {
  "Not Shared": <Slash className="h-3 w-3" />,
  Active: <ShieldCheck className="h-3 w-3" />,
  "Expiring Soon": <Timer className="h-3 w-3" />,
  Expired: <ShieldOff className="h-3 w-3" />,
  "Access Revoked": <RefreshCcwDot className="h-3 w-3" />,
};

export function PassportPill({ value }: { value: SharedPassportStatus }) {
  return (
    <Pill tone={SP_TONE[value]} icon={SP_ICON[value]}>
      {value}
    </Pill>
  );
}

const CLAIM_TONE: Record<ClaimStatus, string> = {
  "Candidate-provided": "bg-foreground/[0.05] text-muted-foreground border-border/60",
  "Verification pending": "bg-info/15 text-info-foreground border-info/25",
  Verified: "bg-success/15 text-success border-success/25",
  "Unable to verify": "bg-destructive/10 text-destructive border-destructive/25",
};
export function ClaimPill({ value }: { value: ClaimStatus }) {
  return <Pill tone={CLAIM_TONE[value]}>{value}</Pill>;
}
