"use client";

import { useSyncExternalStore } from "react";

/**
 * Tracks whether the viewport is below the mobile breakpoint.
 *
 * Rewritten from shadcn's `useEffect` + `useState` version to
 * `useSyncExternalStore`. The original calls `setState` inside an effect, which
 * means the first render always returns `false` and then immediately re-renders —
 * a cascading render the React Compiler lint rules correctly flag, and a brief
 * window where a desktop-only layout renders on a phone.
 *
 * `useSyncExternalStore` subscribes to `matchMedia` directly: the server snapshot
 * is `false`, the client snapshot is the real value, and React reconciles them
 * during hydration without an extra render pass.
 */
const MOBILE_BREAKPOINT = 768;

function subscribe(callback: () => void): () => void {
  const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** Server snapshot: never mobile, so the markup matches an unknown-width client. */
function getServerSnapshot(): boolean {
  return false;
}

function getSnapshot(): boolean {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
