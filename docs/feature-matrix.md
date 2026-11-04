# Feature matrix: Angular, React and Vue

`@inandu-solutions/grid-angular` is the reference implementation. `grid-react` and `grid-vue` are
ports: the framework-agnostic core (sorting, filtering, aggregation, export, i18n) is copied across the
three repos and guarded by a CI check, but the component layer is written per framework, so the
surface is **not identical**. This table lists what each package supports today.

Legend: ✅ supported · ❌ not available (no equivalent prop, hook option or component).

Compared against `grid-angular` (current `main`) and `grid-react` / `grid-vue` 0.2.2, by their public
props / inputs and READMEs. If you find a row that is wrong, please open an issue.

## Available in all three

| Feature | Angular | React | Vue |
| --- | :-: | :-: | :-: |
| Sorting (single and multi-column) | ✅ | ✅ | ✅ |
| Free-text search and per-column filters | ✅ | ✅ | ✅ |
| Custom row predicate (`extraRowFilter`) | ✅ | ✅ | ✅ |
| Pagination | ✅ | ✅ | ✅ |
| Row grouping with aggregates | ✅ | ✅ | ✅ |
| Row selection | ✅ | ✅ | ✅ |
| CSV / Excel (`.xls`) / PDF export and print | ✅ | ✅ | ✅ |
| i18n, 5 built-in languages (`lang`) | ✅ | ✅ | ✅ |
| Inline edit, create and delete, with validation | ✅ | ✅ | ✅ |
| Clipboard copy / paste | ✅ | ✅ | ✅ |
| Cell range selection (`cellRangeSelection`, `multiRange`) | ✅ | ✅ | ✅ |
| Column show / hide, sticky (pinned) columns, drag reorder | ✅ | ✅ | ✅ |
| Column resize and autosize | ✅ | ✅ | ✅ |
| Row drag reorder | ✅ | ✅ | ✅ |
| Tree data (display and expand only) | ✅ | ✅ | ✅ |
| Master-detail | ✅ | ✅ | ✅ |
| Virtual scroll | ✅ | ✅ | ✅ |
| Server-side mode, paged (`serverSide`) | ✅ | ✅ | ✅ |

## Angular only

These exist in `grid-angular` and have **no counterpart yet** in `grid-react` / `grid-vue`.

| Feature | Angular | React | Vue |
| --- | :-: | :-: | :-: |
| Server-side infinite scroll (`infiniteScroll`, `loadMore`) | ✅ | ❌ | ❌ |
| Pinned top / bottom rows (`pinnedTopRows`, `pinnedBottomRows`) | ✅ | ❌ | ❌ |
| Totals row (`showTotals`) | ✅ | ❌ | ❌ |
| Column groups (`<inandu-column-group>`) | ✅ | ❌ | ❌ |
| Theme classes (`theme`) | ✅ | ❌ | ❌ |
| Right-to-left layout (`dir`) | ✅ | ❌ | ❌ |
| `loading` / `error` state on the grid component | ✅ | ❌ ¹ | ❌ ¹ |
| Persisted grid state (`stateKey`) | ✅ | ❌ | ❌ |
| Custom filter placeholder (`filterPlaceholder`) | ✅ | ❌ | ❌ |
| Custom translations (`customTranslations`) | ✅ | ❌ | ❌ |
| `ng add` / `ng generate` schematics | ✅ | n/a | n/a |

¹ `useInanduGridServer` returns `loading` and `error` for you to render yourself; the grid component
does not draw them.

## React and Vue differences

- Virtual scroll does not auto-measure the row height in React / Vue: pass `virtualRowHeight`.
- Both expose a headless API (`useInanduGrid` / `useInanduGridServer`) in addition to the component.
- Pro features (`@inandu-solutions/grid-pro`, `-pro-react`, `-pro-vue`) are tracked separately.
