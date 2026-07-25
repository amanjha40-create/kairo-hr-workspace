import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  MailOpen,
  MoreHorizontal,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getNotificationErrorMessage,
  getNotificationKindLabel,
  getNotificationTargetHref,
  type WorkspaceNotification,
} from "@/lib/notifications";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationUnreadCountQuery,
  useNotificationsQuery,
} from "@/lib/queries/notifications";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const EMPTY_NOTIFICATIONS: WorkspaceNotification[] = [];

function getNotificationIcon(notification: WorkspaceNotification) {
  if (notification.kind === "trust_invitation_created") return MailOpen;
  if (notification.kind === "verification_completed") return ShieldCheck;
  if (notification.kind === "password_reset_requested") return ShieldAlert;

  if (notification.category === "verification") return ShieldQuestion;
  if (notification.category === "security") return ShieldAlert;
  if (notification.category === "system") return Clock;

  return Bell;
}

export function NotificationsPopover() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const notificationsQuery = useNotificationsQuery();
  const unreadCountQuery = useNotificationUnreadCountQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const notifications = notificationsQuery.data ?? EMPTY_NOTIFICATIONS;
  const derivedUnreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );
  const unread = unreadCountQuery.data ?? derivedUnreadCount;

  const list = useMemo(() => {
    const arr = [...notifications].sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || ""),
    );
    return tab === "unread" ? arr.filter((n) => !n.read) : arr;
  }, [notifications, tab]);

  const visible = list.slice(0, 8);
  const loadError =
    notificationsQuery.error ?? (!notifications.length ? unreadCountQuery.error : null);

  async function markAsRead(notification: WorkspaceNotification) {
    if (notification.read) return;
    try {
      await markReadMutation.mutateAsync(notification.id);
    } catch (error) {
      toast.error(
        getNotificationErrorMessage(error, "We couldn't mark this notification as read."),
      );
    }
  }

  async function onMarkAllRead() {
    try {
      await markAllReadMutation.mutateAsync();
    } catch (error) {
      toast.error(
        getNotificationErrorMessage(error, "We couldn't mark your notifications as read."),
      );
    }
  }

  function onOpen(notification: WorkspaceNotification) {
    const href = getNotificationTargetHref(notification);
    if (!notification.read) {
      void markAsRead(notification);
    }
    if (!href) {
      toast.error("This notification doesn't have a linked workspace record.");
      return;
    }
    setOpen(false);
    navigate(href as never);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] sm:w-[420px] p-0 rounded-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-border/60 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-xs text-muted-foreground">{unread} unread</div>
          </div>
          <button
            onClick={() => void onMarkAllRead()}
            disabled={unread === 0 || markAllReadMutation.isPending}
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
                tab === t
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-foreground/[0.05]",
              )}
            >
              {t}
              {t === "unread" && unread > 0 && (
                <span className="ml-1 tabular-nums">({unread})</span>
              )}
            </button>
          ))}
          <div className="ml-auto pb-2" />
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notificationsQuery.isPending && !notificationsQuery.data ? (
            <LoadingState />
          ) : loadError ? (
            <PopoverErrorState
              title={
                loadError instanceof Error && "status" in loadError && loadError.status === 403
                  ? "Permission denied"
                  : "Notifications didn't load"
              }
              description={getNotificationErrorMessage(loadError, "Please try again.")}
              onRetry={() => {
                void notificationsQuery.refetch();
                void unreadCountQuery.refetch();
              }}
            />
          ) : visible.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <AnimatePresence initial={false}>
              {visible.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onOpen={() => onOpen(n)}
                  onMarkRead={() => void markAsRead(n)}
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

function LoadingState() {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-foreground/[0.05] flex items-center justify-center mb-3">
        <Bell className="h-4 w-4 text-muted-foreground animate-pulse" />
      </div>
      <div className="text-sm font-medium">Loading notifications</div>
      <div className="text-xs text-muted-foreground mt-1">
        We’re fetching the latest activity for this workspace.
      </div>
    </div>
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
        {tab === "unread"
          ? "New activity will appear here."
          : "We’ll let you know when something happens."}
      </div>
    </div>
  );
}

function PopoverErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
        <AlertTriangle className="h-4 w-4 text-destructive" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">{description}</div>
      <Button variant="outline" size="sm" className="mt-4 rounded-lg" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
      </Button>
    </div>
  );
}

export function NotificationRow({
  n,
  onOpen,
  onMarkRead,
  dense = true,
}: {
  n: WorkspaceNotification;
  onOpen: () => void;
  onMarkRead?: () => void;
  dense?: boolean;
}) {
  const Icon = getNotificationIcon(n);
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
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              unavailable
                ? "bg-muted text-muted-foreground"
                : "bg-foreground/[0.06] text-foreground",
            )}
          >
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
              {getNotificationKindLabel(n.kind, n.category)}
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
            <button
              className="h-6 w-6 rounded-md hover:bg-foreground/10 flex items-center justify-center"
              aria-label="Options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem disabled={n.read || !onMarkRead} onClick={onMarkRead}>
              <MailOpen className="h-3.5 w-3.5 mr-2" />
              {n.read ? "Already read" : "Mark as read"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
