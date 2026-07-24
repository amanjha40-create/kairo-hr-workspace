import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bell, MailOpen, Mail, CheckCheck, ShieldCheck, ShieldAlert, ShieldQuestion,
  MailPlus, MailX, Clock, UserRoundCheck, Users, Building2, Inbox, AlertTriangle,
  CircleUser, MoreHorizontal, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/lib/dashboard-context";
import type { Notification, NotificationCategory } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const ICONS: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
  invitation_opened: MailOpen,
  invitation_accepted: UserRoundCheck,
  invitation_expiring: Clock,
  invitation_delivery_failed: MailX,
  candidate_info_submitted: CircleUser,
  candidate_response: Mail,
  verification_received: Inbox,
  clarification_received: ShieldQuestion,
  verification_completed: ShieldCheck,
  unable_to_verify: ShieldAlert,
  team_member_invited: Users,
  team_invitation_accepted: Users,
  org_action_required: Building2,
  update: Bell,
  reminder: Clock,
  completed: ShieldCheck,
  flagged: AlertTriangle,
};

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  invitation_opened: "Invitation opened",
  invitation_accepted: "Invitation accepted",
  invitation_expiring: "Invitation expiring",
  invitation_delivery_failed: "Delivery failed",
  candidate_info_submitted: "Information submitted",
  candidate_response: "Candidate response",
  verification_received: "Verification received",
  clarification_received: "Clarification received",
  verification_completed: "Verification completed",
  unable_to_verify: "Unable to verify",
  team_member_invited: "Team member invited",
  team_invitation_accepted: "Team invitation accepted",
  org_action_required: "Organization action required",
  update: "Update",
  reminder: "Reminder",
  completed: "Completed",
  flagged: "Flagged",
};

export const NOTIF_CATEGORY_LABEL = CATEGORY_LABEL;
export const NOTIF_ICONS = ICONS;

export function targetHref(n: Notification): { to: string; params?: Record<string, string> } | null {
  if (n.available === false) return null;
  const t = n.target;
  switch (t.kind) {
    case "person":
      return t.id ? { to: "/app/people/$id", params: { id: t.id } } : { to: "/app/people" };
    case "invitation":
      return t.id ? { to: "/app/invitations/$id", params: { id: t.id } } : { to: "/app/invitations" };
    case "verification":
      return t.id ? { to: "/app/verifications/$id", params: { id: t.id } } : { to: "/app/verifications" };
    case "team":
      return { to: "/app/team" };
    case "settings":
      return { to: "/app/settings" };
    default:
      return null;
  }
}

export function NotificationsPopover() {
  const { notifications, unread, markAllRead, markRead, markUnread } = useDashboard();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");

  const list = useMemo(() => {
    const arr = [...notifications].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return tab === "unread" ? arr.filter((n) => !n.read) : arr;
  }, [notifications, tab]);

  const visible = list.slice(0, 8);

  function onOpen(n: Notification) {
    const href = targetHref(n);
    if (!href) {
      toast.error("This record is no longer available.");
      if (!n.read) markRead(n.id);
      return;
    }
    if (!n.read) markRead(n.id);
    setOpen(false);
    navigate(href as never);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] sm:w-[420px] p-0 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-xs text-muted-foreground">{unread} unread</div>
          </div>
          <button
            onClick={markAllRead}
            disabled={unread === 0}
            className="text-xs font-medium hover:underline disabled:opacity-40 disabled:no-underline inline-flex items-center gap-1"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        </div>

        <div className="px-4 pt-3 flex gap-1 border-b border-border/60">
          {(["all", "unread"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors capitalize",
                tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground/[0.05]",
              )}
            >
              {t}
              {t === "unread" && unread > 0 && <span className="ml-1 tabular-nums">({unread})</span>}
            </button>
          ))}
          <div className="ml-auto pb-2" />
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {visible.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <AnimatePresence initial={false}>
              {visible.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onOpen={() => onOpen(n)}
                  onToggleRead={() => (n.read ? markUnread(n.id) : markRead(n.id))}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-2 border-t border-border/60 bg-foreground/[0.015]">
          <Link
            to="/app/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg hover:bg-foreground/[0.05] transition-colors"
          >
            View all notifications <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EmptyState({ tab }: { tab: "all" | "unread" }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-foreground/[0.05] flex items-center justify-center mb-3">
        <Bell className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">
        {tab === "unread" ? "No unread notifications" : "You’re all caught up"}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {tab === "unread" ? "New activity will appear here." : "We’ll let you know when something happens."}
      </div>
    </div>
  );
}

export function NotificationRow({
  n,
  onOpen,
  onToggleRead,
  dense = true,
}: {
  n: Notification;
  onOpen: () => void;
  onToggleRead: () => void;
  dense?: boolean;
}) {
  const Icon = ICONS[n.kind] ?? Bell;
  const unavailable = n.available === false;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "group relative border-b border-border/60 last:border-b-0",
        !n.read && "bg-primary/[0.03]",
      )}
    >
      <button
        onClick={onOpen}
        className={cn(
          "w-full text-left flex items-start gap-3 hover:bg-foreground/[0.03] transition-colors",
          dense ? "px-4 py-3" : "px-5 py-4",
        )}
      >
        <div className="mt-0.5 relative shrink-0">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            unavailable ? "bg-muted text-muted-foreground" : "bg-foreground/[0.06] text-foreground",
          )}>
            <Icon className="h-4 w-4" />
          </div>
          {!n.read && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="text-sm font-medium leading-tight flex-1 min-w-0">{n.title}</div>
            <div className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{n.at}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">
              {CATEGORY_LABEL[n.kind]}
            </span>
            {n.target.label && !unavailable && (
              <span className="text-[10px] text-muted-foreground">· {n.target.label}</span>
            )}
            {unavailable && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning-foreground font-medium">
                Unavailable
              </span>
            )}
          </div>
        </div>
      </button>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-6 w-6 rounded-md hover:bg-foreground/10 flex items-center justify-center" aria-label="Options">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={onToggleRead}>
              {n.read ? (<><Mail className="h-3.5 w-3.5 mr-2" /> Mark as unread</>) : (<><MailOpen className="h-3.5 w-3.5 mr-2" /> Mark as read</>)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

export { MailPlus }; // silence unused
