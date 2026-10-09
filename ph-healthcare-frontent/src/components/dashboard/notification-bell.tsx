"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelative } from "@/lib/utils/format";
import type { NotificationType } from "@/generated/prisma/enums";

type NotificationPreview = {
  id: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
};

/**
 * The notification bell (§24).
 *
 * Renders the server-provided unread count immediately so it is correct in the
 * first HTML, then refreshes the list lazily. Two reasons not to make the whole
 * dropdown client-fetched on mount: it would delay the count the sidebar already
 * shows, and it would mean the notification count is only as reliable as a fetch
 * the user may not wait for.
 */
export function NotificationBell({
  href,
  initialUnread = 0,
}: {
  href: string;
  initialUnread?: number;
}) {
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  /*
   * Keep the local count in step with a new value from the server (a router
   * refresh, the sidebar re-rendering after a mark-as-read).
   *
   * React's endorsed pattern for "adjust state when a prop changes" is to do it
   * during render and compare against the previous prop value — not in an effect,
   * which would render once with the stale value first.
   */
  const [lastServerCount, setLastServerCount] = useState(initialUnread);
  if (initialUnread !== lastServerCount) {
    setLastServerCount(initialUnread);
    setUnread(initialUnread);
  }

  const load = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications?pageSize=8", {
        credentials: "same-origin",
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { items: NotificationPreview[]; meta: { total: number } };
      };

      if (payload.success && payload.data) {
        setItems(payload.data.items);
        setUnread(payload.data.meta.total);
      }
    } catch {
      // A failed notification fetch must not break the header; the dropdown shows
      // an explicit empty state and the full page remains reachable.
    } finally {
      setIsLoading(false);
    }
  };

  const markAllRead = async () => {
    setUnread(0);
    setItems((previous) =>
      previous.map((item) => ({ ...item, readAt: new Date().toISOString() })),
    );

    await fetch("/api/notifications/mark-all-read", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) void load();
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={
              unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
            }
            className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        }
      >
        <Bell className="size-4.5" aria-hidden="true" />
        {unread > 0 ? (
          <Badge
            variant="default"
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 justify-center px-1 text-[10px] leading-none tabular-nums"
          >
            {unread > 99 ? "99+" : unread}
          </Badge>
        ) : null}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="mr-1.5 size-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          ) : null}
        </div>

        <ScrollArea className="max-h-80">
          {isLoading && items.length === 0 ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell
                className="mx-auto mb-2 size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                You are all caught up.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Link
                          href={item.actionUrl ?? href}
                          className={cn(
                            "block px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                            !item.readAt && "bg-primary/5",
                          )}
                        />
                      }
                    >
                      <div className="flex items-start gap-2">
                        {!item.readAt ? (
                          <span
                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                            aria-label="Unread"
                          />
                        ) : (
                          <span className="mt-1.5 size-1.5 shrink-0" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.title}
                          </p>
                          {item.body ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {item.body}
                            </p>
                          ) : null}
                          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                            {formatRelative(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        render={
                          <Link href={item.actionUrl ?? href} />
                        }
                      >
                        View
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full" render={<Link href={href} />}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}