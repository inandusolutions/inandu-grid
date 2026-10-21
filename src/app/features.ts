import type { DemoTab } from './app.component';

export type Tone = 'teal' | 'green' | 'amber' | 'violet' | 'rose' | 'blue';

export interface Feature {
  id: string;
  title: string;
  blurb: string;
  tone: Tone;
  /** Key into ICON_PATHS. */
  icon: string;
  code: string;
  /** Demo tab that shows this feature running, when there is one. */
  demo?: DemoTab;
  /** README anchor on GitHub, or a page of the manual. */
  doc: string;
}

// Stroke icons, 24x24 viewBox. Paths are deliberately simple.
export const ICON_PATHS: Record<string, string> = {
  sort: 'M7 4v16M7 4 3.5 7.5M7 4l3.5 3.5M17 20V4M17 20l-3.5-3.5M17 20l3.5-3.5',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5',
  download: 'M12 4v11M12 15l-4-4M12 15l4-4M4 20h16',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  columns: 'M4 5h16v14H4zM9.5 5v14M14.5 5v14',
  grid: 'M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16',
  zap: 'M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z',
  server: 'M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01',
  puzzle: 'M9 4h3a2 2 0 1 1 4 0h3v4a2 2 0 1 0 0 4v4h-4a2 2 0 1 0-4 0H7v-4a2 2 0 1 1 0-4V4h2Z',
  tree: 'M6 4v8a3 3 0 0 0 3 3h3M6 4a2 2 0 1 0 0 .01M6 9h6M15 15a2 2 0 1 0 4 0 2 2 0 0 0-4 0M13 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z',
  pin: 'M12 17v5M8 3h8l-1 6 3 3H6l3-3-1-6Z',
};

const README = 'https://github.com/inandusolutions/inandu-grid#';

// Snippets use the real inputs / outputs — keep them in sync with projects/inandu-grid.
export const FEATURES: Feature[] = [
  {
    id: 'sort-filter',
    title: 'Sorting & filtering',
    blurb:
      'Click a header to sort, shift-click for a second column. One free-text box covers every column, and each column gets a filter that matches its type: text, number range, date range or boolean. Need your own rule? Layer a predicate on top.',
    tone: 'teal',
    icon: 'sort',
    demo: 'overview',
    doc: 'manual.html',
    code: `<inandu-grid [data]="rows" filter="true"
             [extraRowFilter]="onlyActive"
             [paging]="{ pageSize: 25 }">
  <inandu-column title="Company" field="company"
                 sortable="true" filter="yes" />
  <inandu-column title="Revenue" field="revenue"
                 type="number" sortable="true" filter="yes" />
</inandu-grid>`,
  },
  {
    id: 'grouping',
    title: 'Grouping & aggregates',
    blurb:
      'Drag a header into the group bar and get live sum / avg / min / max / count per group, plus a totals row. Declare the aggregate once on the column.',
    tone: 'green',
    icon: 'layers',
    demo: 'overview',
    doc: 'manual.html',
    code: `<inandu-grid [data]="rows" showTotals="true">
  <inandu-column title="City" field="city" groupable="true" />
  <inandu-column title="Revenue" field="revenue"
                 type="number" format="1.2-2" aggregate="sum" />
</inandu-grid>
<!-- drag "City" into the group bar -->`,
  },
  {
    id: 'export',
    title: 'CSV / Excel / PDF export',
    blurb:
      'One flag adds a toolbar that exports exactly the rows you are looking at. jspdf is lazy-loaded, so the PDF path costs nothing until someone clicks it.',
    tone: 'amber',
    icon: 'download',
    demo: 'overview',
    doc: 'manual.html',
    code: `<inandu-grid [data]="rows" exportable="true">
  <!-- CSV, Excel and PDF buttons appear in the toolbar -->
</inandu-grid>`,
  },
  {
    id: 'editing',
    title: 'Inline editing & validation',
    blurb:
      'Mark columns editable and the grid handles edit, create, delete and row reordering. Required / min / max / pattern, a custom validator and async validators run at save time. The grid never mutates your data — outputs hand you the change.',
    tone: 'violet',
    icon: 'pencil',
    demo: 'editing',
    doc: 'manual.html',
    code: `<inandu-grid [data]="inventory()" creatable="true" deletable="true"
             (rowSave)="onSave($event)"
             (rowCreate)="onCreate($event)"
             (rowDelete)="onDelete($event)">
  <inandu-column title="Product" field="product"
                 editable="true" required="true" />
  <inandu-column title="Price" field="price" type="number"
                 editable="true" required="true" min="0" />
</inandu-grid>`,
  },
  {
    id: 'columns',
    title: 'Columns, your way',
    blurb:
      'Resize by dragging, autosize with a double-click, drag headers to reorder, pin columns left or right, and let users show or hide columns at runtime.',
    tone: 'blue',
    icon: 'columns',
    demo: 'overview',
    doc: 'manual.html',
    code: `<inandu-grid [data]="rows" columnToggle="true">
  <inandu-column title="Name" field="name" width="180"
                 sticky="true" stickySide="left" />
  <inandu-column title="Team" field="team" hideable="false" />
  <inandu-column title="Salary" field="salary" reorder="false" />
</inandu-grid>`,
  },
  {
    id: 'range',
    title: 'Selection & cell ranges',
    blurb:
      'Checkbox row selection, click-and-drag cell ranges, Ctrl-drag for several rectangles at once, and clipboard copy / paste straight to and from Excel.',
    tone: 'rose',
    icon: 'grid',
    doc: 'manual.html',
    code: `<inandu-grid [data]="rows" selectable="true"
             cellRangeSelection="true" multiRange="true"
             clipboard="true"
             (selectionChange)="onRows($event)"
             (cellRangeChange)="onRange($event)"
             (cellsPaste)="onPaste($event)">
  …
</inandu-grid>`,
  },
  {
    id: 'virtual',
    title: 'Virtual scroll',
    blurb:
      'Render only the rows in view, so five thousand rows scroll as smoothly as fifty — no pagination needed. Infinite scroll is one more flag when the data arrives in chunks.',
    tone: 'green',
    icon: 'zap',
    demo: 'scale',
    doc: 'manual.html',
    code: `<inandu-grid [data]="fiveThousandRows" height="420"
             virtualScroll="true">
  <inandu-column title="Product" field="product" sortable="true" />
</inandu-grid>

<!-- chunked data: add infiniteScroll="true" and (loadMore)="next()" -->`,
  },
  {
    id: 'server',
    title: 'Server-side data',
    blurb:
      'Let the backend sort, filter and page. The grid emits its state as outputs; the .NET companion package parses the query and runs one paged SQL query for you.',
    tone: 'amber',
    icon: 'server',
    doc: 'docs/aspnet-core-server-side.html',
    code: `<inandu-grid [data]="page().rows" serverSide="true"
             [totalItems]="page().total"
             (sortChange)="load($event)"
             (pageChange)="load($event)"
             (filterChange)="load($event)" />

// ASP.NET Core — Inandu.Grid.Extensions
app.MapGet("/api/accounts", (HttpRequest req, AppDb db) =>
    db.Accounts.AsNoTracking()
      .ToInanduGridAsync(req.QueryString.Value));`,
  },
  {
    id: 'templates',
    title: 'Custom templates & detail rows',
    blurb:
      'Replace any cell or header with your own template — sorting, resizing and validation keep working. Drop an <ng-template inanduDetailTemplate> inside the grid for an expandable master-detail row.',
    tone: 'violet',
    icon: 'puzzle',
    doc: 'manual.html',
    code: `<inandu-grid [data]="orders">
  <inandu-column title="Status" field="status">
    <ng-template #cellTemplate let-value let-row="row">
      <app-status-badge [status]="value" />
    </ng-template>
  </inandu-column>

  <ng-template inanduDetailTemplate let-row>
    <app-order-lines [order]="row" />
  </ng-template>
</inandu-grid>`,
  },
  {
    id: 'tree',
    title: 'Tree data & pinned rows',
    blurb:
      'Point the grid at the key that holds each row’s children and it renders an expandable tree that filtering and sorting understand. Pin rows above or below the scroll body for totals or a top account.',
    tone: 'teal',
    icon: 'tree',
    demo: 'tree',
    doc: 'manual.html',
    code: `<inandu-grid [data]="catalog"
             treeChildrenKey="children"
             treeDefaultExpanded="all"
             [pinnedTopRows]="top"
             [pinnedBottomRows]="totals">
  <inandu-column title="Name" field="name" />
</inandu-grid>`,
  },
  {
    id: 'i18n',
    title: 'i18n & theming',
    blurb:
      'English, Spanish, French, Italian and Chinese are bundled; override any string. Themes are CSS custom properties, with material, dark and minimal built in.',
    tone: 'blue',
    icon: 'globe',
    demo: 'themes',
    doc: 'manual.html',
    code: `<inandu-grid [data]="rows" lang="es" theme="dark" />

<!-- en · es · fr · it · zh -->
<!-- override any label with [customTranslations] -->`,
  },
  {
    id: 'state',
    title: 'Remembered state',
    blurb:
      'Give the grid a state key and it remembers sort, filters and column widths, order and visibility across visits — per grid, in the browser.',
    tone: 'rose',
    icon: 'pin',
    doc: 'manual.html',
    code: `<inandu-grid [data]="rows" stateKey="accounts"
             (sortChange)="log($event)"
             (filterChange)="log($event)" />
<!-- persisted under "inandu-grid-state:accounts" -->`,
  },
];

export const featureDocUrl = (doc: string) => (doc.startsWith('http') ? doc : doc.endsWith('.html') ? doc : README + doc);
