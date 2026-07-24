import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, SectionCard } from "@/components/app/primitives";
import { useDashboard } from "@/lib/dashboard-context";
import type { Notification, NotificationCategory } from "@/lib/dashboard-data";
import { NotificationRow, NOTIF_CATEGORY_LABEL, targetHref } from "@/components/app/NotificationsPopover";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Kairo Trust Workspace" }] }),
  component: NotificationsPage,
});

type Tab = "all" | "unread";

const DAY = 86400000;

function bucketOf(iso: string): string {
  const t = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = today.getTime();
  if (t >= start) return "Today";
  if (t >= start - DAY) return "Yesterday";
  if (t >= start - 7 * DAY) return "This week";
  if (t >= start - 30 * DAY) return "This month";
  return "Earlier";
}

function NotificationsPage() {
  const { notifications, unread, markAllRead, markRead, markUnread } = useDashboard();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [category, setCategory] = useState<NotificationCategory | "all">("all");

  const categories = useMemo(() => {
    const set = new Set<NotificationCategory>();
    notifications.forEach((n) => set.add(n.kind));
    return Array.from(set);
  }, [notifications]);

  const filtered = useMemo(() => {
    let arr = [...notifications].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (tab === "unread") arr = arr.filter((n) => !n.read);
    if (category !== "all") arr = arr.filter((n) => n.kind === category);
    return arr;
  }, [notifications, tab, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, Notification[]>();
    filtered.forEach((n) => {
      const b = bucketOf(n.createdAt);
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(n);
    });
    const order = ["Today", "Yesterday", "This week", "This month", "Earlier"];
    return order.filter((k) => map.has(k)).map((k) => ({ bucket: k, items: map.get(k)! }));
  }, [filtered]);

  function onOpen(n: Notification) {
    const href = targetHref(n);
    if (!href) {
      toast.error("This record is no longer available.");
      if (!n.read) markRead(n.id);
      return;
    }
    if (!n.read) markRead(n.id);
    navigate(href as never);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Notification Centre"
        title="Notifications"
        description="A running record of activity across invitations, verifications, team, and your organization."
      />

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
        <div className="flex gap-1 rounded-xl bg-foreground/[0.04] p-1 self-start">
          {(["all", "unread"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors capitalize",
                tab === t ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {t}
              {t === "unread" && unread > 0 && <span className="ml-1 tabular-nums">({unread})</span>}
            </button>
          ))}
        </div>

        <Select value={category} onValueChange={(v) => setCategory(v as NotificationCategory | "all")}>
          <SelectTrigger className="rounded-xl h-9 w-full sm:w-[240px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{NOTIF_CATEGORY_LABEL[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg h-9"
            disabled={unread === 0}
            onClick={markAllRead}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark all as read
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-background shadow-[var(--shadow-soft)]">
          <div className="px-6 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-foreground/[0.05] flex items-center justify-center mb-4">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-base font-semibold">
              {tab === "unread" ? "No unread notifications" : "No notifications yet"}
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {tab === "unread"
                ? "You’re fully caught up. New activity will appear here."
                : "We’ll notify you when invitations, verifications, or team activity happens."}
            </p>
          </div>
        </div>

      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <SectionCard key={g.bucket} title={g.bucket}>
              <div>
                {g.items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    dense={false}
                    onOpen={() => onOpen(n)}
                    onToggleRead={() => (n.read ? markUnread(n.id) : markRead(n.id))}
                  />
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
