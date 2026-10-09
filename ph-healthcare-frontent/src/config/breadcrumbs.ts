import type { RoleKey } from "@/generated/prisma/enums";
import { NAV, ROLE_HOME } from "@/config/navigation";

/**
 * Breadcrumb resolution, extracted from `navigation.ts` so the client component
 * that renders the trail can import it without pulling the whole navigation
 * config — which imports Lucide icon modules — into a Server Component boundary.
 *
 * `NAV` is data-only as far as this file is concerned; the icons are only
 * dereferenced when a component actually renders an item.
 */

export type Crumb = { label: string; href?: string };

export function navBreadcrumbForPath(
  role: RoleKey,
  pathname: string,
  dynamicLabel?: string,
): Crumb[] {
  const groups = NAV[role] ?? [];
  const items = groups.flatMap((group) => group.items);

  const home = ROLE_HOME[role];

  // Longest matching href wins, so /admin/patients/[id] reports the Patients
  // section rather than the Dashboard.
  const match = [...items]
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  const crumbs: Crumb[] = [{ label: "Overview", href: home }];

  if (!match) return crumbs;

  if (match.href !== home) {
    crumbs.push({ label: match.label, href: match.href });
  }

  const remainder = pathname.slice(match.href.length).replace(/^\//, "");
  if (remainder) {
    crumbs.push({ label: dynamicLabel ?? titleFromSlug(remainder) });
  }

  return crumbs;
}

function titleFromSlug(slug: string): string {
  const last = slug.split("/").pop() ?? slug;
  return last
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .slice(0, 60);
}
