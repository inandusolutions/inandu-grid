# Changelog

All notable changes to `@inandu-solutions/grid-angular` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Needs `@inandu-solutions/grid-core` with the print and state helpers (the release after 0.1.2).

### Added

- `persist` input: which parts of the state `stateKey` saves (`'columnWidths'`, `'reorderedFields'`, `'hiddenFields'`,
  `'pinnedOverrides'`, `'sortCriteria'`, `'filterQuery'`, `'columnFilters'`). Leave out the last two to keep what the user
  typed out of storage. `clearPersistedState()` removes what was saved.

### Fixed

- **The published type declarations were broken in 1.3.0 and 1.4.0.** `inandu-solutions-grid-angular.d.ts` referred to a namespace
  `index_d_exports` that it never defined, so with `skipLibCheck: true` every type that comes from `@inandu-solutions/grid-core`
  (`InanduGridRow`, `InanduColumnType`, `InanduGridColumnFilterValue`, ...) silently became `any` in a consumer's code, and with
  `skipLibCheck: false` the compiler reported `Cannot find namespace 'index_d_exports'`. The library now imports the core package
  directly instead of through a local `export *` barrel, which the declaration bundler mangled, and CI type-checks the generated
  declarations with `skipLibCheck` off (`npm run check:dts`).

### Changed

- **The saved state is validated.** What `stateKey` reads back from `localStorage` is checked for shape, types and sizes
  (`sanitizeGridState`): a part that is wrong is dropped, field names like `__proto__` are refused, widths are clamped, and a
  blob written by a newer version is ignored. The blob now carries a version (`v`); blobs without one still load.

### Fixed

- `printTable` opens the print page through a `Blob` URL with `noopener` instead of writing it with `document.write` into a
  same-origin window: the page has no `window.opener` and shares nothing with the app. The page prints itself once loaded.
- **`jspdf` is an optional peer dependency** instead of a dependency. A project that never exports PDF no longer installs
  it (and its `core-js` postinstall script). Install it with `npm install jspdf` to use PDF export; without it the export
  rejects with a clear message.

## [1.4.0] - 2026-11-05

Requires `@inandu-solutions/grid-core` ^0.1.2.

### Fixed

- **Pasting is strict and follows the grid's locale.** A number is read with the locale's separators (`1.234,56` in `es`),
  a numeric date in the order the locale writes it, and a boolean through a dictionary. Text a column cannot hold
  (`Infinity`, `0x10`, an ambiguous date, a word that is no boolean) is skipped instead of clearing the cell.
- **Sorting follows the column type**: text in a number or date column is compared as a number or a date (`'9'` before `'10'`).
- A numeric column shows an empty or blank cell as empty and a boolean as itself, not `0` / `1`; a `min` / `max` of `0` in a
  column filter now filters.

### Added

- `timeZone` input on `<inandu-column>`: the zone dates are shown and filtered in (`'local'`, `'utc'` or an IANA name such as `'America/Bogota'`).
- Date formats accept `MMM` / `MMMM` (month name in the grid's locale) and `[literal text]`.

## [1.3.0] - 2026-11-04

### Changed

- The framework-agnostic core is now the `@inandu-solutions/grid-core` package (a dependency) instead of a copy in
  `src/lib/core`, shared with the React and Vue grids. With it come the fixes made there: a bare `yyyy-mm-dd` cell is
  read as a local calendar day (it showed the previous day west of UTC), CSV cells that start with `=`, `+`, `-`,
  `@`, a tab or a carriage return are prefixed with a quote so a spreadsheet does not run them as formulas, the
  Excel export drops characters XML cannot carry, `downloadBlob` revokes its URL a second after the click, and tree
  flattening terminates on cyclic data.

## [1.2.3] - 2026-11-04

### Accessibility

- Sortable column headers expose `aria-sort` (`ascending` / `descending` / `none`).
- Data rows expose `aria-selected` when the grid is `selectable`.
- Paged, virtual-scroll and server-side grids expose `aria-rowcount` (header row included), so assistive
  technology can say "row 3 of 240" although only a page is in the DOM.
- A visually hidden polite live region (`role="status"`) announces loading, an error message and an empty
  result. It reuses the existing translated messages, so there are no new strings.

### Documentation

- `InanduEditTemplateContext`: documented that `value` is always the raw control shape (text), so a cell
  holding an array or object reaches a custom editor as text - store delimited strings, or read
  `row[field]`.

## [1.2.2] - 2026-10-21

### Changed

- README and npm page now mention the React and Vue ports (`@inandu-solutions/grid-react`,
  `@inandu-solutions/grid-vue`). No library source changes.

## [1.2.1] - 2026-10-14

### Changed

- Releases are now published from GitHub Actions via npm trusted publishing, so the package carries a
  provenance attestation. No library source changes.
- Author URL in `package.json` now points to `https://www.inandu.com/`.

## [1.2.0] - 2026-09-22

### Added

- **Angular 22 support** — peer/dependency ranges broadened to `^21.2.0 || ^22.0.0` for
  `@angular/core`, `@angular/common` and `@angular/cdk`. No library source changes were needed;
  Angular 22 requires TypeScript ~6.0, which the library's own tooling now accommodates.

## [1.1.0] - 2026-09-22

### Added

- **Runtime column control** — `setColumnOrder(fields)`, `setColumnPinned(field, side)` /
  `columnPinnedSide(column)`, and `setColumnWidth(field, width)`, so column order, pin side and
  width can all be changed (and saved/restored) programmatically, not just via header drag/resize.
- **Set filter** — `InanduGridColumnFilterValue.values?: string[]`, an Excel-style checklist filter
  matching against a column's formatted display value, independent of column type. Takes over from
  the type-specific filter keys once present (an empty array means "match nothing", not "no
  constraint").
- **Master-detail rows** (#4) — an expand/collapse toggle column plus a full-width detail row via
  `<ng-template inanduDetailTemplate let-row>`; `singleDetailExpand` for accordion-style expand.
  Flat/paged render path only (auto-disables while grouped or `virtualScroll`).
- **Column groups** (#26) — `<inandu-column-group title="…">` wraps a run of `<inandu-column>`
  children under one shared spanning header cell. One level of nesting; not collapsible; not yet
  reflected in exports.
- **Custom cell editor slot** — `<ng-template #inanduEditTemplate>` on a column replaces the
  built-in type-aware edit `<input>`, symmetric to the existing cell/header template slots.
- **`extraRowFilter`** — an extra `(row) => boolean` predicate ANDed onto the free-text and
  per-column filters, for filtering logic the grid doesn't model itself (e.g. an advanced
  AND/OR query builder). Ignored under `serverSide`.
- **Pinned rows** — `[pinnedTopRows]` / `[pinnedBottomRows]`, display-only rows (e.g. a computed
  summary) kept visible above/below the scrolling body, excluded from filter/sort/paging/totals.
- **Autosize on double-click** — double-clicking a resize handle fits the column to its widest
  rendered value (header included); gated by `[autosize]` (default on).
- **Tree data** (#3) — `treeChildrenKey` turns a row's nested array into an expandable subtree,
  with filtering/sorting/`treeDefaultExpanded` support and a `hasTreeData()`/`treeRows()`/
  `toggleTreeRow()` API. Non-virtualized, non-grouped, non-`serverSide` only.
- **`validateCell()`** — runs a column's synchronous validation chain against an arbitrary value,
  for whole-grid validation views (not just the row currently being edited).
- **Multi-range cell selection** (#16) — `multiRange` lets a Ctrl/Cmd-drag freeze the current
  selection rectangle and start another instead of replacing it; `(cellRangesChange)` and
  `cellRanges()` expose the whole list.
- **`(viewportRangeChange)`** (#21) — emitted only while `virtualScroll` + `serverSide` are both on:
  the row-index window the virtual viewport currently shows, for a block/windowed server row model
  to fetch exactly what's on screen.

### Fixed

- Incomplete CSS-selector escaping in the autosize column-content measurement (backslashes weren't
  escaped before quotes, allowing a crafted field name to break out of the attribute-selector
  value).

## [1.0.0] - 2026-08-31

First public release, published as `@inandu-solutions/grid-angular`. The bare
`@inandu-solutions/grid` name is reserved for a future framework-neutral umbrella;
a React port would ship as `@inandu-solutions/grid-react`, reusing this package's
framework-agnostic core (`projects/inandu-grid/src/lib/core/`, no `@angular/*`).

### Added

- **Standalone components** `<inandu-grid>` and `<inandu-column>` — no `NgModule`s,
  signal-based inputs/outputs.
- **Sorting** — per-column opt-in, single and multi-column (shift-click).
- **Filtering** — free-text search across all columns, plus per-column type-aware
  filters (text / number range / date range / boolean) combined with AND, and an
  advanced filter state for server-side mode.
- **Grouping** — drag a column header onto the drop zone.
- **Pagination** — via the `paging` input; off entirely when unbound.
- **Server-side mode** — `serverSide` + `totalItems` + `loading`/`error`; the grid
  stops processing locally and emits `sortChange` / `pageChange` / `filterChange`.
- **Row virtualization** (`virtualScroll`) and **infinite scroll** (`infiniteScroll`
  → `loadMore`).
- **Columns** — resize, drag-reorder, show/hide toggle, sticky (left/right),
  multi-level header groups, aggregates / totals row.
- **Rows** — selection, drag-reorder (`rowReorder` → `rowOrderChange`), inline
  editing / creation / deletion, clipboard copy/paste and cell-range selection.
- **Validation** — `required` / `min` / `max` / `pattern` / custom sync and async
  validators, checked at save time.
- **Export & print** — CSV (UTF-8 BOM), Excel (SpreadsheetML `.xls`, dependency-free),
  PDF (`jspdf`, lazy-loaded), and print.
- **i18n** — `lang` selector with 5 built-in languages (en, es, fr, it, zh) plus
  `customTranslations`; each grid instance is isolated. **RTL** via `dir`.
- **Theming** — `theme` with 3 CSS presets (`material`, `dark`, `minimal`), or a
  custom `.inandu-theme-<name>` rule.
- **Generic row typing** — `InanduGridComponent<T>`.
- Custom cell / header templates and custom row-action slots.

### Notes

- A real Open XML `.xlsx` export is a `@inandu-solutions/grid-pro` feature, not part of the
  MIT core.

[Unreleased]: https://github.com/inandusolutions/inandu-grid/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/inandusolutions/inandu-grid/compare/v1.2.3...v1.3.0
[1.2.3]: https://github.com/inandusolutions/inandu-grid/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/inandusolutions/inandu-grid/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/inandusolutions/inandu-grid/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/inandusolutions/inandu-grid/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/inandusolutions/inandu-grid/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/inandusolutions/inandu-grid/releases/tag/v1.0.0
