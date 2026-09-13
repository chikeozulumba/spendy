import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CircleCheck, HandCoins } from "lucide-react";
import { api } from "../api";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "./ui/Sheet";
import { NotificationToggle } from "./NotificationToggle";
import { formatDate } from "../lib/formatDate";
import { cn } from "../lib/cn";
import type { NotificationItem } from "../types";

const TYPE_ICON: Record<string, typeof Bell> = {
  loan_due: HandCoins,
  loan_overdue: HandCoins,
};

// Polls rather than pushing — these are the same alerts already delivered
// via Telegram in real time, so the web app just needs to reflect that
// state next time the user has it open, not stream it live.
const POLL_INTERVAL_MS = 60_000;

export function NotificationsBell() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(getToken),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(getToken, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(getToken),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  function handleClick(n: NotificationItem) {
    if (!n.readAt) markRead.mutate(n.id);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex size-9 items-center justify-center rounded-lg border border-line text-text-400 hover:border-line-strong hover:text-text-100"
        aria-label="Notifications"
      >
        <Bell className="size-4" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rust-500 text-[10px] font-semibold text-ink-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <SheetContent>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-medium text-moss-400 hover:text-moss-300 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>
        </SheetHeader>

        <SheetBody>
          {notifications.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-text-400">You're all caught up.</p>
          )}
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            const unread = !n.readAt;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-line px-5 py-3.5 text-left hover:bg-ink-850",
                  unread && "bg-moss-400/5"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    unread ? "bg-moss-400/15 text-moss-400" : "bg-ink-850 text-text-600"
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "truncate text-sm",
                        unread ? "font-semibold text-text-100" : "font-medium text-text-400"
                      )}
                    >
                      {n.title}
                    </span>
                    {unread && <span className="size-1.5 shrink-0 rounded-full bg-moss-400" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-400">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-text-600">{formatDate(n.createdAt)}</span>
                </span>
                {!unread && <CircleCheck className="mt-1 size-3.5 shrink-0 text-text-600" strokeWidth={1.8} />}
              </button>
            );
          })}
        </SheetBody>

        <SheetFooter>
          <NotificationToggle />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
