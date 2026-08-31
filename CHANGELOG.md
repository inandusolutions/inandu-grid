# Changelog

All notable changes to `@inandu-solutions/grid-angular` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/inandusolutions/inandu-grid/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/inandusolutions/inandu-grid/releases/tag/v1.0.0
