import { ChangeDetectionStrategy, Component, ElementRef, TemplateRef, booleanAttribute, computed, contentChild, contentChildren, input, numberAttribute } from '@angular/core';
import type { InanduColumnAggregate, InanduColumnStickySide, InanduColumnType } from '../core/types';

// Re-exported for back-compat: these string-literal unions used to be declared here. They now live
// in ../core/types (framework-agnostic); public-api.ts still re-exports them from this module.
export type { InanduColumnType, InanduColumnStickySide, InanduColumnAggregate };

/**
 * Template context for a column's custom cell template (see `InanduColumnComponent.cellTemplate`):
 * `$implicit`/`value` is the cell's raw (unformatted) value, `row` is the full row object.
 */
export interface InanduCellTemplateContext {
  $implicit: unknown;
  row: Record<string, unknown>;
}

/**
 * Template context for a column's custom header template (see `InanduColumnComponent.headerTemplate`):
 * `$implicit`/`title` is the resolved display label (`title()` if set, else `field()` — the same
 * fallback the built-in plain-text header already uses), `field` is the raw field name.
 */
export interface InanduHeaderTemplateContext {
  $implicit: string;
  title: string;
  field: string;
}

/**
 * Custom per-column validation, run (alongside `required`/`min`/`max`/`pattern`) when a row-edit or
 * row-create draft is saved. `value` is that field's already-parsed value (a real `number`/`Date`/
 * `boolean`, per the column's `type`); `row` is every editable field's parsed value for the row
 * currently being saved (the original row for an edit, or the in-progress values for a new row —
 * there's no prior row to fall back to there). Return an error message to block the save, or `null`
 * if the value is valid.
 */
export type InanduColumnValidator = (value: unknown, row: Record<string, unknown>) => string | null;

/**
 * Async counterpart to `InanduColumnValidator` — for a check that can't be done synchronously (a
 * uniqueness check against a server, say). Same `(value, row)` arguments and same "return a message
 * to block, `null` to allow" contract, just wrapped in a `Promise`. Runs *after* every synchronous
 * rule (`required`/`min`/`max`/`pattern`/`validator`) has already passed for that field — a field
 * failing a sync rule never even calls its `asyncValidator`. See `InanduGridComponent.isValidating`
 * for how the grid surfaces a pending async check to the UI while `saveRow`/`saveNewRow` await it.
 */
export type InanduColumnAsyncValidator = (value: unknown, row: Record<string, unknown>) => Promise<string | null>;

function optionalNumberAttribute(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = numberAttribute(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

@Component({
    selector: 'inandu-column',
    templateUrl: './inandu-column.component.html',
    styleUrl: './inandu-column.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InanduColumnComponent {
  readonly title = input('');
  readonly field = input.required<string>();
  readonly width = input(0, { transform: numberAttribute });
  /** 0-based target position in the rendered grid. Columns without it render in declaration order, filling the remaining slots. */
  readonly order = input(undefined, { transform: optionalNumberAttribute });
  readonly sortable = input(false, { transform: booleanAttribute });

  /**
   * How to interpret and format `field`'s raw cell value. Defaults to `'string'` (no formatting;
   * the raw value is stringified as-is). `format`'s syntax depends on `type`:
   * - `'number'`: `format` is a `DecimalPipe`-style `digitsInfo` string,
   *   `'{minIntegerDigits}.{minFractionDigits}-{maxFractionDigits}'` — e.g. `format="1.2-2"` always
   *   shows exactly 2 decimals. Thousands/decimal separators follow the app's `LOCALE_ID`, not `format`.
   *   Omitting `format` falls back to Angular's own default digitsInfo (`'1.0-3'`).
   * - `'date'`: `format` is a case-*sensitive* token pattern using the field names from the ECMA-262
   *   Date Time String Format (https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format)
   *   — the same standard `Date.prototype.toISOString()`/`new Date(string)` follow — so `MM` (month)
   *   and `mm` (minutes) stay unambiguous: `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`, `sss` (literal
   *   characters like `/`, `-`, `:`, `T` pass through unchanged) — e.g. `format="DD/MM/YYYY"` →
   *   "31/12/2025", `format="YYYY-MM-DDTHH:mm:ss"` → "2025-12-31T23:59:00". Defaults to `'YYYY-MM-DD'`
   *   (that same standard's date-only profile). The raw value may be a `Date`, an ISO string, or a timestamp.
   * - `'boolean'`: `format` is `'<truthyLabel>|<falsyLabel>'` — e.g. `format="Sí|No"`. Defaults to `'true|false'`.
   */
  readonly type = input<InanduColumnType>('string');
  readonly format = input('');

  /**
   * Enables a per-column filter control in the grid header (`filter="yes"` — anything but the
   * literal string `"false"` counts as enabled, same as `sortable`). The control shown depends on
   * `type`: a text box for `'string'`, min/max number boxes for `'number'`, from/to date pickers
   * for `'date'`, and an all/true/false dropdown (using `format`'s labels) for `'boolean'`. Several
   * columns can have `filter="yes"` at once — their filters combine (AND).
   */
  readonly filter = input(false, { transform: booleanAttribute });

  /**
   * Makes this column's header draggable onto the grid's "group by" drop zone (`groupable="true"`,
   * same `booleanAttribute` transform as `sortable`/`filter`). Dropping it there groups all rows by
   * this column's *formatted* value; dropping a different groupable column's header switches to
   * grouping by that one instead. The drop zone itself only appears when at least one column has
   * `groupable="true"`.
   */
  readonly groupable = input(false, { transform: booleanAttribute });

  /**
   * Lets the user drag this column wider/narrower from a handle at the right edge of its header,
   * overriding the initial `width` value. Enabled by default for every column — opt out with
   * `resize="false"` (same `booleanAttribute` transform as `sortable`/`filter`/`groupable`, but
   * inverted: anything but the literal string `"false"` stays enabled).
   */
  readonly resize = input(true, { transform: booleanAttribute });

  /**
   * Lets the user drag this column's header to move it to a different position, overriding the
   * initial declaration/`order` placement. Enabled by default for every column — opt out with
   * `reorder="false"` (same inverted `booleanAttribute` transform as `resize`) to pin a column in
   * place; other columns can still be dropped next to it, they just can't pick *it* up to move it.
   */
  readonly reorder = input(true, { transform: booleanAttribute });

  /**
   * Whether this column can be hidden via the grid's column-visibility toggle popup (see
   * `InanduGridComponent.columnToggle`). Enabled by default for every column, like `resize`/`reorder` —
   * opt out with `hideable="false"` (same inverted `booleanAttribute` transform) so a column that
   * should always stay on screen (e.g. an id column) never appears in that popup's checkbox list and
   * can never be hidden. Has no effect at all unless the grid itself has `columnToggle="true"`.
   */
  readonly hideable = input(true, { transform: booleanAttribute });

  /**
   * Pins this column to the left edge so it stays visible while the grid scrolls horizontally
   * (`sticky="true"`, same `booleanAttribute` transform as `sortable`/`filter`/`groupable`). Off by
   * default — unlike `resize`/`reorder`, this is an opt-in visual choice, not a default-on
   * convenience. Several columns can be sticky at once; they stack left-to-right in whatever order
   * they render in (after the selection checkbox column, if `selectable` is on). For predictable
   * results, sticky columns should form a contiguous run starting from the first column — sticking
   * one out of that leading run works, but can visually overlap non-sticky columns ahead of it
   * while scrolling, since CSS `position: sticky` doesn't know about the other column's layout.
   */
  readonly sticky = input(false, { transform: booleanAttribute });

  /**
   * Includes this column among the fields shown as editable controls when its row is put into edit
   * mode (`editable="true"`, same `booleanAttribute` transform as `sortable`/`filter`/`groupable`).
   * Editing itself is per-*row*, not per-cell: as soon as at least one column is `editable`, every
   * row gets a trailing "Edit" button (see `InanduGridComponent.editableColumns`); clicking it switches
   * every editable field *in that row* into a type-aware control at once — a text `<input>` for
   * `'string'`, `type="number"` for `'number'`, `type="date"` for `'date'`, a checkbox for
   * `'boolean'` — seeded from the cell's **raw** value, not its formatted display string (so e.g. a
   * `format="1.2-2"` numeric column edits the actual number, not `"1,234.50"`), and the button
   * itself is replaced by "Save"/"Cancel". **The grid never writes the edit back into `data()`
   * itself** — "Save" emits `InanduGridComponent.rowSave` with the row and every editable field's new
   * value, and it's up to the consumer to decide whether/how to persist it (see the `inandu-grid`
   * library's `InanduGridRowSave` type); "Cancel" just discards the in-progress edits.
   */
  readonly editable = input(false, { transform: booleanAttribute });

  /**
   * Requires this field to have a value before a row-edit or row-create draft can be saved
   * (`required="true"`, same `booleanAttribute` transform as `sortable`/`filter`/`groupable`). An
   * empty text/number/date control fails; a checkbox (`type="boolean"`) is never considered empty,
   * so `required` has no effect on `'boolean'` columns. Checked at Save time only (see
   * `InanduGridComponent.saveRow`/`saveNewRow`) — a failing field blocks the save, shows its message
   * inline, and leaves the row in edit/create mode rather than discarding the draft.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /** Inclusive lower bound checked at Save time for a `type="number"` column's parsed value. Ignored for other types. */
  readonly min = input(undefined, { transform: optionalNumberAttribute });

  /** Inclusive upper bound checked at Save time for a `type="number"` column's parsed value. Ignored for other types. */
  readonly max = input(undefined, { transform: optionalNumberAttribute });

  /**
   * A `RegExp` source string checked against the field's raw (unparsed) text at Save time — e.g.
   * `pattern="^[A-Z]{2}\d{4}$"`. Only applied when the draft holds a non-empty string, so it's a
   * no-op for an empty/untouched field (pair with `required` to also forbid that) and for
   * `'boolean'` columns (whose draft value is never a string).
   */
  readonly pattern = input('');

  /**
   * Custom validation beyond `required`/`min`/`max`/`pattern` — see `InanduColumnValidator`. Bind it as a
   * property (`[validator]="myFn"`), not a plain attribute. Runs last, after every built-in rule has
   * already passed for this field.
   */
  readonly validator = input<InanduColumnValidator | undefined>(undefined);

  /**
   * Async custom validation beyond `required`/`min`/`max`/`pattern`/`validator` — see
   * `InanduColumnAsyncValidator`. Bind it as a property (`[asyncValidator]="myFn"`), not a plain
   * attribute. Runs last of all, only once every synchronous rule (including `validator`) has
   * already passed for this field; while it's pending, `InanduGridComponent.isValidating()` is
   * `true` and the row's Save/Cancel buttons disable.
   */
  readonly asyncValidator = input<InanduColumnAsyncValidator | undefined>(undefined);

  /**
   * Which edge this column pins to when `sticky="true"` — `'left'` (the default) stacks after the
   * select-checkbox column and any earlier left-sticky columns; `'right'` stacks from the right edge
   * of the data columns instead, after any later right-sticky columns. Has no effect when `sticky`
   * is off.
   */
  readonly stickySide = input<InanduColumnStickySide>('left');

  /**
   * When the grid is grouped (see `InanduGridComponent`'s group-by), shows this aggregate of the
   * column's raw values next to that group's header — `'sum'`/`'avg'`/`'min'`/`'max'` (numeric
   * columns only; non-numeric/unparseable values are skipped) or `'count'` (any column type, counts
   * every row in the group). Unset (the default) shows nothing. Has no effect while ungrouped.
   */
  readonly aggregate = input<InanduColumnAggregate>('');

  /**
   * Every `<ng-template>` declared as this column's content, and (index-aligned, same document
   * order) each one's own anchor `ElementRef` — together, used internally to tell `cellTemplate()`
   * apart from `headerTemplate()` when both are declared on the same column (see `headerTemplate`'s
   * doc comment for why a plain unqualified `contentChild(TemplateRef)` alone can't do that safely).
   * Matched up via `.nativeElement` (a real, stable DOM comment-node reference for an `<ng-template>`)
   * rather than by comparing `TemplateRef` instances directly — empirically, two *separately*
   * resolved content queries against the very same `<ng-template>` (one by name, one unqualified by
   * type) can return `TemplateRef` wrapper objects that are `!==` each other despite representing the
   * same template, making that comparison unreliable; the underlying DOM node doesn't have that problem.
   */
  private readonly allTemplateRefs = contentChildren(TemplateRef);
  private readonly allTemplateAnchors = contentChildren(TemplateRef, { read: ElementRef });

  /**
   * Custom header content for this column, in place of the plain `title()`/`field()` text — declare
   * a `<ng-template #inanduHeaderTemplate>…</ng-template>` (that exact template reference variable
   * name is required) as this column's content, alongside (in either order) an optional `cellTemplate`.
   * `$implicit`/`title` is the resolved display label, `field` the raw field name — see
   * `InanduHeaderTemplateContext`. Only affects the header `<th>`'s text; sort/filter/resize controls
   * next to it are unaffected.
   */
  private readonly headerAnchor = contentChild('inanduHeaderTemplate', { read: ElementRef });

  /** This column's index into `allTemplateRefs()`/`allTemplateAnchors()` that `headerAnchor()` points at, or `-1` if there's no header template. */
  private readonly headerTemplateIndex = computed(() => {
    const anchor = this.headerAnchor();
    return anchor ? this.allTemplateAnchors().findIndex(candidate => candidate.nativeElement === anchor.nativeElement) : -1;
  });

  readonly headerTemplate = computed(() => {
    const index = this.headerTemplateIndex();
    return index === -1 ? undefined : (this.allTemplateRefs()[index] as TemplateRef<InanduHeaderTemplateContext>);
  });

  /**
   * Custom rendering for this column's cells, in place of the built-in `type`/`format` formatting —
   * declare a plain `<ng-template let-value let-row="row">…</ng-template>` as this column's content.
   * `let-value` (the template's `$implicit`) is the cell's raw value; `let-row="row"` is the full row
   * object, for cross-field rendering (e.g. a link built from another field). Only affects the
   * *display* (non-edit) rendering of a cell — a row in edit/create mode still shows the normal
   * type-aware input control for an `editable` column, regardless of `cellTemplate`.
   *
   * Resolved as "whichever declared `<ng-template>` isn't at `headerTemplateIndex()`" rather than a
   * second, separately-named `contentChild` query — a plain unqualified `contentChild(TemplateRef)`
   * matches *any* `<ng-template>` regardless of its own reference-variable name, so if `headerTemplate`
   * were simply left alongside the original unqualified query, a column declaring *only* a header
   * template (no cell template at all) would have that same query mistakenly resolve to the header
   * template, silently misrendering every cell in that column. This sidesteps that: with just a cell
   * template, behavior is unchanged from before `headerTemplate` existed (`headerTemplateIndex()` is
   * `-1`, so nothing is excluded); with just a header template, `cellTemplate()` correctly comes back
   * `undefined`.
   */
  readonly cellTemplate = computed(() => {
    const headerIndex = this.headerTemplateIndex();
    return this.allTemplateRefs().find((_, index) => index !== headerIndex) as TemplateRef<InanduCellTemplateContext> | undefined;
  });
}
