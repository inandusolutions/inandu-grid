/*
 * Framework-agnostic types shared by the pure helpers in this folder.
 *
 * Nothing under `lib/core/` imports from `@angular/*` or from the two component files — the folder
 * is the reusable "brains" of the grid (sorting / filtering / formatting / parsing / aggregation /
 * export), consumable as-is from a non-Angular port. The Angular components re-export the pieces
 * that are part of the library's public API, so `public-api.ts` is unaffected by the split.
 */

/** How a column's raw cell value is interpreted and formatted. See `InanduColumnComponent.type`. */
export type InanduColumnType = 'string' | 'number' | 'boolean' | 'date';

/** Which side of the grid a `sticky="true"` column pins to. See `InanduColumnComponent.stickySide`. */
export type InanduColumnStickySide = 'left' | 'right';

/** Aggregate shown in a group's header row when the grid is grouped. See `InanduColumnComponent.aggregate`. */
export type InanduColumnAggregate = 'sum' | 'avg' | 'min' | 'max' | 'count' | '';

/** A grid row — a plain bag of field values. The grid never assumes any particular key. */
export type InanduGridRow = Record<string, unknown>;

/**
 * The subset of a column definition the pure helpers read, expressed as the signal-getter shape
 * `InanduColumnComponent` already exposes (so an `InanduColumnComponent` instance satisfies this
 * structurally, with no adapter). A non-Angular consumer can pass any object with these five
 * zero-arg accessors — e.g. `{ field: () => 'name', type: () => 'string', ... }`.
 */
export interface ColumnConfig {
  field(): string;
  type(): InanduColumnType;
  format(): string;
  order(): number | undefined;
  aggregate(): InanduColumnAggregate;
}

/** Raw values from a single column's filter controls; which keys are used depends on that column's `type`. */
export interface InanduGridColumnFilterValue {
  /** `'string'` columns. */
  text?: string;
  /** `'number'` columns. */
  min?: string;
  max?: string;
  /** `'date'` columns, `yyyy-mm-dd` (native `<input type="date">` value format). */
  from?: string;
  to?: string;
  /** `'boolean'` columns: `''` (no filter), `'true'`, or `'false'`. */
  bool?: string;
  /**
   * Excel-style "set filter" — an explicit list of the column's own *formatted* display values to
   * match (OR within the column, same as every other filter key combines with AND across
   * columns). Works the same regardless of `type` — unlike `text`/`min`/`max`/`from`/`to`/`bool`,
   * which are each specific to one `type` — since it compares against the already-formatted
   * string, not the raw value. Whenever this key is *present* (defined) at all, it takes over
   * matching for the column entirely and the type-specific keys above are ignored — including an
   * **empty array**, which means "every value unchecked" and matches nothing, not "no
   * constraint". Omit the key (or set it to `undefined`) for "no constraint" instead. See
   * `matchesColumnFilter`/`hasMeaningfulFilterValue`.
   */
  values?: string[];
}
