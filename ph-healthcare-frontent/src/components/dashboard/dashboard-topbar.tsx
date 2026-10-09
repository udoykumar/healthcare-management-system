"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavBreadcrumb } from "@/components/dashboard/nav-breadcrumb";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { initials } from "@/lib/utils/format";
import { logoutAction } from "@/app/(auth)/actions";
import type { SidebarUser } from "@/components/dashboard/dashboard-sidebar";

/**
 * The dashboard top bar.
 *
 * Holds the mobile sidebar trigger, the breadcrumb, the notification bell and the
 * account menu. On small screens the breadcrumb collapses to just the page title —
 * a full trail does not fit next to the trigger and bell without wrapping.
 */
export function DashboardTopBar({
  user,
  unreadNotifications = 0,
  notificationsHref,
}: {
  user: SidebarUser;
  unreadNotifications?: number;
  notificationsHref?: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
      {/*
        SidebarTrigger renders a plain <button>, so its label must be a string.
        The collapsed/expanded state is already conveyed by aria-expanded on the
        control itself; restating it in the label would make screen readers
        announce it twice.
      */}
      <SidebarTrigger className="-ml-1" aria-label="Toggle navigation" />

      <Separator orientation="vertical" className="mr-1 h-4" />

      <NavBreadcrumb role={user.role} className="min-w-0 flex-1" />

      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />

        {notificationsHref ? (
          <NotificationBell
            href={notificationsHref}
            initialUnread={unreadNotifications}
          />
        ) : null}

        <Separator orientation="vertical" className="mx-1 h-4" />

        <AccountMenu user={user} />
      </div>
    </header>
  );
}

function AccountMenu({ user }: { user: SidebarUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        }
      >
        <Avatar className="size-7">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">{user.name}</p>
          {user.email ? (
            <p className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </p>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/change-password" />}>
          <Settings aria-hidden="true" />
          Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          render={<form action={logoutAction} />}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}