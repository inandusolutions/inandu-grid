import { booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChild, contentChildren, effect, ElementRef, HostListener, inject, input, LOCALE_ID, numberAttribute, output, signal, TemplateRef, untracked, viewChildren } from '@angular/core';
import { formatNumber, NgTemplateOutlet } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { provideChildTranslateService, TranslateService } from '@ngx-translate/core';
import { InanduCellTemplateContext, InanduColumnComponent, InanduHeaderTemplateContext } from '../inandu-column/inandu-column.component';
import type { InanduColumnAsyncValidator, InanduColumnStickySide } from '../inandu-column/inandu-column.component';
import { registerInanduGridTranslations, resolveInanduGridLang } from '../i18n/inandu-grid-translations';
// The grid's pure logic (sorting / filtering / formatting / parsing / aggregation / export) lives
// in ../core now — framework-agnostic, no `@angular/*` dependency, reusable as-is by a non-Angular
// port. This component is the Angular binding layer over it.
import {
  AGGREGATE_SYMBOLS,
  MIN_COLUMN_WIDTH,
  ROW_DRAG_COLUMN_WIDTH,
  SELECT_COLUMN_WIDTH,
  STATE_STORAGE_PREFIX,
  coerceToDate,
  compareCellValues,
  computeGroupAggregates,
  downloadBlob,
  escapeCsvValue,
  escapeMarkup,
  formatCellValue,
  hasMeaningfulFilterValue,
  matchesColumnFilter,
  parseDraftValue,
  parsePastedCellValue,
  placeColumnsByOrder,
  truncatePdfText,
} from '../core';
import type { InanduGridColumnFilterValue, InanduGridRow, NumberFormatter } from '../core';

export type SortDirection = 'asc' | 'desc';

// `InanduGridRow` and `InanduGridColumnFilterValue` moved to ../core; re-exported here because
// `public-api.ts` re-exports them from this module (keeping the library's public API unchanged).
export type { InanduGridRow, InanduGridColumnFilterValue };

/** One entry of the grid's active multi-column sort (see `InanduGridComponent.sortChange`), in priority order (index 0 sorts first). */
export interface InanduGridSortCriterion {
  field: string;
  direction: SortDirection;
}

/** Emitted by `InanduGridComponent.pageChange` — only while `serverSide()` is on. */
export interface InanduGridPageState {
  page: number;
  pageSize: number;
}

/** Emitted by `InanduGridComponent.filterChange` — only while `serverSide()` is on. */
export interface InanduGridFilterState {
  query: string;
  columnFilters: Record<string, InanduGridColumnFilterValue>;
}

/** Shape of the `customTranslations` input — language code to a partial `{ MsgKey: 'text' }` override dictionary. See `InanduGridComponent.customTranslations`. */
export type InanduGridCustomTranslations = Record<string, Record<string, string>>;

/** Template context for `InanduGridComponent.rowActionsTemplate` — `$implicit`/`row` is the row that trailing actions cell belongs to. */
export interface InanduRowActionsContext<T extends InanduGridRow = InanduGridRow> {
  $implicit: T;
  row: T;
}

/** One entry of `InanduGridComponent.virtualItems()` — see its doc comment. Internal only, not part of the public API. */
type VirtualRowItem<T extends InanduGridRow = InanduGridRow> =
  | { kind: 'group'; key: string; column: InanduColumnComponent; count: number; aggregates: Record<string, number> }
  | { kind: 'row'; row: T; indexInGroup: number };

/** Same coercion `InanduColumnComponent.order`/`min`/`max` use — `''`/`null`/`undefined`/unparseable all become `undefined` rather than `NaN`. */
function optionalNumberAttribute(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = numberAttribute(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Configuration object for the `paging` input. Pagination is off (all rows render) when `paging`
 * is not bound at all — passing an (even empty) object turns it on.
 */
export interface InanduGridPagingOptions {
  /** Rows per page. Defaults to `10`. */
  pageSize?: number;
  /** Individually show/hide each navigation button. All default to `true`. */
  showFirstButton?: boolean;
  showPreviousButton?: boolean;
  showNextButton?: boolean;
  showLastButton?: boolean;
  /** Button label overrides — default to `«`/`‹`/`›`/`»`. */
  firstLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  lastLabel?: string;
  /** Builds the page-indicator text. Defaults to the resolved `lang`'s translated `MsgPageOf` message. */
  pageLabel?: (page: number, totalPages: number) => string;
}

/**
 * Emitted by `InanduGridComponent.rowSave` when a row's "Save" button (see `InanduColumnComponent.editable`)
 * is clicked. `row` is the exact object reference from `data()` — the grid itself never mutates it;
 * `values` holds every editable column's committed value for that row, keyed by field. Persisting
 * the change (in `data()`, to a server, both, or neither) is entirely up to whoever handles this event.
 *
 * Generic over the same row type `T` the emitting `<inandu-grid>` was bound with (defaulting to the
 * untyped `InanduGridRow` for a grid that wasn't given a more specific one) — `values` is typed
 * `Partial<T>`, but note this is a **cast, not a verified guarantee**: fields are declared as plain
 * `field="..."` strings on `<inandu-column>`, so there's no way for the grid to statically prove a
 * parsed value actually belongs to `T` at that key. Treat it as documentation of intent, not a runtime check.
 */
export interface InanduGridRowSave<T extends InanduGridRow = InanduGridRow> {
  row: T;
  values: Partial<T>;
}

/**
 * Emitted by `InanduGridComponent.rowCreate` when a new row's "Save" button (see `creatable`) succeeds —
 * every editable field's parsed value, keyed by field. There's no row reference to pair it with,
 * unlike `InanduGridRowSave`: the row doesn't exist in `data()` yet, that's exactly what this event is for.
 * Same `Partial<T>`-is-a-cast caveat as `InanduGridRowSave.values` applies here too.
 */
export type InanduGridNewRowValues<T extends InanduGridRow = InanduGridRow> = Partial<T>;

/** One cell of a `Ctrl+V` paste — see `InanduGridComponent.clipboard`/`pasteAt()`. `value` is already parsed per that column's `type()`. */
export interface InanduGridCellPaste<T extends InanduGridRow = InanduGridRow> {
  row: T;
  field: string;
  value: unknown;
}

/** The currently selected cell range — see `InanduGridComponent.cellRangeSelection`/`cellRangeChange`. `rows`/`fields` are the full row objects and field names spanning the selected rectangle, in `pagedData()`/`visibleColumns()` order. */
export interface InanduGridCellRangeSelection<T extends InanduGridRow = InanduGridRow> {
  rows: T[];
  fields: string[];
}

/** Emitted by `InanduGridComponent.loadMore` — see `infiniteScroll`. `loadedCount` is `data().length` at the moment of the request, i.e. the offset the consumer's next fetch should start from. */
export interface InanduGridLoadMoreEvent {
  loadedCount: number;
}

@Component({
    selector: 'inandu-grid',
    templateUrl: './inandu-grid.component.html',
    styleUrl: './inandu-grid.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgTemplateOutlet, ScrollingModule],
    // A dedicated, isolated TranslateService per grid instance — required so two <inandu-grid>s on
    // the same page can each show a different `lang` simultaneously, and so this library never
    // touches (or depends on) any TranslateService the host app might have of its own.
    providers: [provideChildTranslateService()],
})
/**
 * Generic over `T`, the row type — inferred automatically from whatever's bound to `[data]` (Angular
 * infers a generic component's type parameters from its input bindings under `strictTemplates`, the
 * same mechanism `*ngFor`'s item type inference already relies on), so `<inandu-grid [data]="rows">`
 * with `rows: Customer[]` types every row-bearing output (`selectionChange`, `rowSave`, `rowDelete`,
 * `rowsDelete`, `rowCreate`) as `Customer` instead of the untyped default `InanduGridRow`
 * (`Record<string, unknown>`) — no breaking change for existing usage, which just leaves `T` at that
 * default. **This does not extend to per-column type-checking**: `<inandu-column field="...">`
 * declares its field as a plain string, and `InanduColumnComponent` has no way to receive the
 * parent grid's `T` (Angular has no mechanism to propagate a generic type parameter into
 * content-projected children — they're resolved by `contentChildren` as ordinary, independently-typed
 * component instances) — so a typo'd `field` name is still only ever caught at runtime, never by the
 * compiler, regardless of how precisely `T` is typed.
 */
export class InanduGridComponent<T extends InanduGridRow = InanduGridRow> {
  readonly width = input(0, { transform: numberAttribute });
  readonly height = input(0, { transform: numberAttribute });
  readonly id = input('');
  readonly data = input<T[]>([]);

  /**
   * Opts the grid out of local sort/filter/pagination entirely: `data()` is trusted to already be
   * the current page's rows, already sorted/filtered by the consumer. Instead of computing results
   * itself, the grid emits `sortChange`/`filterChange`/`pageChange` whenever the user interacts with
   * the corresponding controls (including once on load, so a consumer can drive its very first
   * fetch from these events) and leaves fetching/slicing entirely up to whoever handles them. Pair
   * with `totalItems` so the pager can compute a correct page count from a total the grid itself has
   * no way to know (it only ever sees one page's worth of rows in `data()`).
   */
  readonly serverSide = input(false, { transform: booleanAttribute });

  /** Total row count across every page — only consulted while `serverSide()` is on, where `data().length` is just the current page's size. Falls back to `data().length` when unset. */
  readonly totalItems = input<number | undefined>(undefined, { transform: optionalNumberAttribute });

  /**
   * When set, persists this grid's column widths/order/visibility, sort, and filters to
   * `localStorage` (keyed by this string) and restores them the next time a grid with the same
   * `stateKey` mounts — e.g. across a page reload, or navigating away and back. Unset (the default)
   * means no persistence at all; every grid without a `stateKey` starts fresh every time, as before.
   * Give two different `<inandu-grid>`s distinct keys, or they'll overwrite each other's saved state.
   */
  readonly stateKey = input('');

  /**
   * Shows a loading row in place of the data rows (and disables the export/print toolbar) while
   * `true` — for a grid whose `data()` is still being fetched. Doesn't affect `filteredData()`/
   * `sortedData()`/pagination math, only what actually renders in `<tbody>`.
   */
  readonly loading = input(false, { transform: booleanAttribute });

  /**
   * Shows this message in place of the data rows (and disables the export/print toolbar) instead of
   * the loading row or the normal data/empty rendering, when non-empty — for a grid whose last fetch
   * failed. Like `deleteConfirmMessage`/a `validator`'s message, this is shown verbatim: the consumer
   * is responsible for translating it themselves if needed. Takes priority over `loading()` if both
   * are somehow set at once.
   */
  readonly error = input('');

  /** Emitted whenever the active multi-column sort changes — only while `serverSide()` is on. Empty array means "no sort". */
  readonly sortChange = output<InanduGridSortCriterion[]>();
  /** Emitted whenever the requested page/page size changes — only while `serverSide()` is on. */
  readonly pageChange = output<InanduGridPageState>();
  /** Emitted whenever the free-text search or a column filter changes — only while `serverSide()` is on. */
  readonly filterChange = output<InanduGridFilterState>();

  /** Guards the one-time `stateKey`-based restore effect in the constructor against re-running. */
  private hasRestoredState = false;

  /** Everything persisted under `stateKey` — column widths/order/visibility/pin, sort, and filters. */
  private readonly persistableState = computed(() => ({
    columnWidths: this.columnWidths(),
    reorderedFields: this.reorderedFields(),
    hiddenFields: Array.from(this.hiddenFields()),
    pinnedOverrides: this.pinnedOverrides(),
    sortCriteria: this.sortCriteria(),
    filterQuery: this.filterQuery(),
    columnFilters: this.columnFilters(),
  }));

  /** Best-effort restore of a previously-persisted state blob for `key` — silently does nothing if there's none, it's unparseable, or `localStorage` itself throws. */
  private restorePersistedState(key: string): void {
    if (!key) {
      return;
    }
    try {
      const raw = localStorage.getItem(STATE_STORAGE_PREFIX + key);
      if (!raw) {
        return;
      }
      const state = JSON.parse(raw) as Partial<{
        columnWidths: Record<string, number>;
        reorderedFields: string[];
        hiddenFields: string[];
        pinnedOverrides: Record<string, InanduColumnStickySide | 'none'>;
        sortCriteria: InanduGridSortCriterion[];
        filterQuery: string;
        columnFilters: Record<string, InanduGridColumnFilterValue>;
      }>;
      if (state.columnWidths) {
        this.columnWidths.set(state.columnWidths);
      }
      if (state.reorderedFields) {
        this.reorderedFields.set(state.reorderedFields);
      }
      if (Array.isArray(state.hiddenFields)) {
        this.hiddenFields.set(new Set(state.hiddenFields));
      }
      if (state.pinnedOverrides) {
        this.pinnedOverrides.set(state.pinnedOverrides);
      }
      if (Array.isArray(state.sortCriteria)) {
        this.sortCriteria.set(state.sortCriteria);
      }
      if (typeof state.filterQuery === 'string') {
        this.filterQuery.set(state.filterQuery);
      }
      if (state.columnFilters) {
        this.columnFilters.set(state.columnFilters);
      }
    } catch {
      // Corrupt/stale persisted state (or no localStorage access) — start fresh instead of throwing.
    }
  }

  /**
   * Opt-in visual preset, applied as an `inandu-theme-{theme}` class on the grid's root element —
   * e.g. `theme="material"` → `inandu-theme-material`. Purely a CSS class hook; it does not add a
   * dependency on `@angular/material` or any other library. Omit `theme` for the unstyled default
   * look. Built into `inandu-grid.component.less`: `'material'` (a Material Design-*flavored* look —
   * colored header, elevation, rounded pager buttons — achieved with plain CSS, not actual
   * `@angular/material` components), `'dark'`, and `'minimal'` (borderless, quiet). Any other
   * string also works — it just needs a matching `.inandu-theme-<name>` rule supplied by the
   * consuming app's own stylesheet, the same styling hook `inandu-grid`/`inandu-column`/`inandu-row`
   * already provide.
   */
  readonly theme = input('');

  readonly rootClasses = computed(() => {
    const classes = ['inandu', 'inandu-grid'];
    const theme = this.theme();
    if (theme) {
      classes.push(`inandu-theme-${theme}`);
    }
    return classes.join(' ');
  });

  /**
   * BCP 47 language tag (e.g. `"es-AR"`, `"fr-FR"`) selecting the built-in translations for this
   * grid's own text (the empty-state message, pager button aria-labels/default page-indicator
   * text, and sort-button aria-labels). Only the primary subtag is matched, so `"es-AR"` and
   * `"es-ES"` resolve identically. When omitted, falls back to the browser's own language
   * (via `TranslateService.getBrowserLang()`); when that's unset/unsupported too, falls back to
   * English. Currently built in: English (`en`), Spanish (`es`), French (`fr`), Italian (`it`),
   * Mandarin (`zh`) — any other language resolves to English. Translated via `@ngx-translate/core`;
   * the per-language message dictionaries live in `../i18n/*.ts`, keys prefixed `Msg`.
   */
  readonly lang = input('');

  /**
   * Text/layout direction — `'ltr'` (default), `'rtl'`, or `'auto'` (the browser's own bidi
   * heuristic, based on the first strongly-directional character it finds in the grid's content).
   * Rendered as a plain `[attr.dir]` on the root `<div>`, so it composes with `lang()` rather than
   * replacing it — e.g. `lang="ar"` alone still renders left-to-right unless `dir="rtl"` is also set,
   * matching how plain HTML `dir`/`lang` attributes already behave independently of each other.
   *
   * Table cell/toolbar/footer alignment throughout `inandu-grid.component.less` is written with CSS
   * logical properties (`text-align: start`/`end`, `margin-inline-start`, `inset-inline-end`, …)
   * rather than physical `left`/`right`, so **static** layout mirrors automatically once `dir="rtl"`
   * is set — no JS involved for those. The handful of genuinely **JS-computed** inline offsets
   * (`stickyOffset()`/`stickyOffsetRight()`, bound in the template to `inset-inline-start`/
   * `inset-inline-end` rather than `left`/`right`) mirror the same way, for the same reason: the
   * *number* stays exactly what it always was ("distance from this row's leading/trailing edge"),
   * only the CSS property it's assigned to already knows which physical side that is. The one thing
   * that doesn't flip via pure CSS is the pager's four built-in chevron icons (a physical left-/
   * right-pointing SVG mask each) — those are explicitly mirrored via a `.inandu[dir="rtl"] { transform:
   * scaleX(-1) }` rule in the stylesheet instead. A consumer-supplied `firstLabel`/`previousLabel`/
   * `nextLabel`/`lastLabel` string replaces the icon entirely and is never mirrored — same as it's
   * never translated (see `InanduGridPagingOptions`), it's opaque content the consumer typed.
   */
  readonly dir = input<'ltr' | 'rtl' | 'auto'>('ltr');

  /**
   * Overrides/extends this grid's own built-in messages — a map of language code to a partial
   * `{ MsgKey: 'text' }` dictionary, e.g. `{ en: { MsgNoData: 'Nothing to show' }, es: { MsgNoData:
   * 'Nada para mostrar' } }`. Merged on top of the built-in dictionary for that language (only the
   * keys present in `customTranslations()` change; every other message keeps its built-in text) via
   * `TranslateService.setTranslation(lang, messages, true)` — the same instance-scoped service
   * `registerInanduGridTranslations()` already populates, so this doesn't touch any translations a
   * host app's own `TranslateService` might have. A language not already one of the 5 built-in ones
   * (`en`/`es`/`fr`/`it`/`zh`) still works as a brand-new entry, as long as `lang()` is then set to
   * select it — this is the only way to add a *new* language, since there's no public "bring your
   * own full dictionary from scratch" API beyond this merge. **Additive only**: re-applied whenever
   * this input's value changes, but a key removed from a later value stays overridden by whatever
   * was applied previously — set the same key back to the built-in text explicitly to revert it.
   */
  readonly customTranslations = input<InanduGridCustomTranslations | undefined>(undefined);

  private readonly translate = inject(TranslateService);
  readonly resolvedLang = computed(() => resolveInanduGridLang(this.lang(), this.translate));

  readonly msgNoData = this.translate.translate('MsgNoData', undefined, this.resolvedLang);
  readonly msgFirstPage = this.translate.translate('MsgFirstPage', undefined, this.resolvedLang);
  readonly msgPreviousPage = this.translate.translate('MsgPreviousPage', undefined, this.resolvedLang);
  readonly msgNextPage = this.translate.translate('MsgNextPage', undefined, this.resolvedLang);
  readonly msgLastPage = this.translate.translate('MsgLastPage', undefined, this.resolvedLang);
  readonly msgFilterPlaceholder = this.translate.translate('MsgFilterPlaceholder', undefined, this.resolvedLang);
  readonly msgFilterMin = this.translate.translate('MsgFilterMin', undefined, this.resolvedLang);
  readonly msgFilterMax = this.translate.translate('MsgFilterMax', undefined, this.resolvedLang);
  readonly msgFilterFrom = this.translate.translate('MsgFilterFrom', undefined, this.resolvedLang);
  readonly msgFilterTo = this.translate.translate('MsgFilterTo', undefined, this.resolvedLang);
  readonly msgAll = this.translate.translate('MsgAll', undefined, this.resolvedLang);
  readonly msgCancelFilter = this.translate.translate('MsgCancelFilter', undefined, this.resolvedLang);
  readonly msgCancelAllFilters = this.translate.translate('MsgCancelAllFilters', undefined, this.resolvedLang);
  readonly msgGroupByHint = this.translate.translate('MsgGroupByHint', undefined, this.resolvedLang);
  readonly msgCancelGrouping = this.translate.translate('MsgCancelGrouping', undefined, this.resolvedLang);
  readonly msgSelectAll = this.translate.translate('MsgSelectAll', undefined, this.resolvedLang);
  readonly msgExportCsv = this.translate.translate('MsgExportCsv', undefined, this.resolvedLang);
  readonly msgExportExcel = this.translate.translate('MsgExportExcel', undefined, this.resolvedLang);
  readonly msgExportPdf = this.translate.translate('MsgExportPdf', undefined, this.resolvedLang);
  readonly msgPrint = this.translate.translate('MsgPrint', undefined, this.resolvedLang);
  readonly msgToggleColumns = this.translate.translate('MsgToggleColumns', undefined, this.resolvedLang);
  readonly msgEditRow = this.translate.translate('MsgEditRow', undefined, this.resolvedLang);
  readonly msgSaveRow = this.translate.translate('MsgSaveRow', undefined, this.resolvedLang);
  readonly msgCancelRowEdit = this.translate.translate('MsgCancelRowEdit', undefined, this.resolvedLang);
  readonly msgDeleteRow = this.translate.translate('MsgDeleteRow', undefined, this.resolvedLang);
  readonly msgAddRow = this.translate.translate('MsgAddRow', undefined, this.resolvedLang);
  readonly msgLoading = this.translate.translate('MsgLoading', undefined, this.resolvedLang);
  readonly msgDragRow = this.translate.translate('MsgDragRow', undefined, this.resolvedLang);

  constructor() {
    registerInanduGridTranslations(this.translate);

    // Layers customTranslations() on top of the built-in dictionaries whenever it changes — merge
    // (not replace), so only the keys the consumer actually supplies override the built-in text.
    effect(() => {
      const custom = this.customTranslations();
      if (!custom) {
        return;
      }
      // untracked: setTranslation() reads TranslateService's own internal signals as part of
      // storing the merge (e.g. to check whether `lang` already has translations) — without this,
      // those incidental reads become tracked dependencies of *this* effect too, and since
      // setTranslation() also *writes* that same internal state, every run would immediately
      // schedule another run of itself, forever (an effect can safely write signals it doesn't
      // depend on, but writing one it just read is the classic self-triggering infinite loop).
      untracked(() => {
        for (const [lang, messages] of Object.entries(custom)) {
          this.translate.setTranslation(lang, messages, true);
        }
      });
    });

    // Restores any previously-persisted state for this `stateKey`, exactly once — deferred to an
    // effect (rather than read directly here) since a signal input's *bound* value isn't available
    // yet during construction, only its default. Guarded by `hasRestoredState` so later changes to
    // `stateKey()` itself don't re-trigger a restore.
    effect(() => {
      const key = this.stateKey();
      if (this.hasRestoredState) {
        return;
      }
      this.hasRestoredState = true;
      this.restorePersistedState(key);
    });

    // Persists this grid's runtime state (column widths/order/visibility, sort, filters) to
    // localStorage whenever it changes, keyed by `stateKey()` — a no-op while `stateKey()` is unset.
    // Best-effort: localStorage can throw (private browsing, quota) and that's not worth failing over.
    effect(() => {
      const key = this.stateKey();
      const state = this.persistableState();
      if (!key) {
        return;
      }
      try {
        localStorage.setItem(STATE_STORAGE_PREFIX + key, JSON.stringify(state));
      } catch {
        // Persistence is a convenience, not a guarantee — silently skip a save that can't happen.
      }
    });

    // Server-side mode: notify the consumer of every sort/page/filter change instead of computing
    // results locally (see `serverSide()`) — including the very first value, so a consumer can drive
    // its initial fetch straight from these events rather than needing a separate "on init" call.
    effect(() => {
      const criteria = this.sortCriteria();
      if (this.serverSide()) {
        this.sortChange.emit(criteria);
      }
    });
    effect(() => {
      const page = this.currentPage();
      const pageSize = this.pageSize();
      if (this.serverSide()) {
        this.pageChange.emit({ page, pageSize });
      }
    });
    effect(() => {
      const query = this.filterQuery();
      const columnFilters = this.columnFilters();
      if (this.serverSide()) {
        this.filterChange.emit({ query, columnFilters });
      }
    });

    // Auto-measures `measuredRowHeight` from whatever virtual row(s) actually exist right now,
    // whenever that set changes — the row is real DOM (not a hidden probe element), and its
    // rendered height is content-driven (padding/font-size), independent of the `itemSize` CDK is
    // currently using for scroll math, so this is a true, unbiased reading of the real row height.
    // No-ops once `virtualRowHeight()` is set explicitly, or before the first virtual row exists.
    effect(() => {
      const elements = this.virtualRowElements();
      if (this.virtualRowHeight() !== undefined || elements.length === 0) {
        return;
      }
      const height = elements[0].nativeElement.getBoundingClientRect().height;
      if (height > 0) {
        this.measuredRowHeight.set(height);
      }
    });
  }

  /** `MsgSortBy` interpolated with the column's display label — called from the template per column. */
  sortByLabel(column: InanduColumnComponent): string {
    return this.translate.instant('MsgSortBy', { column: column.title() || column.field() }, this.resolvedLang());
  }

  /** `MsgFilterColumn` interpolated with the column's display label — the text filter's aria-label. */
  columnFilterLabel(column: InanduColumnComponent): string {
    return this.translate.instant('MsgFilterColumn', { column: column.title() || column.field() }, this.resolvedLang());
  }

  /** `MsgEditCell` interpolated with the column's display label — a row-edit field's aria-label. */
  cellEditLabel(column: InanduColumnComponent): string {
    return this.translate.instant('MsgEditCell', { column: column.title() || column.field() }, this.resolvedLang());
  }

  /** `MsgToggleColumn` interpolated with the column's display label — a column-visibility checkbox's aria-label. */
  columnToggleLabel(column: InanduColumnComponent): string {
    return this.translate.instant('MsgToggleColumn', { column: column.title() || column.field() }, this.resolvedLang());
  }

  /** `[truthyLabel, falsyLabel]` for a `type="boolean"` column's filter dropdown, from its own `format`. */
  booleanFilterLabels(column: InanduColumnComponent): [string, string] {
    const [truthy, falsy] = (column.format() || 'true|false').split('|');
    return [truthy, falsy];
  }

  readonly paging = input<InanduGridPagingOptions>();

  /** Enables the header search box. Off (no box rendered, `data()` passes through unfiltered) by default. */
  readonly filter = input(false, { transform: booleanAttribute });
  /** Overrides the search box's placeholder text. Defaults to the resolved language's translated placeholder. */
  readonly filterPlaceholder = input('');

  readonly filterQuery = signal('');

  onFilterInput(event: Event): void {
    this.setFilterQuery((event.target as HTMLInputElement).value);
  }

  /** Sets the free-text search query directly, bypassing typing into the search box — e.g. to restore a persisted query, or drive the search from some other UI entirely. */
  setFilterQuery(query: string): void {
    this.filterQuery.set(query);
    // The result set can shrink/grow, so whatever page we were on may no longer make sense.
    this.requestedPage.set(1);
  }

  readonly columns = contentChildren(InanduColumnComponent);

  readonly orderedColumns = computed(() => placeColumnsByOrder(this.columns()));

  /** Field order after any runtime header drag-to-reorder; `undefined` until the first drop. */
  private readonly reorderedFields = signal<string[] | undefined>(undefined);

  /**
   * `orderedColumns()` further permuted by runtime header drag-to-reorder. This is what the
   * template actually renders (colgroup/header/filter-controls/data cells) — always iterate this,
   * never `orderedColumns()` directly, or a drag-reorder won't visibly move the column's cells.
   * Columns absent from a stale `reorderedFields()` (e.g. newly added at runtime) flow in at the
   * end, in declaration order.
   */
  readonly displayColumns = computed(() => {
    const base = this.orderedColumns();
    const fields = this.reorderedFields();
    if (!fields) {
      return base;
    }
    const byField = new Map(base.map(column => [column.field(), column]));
    const result: InanduColumnComponent[] = [];
    for (const field of fields) {
      const column = byField.get(field);
      if (column) {
        result.push(column);
        byField.delete(field);
      }
    }
    result.push(...byField.values());
    return result;
  });

  /**
   * Enables a "toggle columns" toolbar button (🗂️) + popup letting the user show/hide individual
   * columns at runtime. Off (no button, every column always renders) by default. Shares the toolbar
   * `<div>` with `exportable`'s buttons — that `<div>` now renders whenever *either* is on.
   */
  readonly columnToggle = input(false, { transform: booleanAttribute });

  /** `displayColumns()` filtered to `column.hideable()` — what the toggle popup's checkbox list iterates. A non-hideable column never appears here, so it can never end up in `hiddenFields`. */
  readonly hideableColumns = computed(() => this.displayColumns().filter(column => column.hideable()));

  /** Fields currently hidden via the column-visibility toggle popup, by field — empty until the user hides something. */
  private readonly hiddenFields = signal<Set<string>>(new Set());

  isColumnHidden(field: string): boolean {
    return this.hiddenFields().has(field);
  }

  /**
   * The header checkbox toggle for one column in the popup. Un-hiding is always allowed; hiding is
   * refused if `field` is currently the *only* visible column left — a grid with zero visible
   * columns would have nothing left to render (no header, no cells, nothing to un-hide it from), so
   * this is a hard floor rather than something the consumer needs to guard against themselves.
   */
  toggleColumnVisibility(field: string): void {
    if (this.hiddenFields().has(field)) {
      this.hiddenFields.update(fields => {
        const next = new Set(fields);
        next.delete(field);
        return next;
      });
      return;
    }
    if (this.visibleColumns().length <= 1) {
      return;
    }
    this.hiddenFields.update(fields => new Set(fields).add(field));
  }

  /**
   * Runtime pin (sticky) overrides, keyed by field — `'left'`/`'right'` pins there regardless of the
   * column's own declared `sticky()`/`stickySide()`, `'none'` un-pins a column that declared
   * `sticky="true"`. A field with no entry here just falls through to that column's own declared
   * default — see `columnPinnedSide()`, the only place this is read.
   */
  private readonly pinnedOverrides = signal<Record<string, InanduColumnStickySide | 'none'>>({});

  /**
   * A column's current pin side, considering any runtime override — an override if `setColumnPinned`
   * was ever called for this field, else its own declared `sticky()`/`stickySide()`. `undefined`
   * means not pinned. Every sticky-related render (`<th>`/`<td>` class, `stickyOffset()`/
   * `stickyOffsetRight()`, both left/right inline-offset bindings) goes through this now instead of
   * reading `column.sticky()`/`column.stickySide()` directly, so a runtime pin/unpin from e.g. a
   * consumer-built column panel takes effect everywhere at once.
   */
  columnPinnedSide(column: InanduColumnComponent): InanduColumnStickySide | undefined {
    const override = this.pinnedOverrides()[column.field()];
    if (override === 'left' || override === 'right') {
      return override;
    }
    if (override === 'none') {
      return undefined;
    }
    return column.sticky() ? column.stickySide() : undefined;
  }

  /** Pins `field` to `side` at runtime, or un-pins it when `side` is `undefined` — from e.g. a consumer-built column panel's "fix left/right" control. See `columnPinnedSide()`. Persisted under `stateKey` like column order/width/visibility. */
  setColumnPinned(field: string, side: InanduColumnStickySide | undefined): void {
    this.pinnedOverrides.update(overrides => ({ ...overrides, [field]: side ?? 'none' }));
  }

  /** Field of the column whose visibility toggle popup is open, tracked as a simple flag since there's only one such popup for the whole grid (unlike the per-column filter popups). */
  private readonly columnTogglePopupOpen = signal(false);

  isColumnTogglePopupOpen(): boolean {
    return this.columnTogglePopupOpen();
  }

  toggleColumnTogglePopup(): void {
    this.columnTogglePopupOpen.update(open => !open);
  }

  /**
   * `displayColumns()` minus whatever's currently hidden. This is what the template actually
   * renders everywhere a column loop matters (colgroup, header row, every data-cell `@for`, in the
   * grouped/flat/virtual/add-row paths alike) — and what `totalColumnCount`, `stickyOffset`, the
   * free-text search, and all four export/print methods operate over. Always non-empty (see
   * `toggleColumnVisibility`'s floor), so there's no "every column hidden" case to special-case.
   */
  readonly visibleColumns = computed(() => {
    const hidden = this.hiddenFields();
    return hidden.size === 0 ? this.displayColumns() : this.displayColumns().filter(column => !hidden.has(column.field()));
  });

  /** Columns editable via the per-row "Edit" button. The trailing actions column only renders when this is non-empty. */
  readonly editableColumns = computed(() => this.visibleColumns().filter(column => column.editable()));

  /** Enables the per-row "Delete" button in the trailing actions column. Off (no button, `data()` untouched) by default. */
  readonly deletable = input(false, { transform: booleanAttribute });

  /**
   * Optional confirmation message shown via `window.confirm()` before a "Delete" click actually
   * emits `rowDelete`. Empty/omitted (the default) means delete fires immediately, no prompt.
   */
  readonly deleteConfirmMessage = input('');

  /**
   * Enables an "Add row" trigger above the data rows (hidden while grouped — there's no group a new
   * row could belong to yet). Off by default. Most useful combined with at least one `editable`
   * column, the same way `deletable` is — with zero editable columns, "Save" on a new row simply
   * emits an empty `values` object immediately.
   */
  readonly creatable = input(false, { transform: booleanAttribute });

  /**
   * Custom, consumer-supplied buttons for the trailing row-actions cell, alongside (after) the
   * built-in Edit/Delete — declare a plain `<ng-template let-row>…</ng-template>` as a *direct*
   * child of `<inandu-grid>` (not nested inside an `<inandu-column>`, which is where a column's own
   * `cellTemplate` lives instead). `let-row` (the template's `$implicit`) is the full row object;
   * only rendered for an *existing* row's actions cell, not while adding a new row (there's no row
   * yet to act on there). Setting this alone (with no `editable` column, `deletable`, or `creatable`)
   * is enough to make the actions column appear — see `hasRowActions`.
   */
  readonly rowActionsTemplate = contentChild(TemplateRef<InanduRowActionsContext<T>>);

  /** The `*ngTemplateOutlet` context for `rowActionsTemplate()` — `$implicit`/`row` is the full row object. */
  rowActionsContext(row: T): InanduRowActionsContext<T> {
    return { $implicit: row, row };
  }

  /** Whether the trailing row-actions column should render at all — row editing, row deletion, row creation, a custom `rowActionsTemplate`, or any combination. */
  readonly hasRowActions = computed(() => this.editableColumns().length > 0 || this.deletable() || this.creatable() || !!this.rowActionsTemplate());

  /** Header + optional select/actions columns — the colspan every full-width row (search, group zone, empty state, pager) should span. */
  readonly totalColumnCount = computed(() =>
    this.visibleColumns().length + (this.hasRowDragHandle() ? 1 : 0) + (this.selectable() ? 1 : 0) + (this.hasRowActions() ? 1 : 0)
  );

  readonly filterableColumns = computed(() => this.visibleColumns().filter(column => column.filter()));

  /** Per-column filter values, keyed by field. Only columns with an active entry are constrained. */
  readonly columnFilters = signal<Record<string, InanduGridColumnFilterValue>>({});

  /** Merges `patch` into `field`'s filter entry (creating it if absent) and resets to page 1. */
  updateColumnFilter(field: string, patch: InanduGridColumnFilterValue): void {
    this.columnFilters.update(filters => ({
      ...filters,
      [field]: { ...filters[field], ...patch },
    }));
    this.requestedPage.set(1);
  }

  /** Generic `(input)`/`(change)` handler for a column filter control: writes `event.target.value` under `key`. */
  onColumnFilterInput(field: string, key: keyof InanduGridColumnFilterValue, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.updateColumnFilter(field, { [key]: value });
  }

  /** The "Cancel filter" button for a single column. */
  clearColumnFilter(field: string): void {
    this.columnFilters.update(filters => {
      const next = { ...filters };
      delete next[field];
      return next;
    });
    this.requestedPage.set(1);
  }

  /** The grid-wide "Clear filters" button — removes every column's filter entry at once. */
  clearAllColumnFilters(): void {
    this.columnFilters.set({});
    this.requestedPage.set(1);
  }

  /** Whether `field` currently narrows anything (as opposed to having an entry with only empty values). */
  hasColumnFilter(field: string): boolean {
    return hasMeaningfulFilterValue(this.columnFilters()[field]);
  }

  /** Gates the grid-wide "Clear filters" row — it only renders once at least one column filter actually narrows something. */
  readonly hasActiveColumnFilters = computed(() => {
    const filters = this.columnFilters();
    return Object.keys(filters).some(field => hasMeaningfulFilterValue(filters[field]));
  });

  /** Field of the column whose filter popup is open, or `undefined` if none — only one can be open at a time. */
  private readonly openFilterField = signal<string | undefined>(undefined);

  isFilterPopupOpen(field: string): boolean {
    return this.openFilterField() === field;
  }

  /** The header filter-toggle button (`▾`) — opens `field`'s popup, or closes it if it's already open. */
  toggleColumnFilterPopup(field: string): void {
    this.openFilterField.update(current => current === field ? undefined : field);
  }

  /** Closes the open column-filter popup and/or the column-visibility toggle popup on any click outside of it (and outside its own toggle button) — the two popups are independent, so either, both, or neither can close on a given click. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.openFilterField() && !target.closest('.inandu-column-filter-popup') && !target.closest('.inandu-column-filter-toggle')) {
      this.openFilterField.set(undefined);
    }
    if (this.columnTogglePopupOpen() && !target.closest('.inandu-column-toggle-popup') && !target.closest('.inandu-column-toggle-button')) {
      this.columnTogglePopupOpen.set(false);
    }
  }

  /**
   * Arrow-key/Home/End navigation between the grid's `role="columnheader"`/`role="gridcell"` cells
   * (a subset of the full WAI-ARIA grid keyboard pattern — only the header row and data rows carry
   * grid semantics; toolbar/search/group-zone/pager rows are plain content, unaffected by this).
   * Bound once on the root `<div>`'s `(keydown)`, rather than per-cell, and navigates by walking the
   * real DOM directly (`closest`/`querySelectorAll`) instead of tracking focus in component state —
   * a plain roving-tabindex implementation: moving focus flips the old cell's `tabIndex` to `-1` and
   * the new one's to `0` directly on the elements, so only one cell is ever a tab stop at a time.
   * A data re-render (e.g. after a sort) can reset this to the template's static initial tabindex —
   * a known, accepted simplification rather than something tracked in reactive state.
   */
  onGridKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    if (this.handleClipboardShortcut(event, key)) {
      return;
    }
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'Home' && key !== 'End') {
      return;
    }
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[role="columnheader"], [role="gridcell"]');
    const table = cell?.closest('table');
    const row = cell?.closest('tr');
    if (!cell || !table || !row) {
      return;
    }
    const cellsInRow = Array.from(row.querySelectorAll<HTMLElement>('[role="columnheader"], [role="gridcell"]'));
    const colIndex = cellsInRow.indexOf(cell);
    let nextCell: HTMLElement | null | undefined;
    switch (key) {
      case 'ArrowRight':
        nextCell = cellsInRow[colIndex + 1];
        break;
      case 'ArrowLeft':
        nextCell = cellsInRow[colIndex - 1];
        break;
      case 'Home':
        nextCell = cellsInRow[0];
        break;
      case 'End':
        nextCell = cellsInRow[cellsInRow.length - 1];
        break;
      case 'ArrowUp':
      case 'ArrowDown': {
        const rows = Array.from(table.querySelectorAll<HTMLElement>('tr[role="row"]'));
        const rowIndex = rows.indexOf(row);
        const nextRow = rows[rowIndex + (key === 'ArrowDown' ? 1 : -1)];
        nextCell = nextRow?.querySelectorAll<HTMLElement>('[role="columnheader"], [role="gridcell"]')[colIndex];
        break;
      }
    }
    if (nextCell) {
      event.preventDefault();
      cell.tabIndex = -1;
      nextCell.tabIndex = 0;
      nextCell.focus();
    }
  }

  /**
   * Opt-in Excel-style copy/paste via `Ctrl+C`/`Ctrl+V` (`Cmd+C`/`Cmd+V` on Mac) while a data cell has
   * keyboard focus (see `onGridKeyDown`'s roving-tabindex nav) — off by default, so a grid never
   * intercepts clipboard shortcuts unless a consumer opts in. Copy always copies a *single* cell's
   * formatted value — there's no multi-cell range selection to copy a block from (yet); paste reads
   * clipboard text as tab/newline-separated values and fans it out starting at the focused cell,
   * exactly the shape Excel/Sheets put on the clipboard when copying a block — see `pasteAt()`. Both
   * only operate on the flat, non-grouped, non-virtualized `pagedData()` rows — the same DOM-row-to-
   * data-row correspondence `rowReorder` already restricts itself to, via the same `data-row-index`/
   * `data-field` attributes on that render path's `<tr>`/`<td>` the template adds for this purpose.
   */
  readonly clipboard = input(false, { transform: booleanAttribute });

  /** Emitted once per `Ctrl+V` with every parsed `{ row, field, value }` to apply — see `clipboard`/`pasteAt()`. The grid itself never mutates `data()`. */
  readonly cellsPaste = output<InanduGridCellPaste<T>[]>();

  /** The formatted text `Ctrl+C` copies for one cell — `''` if `row`/`field` doesn't resolve to a real, currently-paged, visible cell. */
  copyCellText(row: T, field: string): string {
    const column = this.visibleColumns().find(col => col.field() === field);
    if (!column || !this.pagedData().includes(row)) {
      return '';
    }
    return this.formatValue(column, row);
  }

  /**
   * Parses `text` as TSV (rows split on a line break, columns on a tab) and, anchored at `row`/
   * `field`'s position within `pagedData()`/`visibleColumns()`, builds the list of `{ row, field,
   * value }` updates `cellsPaste` emits — one entry per pasted cell that lands on both an existing
   * row and an *editable* column. A pasted block bigger than the remaining grid, or touching a
   * non-editable column, is simply clipped there — this never extends `data()` with new rows or
   * columns, only ever writes into cells that already exist. Each value is parsed per that column's
   * `type()` (see `parsePastedCellValue`), the same coercions a manual row edit already applies. A
   * no-op — `cellsPaste` isn't emitted at all — if `row`/`field` don't resolve, or nothing in `text`
   * landed on an editable cell.
   */
  pasteAt(row: T, field: string, text: string): void {
    const rows = this.pagedData();
    const columns = this.visibleColumns();
    const rowIndex = rows.indexOf(row);
    const colIndex = columns.findIndex(col => col.field() === field);
    if (rowIndex === -1 || colIndex === -1) {
      return;
    }
    const updates: InanduGridCellPaste<T>[] = [];
    // Excel/Sheets terminate a copied block with a trailing line break; without stripping it, the
    // split below would produce one extra, entirely-empty phantom row past the real data.
    const pastedRows = text.replace(/\r\n$|\r$|\n$/, '').split(/\r\n|\r|\n/).map(line => line.split('\t'));
    pastedRows.forEach((pastedRow, rOffset) => {
      const targetRow = rows[rowIndex + rOffset];
      if (!targetRow) {
        return;
      }
      pastedRow.forEach((cellText, cOffset) => {
        const targetColumn = columns[colIndex + cOffset];
        if (!targetColumn || !targetColumn.editable()) {
          return;
        }
        updates.push({ row: targetRow, field: targetColumn.field(), value: parsePastedCellValue(cellText, targetColumn.type()) });
      });
    });
    if (updates.length > 0) {
      this.cellsPaste.emit(updates);
    }
  }

  /**
   * The `Ctrl+C`/`Ctrl+V` half of `onGridKeyDown` — resolves the focused cell back to a `row`/`field`
   * via the `data-row-index`/`data-field` attributes the flat render path's `<tr>`/`<td>` carry, then
   * defers to `copyCellText()`/`pasteAt()`. Returns `true` when it handled the key (so `onGridKeyDown`
   * stops there), `false` otherwise — including whenever `clipboard()` is off, the key isn't C/V with
   * a modifier, or focus is inside a cell's own edit `<input>`/`<select>` (native copy/paste of the
   * *selected text* inside that control should win, not a whole-cell copy/paste).
   */
  private handleClipboardShortcut(event: KeyboardEvent, key: string): boolean {
    if (!this.clipboard() || !(event.ctrlKey || event.metaKey)) {
      return false;
    }
    const normalizedKey = key.toLowerCase();
    if (normalizedKey !== 'c' && normalizedKey !== 'v') {
      return false;
    }
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      return false;
    }
    const cell = target.closest<HTMLElement>('td[data-field]');
    const field = cell?.getAttribute('data-field');
    const rowIndexAttr = cell?.closest('tr')?.getAttribute('data-row-index');
    if (!cell || !field || rowIndexAttr === null || rowIndexAttr === undefined) {
      return false;
    }
    const row = this.pagedData()[Number(rowIndexAttr)];
    if (!row) {
      return false;
    }
    event.preventDefault();
    if (normalizedKey === 'c') {
      navigator.clipboard?.writeText(this.clipboardCopyText(row, field))?.catch(() => undefined);
    } else {
      navigator.clipboard?.readText()?.then(text => this.pasteAt(row, field, text)).catch(() => undefined);
    }
    return true;
  }

  /**
   * Opt-in Excel-style range selection — click-and-drag (or shift-click, without dragging) across
   * cells in the flat, non-grouped, non-virtualized `pagedData()` rows (the same render-path
   * restriction `rowReorder`/`clipboard` already document) selects a rectangular block of cells,
   * highlighted via `.inandu-cell-range-selected`. Off by default. When `clipboard()` is *also* on,
   * `Ctrl+C` copies the *entire* selected range as TSV instead of just the focused cell — see
   * `clipboardCopyText()` — otherwise this is purely a selection/highlight feature with no built-in
   * side effect of its own; `cellRangeChange` is how a consumer observes what's currently selected.
   */
  readonly cellRangeSelection = input(false, { transform: booleanAttribute });

  /** Emits the selected range's rows/fields on every change, or `undefined` once cleared — see `cellRangeSelection`/`clearCellRangeSelection()`. */
  readonly cellRangeChange = output<InanduGridCellRangeSelection<T> | undefined>();

  /** The cell a range drag/shift-click started from — fixed for the duration of one selection gesture. */
  private readonly rangeAnchor = signal<{ row: number; col: number } | undefined>(undefined);
  /** The cell a range drag/shift-click currently extends to — this is the corner that moves as the gesture continues. */
  private readonly rangeFocus = signal<{ row: number; col: number } | undefined>(undefined);
  /** Whether a mouse-drag range selection is currently in progress — set on `mousedown`, cleared on the next `mouseup` anywhere in the document (the drag can end with the pointer outside any cell). */
  private readonly isSelectingRange = signal(false);

  /** `rangeAnchor()`/`rangeFocus()` normalized into an inclusive `[min, max]` rectangle, or `undefined` while nothing is selected. */
  private readonly selectedRange = computed(() => {
    const anchor = this.rangeAnchor();
    const focus = this.rangeFocus();
    if (!anchor || !focus) {
      return undefined;
    }
    return {
      minRow: Math.min(anchor.row, focus.row),
      maxRow: Math.max(anchor.row, focus.row),
      minCol: Math.min(anchor.col, focus.col),
      maxCol: Math.max(anchor.col, focus.col),
    };
  });

  /** Whether `(rowIndex, colIndex)` (both into `pagedData()`/`visibleColumns()`) falls inside the currently selected range — drives `.inandu-cell-range-selected` in the template. */
  isCellInRange(rowIndex: number, colIndex: number): boolean {
    const range = this.selectedRange();
    return !!range && rowIndex >= range.minRow && rowIndex <= range.maxRow && colIndex >= range.minCol && colIndex <= range.maxCol;
  }

  /** Starts a new range selection gesture — a plain click resets the anchor to this cell; shift-click extends the *existing* anchor instead, the same convention spreadsheet apps use. */
  onCellRangeMouseDown(event: MouseEvent, rowIndex: number, colIndex: number): void {
    if (event.button !== 0) {
      return;
    }
    this.isSelectingRange.set(true);
    if (!event.shiftKey || !this.rangeAnchor()) {
      this.rangeAnchor.set({ row: rowIndex, col: colIndex });
    }
    this.rangeFocus.set({ row: rowIndex, col: colIndex });
    this.emitCellRangeChange();
  }

  /** Extends the in-progress range to `(rowIndex, colIndex)` — a no-op while no drag is active, so merely hovering cells never starts or changes a selection. */
  onCellRangeMouseEnter(rowIndex: number, colIndex: number): void {
    if (!this.isSelectingRange()) {
      return;
    }
    this.rangeFocus.set({ row: rowIndex, col: colIndex });
    this.emitCellRangeChange();
  }

  /** Ends the in-progress drag — bound at the document level (not the cell) since the mouse button can be released outside any cell and the drag should still stop. */
  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    this.isSelectingRange.set(false);
  }

  /** Clears the current range selection and emits `cellRangeChange` with `undefined`. */
  clearCellRangeSelection(): void {
    this.rangeAnchor.set(undefined);
    this.rangeFocus.set(undefined);
    this.cellRangeChange.emit(undefined);
  }

  private emitCellRangeChange(): void {
    const range = this.selectedRange();
    if (!range) {
      return;
    }
    const rows = this.pagedData().slice(range.minRow, range.maxRow + 1);
    const fields = this.visibleColumns().slice(range.minCol, range.maxCol + 1).map(column => column.field());
    this.cellRangeChange.emit({ rows, fields });
  }

  /** The full selected range formatted as TSV (one line per row, tab-separated columns) — what `clipboardCopyText()` copies when a genuine (more-than-one-cell) range is active. */
  private selectedRangeText(range: { minRow: number; maxRow: number; minCol: number; maxCol: number }): string {
    const rows = this.pagedData().slice(range.minRow, range.maxRow + 1);
    const columns = this.visibleColumns().slice(range.minCol, range.maxCol + 1);
    return rows.map(row => columns.map(column => this.formatValue(column, row)).join('\t')).join('\n');
  }

  /** What `Ctrl+C` actually copies: the whole selected range as TSV when `cellRangeSelection()` is on and more than one cell is selected, else just the focused cell (see `copyCellText()`). */
  private clipboardCopyText(row: T, field: string): string {
    if (this.cellRangeSelection()) {
      const range = this.selectedRange();
      if (range && (range.minRow !== range.maxRow || range.minCol !== range.maxCol)) {
        return this.selectedRangeText(range);
      }
    }
    return this.copyCellText(row, field);
  }

  /**
   * `data()` narrowed by every active filter, combined with AND: the free-text search box (if
   * `filter()` is on) *and* every `filter="yes"` column's own control. The free-text box matches
   * against any *currently visible* column's *formatted* value (so searching "sí" matches a boolean
   * column formatted `Sí|No` — but a column hidden via `columnToggle` is excluded, same reasoning as
   * its own per-column filter popup disappearing once hidden — see `visibleColumns`); each column
   * control is type-aware instead — substring match for `'string'`, an
   * inclusive min/max range for `'number'`, an inclusive from/to range for `'date'` (`'to'`
   * extended to the end of that day), and exact equality for `'boolean'`. Passes `data()` through
   * unchanged when nothing is active.
   */
  readonly filteredData = computed(() => {
    let rows = this.data();

    // Server-side mode: `data()` is already the server's filtered result — filtering it again
    // locally would double-apply the query against rows that (for server-side search) may not even
    // contain the fields being matched anymore. The filter controls still render and still drive
    // `filterChange`, they just stop constraining what's rendered themselves.
    if (this.serverSide()) {
      return rows;
    }

    if (this.filter()) {
      const query = this.filterQuery().trim().toLowerCase();
      if (query) {
        const columns = this.visibleColumns();
        rows = rows.filter(row =>
          columns.some(column => this.formatValue(column, row).toLowerCase().includes(query))
        );
      }
    }

    const columns = this.filterableColumns();
    if (columns.length > 0) {
      const filters = this.columnFilters();
      rows = rows.filter(row =>
        columns.every(column => matchesColumnFilter(column, row, filters[column.field()] ?? {}, this.locale, this.numberFormatter))
      );
    }

    return rows;
  });

  /**
   * The active sort, in priority order (index 0 sorts first, ties broken by the next entry, and so
   * on). A plain click on a sort button always collapses this to a single entry (see `toggleSort`);
   * shift-click appends/toggles an additional entry instead, building a multi-column sort.
   */
  readonly sortCriteria = signal<InanduGridSortCriterion[]>([]);

  readonly sortedData = computed(() => {
    const rows = this.filteredData();
    if (this.serverSide()) {
      // Server-side mode: `data()` arrives pre-sorted by the server — sortCriteria() still drives
      // the header buttons' visual state and sortChange, it just doesn't reorder anything itself.
      return rows;
    }
    const criteria = this.sortCriteria();
    if (criteria.length === 0) {
      return rows;
    }
    return [...rows].sort((a, b) => {
      for (const { field, direction } of criteria) {
        const sign = direction === 'asc' ? 1 : -1;
        const cmp = compareCellValues(a[field], b[field], this.locale) * sign;
        if (cmp !== 0) {
          return cmp;
        }
      }
      return 0;
    });
  });

  /**
   * The sort button's `(click)` handler. A plain click always collapses the sort to just `field`
   * (toggling asc/desc if it was already the *sole* active criterion, else resetting to ascending) —
   * the same single-column behavior this always had. A **shift-click** instead builds a multi-column
   * sort: appends `field` as a new lowest-priority criterion (ascending), or toggles its direction in
   * place if it's already one of the active criteria.
   */
  toggleSort(field: string, event?: MouseEvent): void {
    const additive = !!event?.shiftKey;
    this.sortCriteria.update(criteria => {
      const index = criteria.findIndex(c => c.field === field);
      if (additive) {
        if (index === -1) {
          return [...criteria, { field, direction: 'asc' }];
        }
        const next = [...criteria];
        next[index] = { field, direction: criteria[index].direction === 'asc' ? 'desc' : 'asc' };
        return next;
      }
      if (criteria.length === 1 && criteria[0].field === field) {
        return [{ field, direction: criteria[0].direction === 'asc' ? 'desc' : 'asc' }];
      }
      return [{ field, direction: 'asc' }];
    });
    // Sorting reshuffles what each page means, so start over from page 1.
    this.requestedPage.set(1);
  }

  /** The sort direction currently applied to `field`, or `undefined` if it isn't part of the active sort — what the header button's icon binds to. */
  sortDirectionFor(field: string): SortDirection | undefined {
    return this.sortCriteria().find(c => c.field === field)?.direction;
  }

  /** `field`'s 1-based priority (1, 2, 3, …) once a *multi*-column sort is active, or `undefined` when it isn't sorted or there's only one active criterion overall — a lone (single-column) sort shows no badge on anyone, since there's nothing to disambiguate. */
  sortPriorityFor(field: string): number | undefined {
    const criteria = this.sortCriteria();
    if (criteria.length < 2) {
      return undefined;
    }
    const index = criteria.findIndex(c => c.field === field);
    return index === -1 ? undefined : index + 1;
  }

  /**
   * Sets the full multi-column sort directly, bypassing the click/shift-click UI — e.g. to restore a
   * sort a consumer persisted themselves, or to sort by a field that has no visible sort button.
   * Replaces whatever was active before. Resets to page 1, same as every other sort-changing action.
   */
  setSort(criteria: InanduGridSortCriterion[]): void {
    this.sortCriteria.set(criteria);
    this.requestedPage.set(1);
  }

  /** Clears the active sort entirely — equivalent to `setSort([])`. */
  clearSort(): void {
    this.setSort([]);
  }

  readonly pageSize = computed(() => this.paging()?.pageSize ?? 10);

  /**
   * `1` (no paging) when `paging` isn't bound, otherwise how many pages the data spans. In
   * `serverSide()` mode this is computed from `totalItems()` (falling back to `data().length`, which
   * is only ever one page's worth) rather than `sortedData().length`, since the grid never holds
   * more than the current page of rows itself.
   */
  readonly totalPages = computed(() => {
    if (!this.paging()) {
      return 1;
    }
    const totalCount = this.serverSide() ? (this.totalItems() ?? this.data().length) : this.sortedData().length;
    return Math.max(1, Math.ceil(totalCount / this.pageSize()));
  });

  /** Raw requested page number; may be out of range — read `currentPage()` instead. */
  private readonly requestedPage = signal(1);

  /** `requestedPage` clamped to `[1, totalPages()]`, so it's always safe to read/render directly. */
  readonly currentPage = computed(() => Math.min(Math.max(this.requestedPage(), 1), this.totalPages()));

  readonly pagedData = computed(() => {
    const rows = this.sortedData();
    if (!this.paging() || this.serverSide()) {
      // Server-side mode: `data()` already *is* the current page's rows, sliced by the server.
      return rows;
    }
    const size = this.pageSize();
    const start = (this.currentPage() - 1) * size;
    return rows.slice(start, start + size);
  });

  /**
   * Opt-in row virtualization (via `@angular/cdk`'s `cdk-virtual-scroll-viewport`) for large
   * datasets — instead of rendering every row's `<tr>` up front, only the rows currently scrolled
   * into view (plus a small runway) exist in the DOM. Takes over rendering from `pagedData()`/
   * `paging()` entirely: `sortedData()` is fed to the viewport directly, and the pager footer hides
   * itself, the same way it already does while grouped (see `groupByColumn()`).
   *
   * **Also virtualizes while grouped** — `virtualItems()` interleaves each group's header
   * with its rows into a single flat list, which is what's actually fed to the viewport in that
   * case. This still assumes a **uniform row height** — the same `FixedSizeVirtualScrollStrategy`
   * limitation `virtualRowHeight`/auto-measurement already documents for plain rows — so a group
   * header row is assumed to render at the same height as a data row. In practice they're both
   * single-line table rows, so this holds for the built-in look and any theme that doesn't give
   * `.inandu-group-row` a taller line-height; a theme that does will see the same scroll-position
   * drift a genuinely uneven data row would already cause, an accepted trade-off rather than
   * something this library tries to solve generally (see `virtualRowHeight`'s own doc comment).
   */
  readonly virtualScroll = input(false, { transform: booleanAttribute });

  /**
   * Fixed row height (px) override for the CDK virtual scroll strategy, which uses it to compute
   * scroll position and how many rows to render. **Optional** — left unset (the default), the grid
   * auto-measures its own first rendered `<tr>` (see `measuredRowHeight`/the `effect()` in the
   * constructor) instead of requiring the consumer to hand-tune this. Set it explicitly only to skip
   * that one-time measurement (e.g. a known-fixed row height decided up front). Only used while
   * `virtualScroll()` is on. Either way this assumes a genuinely **fixed** row height — a row whose
   * height varies from the others (e.g. one showing an inline validation error) will still visibly
   * misalign scrolling, auto-measured or not; that's a `FixedSizeVirtualScrollStrategy` limitation
   * this library doesn't attempt to solve (a true per-row auto-sizing strategy exists only in
   * `@angular/cdk-experimental`, an explicitly experimental package this library avoids depending on).
   */
  readonly virtualRowHeight = input<number | undefined>(undefined, { transform: optionalNumberAttribute });

  /** Fallback used only until `measuredRowHeight` has a real reading (or forever, if `virtualRowHeight()` is never set and no row ever renders to measure — e.g. an always-empty dataset). */
  private readonly measuredRowHeight = signal(40);

  /** Every currently-rendered virtual row's host element (`#virtualRowEl` in the template) — used only to auto-measure `measuredRowHeight`, see the constructor's `effect()`. */
  private readonly virtualRowElements = viewChildren<ElementRef<HTMLElement>>('virtualRowEl');

  /** What the viewport's `[itemSize]` actually binds to: an explicit `virtualRowHeight()` override if set, else the auto-measured height. */
  readonly effectiveVirtualRowHeight = computed(() => this.virtualRowHeight() ?? this.measuredRowHeight());

  /** The `cdk-virtual-scroll-viewport`'s own height — reuses `height()` (falling back to `400`, since a virtualized viewport needs a bounded height to know how much of `sortedData()` to render). */
  readonly virtualViewportHeight = computed(() => this.height() || 400);

  /**
   * Opt-in infinite/incremental loading for a server-paginated, virtualized grid — off by default,
   * and a no-op unless `virtualScroll()` **and** `serverSide()` are both also on (there's no
   * meaningful "more to load" signal otherwise: a non-virtualized grid has no scroll position to
   * watch, and a fully client-side one already has every row it'll ever have). While active, scrolling
   * near the end of what's currently loaded emits `loadMore` instead of requiring a "Next page" click
   * — the consumer is expected to fetch the next chunk and *append* it to `data()` (this grid never
   * mutates `data()` itself, same boundary every other write-triggering event already holds to).
   */
  readonly infiniteScroll = input(false, { transform: booleanAttribute });

  /** How many rows from the end of the currently-loaded data triggers `loadMore` — e.g. the default `10` fires once only 10 more rows remain to scroll through below the visible viewport. */
  readonly infiniteScrollThreshold = input(10, { transform: numberAttribute });

  /** Emitted at most once per distinct `data()` length — see `infiniteScroll`. */
  readonly loadMore = output<InanduGridLoadMoreEvent>();

  /**
   * The `data().length` `loadMore` was last emitted for — `-1` initially, so the very first
   * near-the-end scroll always fires. Guards against emitting repeatedly for the same not-yet-grown
   * dataset (e.g. scrolling back up and down again while waiting for the consumer's fetch to land);
   * once `data()` actually grows, the next near-the-end scroll is free to fire again.
   */
  private readonly lastLoadMoreLength = signal(-1);

  /**
   * Bound to `<cdk-virtual-scroll-viewport>`'s own `(scrolledIndexChange)` — `startIndex` is the
   * index of the first item currently rendered. The number of rows actually visible is estimated from
   * the viewport's own height and row height (both already tracked signals) rather than querying the
   * viewport instance directly, which keeps this a plain arithmetic check with no extra `viewChild`/
   * subscription plumbing beyond the template event binding itself.
   */
  onVirtualScrolledIndexChange(startIndex: number): void {
    if (!this.infiniteScroll() || !this.virtualScroll() || !this.serverSide()) {
      return;
    }
    const total = this.sortedData().length;
    const visibleCount = Math.ceil(this.virtualViewportHeight() / (this.effectiveVirtualRowHeight() || 1));
    if (startIndex + visibleCount + this.infiniteScrollThreshold() >= total && total !== this.lastLoadMoreLength()) {
      this.lastLoadMoreLength.set(total);
      this.loadMore.emit({ loadedCount: total });
    }
  }

  readonly pageLabelText = computed(() => {
    const page = this.currentPage();
    const total = this.totalPages();
    const pageLabel = this.paging()?.pageLabel;
    if (pageLabel) {
      return pageLabel(page, total);
    }
    return this.translate.instant('MsgPageOf', { page, total }, this.resolvedLang());
  });

  goToFirstPage(): void {
    this.requestedPage.set(1);
  }

  goToPreviousPage(): void {
    this.requestedPage.update(page => page - 1);
  }

  goToNextPage(): void {
    this.requestedPage.update(page => page + 1);
  }

  goToLastPage(): void {
    this.requestedPage.set(this.totalPages());
  }

  /** Jumps directly to `page` (1-based) — clamped the same way every other navigation method is, via `currentPage()`, so an out-of-range value is simply clamped rather than ignored or throwing. */
  goToPage(page: number): void {
    this.requestedPage.set(page);
  }

  /**
   * Enables dragging a row (via a leading grip-handle column) to reorder it. Whole-row, grid-level
   * like `selectable`/`deletable` — there's no per-column setting, since a row either can be picked
   * up or it can't. Off by default.
   *
   * Only renders in the flat, non-virtualized `pagedData()` render path — ignored while grouped
   * (there's no meaningful "position" for a row once it's bucketed by group, same posture
   * `virtualScroll` already takes while grouped is combined with something incompatible) and while
   * `virtualScroll()` is on (native HTML5 drag-and-drop against `*cdkVirtualFor`'s recycled `<tr>`
   * nodes is unreliable, the same reasoning virtual-scroll-while-grouped's DOM-recycling concerns
   * are built around) or `serverSide()` is on (the server owns row order, not this grid).
   *
   * Emits `rowOrderChange` with the *complete* reordered `sortedData()` array — not a delta, not
   * page-relative indices — leaving it to the consumer to apply that order back to their own
   * `data()` (the same "grid never mutates data() itself" boundary `rowSave`/`rowDelete`/`rowCreate`
   * already hold to). Meant to be used without an active sort: dragging while `sortCriteria()` is
   * non-empty still emits the requested order, but the very next re-render's `sortedData()`
   * immediately resorts it back, visually undoing the drag — a documented limitation (like the
   * sticky-column leading-run caveat elsewhere in this file), not something this feature tries to
   * reconcile with sorting.
   */
  readonly rowReorder = input(false, { transform: booleanAttribute });

  /** Emits the fully reordered array of rows after a drag-and-drop reorder — see `rowReorder`. */
  readonly rowOrderChange = output<T[]>();

  /** Whether the row-drag-handle column should render at all — `rowReorder()` on, and not grouped/virtualized/server-side (see `rowReorder`'s doc comment). */
  readonly hasRowDragHandle = computed(() => this.rowReorder() && !this.groupByColumn() && !this.virtualScroll() && !this.serverSide());

  /** The row currently being dragged (drag source), tracked by object reference — `undefined` when no drag is in progress. */
  private readonly draggingRow = signal<T | undefined>(undefined);

  /** Row whose `<tr>` is currently being dragged *over* (drop target) — purely visual, drives `.inandu-drag-over` on that row. */
  private readonly dragOverRow = signal<T | undefined>(undefined);

  isDragOverRow(row: T): boolean {
    return this.dragOverRow() === row;
  }

  onRowDragStart(event: DragEvent, row: T): void {
    this.draggingRow.set(row);
    // Real-world fallback for browsers/embeds that need actual dataTransfer payload; the signal
    // above is the primary source of truth, same convention onColumnDragStart already follows.
    event.dataTransfer?.setData('text/plain', 'row');
  }

  onRowDragOver(event: DragEvent, row: T): void {
    // Required so the browser allows a subsequent 'drop' event to fire on this row.
    event.preventDefault();
    this.dragOverRow.set(row);
  }

  onRowDragLeave(row: T): void {
    if (this.dragOverRow() === row) {
      this.dragOverRow.set(undefined);
    }
  }

  /** Dropping a dragged row onto another row — inserts the dragged row immediately before the target, mirroring `onColumnHeaderDrop()`'s semantics. */
  onRowDrop(event: DragEvent, targetRow: T): void {
    event.preventDefault();
    this.dragOverRow.set(undefined);
    const draggedRow = this.draggingRow();
    this.draggingRow.set(undefined);
    if (!draggedRow || draggedRow === targetRow) {
      return;
    }
    const rows = [...this.sortedData()];
    const fromIndex = rows.indexOf(draggedRow);
    let toIndex = rows.indexOf(targetRow);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    rows.splice(fromIndex, 1);
    if (fromIndex < toIndex) {
      // The removal above shifted every later index down by one, including the target's.
      toIndex--;
    }
    rows.splice(toIndex, 0, draggedRow);
    this.rowOrderChange.emit(rows);
  }

  /** Enables a checkbox column (header "select all" + one per row). Off, no checkbox column, by default. */
  readonly selectable = input(false, { transform: booleanAttribute });
  /** Emits the full list of currently-selected rows every time the selection changes. */
  readonly selectionChange = output<T[]>();

  /** Selected rows, tracked by object reference (not a key field, since rows have no guaranteed unique id). */
  private readonly selectedRows = signal<Set<T>>(new Set());

  /**
   * Rows the "select all" checkbox (and CSV/Excel/PDF/print export) governs: every group's rows
   * when grouped, or the full sorted/filtered set when `virtualScroll()` is on (neither has a
   * pager), else just the current page.
   */
  private readonly visibleRows = computed(() =>
    (this.groupByColumn() || this.virtualScroll()) ? this.sortedData() : this.pagedData()
  );

  /** `visibleRows().length` — exposed publicly just so the template can disable the export buttons when there's nothing to export. */
  readonly visibleRowCount = computed(() => this.visibleRows().length);

  readonly allVisibleSelected = computed(() => {
    const rows = this.visibleRows();
    return rows.length > 0 && rows.every(row => this.selectedRows().has(row));
  });

  readonly someVisibleSelected = computed(() => {
    const rows = this.visibleRows();
    return !this.allVisibleSelected() && rows.some(row => this.selectedRows().has(row));
  });

  isRowSelected(row: T): boolean {
    return this.selectedRows().has(row);
  }

  toggleRowSelection(row: T): void {
    this.selectedRows.update(selected => {
      const next = new Set(selected);
      if (next.has(row)) {
        next.delete(row);
      } else {
        next.add(row);
      }
      return next;
    });
    this.selectionChange.emit(Array.from(this.selectedRows()));
  }

  /** The header checkbox: selects every currently-visible row, or clears them all if they're all already selected. */
  toggleSelectAll(): void {
    const rows = this.visibleRows();
    const selectAll = !this.allVisibleSelected();
    this.selectedRows.update(selected => {
      const next = new Set(selected);
      for (const row of rows) {
        if (selectAll) {
          next.add(row);
        } else {
          next.delete(row);
        }
      }
      return next;
    });
    this.selectionChange.emit(Array.from(this.selectedRows()));
  }

  /** The rows currently selected, as a plain array — a public, read-only mirror of what `selectionChange` emits, for a consumer that wants to inspect the selection without listening to the output. */
  readonly selectedRowsList = computed(() => Array.from(this.selectedRows()));

  /**
   * Replaces the current selection with exactly `rows`, bypassing the checkbox UI — e.g. to restore
   * a persisted selection, or select rows from outside based on some other criteria entirely. Rows
   * are matched by object reference, same as everywhere else selection is tracked; a row not
   * actually present in `data()` can still be "selected" here (nothing checks membership), it just
   * won't have a checkbox to reflect it since it never renders.
   */
  selectRows(rows: T[]): void {
    this.selectedRows.set(new Set(rows));
    this.selectionChange.emit(Array.from(this.selectedRows()));
  }

  /** Clears the selection entirely — equivalent to `selectRows([])`. */
  deselectAll(): void {
    this.selectRows([]);
  }

  /** `MsgSelectRow` for one row checkbox's aria-label — `index` is that row's 1-based position within the currently-rendered rows. */
  selectRowLabel(index: number): string {
    return this.translate.instant('MsgSelectRow', { index: index + 1 }, this.resolvedLang());
  }

  private readonly locale = inject(LOCALE_ID);

  /**
   * Adapter handed to the framework-agnostic `../core` helpers so number formatting still routes
   * through Angular's `formatNumber` (honouring whatever locale data the host app registered) —
   * keeping rendered/filtered/exported numbers byte-identical to before the core split. The core's
   * own `defaultNumberFormatter` (an `Intl.NumberFormat` wrapper) is the fallback a non-Angular
   * consumer gets.
   */
  private readonly numberFormatter: NumberFormatter =
    (value, locale, digitsInfo) => formatNumber(value, locale, digitsInfo || undefined);

  formatValue(column: InanduColumnComponent, row: T): string {
    return formatCellValue(row[column.field()], column.type(), column.format(), this.locale, this.numberFormatter);
  }

  /** The `*ngTemplateOutlet` context for `column.cellTemplate()` — `$implicit`/`value` is the cell's raw value, `row` the full row. */
  cellTemplateContext(column: InanduColumnComponent, row: T): InanduCellTemplateContext {
    return { $implicit: row[column.field()], row };
  }

  /** The `*ngTemplateOutlet` context for `column.headerTemplate()` — `$implicit`/`title` is the resolved display label, `field` the raw field name. */
  headerTemplateContext(column: InanduColumnComponent): InanduHeaderTemplateContext {
    const title = column.title() || column.field();
    return { $implicit: title, title, field: column.field() };
  }

  /** Columns whose header can be dragged onto the group-by drop zone. The zone only renders when this is non-empty — a hidden column's header isn't rendered at all, so it can't be dragged from anyway. */
  readonly groupableColumns = computed(() => this.visibleColumns().filter(column => column.groupable()));

  private readonly groupByField = signal<string | undefined>(undefined);

  /** The column currently grouped by, or `undefined` when no grouping is active. */
  readonly groupByColumn = computed(() => this.orderedColumns().find(column => column.field() === this.groupByField()));

  /** Field of the column whose header drag gesture is in progress — the source of truth for drop handling. */
  private readonly draggingField = signal<string | undefined>(undefined);

  /**
   * Columns showing an aggregate (see `InanduColumnComponent.aggregate`) — consumed two ways: a
   * per-group aggregate in that group's header row while grouped, *and* (see `showTotals`) a
   * grid-wide grand total in a sticky footer row, independent of grouping. Same column-level config
   * drives both; a column doesn't need to pick one or the other.
   */
  readonly groupAggregateColumns = computed(() => this.visibleColumns().filter(column => column.aggregate()));

  /**
   * Opt-in sticky totals/footer row — off by default. When on, a `.inandu-totals-row` renders in the
   * table's `<tfoot>` (`position: sticky; bottom: 0`, so it stays visible while the body scrolls,
   * mirroring the sticky header's `top: 0` treatment) showing, for every `groupAggregateColumns()`
   * entry, that column's aggregate across the *entire* `sortedData()` — the full filtered/sorted
   * result, not just the current page — regardless of whether the grid is currently grouped (a grand
   * total across every group, shown alongside each group's own subtotal in its header row). Ignored
   * while `virtualScroll()` is on — that render path has no `<tfoot>` at all, the same limitation the
   * pager footer already has there.
   */
  readonly showTotals = input(false, { transform: booleanAttribute });

  /** Whether the totals `<tr>` should actually render — see `showTotals()`'s doc comment for why `virtualScroll()` rules it out. */
  readonly showTotalsRow = computed(() => this.showTotals() && !this.virtualScroll());

  /** The grand-total aggregate for every `groupAggregateColumns()` entry, across all of `sortedData()` — reuses the same `computeGroupAggregates()` a group's own subtotal is built from, just handed the whole dataset instead of one group's rows. */
  private readonly totalsAggregates = computed(() => computeGroupAggregates(this.sortedData(), this.groupAggregateColumns()));

  /** One column's cell text in the `showTotals` footer row — `"<symbol> <value>"` (e.g. `"Σ 1,234"`), no title prefix since it already sits under that column's own header. Empty for a column with no `aggregate()` set. */
  totalsCellText(column: InanduColumnComponent): string {
    const kind = column.aggregate();
    const value = this.totalsAggregates()[column.field()];
    if (!kind || value === undefined) {
      return '';
    }
    const formatted = kind === 'count' ? String(value) : formatCellValue(value, 'number', column.format(), this.locale, this.numberFormatter);
    return `${AGGREGATE_SYMBOLS[kind]} ${formatted}`;
  }

  /**
   * `sortedData()` bucketed by the grouped column's *formatted* value, in first-seen order (which,
   * since it reads from `sortedData()`, follows the active sort). Grouping intentionally bypasses
   * pagination altogether rather than paginating within/across groups — `pagedData()` is not used
   * when grouped, and the pager footer hides itself instead. Each group also carries `aggregates` —
   * one computed value per `groupAggregateColumns()` entry, keyed by field.
   */
  readonly groupedRows = computed(() => {
    const column = this.groupByColumn();
    if (!column) {
      return [];
    }
    const groups = new Map<string, T[]>();
    for (const row of this.sortedData()) {
      const key = this.formatValue(column, row);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(row);
      } else {
        groups.set(key, [row]);
      }
    }
    const aggregateColumns = this.groupAggregateColumns();
    return Array.from(groups.entries()).map(([key, rows]) => ({
      key,
      rows,
      aggregates: computeGroupAggregates(rows, aggregateColumns),
    }));
  });

  /**
   * The single data source `virtualScroll()` feeds to its one `cdkVirtualFor`, whether grouped or
   * not. When grouped, this is `groupedRows()` interleaved into one flat list — each group's header
   * followed immediately by its rows (a virtualized viewport can't render `groupedRows()`'s nested
   * per-group arrays directly the way the plain `@for` grouped rendering does). When ungrouped, it's
   * just `sortedData()` wrapped in the same `{ kind: 'row', ... }` shape, so the template only ever
   * needs one `<tr *cdkVirtualFor>` and one set of cell-rendering logic for both cases.
   *
   * **Deliberately a single `computed()` behind one `*cdkVirtualFor`, not two separate template
   * branches with their own `*cdkVirtualFor`s gated by `groupByColumn()`** — switching between two
   * *different* structural directive instances (destroying one, creating the other) tripped a real
   * bug: with a genuinely large dataset, the freshly-created `CdkVirtualForOf` re-attaching to the
   * already-initialized (persistent) `CdkVirtualScrollViewport` silently rendered zero rows despite
   * `getDataLength()`/`getRenderedRange()` reporting correctly — reproduced by hand in a real browser
   * (Karma's small fixtures never hit it), not something a smaller unit-test dataset surfaced. Always
   * routing through the *same* directive instance and just changing which array it's bound to (the
   * same pattern the "still sorts while virtualized" behavior already relies on, swapping
   * `sortedData()`'s contents on every sort click without issue) sidesteps that entirely.
   *
   * `indexInGroup` on a `'row'` item is that row's position *within its own group* when grouped
   * (matching what the non-virtualized grouped rendering's `$index` already gives `selectRowLabel()`
   * — restarting per group), or simply its position in `sortedData()` when ungrouped (matching the
   * flat non-virtualized rendering's `$index`).
   */
  readonly virtualItems = computed<VirtualRowItem<T>[]>(() => {
    const column = this.groupByColumn();
    if (!column) {
      return this.sortedData().map((row, indexInGroup) => ({ kind: 'row' as const, row, indexInGroup }));
    }
    const items: VirtualRowItem<T>[] = [];
    for (const group of this.groupedRows()) {
      items.push({ kind: 'group', key: group.key, column, count: group.rows.length, aggregates: group.aggregates });
      group.rows.forEach((row, indexInGroup) => items.push({ kind: 'row', row, indexInGroup }));
    }
    return items;
  });

  /** `trackBy` for `virtualItems()`'s `cdkVirtualFor` — a row tracks by its own object identity (like every other row loop); a group header tracks by its (string) key, stable across recomputes even though `virtualItems()` rebuilds a fresh wrapper object for it every time. */
  trackVirtualItem(_index: number, item: VirtualRowItem<T>): unknown {
    return item.kind === 'row' ? item.row : `group:${item.key}`;
  }

  /** `column`'s aggregate value for one group, formatted as `"<title> <symbol>: <value>"` (e.g. `"Ventas Σ: 1,234"`) — the aggregate *kind* uses a short, language-agnostic symbol rather than a translated word (see `AGGREGATE_SYMBOLS`), so this needs no new i18n keys. */
  aggregateLabel(column: InanduColumnComponent, aggregates: Record<string, number>): string {
    const kind = column.aggregate();
    const value = aggregates[column.field()];
    if (!kind || value === undefined) {
      return '';
    }
    const formatted = kind === 'count' ? String(value) : formatCellValue(value, 'number', column.format(), this.locale, this.numberFormatter);
    return `${column.title() || column.field()} ${AGGREGATE_SYMBOLS[kind]}: ${formatted}`;
  }

  /** Field whose header is currently being dragged *over* (as a drop target) — purely visual, drives `.inandu-drag-over` on that `<th>`. Distinct from `draggingField`, which tracks the drag *source*. */
  private readonly dragOverHeaderField = signal<string | undefined>(undefined);
  /** Whether the group-by drop zone is currently being dragged over — purely visual, drives `.inandu-drag-over` there. */
  private readonly dragOverGroupZone = signal(false);

  isDragOverHeaderField(field: string): boolean {
    return this.dragOverHeaderField() === field;
  }

  isDragOverGroupZone(): boolean {
    return this.dragOverGroupZone();
  }

  onColumnDragStart(event: DragEvent, field: string): void {
    this.draggingField.set(field);
    event.dataTransfer?.setData('text/plain', field);
  }

  onGroupZoneDragOver(event: DragEvent): void {
    // Required so the browser allows a subsequent 'drop' event to fire on this element.
    event.preventDefault();
    this.dragOverGroupZone.set(true);
  }

  onGroupZoneDragLeave(): void {
    this.dragOverGroupZone.set(false);
  }

  onGroupZoneDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOverGroupZone.set(false);
    const field = this.draggingField() ?? event.dataTransfer?.getData('text/plain');
    this.draggingField.set(undefined);
    if (field) {
      this.setGroupBy(field);
    }
  }

  /** The group-zone's "Cancel grouping" button — reverts to the flat, paginated row list. */
  clearGrouping(): void {
    this.setGroupBy(undefined);
  }

  /**
   * Groups by `field` directly, bypassing the drag-and-drop UI — e.g. to restore a persisted
   * grouping, or offer grouping through a dropdown instead of a drag gesture. Silently does nothing
   * if `field` isn't one of `groupableColumns()`'s fields (the same rule `onGroupZoneDrop()` already
   * enforces for a dragged header), so this can't be used to group by a column that opted out.
   * `undefined` clears grouping, equivalent to `clearGrouping()`.
   */
  setGroupBy(field: string | undefined): void {
    if (field === undefined || this.groupableColumns().some(column => column.field() === field)) {
      this.groupByField.set(field);
    }
  }

  onColumnHeaderDragOver(event: DragEvent, field: string): void {
    // Required so the browser allows a subsequent 'drop' event to fire on this header.
    event.preventDefault();
    this.dragOverHeaderField.set(field);
  }

  onColumnHeaderDragLeave(field: string): void {
    if (this.dragOverHeaderField() === field) {
      this.dragOverHeaderField.set(undefined);
    }
  }

  /** Dropping a dragged header onto another header's `<th>` — inserts the dragged column immediately before `targetField`. */
  onColumnHeaderDrop(event: DragEvent, targetField: string): void {
    event.preventDefault();
    this.dragOverHeaderField.set(undefined);
    const draggedField = this.draggingField() ?? event.dataTransfer?.getData('text/plain');
    this.draggingField.set(undefined);
    if (!draggedField || draggedField === targetField) {
      return;
    }
    // Deliberately displayColumns(), not visibleColumns() — the drag/drop interaction itself can
    // only ever involve visible <th>s anyway, but reorderedFields must still carry every column
    // (hidden ones included) or a hidden column would silently reset to the end of the list the
    // next time displayColumns() recomputes (see displayColumns()'s own "flows in at the end" logic
    // for fields absent from a stale reorderedFields()).
    const columns = this.displayColumns();
    const draggedColumn = columns.find(column => column.field() === draggedField);
    if (!draggedColumn || !draggedColumn.reorder()) {
      return;
    }
    const fields = columns.map(column => column.field());
    const fromIndex = fields.indexOf(draggedField);
    let toIndex = fields.indexOf(targetField);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    fields.splice(fromIndex, 1);
    if (fromIndex < toIndex) {
      // The removal above shifted every later index down by one, including the target's.
      toIndex--;
    }
    fields.splice(toIndex, 0, draggedField);
    this.reorderedFields.set(fields);
  }

  /**
   * Sets the full column order directly, bypassing the header drag-and-drop gesture — e.g. from a
   * consumer-built column-management panel (drag-reorder inside a sidebar list, "move up"/"move
   * down" buttons, or restoring a saved layout). `fields` should list every column's `field()`, in
   * the desired order; any field it omits keeps its current relative position and is appended after
   * the fields it does list (same "flows in at the end" behavior `displayColumns()` already has for
   * a stale/partial order — see its doc comment) — so passing a subset is safe, it just won't move
   * the columns you didn't mention. Fields that don't match any current column are ignored. A
   * `reorder="false"` column can still be repositioned this way — that flag only opts a column's own
   * header out of *being dragged*, it doesn't lock its position against every other mechanism.
   */
  setColumnOrder(fields: readonly string[]): void {
    const current = this.displayColumns().map(column => column.field());
    const currentSet = new Set(current);
    const requested = fields.filter(field => currentSet.has(field));
    const requestedSet = new Set(requested);
    const remaining = current.filter(field => !requestedSet.has(field));
    this.reorderedFields.set([...requested, ...remaining]);
  }

  /** `MsgGroupedBy` interpolated with the grouped column's display label. */
  readonly groupByLabel = computed(() => {
    const column = this.groupByColumn();
    if (!column) {
      return '';
    }
    return this.translate.instant('MsgGroupedBy', { column: column.title() || column.field() }, this.resolvedLang());
  });

  /** `MsgGroupHeader` for one group's header row — called from the template per group. */
  groupHeaderLabel(column: InanduColumnComponent, value: string, count: number): string {
    return this.translate.instant('MsgGroupHeader', { column: column.title() || column.field(), value, count }, this.resolvedLang());
  }

  /** Per-column width overrides written by dragging a resize handle, keyed by field. */
  private readonly columnWidths = signal<Record<string, number>>({});

  /** A column's current rendered width: a drag override if one exists, else its declared `width()`. */
  effectiveWidth(column: InanduColumnComponent): number {
    return this.columnWidths()[column.field()] ?? column.width();
  }

  /**
   * The select-checkbox column's width, as the template's `[style.--inandu-select-column-width.px]`
   * binding on the root `<div>` — the *only* other place `SELECT_COLUMN_WIDTH` is referenced, so the
   * Less stylesheet's `.inandu-select-column` rule can read the exact same number back via
   * `var(--inandu-select-column-width)` instead of duplicating the literal `36` independently in two
   * files with nothing keeping them in sync (a real, if minor, gap this closes: one `const` in TS is
   * now the single source of truth for both the actual `<th>`/`<td>` width and `stickyOffset()`'s math).
   */
  protected readonly selectColumnWidthPx = SELECT_COLUMN_WIDTH;

  /** The drag-handle column's width, exposed the same way `selectColumnWidthPx` is — see its doc comment. */
  protected readonly rowDragColumnWidthPx = ROW_DRAG_COLUMN_WIDTH;

  /**
   * The `left` offset (px) a `stickySide="left"` (the default) sticky column's `<th>`/`<td>` needs:
   * the select-checkbox column's width (it's always sticky-left when `selectable()` is on — see the
   * template) plus every *other* left-sticky column's `effectiveWidth()` that renders before this
   * one in `visibleColumns()`. A hidden column never contributes (it has no rendered `<th>`/`<td>`
   * to occupy any width at all). Non-sticky and right-sticky columns never contribute either,
   * regardless of where they sit.
   */
  stickyOffset(column: InanduColumnComponent): number {
    let offset = (this.hasRowDragHandle() ? ROW_DRAG_COLUMN_WIDTH : 0) + (this.selectable() ? SELECT_COLUMN_WIDTH : 0);
    for (const other of this.visibleColumns()) {
      if (other === column) {
        break;
      }
      if (this.columnPinnedSide(other) === 'left') {
        offset += this.effectiveWidth(other) || 80;
      }
    }
    return offset;
  }

  /**
   * The `right` offset (px) a `stickySide="right"` sticky column's `<th>`/`<td>` needs: every other
   * right-sticky column's `effectiveWidth()` that renders *after* this one in `visibleColumns()` —
   * the mirror image of `stickyOffset()`, stacking from the table's right edge inward instead of its
   * left. Doesn't account for the trailing row-actions column (see `hasRowActions`), which — like the
   * select column not contributing to a right offset — is never itself sticky.
   */
  stickyOffsetRight(column: InanduColumnComponent): number {
    let offset = 0;
    let seenColumn = false;
    for (const other of this.visibleColumns()) {
      if (other === column) {
        seenColumn = true;
        continue;
      }
      if (seenColumn && this.columnPinnedSide(other) === 'right') {
        offset += this.effectiveWidth(other) || 80;
      }
    }
    return offset;
  }

  private resizingField: string | undefined;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  /** Starts a column-resize drag from that header's `.inandu-column-resize-handle`. */
  onResizeHandleMouseDown(event: MouseEvent, column: InanduColumnComponent): void {
    event.preventDefault();
    this.resizingField = column.field();
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.effectiveWidth(column);
    window.addEventListener('mousemove', this.onResizeMouseMove);
    window.addEventListener('mouseup', this.onResizeMouseUp);
  }

  private readonly onResizeMouseMove = (event: MouseEvent): void => {
    const field = this.resizingField;
    if (!field) {
      return;
    }
    const width = Math.max(MIN_COLUMN_WIDTH, this.resizeStartWidth + (event.clientX - this.resizeStartX));
    this.columnWidths.update(widths => ({ ...widths, [field]: width }));
  };

  private readonly onResizeMouseUp = (): void => {
    this.resizingField = undefined;
    window.removeEventListener('mousemove', this.onResizeMouseMove);
    window.removeEventListener('mouseup', this.onResizeMouseUp);
  };

  /** Enables the export/print toolbar above the table. Off (no toolbar rendered) by default. */
  readonly exportable = input(false, { transform: booleanAttribute });

  /**
   * Downloads the currently-visible rows (the same "what's on screen right now" set `visibleRows`
   * already defines for the select-all checkbox — the current page, or every group's rows while
   * grouped) as a CSV file, using each column's *formatted* value, same "match what's on screen"
   * rule the rest of the library follows.
   */
  exportCsv(): void {
    const columns = this.visibleColumns();
    const lines = [
      columns.map(column => escapeCsvValue(column.title() || column.field())).join(','),
      ...this.visibleRows().map(row => columns.map(column => escapeCsvValue(this.formatValue(column, row))).join(',')),
    ];
    // Leading BOM so Excel opens accented text (e.g. "México", "Sí") as UTF-8 instead of Latin-1.
    downloadBlob('\uFEFF' + lines.join('\r\n'), `${this.id() || 'inandu-grid'}-export.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Downloads the currently-visible rows as a PDF: one simple table drawn with jsPDF's low-level
   * text/line primitives rather than its `autotable` plugin, to keep this to a single dependency.
   * Cells are single-line, truncated with an ellipsis if they overflow their column's width (no
   * text wrapping/variable row heights); the header row is redrawn at the top of every new page.
   * `jspdf` is dynamically imported so a grid that never calls this never pays to load it.
   */
  async exportPdf(): Promise<void> {
    const { jsPDF: JsPdf } = await import('jspdf');
    const columns = this.visibleColumns();
    const rows = this.visibleRows();
    const headerValues = columns.map(column => column.title() || column.field());

    const doc = new JsPdf({ orientation: 'landscape' });
    const marginX = 10;
    const marginY = 10;
    const rowHeight = 8;
    const pageWidth = doc.internal.pageSize.getWidth() - marginX * 2;
    const pageHeight = doc.internal.pageSize.getHeight() - marginY;
    const rawWidths = columns.map(column => this.effectiveWidth(column) || 80);
    const totalRaw = rawWidths.reduce((sum, width) => sum + width, 0) || 1;
    const colWidths = rawWidths.map(width => (width / totalRaw) * pageWidth);

    let y = marginY;
    const drawRow = (values: string[], bold: boolean): void => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      let x = marginX;
      values.forEach((value, i) => {
        doc.text(truncatePdfText(doc, value, colWidths[i] - 4), x + 2, y + 6);
        x += colWidths[i];
      });
      y += rowHeight;
    };

    drawRow(headerValues, true);
    for (const row of rows) {
      if (y + rowHeight > pageHeight) {
        doc.addPage();
        y = marginY;
        drawRow(headerValues, true);
      }
      drawRow(columns.map(column => this.formatValue(column, row)), false);
    }

    // Goes through the same downloadBlob() helper exportCsv() uses (via doc.output('blob'), a real
    // Blob already typed 'application/pdf') rather than jsPDF's own `.save()` — that method's
    // browser-feature-detection branches for *how* to trigger the download aren't worth depending on
    // when this achieves the identical result with one predictable, already-tested code path.
    downloadBlob(doc.output('blob'), `${this.id() || 'inandu-grid'}-export.pdf`);
  }

  /** `row[column.field()]` if `column` is numeric and the raw value really is a finite `number`, else `undefined` — used by `exportExcel()` so a numeric column ends up genuinely numeric-typed in the sheet rather than a formatted string. */
  private numericCellValue(column: InanduColumnComponent, row: T): number | undefined {
    const raw = row[column.field()];
    return column.type() === 'number' && typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
  }

  /**
   * Downloads the currently-visible rows as a spreadsheet: the dependency-free "SpreadsheetML" XML
   * Excel 2003+ (and LibreOffice/Google Sheets) opens natively — plain text, no binary format to get
   * right — using the same `visibleColumns()`/`visibleRows()`/`formatValue()` source data as every
   * other export, and `numericCellValue()` so a numeric column stays genuinely numeric-typed.
   * (A real Open XML `.xlsx` workbook, which needs a heavier dependency, is a `@inandu-solutions/grid-pro` feature.)
   */
  exportExcel(): void {
    const columns = this.visibleColumns();
    const dataCell = (column: InanduColumnComponent, row: T): string => {
      const num = this.numericCellValue(column, row);
      return num !== undefined
        ? `<Cell><Data ss:Type="Number">${num}</Data></Cell>`
        : `<Cell><Data ss:Type="String">${escapeMarkup(this.formatValue(column, row))}</Data></Cell>`;
    };
    const headerRow = `<Row ss:StyleID="header">${columns
      .map(column => `<Cell><Data ss:Type="String">${escapeMarkup(column.title() || column.field())}</Data></Cell>`)
      .join('')}</Row>`;
    const dataRows = this.visibleRows()
      .map(row => `<Row>${columns.map(column => dataCell(column, row)).join('')}</Row>`)
      .join('');

    const xml = '<?xml version="1.0"?>'
      + '<?mso-application progid="Excel.Sheet"?>'
      + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
      + '<Styles><Style ss:ID="header"><Font ss:Bold="1"/></Style></Styles>'
      + '<Worksheet ss:Name="Sheet1"><Table>'
      + headerRow + dataRows
      + '</Table></Worksheet></Workbook>';

    downloadBlob(xml, `${this.id() || 'inandu-grid'}-export.xls`, 'application/vnd.ms-excel');
  }

  /**
   * Opens a new tab with a plain, print-styled `<table>` of the currently-visible rows and triggers
   * the browser's print dialog on it — reusing the exact same `visibleColumns()`/`visibleRows()`/
   * `formatValue()` pipeline the other three export methods do, rather than printing the live page
   * (which would include the toolbar, pager, and any surrounding app chrome).
   */
  printTable(): void {
    const columns = this.visibleColumns();
    const headerCells = columns.map(column => `<th>${escapeMarkup(column.title() || column.field())}</th>`).join('');
    const bodyRows = this.visibleRows()
      .map(row => `<tr>${columns.map(column => `<td>${escapeMarkup(this.formatValue(column, row))}</td>`).join('')}</tr>`)
      .join('');
    const html = '<!doctype html><html><head><meta charset="utf-8">'
      + `<title>${escapeMarkup(this.id() || 'inandu-grid')}</title>`
      + '<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:4px 8px;text-align:left}th{background:#eee}</style>'
      + `</head><body><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Lets the popup finish parsing/laying out the document before the print dialog opens on it.
    setTimeout(() => printWindow.print(), 0);
  }

  /** Emitted when a row's "Save" button is clicked — see `InanduGridRowSave`. */
  readonly rowSave = output<InanduGridRowSave<T>>();

  /** The row currently in edit mode (every `editableColumns()` field showing a control), or `undefined` — only one row at a time. */
  private readonly editingRow = signal<T | undefined>(undefined);

  /**
   * Draft values for whichever row-level edit is in progress — `editingRow()`'s fields, or (see
   * `creatable`) a brand-new row's fields while `isAddingRow()` — keyed by field, always in the *raw
   * control* shape (a string for text/number/date inputs, a boolean for the checkbox), not yet parsed
   * to the column's actual value type. Shared between the two flows since only one can ever be active
   * at a time (see `isAnotherRowEditing`); parsing (and validation) happens once, at save time.
   */
  private readonly rowDraft = signal<Record<string, unknown>>({});

  /** Validation messages from the most recent failed save attempt, keyed by field — cleared on every fresh edit/create/save/cancel. */
  private readonly fieldErrors = signal<Record<string, string>>({});

  /** A field's current validation error, or `''` if it has none — what the template checks to show/hide the inline message. */
  fieldError(field: string): string {
    return this.fieldErrors()[field] ?? '';
  }

  isEditingRow(row: T): boolean {
    return this.editingRow() === row;
  }

  /** Whether *any* row is mid-edit — disables the "Add row" trigger, since it's another row-level action and only one runs at a time. */
  isAnyRowEditing(): boolean {
    return this.editingRow() !== undefined;
  }

  /** Whether some *other* row-level action is in progress — disables a row's own "Edit"/"Delete" buttons, since only one runs at a time. */
  isAnotherRowEditing(row: T): boolean {
    if (this.isAddingRow()) {
      return true;
    }
    const editing = this.editingRow();
    return editing !== undefined && editing !== row;
  }

  /** The row's own "Edit" button — seeds the draft from `row`'s current values and enters edit mode. */
  startEditingRow(row: T): void {
    const draft: Record<string, unknown> = {};
    for (const column of this.editableColumns()) {
      draft[column.field()] = this.seedDraftValue(row, column);
    }
    this.editingRow.set(row);
    this.rowDraft.set(draft);
    this.fieldErrors.set({});
  }

  /**
   * The initial draft value for one field when a row enters edit mode, already in the same *raw
   * control* shape `onRowFieldChange()` writes back (a string for text/number/date, a boolean for
   * the checkbox) — never the raw value's own type (e.g. a `'number'` column's `row[field]` is a
   * real `number`, but the draft still stores it as a string, same as what typing into the control
   * would produce).
   */
  private seedDraftValue(row: T, column: InanduColumnComponent): unknown {
    if (column.type() === 'boolean') {
      return !!row[column.field()];
    }
    if (column.type() === 'date') {
      return this.dateEditValue(row, column.field());
    }
    const raw = row[column.field()];
    return raw == null ? '' : String(raw);
  }

  /** `row[field]`'s raw value coerced to `yyyy-mm-dd` for a `type="date"` column's `<input type="date">`. */
  private dateEditValue(row: T, field: string): string {
    const date = coerceToDate(row[field]);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  /** The current draft value for `field`, as a string — what a text/number/date row-edit control's `[value]` binds to. */
  rowDraftText(field: string): string {
    const value = this.rowDraft()[field];
    return typeof value === 'string' ? value : '';
  }

  /** The current draft value for `field`, as a boolean — what a `'boolean'` row-edit control's `[checked]` binds to. */
  rowDraftChecked(field: string): boolean {
    return !!this.rowDraft()[field];
  }

  /** The generic `(input)`/`(change)` handler for every field in a row-edit control — stashes the raw control value in the draft. */
  onRowFieldChange(column: InanduColumnComponent, event: Event): void {
    const target = event.target as HTMLInputElement;
    const raw = column.type() === 'boolean' ? target.checked : target.value;
    this.rowDraft.update(draft => ({ ...draft, [column.field()]: raw }));
  }

  /** "Cancel" — discards the draft and exits edit mode without emitting `rowSave`. */
  cancelRowEdit(): void {
    this.editingRow.set(undefined);
    this.rowDraft.set({});
    this.fieldErrors.set({});
  }

  /**
   * Whether an `asyncValidator` is currently being awaited by `saveRow()`/`saveNewRow()` — the
   * template disables the in-progress row's Save/Cancel buttons while this is `true`, since
   * canceling mid-check (or clicking Save again) while a promise is in flight is exactly the race
   * `validateAndParseDraft()`'s post-await `isEditingRow`/`isAddingRow` re-checks exist to prevent;
   * disabling the buttons just keeps the UI from inviting that race in the first place.
   */
  readonly isValidating = signal(false);

  /**
   * Parses and validates every `editableColumns()` field of `draft` (module-level `parseDraftValue()`
   * per column `type()` — an unparseable `'number'`/`'date'` is simply omitted rather than committed
   * as garbage — followed by `validateColumnValue()`, then any `asyncValidator`s). Shared by
   * `saveRow()` and `saveNewRow()`, since both save a draft the exact same way; the only difference
   * is what happens with the result. `errors` is non-empty exactly when the draft should **not** be
   * saved. A field with an `asyncValidator` only runs it once every synchronous rule has already
   * passed for that field; every field's async check (if any) runs concurrently via `Promise.all`,
   * not one after another.
   */
  private async validateAndParseDraft(draft: Record<string, unknown>): Promise<{ errors: Record<string, string>; values: Record<string, unknown> }> {
    const parsedRow: Record<string, unknown> = {};
    for (const column of this.editableColumns()) {
      parsedRow[column.field()] = parseDraftValue(draft[column.field()], column.type());
    }
    const errors: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    const pendingAsyncChecks: Promise<void>[] = [];
    for (const column of this.editableColumns()) {
      const field = column.field();
      const message = this.validateColumnValue(column, draft[field], parsedRow[field], parsedRow);
      if (message) {
        errors[field] = message;
        continue;
      }
      const asyncValidator: InanduColumnAsyncValidator | undefined = column.asyncValidator();
      if (!asyncValidator) {
        if (parsedRow[field] !== undefined) {
          values[field] = parsedRow[field];
        }
        continue;
      }
      pendingAsyncChecks.push(
        asyncValidator(parsedRow[field], parsedRow).then(asyncMessage => {
          if (asyncMessage) {
            errors[field] = asyncMessage;
          } else if (parsedRow[field] !== undefined) {
            values[field] = parsedRow[field];
          }
        })
      );
    }
    if (pendingAsyncChecks.length > 0) {
      this.isValidating.set(true);
      try {
        await Promise.all(pendingAsyncChecks);
      } finally {
        this.isValidating.set(false);
      }
    }
    return { errors, values };
  }

  /**
   * Runs `required`/`min`/`max`/`pattern`/`validator` (see `InanduColumnComponent`) for one field, in that
   * order, stopping at the first failure — `raw` is the draft's raw control value (what `required`/
   * `pattern` check), `parsed` is that same value already run through `parseDraftValue()` (what `min`/
   * `max`/`validator` check), and `parsedRow` is every editable field's parsed value for the row
   * currently being saved, given to `validator` for cross-field checks.
   */
  private validateColumnValue(column: InanduColumnComponent, raw: unknown, parsed: unknown, parsedRow: Record<string, unknown>): string | null {
    if (column.required() && (raw === '' || raw === undefined || raw === null)) {
      return this.translate.instant('MsgValidationRequired', undefined, this.resolvedLang());
    }
    if (column.type() === 'number' && typeof parsed === 'number') {
      const min = column.min();
      if (min !== undefined && parsed < min) {
        return this.translate.instant('MsgValidationMin', { min }, this.resolvedLang());
      }
      const max = column.max();
      if (max !== undefined && parsed > max) {
        return this.translate.instant('MsgValidationMax', { max }, this.resolvedLang());
      }
    }
    const pattern = column.pattern();
    if (pattern && typeof raw === 'string' && raw !== '') {
      // A malformed `pattern` (dev-supplied config) would otherwise throw out of this `async`
      // validation and reject the save with an unhandled error — treat it as "no pattern" instead.
      let regExp: RegExp | undefined;
      try {
        regExp = new RegExp(pattern);
      } catch {
        regExp = undefined;
      }
      if (regExp && !regExp.test(raw)) {
        return this.translate.instant('MsgValidationPattern', undefined, this.resolvedLang());
      }
    }
    const validator = column.validator();
    if (validator) {
      return validator(parsed, parsedRow);
    }
    return null;
  }

  /**
   * "Save" — validates and parses the draft (see `validateAndParseDraft()`); a failing field blocks
   * the save, populates `fieldErrors()` for the template to show inline, and leaves edit mode active
   * so the user can fix it and retry. Otherwise exits edit mode and emits `rowSave`. Guarded by
   * `isEditingRow()` in case this is somehow invoked for a row that isn't (defensively) the one
   * currently being edited.
   */
  async saveRow(row: T): Promise<void> {
    if (!this.isEditingRow(row)) {
      return;
    }
    const { errors, values } = await this.validateAndParseDraft(this.rowDraft());
    // Re-checked after the await: if the user hit Cancel (or somehow started editing a different
    // row) while an asyncValidator was pending, this save is stale and must not apply its result.
    if (!this.isEditingRow(row)) {
      return;
    }
    if (Object.keys(errors).length > 0) {
      this.fieldErrors.set(errors);
      return;
    }
    this.editingRow.set(undefined);
    this.rowDraft.set({});
    this.fieldErrors.set({});
    // Cast: values is built dynamically from string field names (see validateAndParseDraft), so
    // there's no way to statically prove it matches Partial<T> — see InanduGridRowSave's doc comment.
    this.rowSave.emit({ row, values: values as Partial<T> });
  }

  /** Emitted when a row's "Delete" button is confirmed (or clicked, if no `deleteConfirmMessage` is set) — the exact `data()` row reference. */
  readonly rowDelete = output<T>();

  /**
   * The row's own "Delete" button. If `deleteConfirmMessage()` is set, prompts via `window.confirm()`
   * first and does nothing when the user cancels; otherwise deletes immediately. Like `rowSave`, the
   * grid never removes `row` from `data()` itself — persisting the removal is the consumer's job.
   */
  deleteRow(row: T): void {
    const message = this.deleteConfirmMessage();
    if (message && !window.confirm(message)) {
      return;
    }
    this.rowDelete.emit(row);
  }

  /** Optional confirmation message for the toolbar's "Delete selected" bulk action — same `window.confirm()` gating as `deleteConfirmMessage`, independently configurable since bulk deletion is a bigger, easier-to-regret action than deleting one row. */
  readonly bulkDeleteConfirmMessage = input('');

  /** Emitted when the toolbar's "Delete selected" bulk action is confirmed (or clicked, if no `bulkDeleteConfirmMessage` is set) — every currently-selected row. Like `rowDelete`, the grid never removes these from `data()` itself. */
  readonly rowsDelete = output<T[]>();

  /** `selectedRows().size` — gates the toolbar's bulk-delete button (only `selectable() && deletable()` grids with at least one row selected show it) and its label. */
  readonly selectedCount = computed(() => this.selectedRows().size);

  /**
   * The toolbar's "Delete selected" button. Confirms via `bulkDeleteConfirmMessage()` first if set,
   * same as a single-row `deleteRow()`; emits `rowsDelete` with every selected row and then clears
   * the selection (there's nothing left to keep selected once the consumer removes them from `data()`).
   */
  deleteSelectedRows(): void {
    const message = this.bulkDeleteConfirmMessage();
    if (message && !window.confirm(message)) {
      return;
    }
    const rows = Array.from(this.selectedRows());
    this.selectedRows.set(new Set());
    this.selectionChange.emit([]);
    this.rowsDelete.emit(rows);
  }

  /** `MsgDeleteSelected` interpolated with `selectedCount()` — the bulk-delete button's aria-label/title. */
  deleteSelectedLabel(): string {
    return this.translate.instant('MsgDeleteSelected', { count: this.selectedCount() }, this.resolvedLang());
  }

  /** Whether the "Add row" trigger has been clicked and a new row's fields are showing controls — only one row-level action runs at a time (see `isAnotherRowEditing`). */
  private readonly isAddingRow = signal(false);

  isCreatingRow(): boolean {
    return this.isAddingRow();
  }

  /** The "Add row" trigger — starts a blank draft (every field defaults to its own empty control value; nothing needs seeding, unlike `startEditingRow`). */
  startAddingRow(): void {
    this.isAddingRow.set(true);
    this.rowDraft.set({});
    this.fieldErrors.set({});
  }

  /** "Cancel" on the new-row draft — discards it without emitting `rowCreate`. */
  cancelAddRow(): void {
    this.isAddingRow.set(false);
    this.rowDraft.set({});
    this.fieldErrors.set({});
  }

  /** Emitted when a new row's "Save" button succeeds — see `InanduGridNewRowValues`. There's no row reference to include; it doesn't exist in `data()` yet. */
  readonly rowCreate = output<InanduGridNewRowValues<T>>();

  /**
   * "Save" on the new-row draft — same validate-then-parse-or-block flow as `saveRow()` (see
   * `validateAndParseDraft()`), just emitting `rowCreate` with the parsed values instead of pairing
   * them with a row reference. Guarded by `isAddingRow()` for the same defensive reason `saveRow()`
   * guards on `isEditingRow()`.
   */
  async saveNewRow(): Promise<void> {
    if (!this.isAddingRow()) {
      return;
    }
    const { errors, values } = await this.validateAndParseDraft(this.rowDraft());
    // Re-checked after the await, same reasoning as saveRow()'s post-await isEditingRow() guard.
    if (!this.isAddingRow()) {
      return;
    }
    if (Object.keys(errors).length > 0) {
      this.fieldErrors.set(errors);
      return;
    }
    this.isAddingRow.set(false);
    this.rowDraft.set({});
    this.fieldErrors.set({});
    // Cast: same reasoning as saveRow()'s emit — values is a dynamically-built field bag, not
    // something the compiler can verify actually matches Partial<T>.
    this.rowCreate.emit(values as Partial<T>);
  }
}
