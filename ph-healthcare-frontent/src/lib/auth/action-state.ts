/**
 * The result shape every server action in the app returns.
 *
 * This lives outside `app/(auth)/actions.ts` for a specific reason: a module
 * marked `"use server"` may only export async functions, so the shared state type
 * and its idle value cannot live beside the actions that produce it. Client
 * components import from here; the actions import `ActionState` from here too, so
 * there is still exactly one definition.
 */

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export const INITIAL_ACTION_STATE: ActionState = { status: "idle" };

/** Narrows the union for a field-level error lookup. */
export function fieldErrorFor(
  state: ActionState,
  field: string,
): string | undefined {
  if (state.status !== "error") return undefined;
  return state.fieldErrors?.[field];
}