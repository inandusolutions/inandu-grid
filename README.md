# inandu-grid

**A lightweight, MIT-licensed Angular data grid with the essentials other grids gate behind a
paid enterprise licence — row grouping, aggregates, inline editing and Excel-compatible (`.xls`)
export.** Sorting, filtering, pagination, virtual scroll, i18n and theming come with it too, in a
deliberately small dependency footprint.

[![npm](https://img.shields.io/npm/v/@inandu-solutions/grid-angular.svg)](https://www.npmjs.com/package/@inandu-solutions/grid-angular)
[![downloads](https://img.shields.io/npm/dm/@inandu-solutions/grid-angular.svg)](https://www.npmjs.com/package/@inandu-solutions/grid-angular)
[![CI](https://github.com/inandusolutions/inandu-grid/actions/workflows/ci.yml/badge.svg)](https://github.com/inandusolutions/inandu-grid/actions/workflows/ci.yml)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@inandu-solutions/grid-angular)](https://bundlephobia.com/package/@inandu-solutions/grid-angular)
[![license](https://img.shields.io/npm/l/@inandu-solutions/grid-angular.svg)](LICENSE)
![Angular](https://img.shields.io/badge/Angular-21-dd0031)
[![live demo](https://img.shields.io/badge/demo-live-0e7c74)](https://inandusolutions.github.io/inandu-grid/)
[![docs](https://img.shields.io/badge/docs-manual-0e7c74)](https://inandusolutions.github.io/inandu-grid/manual.html)
[![Open in StackBlitz](https://img.shields.io/badge/StackBlitz-open%20example-1389FD?logo=stackblitz&logoColor=white)](https://stackblitz.com/github/inandusolutions/inandu-grid/tree/main/examples/stackblitz)

[![inandu-grid — free-text search filtering the grid live](docs/demo.gif)](https://inandusolutions.github.io/inandu-grid/)

<sub>Live free-text search on the demo grid. [Try every feature →](https://inandusolutions.github.io/inandu-grid/)</sub>

## Try it in 30 seconds

```bash
ng add @inandu-solutions/grid-angular
```

```ts
import { InanduGridComponent, InanduColumnComponent } from '@inandu-solutions/grid-angular';

@Component({
  standalone: true,
  imports: [InanduGridComponent, InanduColumnComponent],
  template: `
    <inandu-grid [data]="rows" filter="true">
      <inandu-column field="name" title="Name" sortable="true" />
      <inandu-column field="age" title="Age" type="number" sortable="true" />
    </inandu-grid>
  `,
})
export class DemoComponent {
  rows = [{ name: 'Ada', age: 36 }, { name: 'Alan', age: 41 }];
}
```

- **▶️ [Live demo](https://inandusolutions.github.io/inandu-grid/)** — try every feature in the browser.
- **⚡ [Edit in StackBlitz](https://stackblitz.com/github/inandusolutions/inandu-grid/tree/main/examples/stackblitz)** — the grid in a bare Angular app; edit `src/app/app.component.ts` and it updates live ([source](examples/stackblitz)).
- **📘 [User manual](https://inandusolutions.github.io/inandu-grid/manual.html)** — every feature with examples + a full API reference.

## Who is this for?

- **CRUD / business apps** that need a sortable, filterable, editable table without pulling in a
  full enterprise grid framework.
- **Admin dashboards** that need grouping, aggregates and CSV/Excel/PDF export out of the box.
- **Data-heavy Angular apps** that need virtual scroll or server-side paging for large datasets,
  including a first-class ASP.NET Core / EF Core story — see [Server-side data](#server-side-data-net) below.

**When not to use it:** if you need pivot tables or integrated charting built into the grid
itself, this isn't that — see [Not included](#not-included) below.

## Why inandu-grid?

Most full-featured Angular grids are either heavy, or gate the genuinely useful parts —
row grouping, Excel export, cell-range selection, aggregation — behind a paid **enterprise
licence**. inandu-grid is **MIT in full**: every feature on this page is free. It also keeps
a **small dependency footprint** and a modern **Angular-native** design — standalone
components, signal inputs/outputs, no `NgModule`s.

| | inandu-grid | AG Grid | PrimeNG Table |
| --- | --- | --- | --- |
| Licence | **MIT, all features** | MIT core + **paid Enterprise** (grouping, Excel, range selection, pivot, tree data…) | MIT |
| Footprint | deliberately minimal (`@angular/cdk`, `@ngx-translate`, `jspdf` lazy-loaded) | large | ships as part of the full PrimeNG library |
| Frameworks | Angular only (signals, standalone) | Angular / React / Vue / vanilla | Angular only |
| Row grouping & aggregates | ✅ free | Enterprise | ✅ |
| Excel-compatible / CSV / PDF export | ✅ free (`.xls` + CSV + PDF) | CSV free; Excel is Enterprise | CSV free |
| Pivoting, integrated charts | ❌ | Enterprise | ❌ |
| Server-side paging / sorting / filtering | ✅ `serverSide` mode + [`inandu-grid-extensions`](https://github.com/inandusolutions/inandu-grid-extensions) (.NET / EF Core companion) | Enterprise | bring-your-own |

<sub>Orientation, not a scorecard — check each project's own docs for the current details. Coming
from [AG Grid](docs/migrating-from-ag-grid.html) or [PrimeNG](docs/migrating-from-primeng.html)?
There are migration guides for both.</sub>

## Not included

Deliberately *not* a kitchen sink: no pivoting and no integrated charts — those stay out of scope
so the core stays small and auditable. If you need pivot tables or built-in charts, AG Grid
Enterprise is the right tool. Server-side paging, sorting and filtering **are** supported — put
the grid in `serverSide` mode and wire it to any backend, or drop in the official .NET companion
below. If you want a solid, free, lightweight grid, this is it.

## Server-side data (.NET)

[`inandu-grid-extensions`](https://github.com/inandusolutions/inandu-grid-extensions) is the
official .NET / EF Core companion. Put `<inandu-grid serverSide>` against your API and a single
`ToInanduGrid()` call turns each sort / filter / page request into one paged SQL query (paging,
sorting, filtering, grouping, aggregates, keyset cursors). MIT, on NuGet — see the
[ASP.NET Core tutorial](docs/aspnet-core-server-side.html) for a full walkthrough.

## React version & commercial add-ons

- **React version:** [`inandu-grid-react`](https://github.com/inandusolutions/inandu-grid-react) —
  feature-complete with this package, published as `@inandu-solutions/grid-react`. Its core
  (sorting, filtering, aggregation, export, i18n) is ported by hand from this repo's
  [`projects/inandu-grid/src/lib/core/`](projects/inandu-grid/src/lib/core/). Has its own
  [StackBlitz example](https://stackblitz.com/github/inandusolutions/inandu-grid-react/tree/main/examples/stackblitz).
- **Commercial add-ons:** `@inandu-solutions/grid-pro` *(proprietary, separate package)* — a React
  port, `@inandu-solutions/grid-pro-react`, is also in progress (private). The bare
  `@inandu-solutions/grid` name is intentionally reserved for a future framework-neutral umbrella.

## See it

Row grouping, inline editing and virtual scroll — the parts other grids gate behind an
enterprise licence — running in the [demo](https://inandusolutions.github.io/inandu-grid/).

| Group by a column | Edit a cell in place |
| --- | --- |
| [![grouping](docs/gifs/grouping.gif)](https://inandusolutions.github.io/inandu-grid/) | [![inline editing](docs/gifs/inline-edit.gif)](https://inandusolutions.github.io/inandu-grid/) |

[![virtual scroll over 5,000 rows](docs/gifs/virtual-scroll.gif)](https://inandusolutions.github.io/inandu-grid/)

<sub>More: [tree data](docs/gifs/tree-data.gif) · [multi-column sort](docs/gifs/multi-sort.gif) · [row selection](docs/gifs/row-selection.gif) — all in the [demo](https://inandusolutions.github.io/inandu-grid/).</sub>

## What's in this repo

This is an Angular CLI **multi-project workspace**:

| Project | Path | What it is |
| --- | --- | --- |
| `inandu-grid` | `projects/inandu-grid/` | The **library** — the distributable, published to npm as `@inandu-solutions/grid-angular`. Built with `ng-packagr`. |
| `grid-app` | `src/` | The **demo / test harness app**. Not published; it only exists to exercise the library. |

## Requirements

**To use `@inandu-solutions/grid-angular` in your app:**

| | |
| --- | --- |
| Angular | `^21.2.0` (`@angular/core` + `@angular/common`, peer dependencies) |
| Node | whatever your Angular 21 app needs — `^20.19.0 \|\| ^22.12.0 \|\| >=24` |
| Browsers | current Chrome / Firefox / Safari (Safari 16+ for fully correct sticky columns); no IE |

`@angular/cdk`, `@ngx-translate/core`, `jspdf` and `tslib` are pulled in automatically —
nothing to configure. See [`projects/inandu-grid/README.md`](projects/inandu-grid/README.md).

**To develop this repo:**

| | |
| --- | --- |
| Node | `^20.19.0 \|\| ^22.12.0 \|\| >=24` — [`.nvmrc`](.nvmrc) pins **22** |
| npm | 10+ |
| Unit tests | a Chrome / Chromium install (Karma `ChromeHeadless`); optionally Firefox for `--browsers=FirefoxHeadless` |
| e2e | Playwright browsers (`npx playwright install`) — **run under Node 22**; Playwright's test runner currently fails to load under Node 24 |

## Quick start (using the library in your app)

```bash
ng add @inandu-solutions/grid-angular
```

Installs it and drops in a runnable `GridDemoComponent` (`--skip-example` to skip). Or install
plain with `npm install @inandu-solutions/grid-angular` and add the two standalone components
(`InanduGridComponent`, `InanduColumnComponent`) to a component's `imports`. `ng generate
@inandu-solutions/grid-angular:grid <name>` scaffolds an example into an existing app any time.

See [`projects/inandu-grid/README.md`](projects/inandu-grid/README.md) for the full
component API, inputs/outputs, and examples.

## Developing this repo

```bash
npm install          # install dependencies
npm start            # build the library, then ng serve — http://localhost:4200
npm run build:lib    # build the library only (dist/inandu-grid) — includes the schematics
npm run build        # build library + demo app
npm run lint         # lint both projects
npm run test:lib     # unit tests for the library (Karma/Jasmine, headless Chrome)
npm run test:schematics  # ng-add / generate schematics (node:test)
npm test             # unit tests for the demo app
npm run e2e          # Playwright end-to-end tests against the built demo
```

> **Workflow gotcha:** the demo app resolves `@inandu-solutions/grid-angular` from the *built*
> output in `dist/inandu-grid`, not from the library's TS source. After changing
> anything under `projects/inandu-grid/src/`, run `npm run build:lib` before
> serving/testing the app, or you'll be looking at stale behavior. `npm start`,
> `npm run build` and the e2e config all build the library first for you.

For a single headless unit-test run without watch mode:

```bash
npx ng test inandu-grid --watch=false --browsers=ChromeHeadless
```

More detail — cross-browser testing, focusing a single spec, architecture — in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Contributing

Issues and PRs welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) first, and
note the [Code of Conduct](.github/CODE_OF_CONDUCT.md). Security reports:
[`.github/SECURITY.md`](.github/SECURITY.md).

## Releasing

Maintainers: see [`PUBLISHING.md`](PUBLISHING.md).

## License

[MIT](LICENSE) © [Inandu SAS](https://inandu.com)
