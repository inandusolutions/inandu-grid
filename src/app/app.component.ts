import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { InanduGridRow, InanduGridComponent, InanduColumnComponent, InanduGridPagingOptions, InanduGridRowSave, InanduGridNewRowValues } from '@inandu-solutions/grid-angular';
import { RouterOutlet } from '@angular/router';

const USERS_API_URL = 'https://jsonplaceholder.typicode.com/users';

/** Pads the hardcoded 10-row customer list up to 100+ rows so pagination has something to page through. */
function buildAdditionalCustomers(count: number): InanduGridRow[] {
  const cities = ['Madrid', 'Barcelona', 'Lisboa', 'Roma', 'Paris', 'Berlin', 'Amsterdam', 'Vienna', 'Zurich', 'Dublin'];
  const roles = ['Owner', 'Sales Representative', 'Marketing Manager', 'Order Administrator', 'Accounting Manager'];
  const rows: InanduGridRow[] = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      Id: `CUST${String(i).padStart(3, '0')}`,
      Nombre: `Cliente Demo ${i}`,
      Apellido: `Apellido ${i}`,
      ContactTitle: roles[i % roles.length],
      City: cities[i % cities.length],
      Activo: i % 3 !== 0,
      FechaAlta: new Date(2015 + (i % 10), i % 12, 1 + (i % 28)),
      Ventas: Math.round((500 + i * 137.35) * 100) / 100,
    });
  }
  return rows;
}

/**
 * 5,000 rows purely to demonstrate `virtualScroll` — large enough that rendering every `<tr>` up
 * front (the default, non-virtualized behavior) would be noticeably slower than this, unlike
 * `buildAdditionalCustomers`'s much more modest row count for the paginated demo grid above.
 */
function buildVirtualScrollData(count: number): InanduGridRow[] {
  const categories = ['Electrónica', 'Hogar', 'Deportes', 'Juguetes', 'Librería'];
  const rows: InanduGridRow[] = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      id: i,
      product: `Producto ${i}`,
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
    imports: [InanduGridComponent, InanduColumnComponent, RouterOutlet]
})
export class AppComponent {
  title = 'grid-app';

  public gridData: InanduGridRow[] = [];

  /** Kept at defaults — `lang="es-AR"` on the grid itself now supplies "Página X de Y" automatically. */
  readonly customersPaging: InanduGridPagingOptions = {
    pageSize: 10,
  };

  /** Custom button glyphs (appearance) combined with `lang="zh-CN"` (translated text) on the grid itself. */
  readonly usersPaging: InanduGridPagingOptions = {
    pageSize: 3,
    firstLabel: '⏮',
    previousLabel: '◀',
    nextLabel: '▶',
    lastLabel: '⏭',
  };

  /** `virtualScroll="true"` demo grid's data — see `buildVirtualScrollData`'s doc comment. No paging config: `virtualScroll` replaces pagination entirely (see `inandu-grid.component.ts`'s doc comment on the input). */
  readonly virtualScrollData: InanduGridRow[] = buildVirtualScrollData(5000);

  /** Shared by the three `theme="..."` demo grids below — just enough paging to also show the themed pager. */
  readonly themeDemoPaging: InanduGridPagingOptions = {
    pageSize: 5,
  };

  /** Populated by `customers-grid`'s `(selectionChange)` — demonstrates the grid's row-selection output. */
  readonly selectedCustomers = signal<InanduGridRow[]>([]);

  onCustomersSelectionChange(rows: InanduGridRow[]): void {
    this.selectedCustomers.set(rows);
  }

  private readonly http = inject(HttpClient);

  /**
   * Second grid's data source: fetched once from a public API instead of hardcoded. A plain
   * writable `signal` (not `toSignal()`) because `onApiRowSave()` below needs to update it after a
   * row edit — `toSignal()`'s result is read-only. `active`/`joined` don't exist on the real API
   * response — they're derived client-side from `id` purely to demonstrate boolean/date column
   * formatting on this grid too.
   */
  readonly apiGridData = signal<InanduGridRow[]>([]);

  /**
   * Demonstrates `inandu-grid`'s row-editing output: `name` and `active` are `editable="true"` on
   * `users-grid` below, so each row gets an "Edit" button that switches those two fields into
   * controls at once. The grid itself never mutates `data()` (see `InanduGridRowSave`'s doc comment in
   * the library), so persisting the edit — locally, remotely, or both — is entirely this handler's
   * job. Here that means an optimistic local update (so the grid visibly reflects the edit right
   * away) plus a `POST` to JSONPlaceholder, which fakes a success response without actually
   * persisting anything server-side — exactly what it's designed for.
   */
  onApiRowSave(save: InanduGridRowSave): void {
    this.apiGridData.update(rows => rows.map(row => row === save.row ? { ...row, ...save.values } : row));
    this.http.post(USERS_API_URL, { ...save.row, ...save.values }).subscribe({
      error: err => console.error('Failed to POST row save', err),
    });
  }

  /**
   * Demonstrates `inandu-grid`'s row-deletion output on the one grid that also sets
   * `deleteConfirmMessage` — by the time this fires, the user already confirmed via the browser's
   * native `window.confirm()` prompt the grid itself triggers. Same optimistic-local-update +
   * fire-and-forget-request pattern as `onApiRowSave()`, just a `DELETE` instead of a `POST`.
   */
  onApiRowDelete(row: InanduGridRow): void {
    this.apiGridData.update(rows => rows.filter(r => r !== row));
    this.http.delete(`${USERS_API_URL}/${row['id']}`).subscribe({
      error: err => console.error('Failed to DELETE row', err),
    });
  }

  /**
   * A grid with only local, hardcoded data (no HTTP involved at all) purely to try row creation,
   * editing, and deletion in isolation — every column type (`'string'`/`'number'`/`'boolean'`/
   * `'date'`) is `editable="true"` here, `creatable="true"` adds an "➕ Add row" trigger above the
   * data (with `Producto` `required="true"` and `Precio` `required="true" min="0"`, so submitting
   * the new row blank or with a negative price shows an inline validation error instead of saving),
   * `deletable="true"` has no `deleteConfirmMessage` (so "Delete" removes the row immediately, no
   * prompt — the other, HTTP-backed grid below demonstrates the with-confirmation path instead), and
   * `lastActionSummary` renders the last saved/deleted/created row directly in the template so all
   * three features are visibly working without needing to open devtools.
   */
  readonly editDemoData = signal<InanduGridRow[]>([
    { id: 1, product: 'Teclado mecánico', price: 45.5, inStock: true, restock: new Date(2026, 5, 1) },
    { id: 2, product: 'Mouse inalámbrico', price: 15.99, inStock: false, restock: new Date(2026, 6, 15) },
    { id: 3, product: 'Monitor 27"', price: 199, inStock: true, restock: new Date(2026, 4, 20) },
  ]);

  readonly lastActionSummary = signal('');

  onEditDemoRowSave(save: InanduGridRowSave): void {
    this.editDemoData.update(rows => rows.map(row => row === save.row ? { ...row, ...save.values } : row));
    this.lastActionSummary.set(`Fila guardada: ${JSON.stringify(save.values)}`);
  }

  onEditDemoRowDelete(row: InanduGridRow): void {
    this.editDemoData.update(rows => rows.filter(r => r !== row));
    this.lastActionSummary.set(`Fila eliminada: ${JSON.stringify(row)}`);
  }

  onEditDemoRowCreate(values: InanduGridNewRowValues): void {
    const nextId = Math.max(0, ...this.editDemoData().map(row => Number(row['id']) || 0)) + 1;
    this.editDemoData.update(rows => [...rows, { id: nextId, ...values }]);
    this.lastActionSummary.set(`Fila creada: ${JSON.stringify({ id: nextId, ...values })}`);
  }

  /** Demonstrates `rowActionsTemplate` — a "Duplicar" button next to Edit/Delete, added purely via the grid's own custom-row-actions `<ng-template>`, no library changes needed. */
  onEditDemoRowDuplicate(row: InanduGridRow): void {
    const nextId = Math.max(0, ...this.editDemoData().map(r => Number(r['id']) || 0)) + 1;
    this.editDemoData.update(rows => [...rows, { ...row, id: nextId }]);
    this.lastActionSummary.set(`Fila duplicada: ${JSON.stringify({ ...row, id: nextId })}`);
  }

  /** Demonstrates `rowReorder` — dragging a row's grip handle reorders it; the grid only emits the new order, so applying it back to `editDemoData` is this handler's job. */
  onEditDemoRowOrderChange(rows: InanduGridRow[]): void {
    this.editDemoData.set(rows);
    this.lastActionSummary.set('Filas reordenadas');
  }

  constructor() {
    this.http.get<InanduGridRow[]>(USERS_API_URL).pipe(
      map(users => users.map(user => {
        const id = Number(user['id']) || 0;
        return {
          ...user,
          active: id % 2 === 0,
          //joined: new Date(2020, 0, id),
          joined: new Date(),
        };
      })),
      catchError(() => of<InanduGridRow[]>([]))
    ).subscribe(rows => this.apiGridData.set(rows));

    this.gridData = [
      {
        Id: "ALFKI",
        Nombre: "Alfreds Futterkiste",
        Apellido: "Maria Anders",
        ContactTitle: "Sales Representative",
        City: "Berlin",
        Activo: true,
        FechaAlta: new Date(2021, 2, 12),
        Ventas: 12500.5,
      },
      {
        Id: "ANATR",
        Nombre: "Ana Trujillo Emparedados y helados",
        Apellido: "Ana Trujillo",
        ContactTitle: "Owner",
        City: "México D.F.",
        Activo: false,
        FechaAlta: new Date(2019, 7, 3),
        Ventas: 980.25,
      },
      {
        Id: "ANTON",
        Nombre: "Antonio Moreno Taquería",
        Apellido: "Antonio Moreno",
        ContactTitle: "Owner",
        City: "México D.F.",
        Activo: true,
        FechaAlta: new Date(2022, 10, 30),
        Ventas: 4310,
      },
      {
        Id: "AROUT",
        Nombre: "Around the Horn",
        Apellido: "Thomas Hardy",
        ContactTitle: "Sales Representative",
        City: "London",
        Activo: true,
        FechaAlta: new Date(2020, 4, 18),
        Ventas: 27890.75,
      },
      {
        Id: "BERGS",
        Nombre: "Berglunds snabbköp",
        Apellido: "Christina Berglund",
        ContactTitle: "Order Administrator",
        City: "Luleå",
        Activo: false,
        FechaAlta: new Date(2018, 11, 1),
        Ventas: 1560.4,
      },
      {
        Id: "BLAUS",
        Nombre: "Blauer See Delikatessen",
        Apellido: "Hanna Moos",
        ContactTitle: "Sales Representative",
        City: "Mannheim",
        Activo: true,
        FechaAlta: new Date(2023, 1, 9),
        Ventas: 6200,
      },
      {
        Id: "BLONP",
        Nombre: "Blondesddsl père et fils",
        Apellido: "Frédérique Citeaux",
        ContactTitle: "Marketing Manager",
        City: "Strasbourg",
        Activo: false,
        FechaAlta: new Date(2017, 5, 22),
        Ventas: 15230.1,
      },
      {
        Id: "BOLID",
        Nombre: "Bólido Comidas preparadas",
        Apellido: "Martín Sommer",
        ContactTitle: "Owner",
        City: "Madrid",
        Activo: true,
        FechaAlta: new Date(2021, 8, 14),
        Ventas: 3420.9,
      },
      {
        Id: "BONAP",
        Nombre: "Bon app",
        Apellido: "Laurence Lebihan",
        ContactTitle: "Owner",
        City: "Marseille",
        Activo: true,
        FechaAlta: new Date(2020, 0, 27),
        Ventas: 890,
      },
      {
        Id: "BOTTM",
        Nombre: "Bottom-Dollar Markets",
        Apellido: "Elizabeth Lincoln",
        ContactTitle: "Accounting Manager",
        City: "Tsawassen",
        Activo: false,
        FechaAlta: new Date(2019, 3, 5),
        Ventas: 41200.35,
      },
      ...buildAdditionalCustomers(90),
    ];

  }
}