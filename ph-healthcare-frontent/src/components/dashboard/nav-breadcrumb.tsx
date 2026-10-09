"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

import { navBreadcrumbForPath } from "@/config/breadcrumbs";
import { ROLE_LABEL } from "@/config/navigation";
import type { RoleKey } from "@/generated/prisma/enums";

/**
 * Breadcrumb trail derived from the current pathname.
 *
 * The lookup table is generated from `config/navigation.ts`, so a new route only
 * has to be declared once. Unknown trailing segments fall back to a title-cased
 * version of the slug — a route that was added without a nav entry still gets a
 * sensible crumb rather than a blank one.
 */
export function NavBreadcrumb({
  role,
  className,
  dynamicLabel,
}: {
  role: RoleKey;
  className?: string;
  /** Label for the last crumb when it is a record id. */
  dynamicLabel?: string;
}) {
  const pathname = usePathname();
  const crumbs = navBreadcrumbForPath(role, pathname, dynamicLabel);

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1 text-sm">
        <li className="hidden sm:flex">
          <Link
            href={`/dashboard`}
            className="flex items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Home className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Dashboard home</span>
          </Link>
        </li>

        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <li className="flex items-center gap-1">
                {index > 0 ? (
                  <ChevronRight
                    className="hidden size-3.5 shrink-0 text-muted-foreground sm:block"
                    aria-hidden="true"
                  />
                ) : null}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hidden truncate rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:inline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className="truncate font-medium text-foreground"
                    // On mobile only the current page name is shown.
                    title={isLast ? crumb.label : undefined}
                  >
                    {isLast && crumbs.length > 1 && crumb.label !== ROLE_LABEL[role]
                      ? crumb.label
                      : crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
