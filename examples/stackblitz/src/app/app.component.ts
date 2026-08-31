import { Component, signal } from '@angular/core';
import {
  InanduGridComponent,
  InanduColumnComponent,
  InanduGridRow,
  InanduGridPagingOptions,
} from '@inandu-solutions/grid-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [InanduGridComponent, InanduColumnComponent],
  template: `
    <h1>&#64;inandu-solutions/grid-angular</h1>
    <p>
      Edit <code>src/app/app.component.ts</code> — the grid updates live. Try the search box,
      the column-filter funnels, sorting (shift-click for multi-sort), the &#9881; column toggle,
      the export toolbar, or drag the <em>Team</em> header onto the group-by zone.
    </p>

    <inandu-grid
      width="840"
      height="440"
      lang="en"
      theme="minimal"
      filter="true"
      selectable="true"
      exportable="true"
      columnToggle="true"
      showTotals="true"
      [data]="people()"
      [paging]="paging"
      (selectionChange)="selected.set($event)">
      <inandu-column field="name"   title="Name"    sortable="true" filter="yes"></inandu-column>
      <inandu-column field="team"   title="Team"    sortable="true" filter="yes" groupable="true"></inandu-column>
      <inandu-column field="role"   title="Role"></inandu-column>
      <inandu-column field="salary" title="Salary"  type="number"  format="1.0-0" sortable="true" filter="yes" aggregate="avg"></inandu-column>
      <inandu-column field="joined" title="Joined"  type="date"    format="DD/MM/YYYY" sortable="true"></inandu-column>
      <inandu-column field="active" title="Active"  type="boolean" format="Yes|No" filter="yes"></inandu-column>
    </inandu-grid>

    <p>{{ selected().length }} row(s) selected.</p>
  `,
  styles: [':host { display: block; }'],
})
export class AppComponent {
  readonly selected = signal<InanduGridRow[]>([]);

  readonly paging: InanduGridPagingOptions = { pageSize: 8 };

  readonly people = signal<InanduGridRow[]>(buildPeople());
}

function buildPeople(): InanduGridRow[] {
  const teams = ['Research', 'Platform', 'Design', 'Sales', 'Support'];
  const roles = ['Engineer', 'Lead', 'Manager', 'Analyst', 'Designer'];
  const first = ['Ada', 'Alan', 'Grace', 'Linus', 'Katherine', 'Edsger', 'Barbara', 'Donald', 'Radia', 'Margaret', 'Ken', 'Hedy', 'Tim', 'Anita', 'Guido', 'Bjarne', 'Vint', 'Frances', 'Dennis', 'Sophie'];
  const last = ['Lovelace', 'Turing', 'Hopper', 'Torvalds', 'Johnson', 'Dijkstra', 'Liskov', 'Knuth', 'Perlman', 'Hamilton', 'Thompson', 'Lamarr', 'Berners-Lee', 'Borg', 'van Rossum', 'Stroustrup', 'Cerf', 'Allen', 'Ritchie', 'Wilson'];

  return first.map((f, i) => ({
    name: `${f} ${last[i]}`,
    team: teams[i % teams.length],
    role: roles[i % roles.length],
    salary: 90000 + ((i * 7919) % 80000),
    joined: new Date(2016 + (i % 9), (i * 5) % 12, 1 + (i % 27)),
    active: i % 4 !== 0,
  }));
}
