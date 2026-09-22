# Changelog

All notable changes to `@inandu-solutions/grid-angular` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/inandusolutions/inandu-grid/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/inandusolutions/inandu-grid/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/inandusolutions/inandu-grid/releases/tag/v1.0.0
