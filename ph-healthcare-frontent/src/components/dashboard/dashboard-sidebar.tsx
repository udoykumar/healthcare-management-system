"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Pill,
  Receipt,
  Settings,
  ShieldCheck,
  Stethoscope,
  Sun,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NAV, ROLE_LABEL, type NavItem } from "@/config/navigation";
import type { RoleKey } from "@/generated/prisma/enums";
import { initials } from "@/lib/utils/format";
import { logoutAction } from "@/app/(auth)/actions";

export type SidebarUser = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  role: RoleKey;
  healthcareCenterName: string | null;
};

/**
 * The dashboard sidebar.
 *
 * Filters the navigation table by the user's permissions and highlights the
 * active route. The filtering is duplicated on the server in each page's guard —
 * that is intentional, not duplication to clean up: hiding a link the user cannot
 * follow improves the interface, and refusing the request protects the data. They
 * answer different questions.
 */
export function DashboardSidebar({
  user,
  permissions,
  isSuperuser,
  unreadNotifications = 0,
  ...props
}: {
  user: SidebarUser;
  permissions: ReadonlySet<string>;
  isSuperuser: boolean;
  unreadNotifications?: number;
} & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const groups = NAV[user.role] ?? [];

  const canSee = (item: NavItem) => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    if (!item.permission) return true;
    return isSuperuser || permissions.has(item.permission);
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Activity className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">PH Healthcare</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.healthcareCenterName ?? "Platform"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => {
          const items = group.items.filter(canSee);
          if (items.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      // A parent is active while the user is on a child route.
                      (pathname.startsWith(`${item.href}/`) &&
                        !group.items.some(
                          (other) => other.href !== item.href && pathname.startsWith(`${other.href}/`),
                        ));

                    const badgeCount =
                      item.badge === "notifications" ? unreadNotifications : 0;

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.label}
                          render={<Link href={item.href} />}
                        >
                          <item.icon aria-hidden="true" />
                          <span>{item.label}</span>
                          {badgeCount > 0 ? (
                            <Badge
                              variant="secondary"
                              className="ml-auto h-5 min-w-5 justify-center px-1 text-xs tabular-nums"
                            >
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </Badge>
                          ) : null}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function UserMenu({ user }: { user: SidebarUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
          />
        }
      >
        <Avatar className="size-8 shrink-0 rounded-lg">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback className="rounded-lg text-xs">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {ROLE_LABEL[user.role]}
          </p>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.name}</p>
          {user.email ? (
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard/patient/profile" />}>
          <UserRound aria-hidden="true" />
          My profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/change-password" />}>
          <ShieldCheck aria-hidden="true" />
          Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          // Sign-out is a form POST rather than a link: it mutates server state,
          // and a GET link would be prefetchable and CSRF-able.
          render={<form action={logoutAction} />}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Icons re-exported so the shell can render them without a second import. */
export {
  Bell,
  Building2,
  CreditCard,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Monitor,
  Moon,
  Pill,
  Receipt,
  Settings,
  Stethoscope,
  Sun,
  UserCog,
  Users,
};