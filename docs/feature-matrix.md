# Feature matrix: Angular, React and Vue

`@inandu-solutions/grid-angular` is the reference implementation. `grid-react` and `grid-vue` are
ports: the framework-agnostic core (sorting, filtering, aggregation, export, i18n, saved state, the
delete confirmation and the check of a server reply) is the shared
[`@inandu-solutions/grid-core`](https://github.com/inandusolutions/inandu-grid-core) package, but the
component layer is written per framework, so the surface is **not identical**. This table lists what
each package supports today.

Legend: ✅ supported · ❌ not available (no equivalent prop, hook option or component) · † on `main`
but not in a release yet (the next release of that package will have it).

Compared on 2026-11-20 against the `main` of each repo (`grid-angular` 1.7.0, `grid-react` and
`grid-vue` 0.5.2, plus what was merged after them), by their public props / inputs / options, their
READMEs and their tests. If you find a row that is wrong, please open an issue.

## Available in all three

| Feature | Angular | React | Vue | Notes |
| --- | :-: | :-: | :-: | --- |
| Sorting (single and multi-column) | ✅ | ✅ | ✅ | |
| Free-text search and per-column filters | ✅ | ✅ | ✅ | `filterPlaceholder` in all three |
| Custom row predicate (`extraRowFilter`) | ✅ | ✅ | ✅ | |
| Pagination | ✅ | ✅ | ✅ | Angular has more options, see below |
| Row grouping with aggregates | ✅ | ✅ | ✅ | |
| Totals row (`showTotals`) | ✅ | ✅ | ✅ | |
| Pinned top / bottom rows (`pinnedTopRows`, `pinnedBottomRows`) | ✅ | ✅ | ✅ | |
| Row selection, and bulk delete of the selection | ✅ | ✅ | ✅ | |
| CSV / Excel (`.xls`) / PDF export and print | ✅ | ✅ | ✅ | |
| i18n, 5 built-in languages (`lang`), custom texts (`customTranslations`) | ✅ | ✅ | ✅ | |
| Right-to-left layout (`dir`) and theme classes (`theme`) | ✅ | ✅ | ✅ | |
| `loading` and `error` state drawn by the grid | ✅ | ✅ | ✅ | |
| Inline edit, create and delete | ✅ | ✅ | ✅ | |
| Validation: required, min, max, pattern, custom and async validators | ✅ | ✅ | ✅ | `asyncValidatorError` shapes the text of a failed check |
| Your own delete confirmation (`confirmDelete`, sync or async) | ✅ † | ✅ † | ✅ † | Replaces `window.confirm()`; see each README |
| Clipboard copy / paste | ✅ | ✅ | ✅ | |
| Cell range selection (`cellRangeSelection`, `multiRange`) | ✅ | ✅ | ✅ | |
| Column show / hide, sticky (pinned) columns, drag reorder | ✅ | ✅ | ✅ | |
| Column resize and autosize | ✅ | ✅ | ✅ | |
| Row drag reorder | ✅ | ✅ | ✅ | |
| Tree data (display and expand only) | ✅ | ✅ | ✅ | |
| Master-detail | ✅ | ✅ | ✅ | Angular: a template; React / Vue: `renderDetail` |
| Custom cell, header and edit-control rendering | ✅ | ✅ | ✅ | Angular: templates; React / Vue: `renderCell`, `renderHeader`, `renderEditor` |
| Time zone per date column (`timeZone`) | ✅ | ✅ | ✅ | |
| Virtual scroll | ✅ | ✅ | ✅ | Fixed row height only; see "Differences" |
| Server-side mode, paged (`serverSide`) | ✅ | ✅ | ✅ | |
| Saved grid state (`stateKey`, `persist`) | ✅ | ✅ | ✅ | Restored on the first draw; a page being hydrated restores right after |
| Server rendering (SSR) | ✅ | ✅ | ✅ | The saved state and the delete confirmation do not touch `localStorage` or `window.confirm()` on the server; React and Vue are tested hydrating a server-rendered page, Vue also with Nuxt |
| Accessibility notes and a manual checklist (`ACCESSIBILITY.md`) | ✅ | ✅ | ✅ | |

## Angular only

These exist in `grid-angular` and have **no counterpart yet** in `grid-react` / `grid-vue`.

| Feature | Angular | React | Vue |
| --- | :-: | :-: | :-: |
| Server-side infinite scroll (`infiniteScroll`, `loadMore`) | ✅ | ❌ | ❌ |
| Visible-row window reported to the app (`viewportRangeChange`) | ✅ | ❌ | ❌ |
| Column groups (`<inandu-column-group>`) | ✅ | ❌ | ❌ |
| Pager options: first / last buttons, button labels, page label (`paging`) | ✅ | ❌ | ❌ |
| Toolbar button labels (`toolbarLabels`) | ✅ | ❌ | ❌ |
| Row height measured by itself in virtual scroll | ✅ | ❌ | ❌ |
| `ng add` / `ng generate` schematics | ✅ | n/a | n/a |

## React and Vue only

These exist in `grid-react` / `grid-vue` and have **no counterpart** in `grid-angular`.

| Feature | Angular | React | Vue | Notes |
| --- | :-: | :-: | :-: | --- |
| Headless API (`useInanduGrid`) next to the component | ❌ | ✅ | ✅ | Bring your own markup |
| Ready-made server data layer (`useInanduGridServer`: aborts superseded requests, debounces, checks the reply, `mapResponse` †) | ❌ | ✅ | ✅ | Angular emits `sortChange` / `pageChange` / `filterChange`; the app does the request |
| Stable row identity (`rowId`) | ❌ | ✅ | ✅ | Angular follows a row by its object |
| Start from a known saved state (`initialState` †), for server-rendered pages | ❌ | ✅ | ✅ | |
| PageUp / PageDown and Ctrl+Home / Ctrl+End in the grid | ❌ | ✅ | ✅ | Documented in Angular's `ACCESSIBILITY.md` |
| Export file name (`exportFilenameBase`) | ❌ | ✅ | ✅ | In Angular the file is named from `id` |

## Differences worth knowing

- **Virtual scroll** assumes a fixed row height in all three. Angular measures the first row by
  itself; React and Vue use `virtualRowHeight` (default 40), so pass the real height if your rows
  are not 40px. A row taller than that makes the scroll position drift. Variable row height is not
  supported anywhere, and not scheduled.
- **Notifications.** In all three, `selectionChange` and the cell-range callbacks report what the
  user does, and none fires when the grid mounts. React and Vue report sort, filter and page
  changes the same way, and do not report a saved state being put back; a server-side grid there
  hears its first (restored) query through `queryChange` / `onQueryChange`. In Angular,
  `sortChange`, `pageChange` and `filterChange` exist for `serverSide` only and fire from the first
  value on, so the app can start its first fetch from them.
- **Versions:** React and Vue are `0.x`, so a minor release can change their API; Angular follows
  SemVer from `1.0`.
- Pro features (`@inandu-solutions/grid-pro`, `-pro-react`, `-pro-vue`) are tracked separately.

## How this table is kept right

It is written from the code, not from memory: each row was checked against the public props, inputs
and options of the three packages (the Angular `input()`s and `output()`s, the React props and the
Vue `defineProps`), and against their tests and READMEs. When a feature is added to one package, add
or update its row here in the same pull request.
