"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";

/**
 * Light / dark / system switch (§32).
 *
 * Rendered as three explicit buttons rather than a single cycling icon: the
 * current choice is visible without clicking, and each option is reachable by name
 * for a screen reader. With three options, cycling through one button is genuinely
 * hard to use.
 *
 * Until mounted, nothing renders: `next-themes` cannot know the OS preference on
 * the server, so painting a sun icon that is about to become a moon is a visible
 * flash and a hydration mismatch.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  /*
   * `next-themes` cannot know the OS preference during SSR, so it renders no
   * theme value at all. Rendering a sun icon that becomes a moon causes a visible
   * flash and a hydration mismatch.
   *
   * Rather than the usual `useEffect(() => setMounted(true), [])` — which sets
   * state in an effect and so triggers a cascading render — this uses
   * useSyncExternalStore with a no-op subscription. `false` on the server, `true`
   * once hydrated, reconciled without an extra pass.
   */
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted) {
    return <div className="h-9 w-28" aria-hidden="true" />;
  }

  const options = [
    { value: "light", label: "Light theme", icon: Sun },
    { value: "dark", label: "Dark theme", icon: Moon },
    { value: "system", label: "Match system theme", icon: Monitor },
  ] as const;

  return (
    <ButtonGroup className="hidden sm:flex" aria-label="Colour theme">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;

        return (
          <Button
            key={option.value}
            variant={isActive ? "secondary" : "ghost"}
            size="icon"
            className="size-8 border-l-0 first:border-l"
            aria-label={option.label}
            aria-pressed={isActive}
            title={option.label}
            onClick={() => setTheme(option.value)}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </Button>
        );
      })}
    </ButtonGroup>
  );
}
