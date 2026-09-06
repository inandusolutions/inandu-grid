# @inandu-solutions/grid-angular

A standalone Angular data grid built from two components — `<inandu-grid>` and
`<inandu-column>` — with a deliberately small dependency footprint. No `NgModule`s,
signal-based inputs/outputs, and every feature opt-in. A lightweight, MIT-licensed
alternative to the big commercial Angular grids.

[![npm](https://img.shields.io/npm/v/@inandu-solutions/grid-angular.svg)](https://www.npmjs.com/package/@inandu-solutions/grid-angular)
[![downloads](https://img.shields.io/npm/dm/@inandu-solutions/grid-angular.svg)](https://www.npmjs.com/package/@inandu-solutions/grid-angular)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@inandu-solutions/grid-angular)](https://bundlephobia.com/package/@inandu-solutions/grid-angular)
[![license](https://img.shields.io/npm/l/@inandu-solutions/grid-angular.svg)](https://github.com/inandusolutions/inandu-grid/blob/main/LICENSE)
![Angular](https://img.shields.io/badge/Angular-21-dd0031)
[![live demo](https://img.shields.io/badge/demo-live-0e7c74)](https://inandusolutions.github.io/inandu-grid/)
[![docs](https://img.shields.io/badge/docs-manual-0e7c74)](https://inandusolutions.github.io/inandu-grid/manual.html)
[![Open in StackBlitz](https://img.shields.io/badge/StackBlitz-open%20example-1389FD?logo=stackblitz&logoColor=white)](https://stackblitz.com/github/inandusolutions/inandu-grid/tree/main/examples/stackblitz)

[![inandu-grid — sorting, filtering, grouping, sticky columns, export toolbar](https://raw.githubusercontent.com/inandusolutions/inandu-grid/main/docs/screenshot.png)](https://inandusolutions.github.io/inandu-grid/)

> This is the **core** (MIT) package. Commercial add-ons ship separately as
> [`@inandu-solutions/grid-pro`](https://github.com/inandusolutions/grid-pro). The bare `@inandu-solutions/grid`
> name is reserved for a future framework-neutral umbrella (a React port would be
> `@inandu-solutions/grid-react`).

▶️ **Live demo:** <https://inandusolutions.github.io/inandu-grid/>
&nbsp;·&nbsp; ⚡ **StackBlitz:** [editable example](https://stackblitz.com/github/inandusolutions/inandu-grid/tree/main/examples/stackblitz)
&nbsp;·&nbsp; 📘 **Full manual** (every feature + API reference): <https://inandusolutions.github.io/inandu-grid/manual.html>

## Hello grid

```bash
ng add @inandu-solutions/grid-angular
```

```ts
import { InanduGridComponent, InanduColumnComponent } from '@inandu-solutions/grid-angular';

@Component({
  imports: [InanduGridComponent, InanduColumnComponent],
  template: `
    <inandu-grid [data]="people" filter="true">
      <inandu-column field="name" title="Name" sortable="true" />
      <inandu-column field="age" title="Age" type="number" sortable="true" />
    </inandu-grid>
  `,
})
export class PeopleComponent {
  people = [{ name: 'Ada', age: 36 }, { name: 'Alan', age: 41 }];
}
```

Two standalone components, a plain array in, click-to-sort and free-text search out. Everything
else — grouping, virtual scroll, inline editing, export, i18n, theming — is opt-in from here; see
**[Quick start](#quick-start)** below and the [manual](https://inandusolutions.github.io/inandu-grid/manual.html).

## Why this vs the big grids?

Row grouping, Excel export, cell-range selection and aggregation are **all free here** —
no enterprise tier. Small dependency footprint, Angular-native (signals, standalone). Not
a kitchen sink: no pivoting, no integrated charts, no built-in server-side row model
(`serverSide` + outputs let you wire your own). Fuller comparison table in the
[repo README](https://github.com/inandusolutions/inandu-grid#why-inandu-grid).

## Features

| Area | How you turn it on |
| --- | --- |
| **Sorting** | `<inandu-column sortable="true">` — click a header to cycle asc → desc; shift-click for multi-column sort |
| **Free-text search** | `<inandu-grid filter="true">` — one box, matches every column's formatted value |
| **Per-column filters** | `<inandu-column filter="yes">` — type-aware popup (text / number range / date range / boolean select), combined with AND |
| **Pagination** | `[paging]="{ pageSize: 25 }"` — an `InanduGridPagingOptions` object; off entirely when unbound |
| **Server-side data** | `serverSide` + `[totalItems]` + `[loading]` / `[error]` — the grid stops sorting/filtering/paging locally and emits `(sortChange)` / `(pageChange)` / `(filterChange)` for you to fetch each page |
| **Row virtualization** | `virtualScroll` — for large ungrouped datasets, via `@angular/cdk` virtual scroll |
| **Infinite scroll** | `infiniteScroll` (+ `infiniteScrollThreshold`) — emits `(loadMore)` as the user nears the end |
| **Grouping** | `<inandu-column groupable="true">` — drag a header onto the drop zone |
| **Aggregates / totals row** | `showTotals` + `<inandu-column aggregate="sum">` (`sum` / `avg` / `min` / `max` / `count`) |
| **Column resize / reorder / show-hide** | On by default; opt out per column with `resize="false"` / `reorder="false"` / `hideable="false"`. Grid-level toggle popup via `columnToggle="true"` |
| **Row reorder** | `rowReorder` — drag rows; emits `(rowOrderChange)` with the new order |
| **Sticky columns** | `<inandu-column sticky="true">` (or `sticky="right"`) — frozen while scrolling |
| **Row selection** | `selectable="true"` — checkbox column + `(selectionChange)` output |
| **Clipboard & cell ranges** | `clipboard` → `(cellsPaste)`; `cellRangeSelection` → `(cellRangeChange)` |
| **Inline editing / creation / deletion** | `<inandu-column editable="true">`, grid-level `creatable` / `deletable`; emits `rowSave` / `rowCreate` / `rowDelete` / `rowsDelete` — the grid never mutates your data |
| **Validation** | `required` / `min` / `max` / `pattern` / `[validator]` / `[asyncValidator]` per column, checked at save time |
| **Custom cell & header templates** | `<ng-template>` with `InanduCellTemplateContext` / `InanduHeaderTemplateContext` |
| **Custom row actions** | project your own buttons via the row-actions slot (`InanduRowActionsContext`) |
| **Export & print** | `exportable="true"` — CSV (UTF-8 BOM), Excel (SpreadsheetML `.xls`, dependency-free), PDF (`jspdf`), and print. Real `.xlsx` is a `@inandu-solutions/grid-pro` feature. |
| **i18n** | `lang="es-AR"` — 5 built-in languages (en, es, fr, it, zh) + `[customTranslations]`; each grid instance is isolated |
| **RTL** | `dir="rtl"` (or `"auto"`) |
| **Theming** | `theme="material"` — 3 presets (`material`, `dark`, `minimal`), pure CSS; or bring your own `.inandu-theme-<name>` rule |

## Requirements

| | |
| --- | --- |
| **Angular** | `^21.2.0` (`@angular/core` + `@angular/common` are peer dependencies) |
| **Node** | whatever your Angular 21 app already needs — `^20.19.0 \|\| ^22.12.0 \|\| >=24` |
| **Package manager** | npm, pnpm or yarn |
| **Browsers** | current Chrome, Firefox and Safari (Safari 16+ for fully correct sticky columns). No Internet Explorer. |
| **Standalone APIs** | your app must be able to `imports: [...]` standalone components (Angular 14.1+ — always true on 21) |

## Installation

```bash
ng add @inandu-solutions/grid-angular
```

Installs the package and scaffolds a ready-to-run `GridDemoComponent` (skip it with
`--skip-example`). Show it by routing to `GridDemoComponent` or dropping
`<app-grid-demo></app-grid-demo>` into a template, then `ng serve`.

Prefer to wire it up yourself:

```bash
npm install @inandu-solutions/grid-angular
```

You can also scaffold an example component into an existing app at any time:

```bash
ng generate @inandu-solutions/grid-angular:grid my-grid
```

### Dependencies

**Peer** (you provide): `@angular/core`, `@angular/common` `^21.2.0`.

**Bundled** (installed automatically, nothing to configure — internal implementation
details): `@angular/cdk` (virtual scroll), `@ngx-translate/core` (i18n), `jspdf`
(PDF export — loaded lazily), and `tslib`.

## Quick start

Both components are standalone — add them to your component's `imports`:

```ts
import { Component } from '@angular/core';
import { InanduGridComponent, InanduColumnComponent, InanduGridRow } from '@inandu-solutions/grid-angular';

@Component({
  selector: 'app-people',
  imports: [InanduGridComponent, InanduColumnComponent],
  template: `
    <inandu-grid
      [data]="rows"
      [paging]="{ pageSize: 10 }"
      filter="true"
      lang="en">
      <inandu-column field="name"   title="Name"   sortable="true"></inandu-column>
      <inandu-column field="age"    title="Age"    type="number"  sortable="true"></inandu-column>
      <inandu-column field="joined" title="Joined" type="date"    format="DD/MM/YYYY"></inandu-column>
      <inandu-column field="active" title="Active" type="boolean" format="Yes|No"></inandu-column>
    </inandu-grid>
  `,
})
export class PeopleComponent {
  rows: InanduGridRow[] = [
    { name: 'Ada Lovelace',   age: 36, joined: new Date(2021, 2, 14), active: true },
    { name: 'Alan Turing',    age: 41, joined: new Date(2019, 8, 1),  active: false },
    { name: 'Grace Hopper',   age: 45, joined: new Date(2020, 0, 20), active: true },
  ];
}
```

The grid only ever consumes a plain `InanduGridRow[]`. Fetching, persistence, and
async concerns stay in your app: handle `(rowSave)`, `(rowCreate)`, `(rowDelete)`,
`(selectionChange)` and update your own array (and/or your backend) however you like.

## Column value types & formatting

`<inandu-column type="…" format="…">` controls how a cell's raw value is displayed:

- **`number`** — `format` is a `DecimalPipe`-style digits string, e.g. `format="1.2-2"`.
  Separators follow the app's `LOCALE_ID`.
- **`date`** — `format` is a case-sensitive token pattern (`YYYY`, `MM`, `DD`, `HH`,
  `mm`, `ss`, `sss`), e.g. `format="DD/MM/YYYY HH:mm"`. Raw value may be a `Date`, an
  ISO string, or a timestamp. Defaults to `YYYY-MM-DD`.
- **`boolean`** — `format` is `"<truthy>|<falsy>"`, e.g. `format="Sí|No"`.
- **`string`** (default) — raw value stringified as-is.

## Public API

`InanduGridComponent<T = InanduGridRow>` and `InanduColumnComponent` are the two
exported components. The main types (see `public-api.ts` for the full surface):

```ts
InanduGridRow                  // Record<string, unknown> — the default row type
InanduGridPagingOptions        // { pageSize?, show*Button?, *Label?, pageLabel? }
InanduGridRowSave<T>           // { row, values } — emitted by (rowSave)
InanduGridNewRowValues<T>      // parsed values — emitted by (rowCreate)
InanduGridSortCriterion        // { field, direction } — (sortChange), multi-sort
InanduGridPageState            // (pageChange), for serverSide
InanduGridFilterState          // (filterChange), for serverSide
InanduGridLoadMoreEvent        // (loadMore), for infiniteScroll
InanduGridCellPaste<T>         // (cellsPaste)
InanduGridCellRangeSelection<T>// (cellRangeChange)
InanduGridCustomTranslations   // [customTranslations]
InanduColumnType               // 'string' | 'number' | 'boolean' | 'date'
InanduColumnValidator          // (value, row) => string | null
InanduColumnAsyncValidator     // (value, row) => Promise<string | null>
InanduColumnAggregate          // 'sum' | 'avg' | 'min' | 'max' | 'count'
InanduCellTemplateContext / InanduHeaderTemplateContext / InanduRowActionsContext
```

`(rowDelete)` / `(rowsDelete)` emit row references; `(selectionChange)` and
`(rowOrderChange)` emit `T[]`.

## Styling hooks

Every structural element carries a stable `inandu-*` class (`inandu-grid`,
`inandu-column`, `inandu-row`, …) with no default rule attached — target them from
your own global stylesheet, e.g.:

```css
inandu-grid .inandu-row:nth-child(even) { background: #fafafa; }
```

## Browser support

Chrome, Firefox, Safari (current). No IE.

## Contributing & source

Source, issues, and the demo app: <https://github.com/inandusolutions/inandu-grid>

## License

[MIT](./LICENSE) © [Inandu SAS](https://inandu.com)
