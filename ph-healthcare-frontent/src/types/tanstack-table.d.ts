/**
 * Column metadata for our DataTable.
 *
 * `align` and `nowrap` are read by the table when rendering each head and cell,
 * which keeps per-column layout decisions in the column definition instead of
 * scattering utility classes through the render loop.
 *
 * Declared with a module augmentation rather than by widening ColumnDef, so
 * `meta` stays the documented extension point and column definitions written
 * elsewhere stay type-checked against it.
 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "center" | "right";
    nowrap?: boolean;
    /** Accessible name for a column whose header renders as an icon. */
    ariaLabel?: string;
  }
}

export {};
