import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import {
  InanduGridRow,
  InanduGridComponent,
  InanduColumnComponent,
  InanduGridPagingOptions,
  InanduGridRowSave,
  InanduGridNewRowValues,
} from '@inandu-solutions/grid-angular';
import { RouterOutlet } from '@angular/router';

const USERS_API_URL = 'https://jsonplaceholder.typicode.com/users';

/** Which demo panel the showcase tabs are showing. */
export type DemoTab = 'overview' | 'editing' | 'tree' | 'scale' | 'themes';

/** Pads the hand-written account list up to 100+ rows so pagination has something to page through. */
function buildAdditionalAccounts(count: number): InanduGridRow[] {
  const cities = ['Madrid', 'Barcelona', 'Lisbon', 'Rome', 'Paris', 'Berlin', 'Amsterdam', 'Vienna', 'Zurich', 'Dublin'];
  const roles = ['Owner', 'Sales Representative', 'Marketing Manager', 'Order Administrator', 'Accounting Manager'];
  const names = ['Northwind', 'Blue Harbour', 'Cedar & Co', 'Fairline', 'Greenfield', 'Harborview', 'Ironwood', 'Juniper', 'Kestrel', 'Lakeside'];
  const contacts = ['A. Novak', 'B. Rossi', 'C. Dubois', 'D. Meyer', 'E. Larsen', 'F. Costa', 'G. Petrov', 'H. Nilsen', 'I. Varga', 'J. Moreau'];
  const suffixes = ['Trading', 'Foods', 'Supply', 'Group', 'Partners'];
  const rows: InanduGridRow[] = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      Id: `ACC${String(i).padStart(3, '0')}`,
      Company: `${names[i % names.length]} ${suffixes[i % suffixes.length]}`,
      Contact: contacts[i % contacts.length],
      Role: roles[i % roles.length],
      City: cities[i % cities.length],
      Active: i % 3 !== 0,
      Since: new Date(2015 + (i % 10), i % 12, 1 + (i % 28)),
      Revenue: Math.round((500 + i * 137.35) * 100) / 100,
    });
  }
  return rows;
}

/**
 * 5,000 rows purely to demonstrate `virtualScroll` — large enough that rendering every `<tr>` up
 * front (the default, non-virtualized behavior) would be noticeably slower.
 */
function buildLargeDataset(count: number): InanduGridRow[] {
  const categories = ['Electronics', 'Home', 'Sports', 'Toys', 'Books'];
  const products = ['Widget', 'Gadget', 'Module', 'Adapter', 'Bracket', 'Sensor', 'Cable', 'Housing'];
  const rows: InanduGridRow[] = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      id: i,
      product: `${products[i % products.length]} ${String(i).padStart(4, '0')}`,
      category: categories[i % categories.length],
      price: Math.round((5 + i * 3.37) * 100) / 100,
      inStock: i % 4 !== 0,
    });
  }
  return rows;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.less',
  imports: [InanduGridComponent, InanduColumnComponent, RouterOutlet],
})
export class AppComponent {
  readonly npmPackage = '@inandu-solutions/grid-angular';
  readonly repoUrl = 'https://github.com/inandusolutions/inandu-grid';
  readonly npmUrl = 'https://www.npmjs.com/package/@inandu-solutions/grid-angular';
  readonly manualUrl = 'manual.html';
  readonly stackblitzUrl = 'https://stackblitz.com/github/inandusolutions/inandu-grid/tree/main/examples/stackblitz';
  readonly extensionsUrl = 'https://github.com/inandusolutions/inandu-grid-extensions';

  /** Code samples live here rather than inline in the template so the markup stays readable and
   *  the newlines survive Angular's whitespace handling. */
  readonly serverSnippet = [
    '// ASP.NET Core — one call does paging, sorting,',
    '// filtering, grouping and aggregates in one query.',
    '',
    'app.MapGet("/api/accounts", (HttpRequest req, AppDb db) =>',
    '    db.Accounts',
    '      .AsNoTracking()',
    '      .ToInanduGridAsync(req.QueryString.Value));',
  ].join('\n');

  readonly usageSnippet = [
    '<inandu-grid [data]="rows" filter="true"',
    '             selectable="true" exportable="true"',
    '             [paging]="{ pageSize: 25 }">',
    '  <inandu-column title="Company" field="company"',
    '                 sortable="true" filter="yes" />',
    '  <inandu-column title="Revenue" field="revenue"',
    '                 type="number" aggregate="sum" />',
    '</inandu-grid>',
  ].join('\n');

  /** Which showcase panel is visible. Every grid stays in the DOM (panels toggle with `hidden`),
   *  so switching tabs never re-runs a grid's first render. */
  readonly activeTab = signal<DemoTab>('overview');

  selectTab(tab: DemoTab): void {
    this.activeTab.set(tab);
  }

  /** Copy-to-clipboard state for the install snippet in the hero. */
  readonly copied = signal(false);

  copyInstall(): void {
    void navigator.clipboard?.writeText(`npm install ${this.npmPackage}`).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    });
  }

  // ---------------------------------------------------------------- overview

  public accounts: InanduGridRow[] = [];

  /** Rows pinned above/below the scroll body — not part of `data()`, so sort/filter/paging ignore them. */
  public pinnedTopAccounts: InanduGridRow[] = [];
  public pinnedBottomAccounts: InanduGridRow[] = [];

  readonly accountsPaging: InanduGridPagingOptions = { pageSize: 10 };

  /** Populated by the overview grid's `(selectionChange)`. */
  readonly selectedAccounts = signal<InanduGridRow[]>([]);

  onAccountsSelectionChange(rows: InanduGridRow[]): void {
    this.selectedAccounts.set(rows);
  }

  // ----------------------------------------------------------------- editing

  /**
   * Local, hardcoded data (no HTTP) to try row creation, editing, deletion and reordering in
   * isolation. Every column type is `editable="true"`; `Product` and `Price` are required and
   * `Price` has `min="0"`, so an empty or negative value shows an inline validation error instead
   * of saving. The grid never mutates `data()` — persisting is each handler's job below.
   */
  readonly inventory = signal<InanduGridRow[]>([
    { id: 1, product: 'Mechanical keyboard', price: 45.5, inStock: true, restock: new Date(2026, 5, 1) },
    { id: 2, product: 'Wireless mouse', price: 15.99, inStock: false, restock: new Date(2026, 6, 15) },
    { id: 3, product: '27" monitor', price: 199, inStock: true, restock: new Date(2026, 4, 20) },
    { id: 4, product: 'USB-C dock', price: 89.9, inStock: true, restock: new Date(2026, 7, 8) },
  ]);

  readonly lastAction = signal('');

  onInventoryRowSave(save: InanduGridRowSave): void {
    this.inventory.update(rows => rows.map(row => (row === save.row ? { ...row, ...save.values } : row)));
    this.lastAction.set(`Row saved: ${JSON.stringify(save.values)}`);
  }

  onInventoryRowDelete(row: InanduGridRow): void {
    this.inventory.update(rows => rows.filter(r => r !== row));
    this.lastAction.set(`Row deleted: ${JSON.stringify(row)}`);
  }

  onInventoryRowCreate(values: InanduGridNewRowValues): void {
    const nextId = Math.max(0, ...this.inventory().map(row => Number(row['id']) || 0)) + 1;
    this.inventory.update(rows => [...rows, { id: nextId, ...values }]);
    this.lastAction.set(`Row created: ${JSON.stringify({ id: nextId, ...values })}`);
  }

  /** `rowActionsTemplate` — a "Duplicate" button beside Edit/Delete, added from the app's own template. */
  onInventoryRowDuplicate(row: InanduGridRow): void {
    const nextId = Math.max(0, ...this.inventory().map(r => Number(r['id']) || 0)) + 1;
    this.inventory.update(rows => [...rows, { ...row, id: nextId }]);
    this.lastAction.set(`Row duplicated: ${JSON.stringify({ ...row, id: nextId })}`);
  }

  /** `rowReorder` — the grid emits the new order; applying it back to the source is up to the app. */
  onInventoryRowOrderChange(rows: InanduGridRow[]): void {
    this.inventory.set(rows);
    this.lastAction.set('Rows reordered');
  }

  // -------------------------------------------------------------------- tree

  /** `treeChildrenKey="children"` — each row's nested `children` array is its subtree. */
  readonly catalog: InanduGridRow[] = [
    {
      name: 'Electronics', units: 0, active: true, children: [
        {
          name: 'Computing', units: 0, active: true, children: [
            { name: 'Laptops', units: 42, active: true },
            { name: 'Monitors', units: 65, active: true },
            { name: 'Keyboards', units: 120, active: false },
          ],
        },
        {
          name: 'Audio', units: 0, active: true, children: [
            { name: 'Headphones', units: 60, active: true },
            { name: 'Speakers', units: 25, active: false },
          ],
        },
      ],
    },
    {
      name: 'Home', units: 0, active: true, children: [
        { name: 'Lighting', units: 200, active: true },
        { name: 'Furniture', units: 15, active: true, children: [{ name: 'Chairs', units: 8, active: true }] },
      ],
    },
    { name: 'Uncategorised', units: 3, active: false },
  ];

  // ------------------------------------------------------------------- scale

  /** No paging config — `virtualScroll` replaces pagination entirely. */
  readonly largeDataset: InanduGridRow[] = buildLargeDataset(5000);

  // ------------------------------------------------------------------ themes

  readonly themePaging: InanduGridPagingOptions = { pageSize: 5 };

  // ------------------------------------------------------- remote data (API)

  readonly usersPaging: InanduGridPagingOptions = {
    pageSize: 5,
    firstLabel: '⏮',
    previousLabel: '◀',
    nextLabel: '▶',
    lastLabel: '⏭',
  };

  /**
   * Fetched once from a public API rather than hardcoded. A plain writable `signal` (not
   * `toSignal()`) because the row-save handler below updates it after an edit. `active` and
   * `joined` don't exist on the real response — they're derived client-side purely to show
   * boolean/date column formatting.
   */
  readonly users = signal<InanduGridRow[]>([]);

  /** Optimistic local update plus a POST; JSONPlaceholder fakes success without persisting. */
  onUserRowSave(save: InanduGridRowSave): void {
    this.users.update(rows => rows.map(row => (row === save.row ? { ...row, ...save.values } : row)));
    this.http.post(USERS_API_URL, { ...save.row, ...save.values }).subscribe({
      error: err => console.error('Failed to POST row save', err),
    });
  }

  /** Fires after the user confirms the grid's own `deleteConfirmMessage` prompt. */
  onUserRowDelete(row: InanduGridRow): void {
    this.users.update(rows => rows.filter(r => r !== row));
    this.http.delete(`${USERS_API_URL}/${row['id']}`).subscribe({
      error: err => console.error('Failed to DELETE row', err),
    });
  }

  private readonly http = inject(HttpClient);

  constructor() {
    this.http
      .get<InanduGridRow[]>(USERS_API_URL)
      .pipe(
        map(users =>
          users.map(user => {
            const id = Number(user['id']) || 0;
            return { ...user, active: id % 2 === 0, joined: new Date(2020, 0, id) };
          }),
        ),
        catchError(() => of<InanduGridRow[]>([])),
      )
      .subscribe(rows => this.users.set(rows));

    this.accounts = [
      { Id: 'ALFKI', Company: 'Alfreds Futterkiste', Contact: 'Maria Anders', Role: 'Sales Representative', City: 'Berlin', Active: true, Since: new Date(2021, 2, 12), Revenue: 12500.5 },
      { Id: 'ANATR', Company: 'Ana Trujillo Emparedados', Contact: 'Ana Trujillo', Role: 'Owner', City: 'Mexico City', Active: false, Since: new Date(2019, 7, 3), Revenue: 980.25 },
      { Id: 'ANTON', Company: 'Antonio Moreno Taquería', Contact: 'Antonio Moreno', Role: 'Owner', City: 'Mexico City', Active: true, Since: new Date(2022, 10, 30), Revenue: 4310 },
      { Id: 'AROUT', Company: 'Around the Horn', Contact: 'Thomas Hardy', Role: 'Sales Representative', City: 'London', Active: true, Since: new Date(2020, 4, 18), Revenue: 27890.75 },
      { Id: 'BERGS', Company: 'Berglunds snabbköp', Contact: 'Christina Berglund', Role: 'Order Administrator', City: 'Luleå', Active: false, Since: new Date(2018, 11, 1), Revenue: 1560.4 },
      { Id: 'BLAUS', Company: 'Blauer See Delikatessen', Contact: 'Hanna Moos', Role: 'Sales Representative', City: 'Mannheim', Active: true, Since: new Date(2023, 1, 9), Revenue: 6200 },
      { Id: 'BLONP', Company: 'Blondel père et fils', Contact: 'Frédérique Citeaux', Role: 'Marketing Manager', City: 'Strasbourg', Active: false, Since: new Date(2017, 5, 22), Revenue: 15230.1 },
      { Id: 'BOLID', Company: 'Bólido Comidas preparadas', Contact: 'Martín Sommer', Role: 'Owner', City: 'Madrid', Active: true, Since: new Date(2021, 8, 14), Revenue: 3420.9 },
      { Id: 'BONAP', Company: 'Bon app', Contact: 'Laurence Lebihan', Role: 'Owner', City: 'Marseille', Active: true, Since: new Date(2020, 0, 27), Revenue: 890 },
      { Id: 'BOTTM', Company: 'Bottom-Dollar Markets', Contact: 'Elizabeth Lincoln', Role: 'Accounting Manager', City: 'Vancouver', Active: false, Since: new Date(2019, 3, 5), Revenue: 41200.35 },
      ...buildAdditionalAccounts(90),
    ];

    const totalRevenue = this.accounts.reduce((sum, r) => sum + (Number(r['Revenue']) || 0), 0);
    const topAccount = this.accounts.reduce(
      (best, r) => ((Number(r['Revenue']) || 0) > (Number(best['Revenue']) || 0) ? r : best),
      this.accounts[0],
    );
    this.pinnedTopAccounts = [{ ...topAccount, Company: `★ ${topAccount['Company']}`, Role: 'Top account' }];
    this.pinnedBottomAccounts = [
      {
        Id: '', Company: `TOTAL · ${this.accounts.length} accounts`, Contact: '',
        Role: '', City: '', Active: null, Since: null, Revenue: totalRevenue,
      },
    ];
  }
}
