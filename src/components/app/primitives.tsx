import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { VerificationStatus } from "@/lib/dashboard-data";

export function PageHeader({
  eyebrow, title, description, actions,
}: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 mb-8">
      <div className="min-w-0">
        {eyebrow && <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-medium">{eyebrow}</div>}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label, value, delta, positive = true, icon: Icon, sparkline,
}: { label: string; value: string; delta?: string; positive?: boolean; icon?: LucideIcon; sparkline?: number[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
    >
      <Card className="p-5 rounded-2xl border-border/60 shadow-[var(--shadow-soft)] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
          {sparkline && <Sparkline data={sparkline} positive={positive} />}
        </div>
        {delta && (
          <div className={cn("mt-1 text-xs flex items-center gap-1", positive ? "text-emerald-600" : "text-destructive")}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 64, h = 24;
  const max = Math.max(...data), min = Math.min(...data);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / Math.max(1, max - min)) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={points} fill="none" stroke={positive ? "hsl(160 60% 40%)" : "hsl(0 60% 55%)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SectionCard({
  title, description, action, children, className,
}: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("p-0 rounded-2xl border-border/60 overflow-hidden shadow-[var(--shadow-soft)]", className)}>
      <div className="p-5 border-b border-border/60 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  );
}

const STATUS_STYLES: Record<VerificationStatus, string> = {
  Pending: "bg-warning/15 text-warning-foreground border-warning/25",
  "Under Review": "bg-info/15 text-info-foreground border-info/25",
  "Documents Requested": "bg-foreground/[0.06] text-foreground border-border/60",
  Verified: "bg-success/15 text-success border-success/25",
  Rejected: "bg-destructive/10 text-destructive border-destructive/25",
};

export function StatusPill({ status }: { status: VerificationStatus }) {
  return (
    <motion.span
      layout
      initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", STATUS_STYLES[status])}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </motion.span>
  );
}

export function SlaBadge({ requestedAt }: { requestedAt: string }) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(requestedAt).getTime()) / 86400000));
  const tone = days > 5 ? "bg-destructive/10 text-destructive border-destructive/25" : days > 2 ? "bg-warning/15 text-warning-foreground border-warning/25" : "bg-success/15 text-success border-success/25";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums", tone)}>
      SLA · {days}d
    </span>
  );
}

export function EmptyState({
  icon: Icon, title, description, action,
}: { icon: LucideIcon; title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="py-16 px-6 text-center flex flex-col items-center">
      <div className="h-14 w-14 rounded-2xl bg-foreground/[0.04] border border-border/60 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="text-base font-semibold">{title}</div>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && <Button className="btn-premium rounded-xl mt-5" onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4">
          <div className="h-9 w-9 rounded-full bg-foreground/[0.06] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 bg-foreground/[0.06] rounded animate-pulse" />
            <div className="h-2.5 w-24 bg-foreground/[0.05] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatCard({
  label, value, icon: Icon, tone = "default", onClick,
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive";
  onClick?: () => void;
}) {
  const toneStyle =
    tone === "success" ? "text-success"
    : tone === "warning" ? "text-warning-foreground"
    : tone === "destructive" ? "text-destructive"
    : "text-foreground";
  const iconStyle =
    tone === "success" ? "text-success bg-success/10"
    : tone === "warning" ? "text-warning-foreground bg-warning/10"
    : tone === "destructive" ? "text-destructive bg-destructive/10"
    : "text-muted-foreground bg-foreground/[0.04]";
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "text-left rounded-2xl border border-border/60 bg-background p-4 transition-all shadow-[var(--shadow-soft)]",
        onClick && "hover:border-primary/40 hover:shadow-md cursor-pointer",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        {Icon && (
          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", iconStyle)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight", toneStyle)}>{value}</div>
    </Comp>
  );
}
