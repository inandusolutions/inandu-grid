import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import corpus from '../contract/diff-corpus.json';
import { InanduColumnComponent } from '../inandu-column/inandu-column.component';
import type { InanduGridColumnFilterValue, InanduGridRow } from '@inandu-solutions/grid-core';
import { InanduGridComponent } from './inandu-grid.component';

/**
 * The differential corpus: the same rows and requests are run through grid-core, grid-angular, grid-react, grid-vue and
 * Inandu.Grid.Extensions, and each must return `expectedIds`, in order. This is the grid-angular half; the file is a copy
 * of the canonical one in inandu-grid-extensions (CI compares them).
 */
interface Case {
  name: string;
  client: { filters?: Record<string, InanduGridColumnFilterValue>; query?: string; sort?: [string, 'asc' | 'desc'][] };
  expectedIds: number[];
}

@Component({
  template: `
    <inandu-grid [data]="rows" [filter]="true">
      <inandu-column field="id" title="id" type="number" [filter]="true"></inandu-column>
      <inandu-column field="name" title="name" type="string" [filter]="true"></inandu-column>
      <inandu-column field="qty" title="qty" type="number" [filter]="true"></inandu-column>
      <inandu-column field="price" title="price" type="number" [filter]="true"></inandu-column>
      <inandu-column field="when" title="when" type="date" [filter]="true"></inandu-column>
      <inandu-column field="active" title="active" type="boolean" [filter]="true"></inandu-column>
      <inandu-column field="tag" title="tag" type="string" [filter]="true"></inandu-column>
    </inandu-grid>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class CorpusHostComponent {
  rows = corpus.rows as InanduGridRow[];
}

describe('differential corpus (grid-angular)', () => {
  for (const c of corpus.cases as unknown as Case[]) {
    it(c.name, () => {
      const fixture = TestBed.createComponent(CorpusHostComponent);
      fixture.detectChanges();
      const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

      grid.columnFilters.set(c.client.filters ?? {});
      grid.filterQuery.set(c.client.query ?? '');
      grid.sortCriteria.set((c.client.sort ?? []).map(([field, direction]) => ({ field, direction })));

      expect(grid.sortedData().map(row => row['id'])).toEqual(c.expectedIds);
    });
  }
});
