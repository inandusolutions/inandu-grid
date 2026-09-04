import { Component, Type } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { InanduGridComponent, InanduGridPagingOptions, InanduGridRow, InanduGridRowSave, InanduGridNewRowValues, InanduGridSortCriterion, InanduGridPageState, InanduGridFilterState, InanduGridCellPaste, InanduGridCellRangeSelection, InanduGridLoadMoreEvent } from './inandu-grid.component';
import { InanduColumnComponent, InanduColumnValidator, InanduColumnAsyncValidator } from '../inandu-column/inandu-column.component';
import { InanduDetailTemplateDirective } from './inandu-detail-template.directive';

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Name" field="name" sortable="true"></inandu-column>
      <inandu-column title="Score" field="score"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class HostComponent {
  rows: InanduGridRow[] = [
    { name: 'Charlie', score: 2 },
    { name: 'Alice', score: 3 },
    { name: 'Bob', score: 1 },
  ];
}

describe('InanduGridComponent sorting', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function nameColumnValues(): string[] {
    return fixture.debugElement
      .queryAll(By.css('tbody tr'))
      .map(row => row.query(By.css('td')).nativeElement.textContent.trim());
  }

  it('does not render a sort button for non-sortable columns', () => {
    const headers = fixture.debugElement.queryAll(By.css('th'));
    expect(headers[1].query(By.css('.inandu-sort-button'))).toBeNull();
  });

  it('sorts ascending on first click and descending on second click', () => {
    expect(nameColumnValues()).toEqual(['Charlie', 'Alice', 'Bob']);

    const sortButton = fixture.debugElement.query(By.css('.inandu-sort-button'));
    sortButton.nativeElement.click();
    fixture.detectChanges();
    expect(nameColumnValues()).toEqual(['Alice', 'Bob', 'Charlie']);

    sortButton.nativeElement.click();
    fixture.detectChanges();
    expect(nameColumnValues()).toEqual(['Charlie', 'Bob', 'Alice']);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Price" field="price" type="number" format="1.2-2"></inandu-column>
      <inandu-column title="Joined" field="joined" type="date" format="DD/MM/YYYY"></inandu-column>
      <inandu-column title="JoinedDefault" field="joined" type="date"></inandu-column>
      <inandu-column title="MonthVsMinute" field="joined" type="date" format="MM:mm"></inandu-column>
      <inandu-column title="Active" field="active" type="boolean" format="Yes|No"></inandu-column>
      <inandu-column title="Nickname" field="nickname" type="string"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class FormattingHostComponent {
  rows: InanduGridRow[] = [
    // June (month 06) at 45 minutes past the hour — deliberately distinct so a format bug that
    // confused month/minutes (case-insensitive tokens) would produce a wrong, detectable value.
    { name: 'Widget', price: 1234.5, joined: new Date(2024, 5, 15, 3, 45, 9), active: true, nickname: null },
  ];
}

describe('InanduGridComponent formatting', () => {
  let fixture: ComponentFixture<FormattingHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FormattingHostComponent] });
    fixture = TestBed.createComponent(FormattingHostComponent);
    fixture.detectChanges();
  });

  function cellValues(): string[] {
    return fixture.debugElement
      .queryAll(By.css('tbody td'))
      .map(cell => cell.nativeElement.textContent.trim());
  }

  it('formats each cell according to its column type and format', () => {
    const [name, price, joined, joinedDefault, monthVsMinute, active, nickname] = cellValues();
    expect(name).toBe('Widget');
    expect(price).toBe('1,234.50');
    expect(joined).toBe('15/06/2024');
    expect(joinedDefault).toBe('2024-06-15');
    expect(monthVsMinute).toBe('06:45');
    expect(active).toBe('Yes');
    expect(nickname).toBe('');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Value" field="value" sortable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class NoPagingHostComponent {
  rows: InanduGridRow[] = Array.from({ length: 25 }, (_, i) => ({ value: i + 1 }));
}

@Component({
  template: `
    <inandu-grid [data]="rows" [paging]="paging" lang="en">
      <inandu-column title="Value" field="value" sortable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class PagingHostComponent {
  rows: InanduGridRow[] = Array.from({ length: 25 }, (_, i) => ({ value: i + 1 }));
  paging: InanduGridPagingOptions = { pageSize: 10 };
}

describe('InanduGridComponent paging', () => {
  it('renders every row with no footer when paging is not bound', () => {
    const fixture = TestBed.createComponent(NoPagingHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('tbody tr')).length).toBe(25);
    expect(fixture.debugElement.query(By.css('tfoot'))).toBeNull();
  });

  it('paginates rows and navigates via first/previous/next/last', () => {
    const fixture = TestBed.createComponent(PagingHostComponent);
    fixture.detectChanges();

    const rowValues = () => fixture.debugElement
      .queryAll(By.css('tbody tr td'))
      .map(cell => cell.nativeElement.textContent.trim());
    const pagerButton = (label: string) => fixture.debugElement.query(By.css(`[aria-label="${label}"]`));
    const pageLabelText = () => fixture.debugElement.query(By.css('.inandu-pager-label')).nativeElement.textContent.trim();

    expect(rowValues()).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 1)));
    expect(pageLabelText()).toBe('Page 1 of 3');
    expect(pagerButton('First page').nativeElement.disabled).toBeTrue();
    expect(pagerButton('Previous page').nativeElement.disabled).toBeTrue();
    expect(pagerButton('Next page').nativeElement.disabled).toBeFalse();

    pagerButton('Next page').nativeElement.click();
    fixture.detectChanges();
    expect(rowValues()).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 11)));
    expect(pageLabelText()).toBe('Page 2 of 3');

    pagerButton('Last page').nativeElement.click();
    fixture.detectChanges();
    expect(rowValues()).toEqual(Array.from({ length: 5 }, (_, i) => String(i + 21)));
    expect(pageLabelText()).toBe('Page 3 of 3');
    expect(pagerButton('Next page').nativeElement.disabled).toBeTrue();
    expect(pagerButton('Last page').nativeElement.disabled).toBeTrue();

    pagerButton('First page').nativeElement.click();
    fixture.detectChanges();
    expect(pageLabelText()).toBe('Page 1 of 3');
  });

  it('resets to page 1 when the sort changes', () => {
    const fixture = TestBed.createComponent(PagingHostComponent);
    fixture.detectChanges();

    const pageLabelText = () => fixture.debugElement.query(By.css('.inandu-pager-label')).nativeElement.textContent.trim();

    fixture.debugElement.query(By.css('[aria-label="Last page"]')).nativeElement.click();
    fixture.detectChanges();
    expect(pageLabelText()).toBe('Page 3 of 3');

    fixture.debugElement.query(By.css('.inandu-sort-button')).nativeElement.click();
    fixture.detectChanges();
    expect(pageLabelText()).toBe('Page 1 of 3');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" [paging]="paging" lang="es-AR">
      <inandu-column title="Nombre" field="name" sortable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class SpanishLangHostComponent {
  rows: InanduGridRow[] = [];
  paging: InanduGridPagingOptions = {};
}

@Component({
  template: `
    <inandu-grid [data]="rows" filter="true" filterPlaceholder="Find a fruit" [paging]="paging" lang="en">
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Color" field="color"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class FilterHostComponent {
  rows: InanduGridRow[] = [
    { name: 'Apple', color: 'Red' },
    { name: 'Banana', color: 'Yellow' },
    { name: 'Grape', color: 'Purple' },
    { name: 'Kiwi', color: 'Green' },
    { name: 'Lemon', color: 'Yellow' },
  ];
  paging: InanduGridPagingOptions = { pageSize: 2 };
}

describe('InanduGridComponent filter', () => {
  it('does not render a search box when filter is not set', () => {
    const fixture = TestBed.createComponent(PagingHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-filter-input'))).toBeNull();
  });

  it('filters across columns by formatted value, case-insensitively, and resets pagination to page 1', () => {
    const fixture = TestBed.createComponent(FilterHostComponent);
    fixture.detectChanges();

    const rowValues = () => fixture.debugElement
      .queryAll(By.css('tbody tr'))
      .map(row => row.query(By.css('td')).nativeElement.textContent.trim());
    const pageLabelText = () => fixture.debugElement.query(By.css('.inandu-pager-label')).nativeElement.textContent.trim();
    const filterInput = () => fixture.debugElement.query(By.css('.inandu-filter-input')).nativeElement as HTMLInputElement;

    expect(filterInput().placeholder).toBe('Find a fruit');

    // Navigate to the last page before searching, to prove the search resets it.
    fixture.debugElement.query(By.css('[aria-label="Last page"]')).nativeElement.click();
    fixture.detectChanges();
    expect(rowValues()).toEqual(['Lemon']);
    expect(pageLabelText()).toBe('Page 3 of 3');

    filterInput().value = 'yellow';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(rowValues()).toEqual(['Banana', 'Lemon']);
    expect(pageLabelText()).toBe('Page 1 of 1');
  });
});

describe('InanduGridComponent lang', () => {
  it('renders the empty-state text, sort aria-label, and pager aria-labels/page text in the given language', () => {
    const fixture = TestBed.createComponent(SpanishLangHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('tbody td')).nativeElement.textContent.trim()).toBe('Sin datos');
    expect(fixture.debugElement.query(By.css('.inandu-sort-button')).nativeElement.getAttribute('aria-label')).toBe('Ordenar por Nombre');
    expect(fixture.debugElement.query(By.css('.inandu-pager-label')).nativeElement.textContent.trim()).toBe('Página 1 de 1');
    expect(fixture.debugElement.query(By.css('[aria-label="Primera página"]'))).not.toBeNull();
  });
});

@Component({
  template: `<inandu-grid [data]="[]" [theme]="theme"></inandu-grid>`,
  imports: [InanduGridComponent],
})
class ThemeHostComponent {
  theme = '';
}

describe('InanduGridComponent theme', () => {
  function rootClasses(fixture: ComponentFixture<ThemeHostComponent>): string[] {
    return (fixture.debugElement.query(By.css('.inandu-grid')).nativeElement as HTMLElement).className.split(' ');
  }

  it('adds no theme class when theme is unset', () => {
    const fixture = TestBed.createComponent(ThemeHostComponent);
    fixture.detectChanges();

    expect(rootClasses(fixture)).toEqual(['inandu', 'inandu-grid']);
  });

  it('adds an inandu-theme-<name> class matching the theme input', () => {
    const fixture = TestBed.createComponent(ThemeHostComponent);
    fixture.componentInstance.theme = 'material';
    fixture.detectChanges();

    expect(rootClasses(fixture)).toEqual(['inandu', 'inandu-grid', 'inandu-theme-material']);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en">
      <inandu-column title="Name" field="name" type="string" filter="yes"></inandu-column>
      <inandu-column title="Score" field="score" type="number" filter="yes"></inandu-column>
      <inandu-column title="Joined" field="joined" type="date" filter="yes"></inandu-column>
      <inandu-column title="Active" field="active" type="boolean" format="Yes|No" filter="yes"></inandu-column>
      <inandu-column title="Extra" field="extra"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ColumnFilterHostComponent {
  rows: InanduGridRow[] = [
    { name: 'Alice', score: 10, joined: new Date(2023, 0, 10), active: true, extra: 'x' },
    { name: 'Bob', score: 20, joined: new Date(2023, 5, 15), active: false, extra: 'y' },
    { name: 'Charlie', score: 30, joined: new Date(2024, 0, 20), active: true, extra: 'z' },
  ];
}

function setInputValue(input: HTMLInputElement | HTMLSelectElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input'));
}

describe('InanduGridComponent column filter', () => {
  let fixture: ComponentFixture<ColumnFilterHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ColumnFilterHostComponent] });
    fixture = TestBed.createComponent(ColumnFilterHostComponent);
    // Attached to the real document so a document-level click (see the "clicking outside" test
    // below) actually bubbles up to it — TestBed fixtures are detached from the DOM by default.
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  const nameValues = () => fixture.debugElement
    .queryAll(By.css('tbody tr'))
    .map(row => row.query(By.css('td')).nativeElement.textContent.trim());
  const headers = () => fixture.debugElement.queryAll(By.css('th'));
  const filterToggle = (columnIndex: number) => headers()[columnIndex].query(By.css('.inandu-column-filter-toggle')).nativeElement as HTMLButtonElement;
  const openFilterPopup = (columnIndex: number) => {
    filterToggle(columnIndex).click();
    fixture.detectChanges();
  };
  const filterPopup = (columnIndex: number) => headers()[columnIndex].query(By.css('.inandu-column-filter-popup'));
  const clearAllRow = () => fixture.debugElement.query(By.css('.inandu-column-filters-actions'));

  it('renders no filter toggle for a column without filter="yes"', () => {
    expect(headers()[4].query(By.css('.inandu-column-filter-toggle'))).toBeNull();
  });

  it('opens the popup on click and closes it on a second click', () => {
    expect(filterPopup(0)).toBeNull();

    openFilterPopup(0);
    expect(filterPopup(0)).not.toBeNull();

    openFilterPopup(0);
    expect(filterPopup(0)).toBeNull();
  });

  it('filters a string column by case-insensitive substring', () => {
    openFilterPopup(0);
    const nameInput = filterPopup(0).query(By.css('.inandu-column-filter-input')).nativeElement as HTMLInputElement;
    setInputValue(nameInput, 'ali');
    fixture.detectChanges();

    expect(nameValues()).toEqual(['Alice']);
  });

  it('filters a number column by min/max range', () => {
    openFilterPopup(1);
    const [minInput, maxInput] = filterPopup(1).queryAll(By.css('.inandu-column-filter-input')).map(el => el.nativeElement as HTMLInputElement);

    setInputValue(minInput, '15');
    fixture.detectChanges();
    expect(nameValues()).toEqual(['Bob', 'Charlie']);

    setInputValue(maxInput, '25');
    fixture.detectChanges();
    expect(nameValues()).toEqual(['Bob']);
  });

  it('filters a date column by from/to range, "to" inclusive of the whole day', () => {
    openFilterPopup(2);
    const [fromInput, toInput] = filterPopup(2).queryAll(By.css('.inandu-column-filter-input')).map(el => el.nativeElement as HTMLInputElement);

    setInputValue(fromInput, '2023-06-01');
    fixture.detectChanges();
    expect(nameValues()).toEqual(['Bob', 'Charlie']);

    setInputValue(toInput, '2023-12-31');
    fixture.detectChanges();
    expect(nameValues()).toEqual(['Bob']);
  });

  it('filters a boolean column by exact match via its dropdown', () => {
    openFilterPopup(3);
    const select = filterPopup(3).query(By.css('select')).nativeElement as HTMLSelectElement;
    setInputValue(select, 'true');
    fixture.detectChanges();

    expect(nameValues()).toEqual(['Alice', 'Charlie']);
  });

  it('combines several active column filters with AND, switching popups keeps earlier filters applied', () => {
    openFilterPopup(1);
    const minInput = filterPopup(1).queryAll(By.css('.inandu-column-filter-input'))[0].nativeElement as HTMLInputElement;
    setInputValue(minInput, '15');
    fixture.detectChanges();
    expect(nameValues()).toEqual(['Bob', 'Charlie']);

    // Opening a different column's popup closes the first one, but its filter value stays active.
    openFilterPopup(3);
    expect(filterPopup(1)).toBeNull();
    const select = filterPopup(3).query(By.css('select')).nativeElement as HTMLSelectElement;
    setInputValue(select, 'true');
    fixture.detectChanges();

    expect(nameValues()).toEqual(['Charlie']);
  });

  it('marks the toggle as active only while its column has a meaningful filter value', () => {
    openFilterPopup(0);
    expect(filterToggle(0).classList).not.toContain('inandu-column-filter-toggle-active');

    const nameInput = filterPopup(0).query(By.css('.inandu-column-filter-input')).nativeElement as HTMLInputElement;
    setInputValue(nameInput, 'ali');
    fixture.detectChanges();
    expect(filterToggle(0).classList).toContain('inandu-column-filter-toggle-active');

    setInputValue(nameInput, '');
    fixture.detectChanges();
    expect(filterToggle(0).classList).not.toContain('inandu-column-filter-toggle-active');
  });

  it('per-column "Cancel filter" clears just that column, without closing the popup', () => {
    openFilterPopup(0);
    const nameInput = filterPopup(0).query(By.css('.inandu-column-filter-input')).nativeElement as HTMLInputElement;
    setInputValue(nameInput, 'ali');
    fixture.detectChanges();
    expect(nameValues()).toEqual(['Alice']);

    filterPopup(0).query(By.css('.inandu-column-filter-cancel')).nativeElement.click();
    fixture.detectChanges();

    expect(nameValues()).toEqual(['Alice', 'Bob', 'Charlie']);
    expect(filterPopup(0)).not.toBeNull();
  });

  it('the grid-wide "Clear filters" row only appears while a filter is active, and clears every column filter at once', () => {
    expect(clearAllRow()).toBeNull();

    openFilterPopup(0);
    const nameInput = filterPopup(0).query(By.css('.inandu-column-filter-input')).nativeElement as HTMLInputElement;
    setInputValue(nameInput, 'a');
    fixture.detectChanges();
    expect(clearAllRow()).not.toBeNull();

    openFilterPopup(1);
    const minInput = filterPopup(1).queryAll(By.css('.inandu-column-filter-input'))[0].nativeElement as HTMLInputElement;
    setInputValue(minInput, '15');
    fixture.detectChanges();
    expect(nameValues()).toEqual(['Charlie']);

    clearAllRow().query(By.css('button')).nativeElement.click();
    fixture.detectChanges();

    expect(nameValues()).toEqual(['Alice', 'Bob', 'Charlie']);
    expect(clearAllRow()).toBeNull();
  });

  it('clicking outside the popup closes it, but clicking inside it does not', () => {
    openFilterPopup(0);
    expect(filterPopup(0)).not.toBeNull();

    filterPopup(0).nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(filterPopup(0)).not.toBeNull();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(filterPopup(0)).toBeNull();
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" [paging]="paging" lang="en">
      <inandu-column title="Value" field="value" type="number" filter="yes"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ColumnFilterPagingHostComponent {
  rows: InanduGridRow[] = Array.from({ length: 5 }, (_, i) => ({ value: i + 1 }));
  paging: InanduGridPagingOptions = { pageSize: 1 };
}

describe('InanduGridComponent column filter with paging', () => {
  it('resets to page 1 when a column filter changes', () => {
    const fixture = TestBed.createComponent(ColumnFilterPagingHostComponent);
    fixture.detectChanges();

    const pageLabelText = () => fixture.debugElement.query(By.css('.inandu-pager-label')).nativeElement.textContent.trim();

    fixture.debugElement.query(By.css('[aria-label="Last page"]')).nativeElement.click();
    fixture.detectChanges();
    expect(pageLabelText()).toBe('Page 5 of 5');

    fixture.debugElement.query(By.css('.inandu-column-filter-toggle')).nativeElement.click();
    fixture.detectChanges();
    const minInput = fixture.debugElement.queryAll(By.css('.inandu-column-filter-input'))[0].nativeElement as HTMLInputElement;
    setInputValue(minInput, '3');
    fixture.detectChanges();

    expect(pageLabelText()).toBe('Page 1 of 3');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" [paging]="paging" lang="en">
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Category" field="category" groupable="true"></inandu-column>
      <inandu-column title="Region" field="region" groupable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class GroupByHostComponent {
  rows: InanduGridRow[] = [
    { name: 'Alice', category: 'Fruit', region: 'North' },
    { name: 'Bob', category: 'Veg', region: 'North' },
    { name: 'Charlie', category: 'Fruit', region: 'South' },
  ];
  paging: InanduGridPagingOptions = { pageSize: 2 };
}

// Drag-and-drop simulation avoids relying on native DataTransfer behavior in jsdom/Karma, which is
// unreliable to synthesize — instead the grid instance's own handlers are called directly, exactly
// as the real (dragstart) / (drop) template bindings would call them.
function fakeDragEvent(): DragEvent {
  return { preventDefault: () => undefined, dataTransfer: null } as unknown as DragEvent;
}

describe('InanduGridComponent group by', () => {
  it('does not render a group-by drop zone when no column is groupable', () => {
    const fixture = TestBed.createComponent(PagingHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-group-zone'))).toBeNull();
  });

  it('renders the drop-zone hint and marks only groupable column headers with the groupable class', () => {
    const fixture = TestBed.createComponent(GroupByHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-group-zone-hint')).nativeElement.textContent.trim())
      .toBe('Drag a column header here to group by it');

    // All three headers are draggable regardless (columns are reorder-enabled by default too — see
    // the "column reorder" describe block); `.inandu-groupable-header` is what's specific to `groupable()`.
    const headers = fixture.debugElement.queryAll(By.css('th'));
    expect(headers[0].nativeElement.classList).not.toContain('inandu-groupable-header');
    expect(headers[1].nativeElement.classList).toContain('inandu-groupable-header');
    expect(headers[2].nativeElement.classList).toContain('inandu-groupable-header');
  });

  it('groups rows by the dropped column, showing a header row with a count per group and hiding the pager', () => {
    const fixture = TestBed.createComponent(GroupByHostComponent);
    fixture.detectChanges();

    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    grid.onColumnDragStart(fakeDragEvent(), 'category');
    grid.onGroupZoneDrop(fakeDragEvent());
    fixture.detectChanges();

    const groupHeaders = fixture.debugElement.queryAll(By.css('.inandu-group-row')).map(el => el.nativeElement.textContent.trim());
    expect(groupHeaders).toEqual(['Category: Fruit (2)', 'Category: Veg (1)']);

    const rowValues = () => fixture.debugElement
      .queryAll(By.css('tbody tr.inandu-row'))
      .map(row => row.query(By.css('td')).nativeElement.textContent.trim());
    expect(rowValues()).toEqual(['Alice', 'Charlie', 'Bob']);

    expect(fixture.debugElement.query(By.css('tfoot'))).toBeNull();
  });

  it('"Cancel grouping" reverts to the flat, paginated row list', () => {
    const fixture = TestBed.createComponent(GroupByHostComponent);
    fixture.detectChanges();

    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    grid.onColumnDragStart(fakeDragEvent(), 'region');
    grid.onGroupZoneDrop(fakeDragEvent());
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.inandu-group-row')).length).toBeGreaterThan(0);

    fixture.debugElement.query(By.css('.inandu-group-zone button')).nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.inandu-group-row')).length).toBe(0);
    expect(fixture.debugElement.queryAll(By.css('tbody tr.inandu-row')).length).toBe(2);
    expect(fixture.debugElement.query(By.css('tfoot'))).not.toBeNull();
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Name" field="name" width="100"></inandu-column>
      <inandu-column title="Id" field="id" width="60" resize="false"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ResizeHostComponent {
  rows: InanduGridRow[] = [{ name: 'Alice', id: 1 }];
}

// Real hardware mouse movement can't be simulated, so a resize drag is a plain dispatched
// MouseEvent sequence instead — the handler only reads clientX, so this exercises the exact same
// code path a real mousedown→mousemove→mouseup gesture would.
function dragResizeHandle(handle: HTMLElement, fromX: number, toX: number): void {
  handle.dispatchEvent(new MouseEvent('mousedown', { clientX: fromX }));
  window.dispatchEvent(new MouseEvent('mousemove', { clientX: toX }));
  window.dispatchEvent(new MouseEvent('mouseup'));
}

describe('InanduGridComponent column resize', () => {
  const colWidths = (fixture: ComponentFixture<ResizeHostComponent>) => fixture.debugElement
    .queryAll(By.css('colgroup col'))
    .map(col => (col.nativeElement as HTMLElement).style.width);

  it('renders a resize handle for a column by default, but not when resize="false"', () => {
    const fixture = TestBed.createComponent(ResizeHostComponent);
    fixture.detectChanges();

    const headers = fixture.debugElement.queryAll(By.css('th'));
    expect(headers[0].query(By.css('.inandu-column-resize-handle'))).not.toBeNull();
    expect(headers[1].query(By.css('.inandu-column-resize-handle'))).toBeNull();
  });

  it('dragging the handle resizes only that column, clamped to a minimum width', () => {
    const fixture = TestBed.createComponent(ResizeHostComponent);
    fixture.detectChanges();

    expect(colWidths(fixture)).toEqual(['100px', '60px']);

    const handle = fixture.debugElement.query(By.css('.inandu-column-resize-handle')).nativeElement as HTMLElement;
    dragResizeHandle(handle, 200, 250);
    fixture.detectChanges();
    expect(colWidths(fixture)).toEqual(['150px', '60px']);

    dragResizeHandle(handle, 200, -1000);
    fixture.detectChanges();
    expect(colWidths(fixture)).toEqual(['30px', '60px']);
  });

  it('setColumnWidth() sets a column\'s width programmatically, same effect as dragging', () => {
    const fixture = TestBed.createComponent(ResizeHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.setColumnWidth('name', 200);
    fixture.detectChanges();
    expect(colWidths(fixture)).toEqual(['200px', '60px']);
  });

  it('setColumnWidth() clamps to the same minimum the drag handle enforces', () => {
    const fixture = TestBed.createComponent(ResizeHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.setColumnWidth('name', 5);
    fixture.detectChanges();
    expect(colWidths(fixture)).toEqual(['30px', '60px']);
  });

  it('setColumnWidth() ignores a field that does not match any current column', () => {
    const fixture = TestBed.createComponent(ResizeHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.setColumnWidth('nope', 999);
    fixture.detectChanges();
    expect(colWidths(fixture)).toEqual(['100px', '60px']);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="A" field="a"></inandu-column>
      <inandu-column title="B" field="b"></inandu-column>
      <inandu-column title="C" field="c" reorder="false"></inandu-column>
      <inandu-column title="D" field="d"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ReorderHostComponent {
  rows: InanduGridRow[] = [{ a: 1, b: 2, c: 3, d: 4 }];
}

describe('InanduGridComponent column reorder', () => {
  const headerText = (fixture: ComponentFixture<ReorderHostComponent>) => fixture.debugElement
    .queryAll(By.css('th')).map(th => th.nativeElement.textContent.trim());
  const gridInstance = (fixture: ComponentFixture<ReorderHostComponent>) => fixture.debugElement
    .query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

  it('is draggable by default, but not for a column with reorder="false"', () => {
    const fixture = TestBed.createComponent(ReorderHostComponent);
    fixture.detectChanges();

    const headers = fixture.debugElement.queryAll(By.css('th'));
    expect(headers[0].nativeElement.getAttribute('draggable')).toBe('true');
    expect(headers[1].nativeElement.getAttribute('draggable')).toBe('true');
    expect(headers[2].nativeElement.getAttribute('draggable')).toBeNull();
    expect(headers[3].nativeElement.getAttribute('draggable')).toBe('true');
  });

  it('dropping a dragged header onto another inserts it immediately before the target', () => {
    const fixture = TestBed.createComponent(ReorderHostComponent);
    fixture.detectChanges();
    const grid = gridInstance(fixture);

    expect(headerText(fixture)).toEqual(['A', 'B', 'C', 'D']);

    // Drag an earlier column onto a later target.
    grid.onColumnDragStart(fakeDragEvent(), 'a');
    grid.onColumnHeaderDrop(fakeDragEvent(), 'd');
    fixture.detectChanges();
    expect(headerText(fixture)).toEqual(['B', 'C', 'A', 'D']);
  });

  it('dropping a dragged header onto an earlier target also inserts it immediately before that target', () => {
    const fixture = TestBed.createComponent(ReorderHostComponent);
    fixture.detectChanges();
    const grid = gridInstance(fixture);

    // Drag a later column onto an earlier target.
    grid.onColumnDragStart(fakeDragEvent(), 'd');
    grid.onColumnHeaderDrop(fakeDragEvent(), 'a');
    fixture.detectChanges();
    expect(headerText(fixture)).toEqual(['D', 'A', 'B', 'C']);
  });

  it('a column with reorder="false" cannot be dragged to a new position', () => {
    const fixture = TestBed.createComponent(ReorderHostComponent);
    fixture.detectChanges();
    const grid = gridInstance(fixture);

    grid.onColumnDragStart(fakeDragEvent(), 'c');
    grid.onColumnHeaderDrop(fakeDragEvent(), 'a');
    fixture.detectChanges();

    expect(headerText(fixture)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('reordering columns also reorders their data cells', () => {
    const fixture = TestBed.createComponent(ReorderHostComponent);
    fixture.detectChanges();
    const grid = gridInstance(fixture);

    grid.onColumnDragStart(fakeDragEvent(), 'a');
    grid.onColumnHeaderDrop(fakeDragEvent(), 'c');
    fixture.detectChanges();

    const cellValues = fixture.debugElement.queryAll(By.css('tbody td')).map(td => td.nativeElement.textContent.trim());
    expect(cellValues).toEqual(['2', '1', '3', '4']);
  });
});

describe('InanduGridComponent setColumnOrder', () => {
  const headerText = (fixture: ComponentFixture<ReorderHostComponent>) => fixture.debugElement
    .queryAll(By.css('th')).map(th => th.nativeElement.textContent.trim());
  const gridInstance = (fixture: ComponentFixture<ReorderHostComponent>) => fixture.debugElement
    .query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

  it('reorders columns programmatically, without a drag event', () => {
    const fixture = TestBed.createComponent(ReorderHostComponent);
    fixture.detectChanges();
    const grid = gridInstance(fixture);

    grid.setColumnOrder(['d', 'a']);
    fixture.detectChanges();
    expect(headerText(fixture)).toEqual(['D', 'A', 'B', 'C']);
  });

  it('appends fields the requested order omits, in their prior relative order', () => {
    const fixture = TestBed.createComponent(ReorderHostComponent);
    fixture.detectChanges();
    const grid = gridInstance(fixture);

    grid.setColumnOrder(['c']);
    fixture.detectChanges();
    expect(headerText(fixture)).toEqual(['C', 'A', 'B', 'D']);
  });

  it('ignores fields that do not match any current column', () => {
    const fixture = TestBed.createComponent(ReorderHostComponent);
    fixture.detectChanges();
    const grid = gridInstance(fixture);

    grid.setColumnOrder(['nope', 'd']);
    fixture.detectChanges();
    expect(headerText(fixture)).toEqual(['D', 'A', 'B', 'C']);
  });

  it('repositions a column even when it declared reorder="false" — that flag only blocks its own header drag', () => {
    const fixture = TestBed.createComponent(ReorderHostComponent);
    fixture.detectChanges();
    const grid = gridInstance(fixture);

    grid.setColumnOrder(['c']);
    fixture.detectChanges();
    expect(headerText(fixture)).toEqual(['C', 'A', 'B', 'D']);
  });

  it('also reorders data cells, matching the new header order', () => {
    const fixture = TestBed.createComponent(ReorderHostComponent);
    fixture.detectChanges();
    const grid = gridInstance(fixture);

    grid.setColumnOrder(['d', 'a']);
    fixture.detectChanges();
    const cellValues = fixture.debugElement.queryAll(By.css('tbody td')).map(td => td.nativeElement.textContent.trim());
    expect(cellValues).toEqual(['4', '1', '2', '3']);
  });
});

describe('InanduGridComponent runtime column pinning', () => {
  let fixture: ComponentFixture<StickyHostComponent>;
  let grid: InanduGridComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StickyHostComponent] });
    fixture = TestBed.createComponent(StickyHostComponent);
    fixture.detectChanges();
    grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
  });

  // Same layout as the declarative sticky-columns suite above: [select, A(sticky), B(sticky), C].
  const headers = () => fixture.debugElement.queryAll(By.css('th'));
  const left = (el: { nativeElement: HTMLElement }) => el.nativeElement.style.insetInlineStart;
  const columnByField = (field: string) => grid.visibleColumns().find(column => column.field() === field)!;

  it('reflects a column\'s own declared sticky/stickySide by default, with no override set', () => {
    expect(grid.columnPinnedSide(columnByField('a'))).toBe('left');
    expect(grid.columnPinnedSide(columnByField('c'))).toBeUndefined();
  });

  it('pins a column that was not declared sticky, taking effect immediately', () => {
    grid.setColumnPinned('c', 'left');
    fixture.detectChanges();

    expect(grid.columnPinnedSide(columnByField('c'))).toBe('left');
    const cHeader = headers()[3];
    expect(cHeader.nativeElement.classList).toContain('inandu-sticky-column');
    // 36 (select) + 50 (A) + 80 (B) — C now stacks after both declared-sticky columns.
    expect(left(cHeader)).toBe('166px');
  });

  it('un-pins a column that declared sticky="true", with side undefined', () => {
    grid.setColumnPinned('a', undefined);
    fixture.detectChanges();

    expect(grid.columnPinnedSide(columnByField('a'))).toBeUndefined();
    expect(headers()[1].nativeElement.classList).not.toContain('inandu-sticky-column');
    // B no longer has a preceding sticky column besides the select checkbox.
    expect(left(headers()[2])).toBe('36px');
  });

  it('can move a column to the other side', () => {
    grid.setColumnPinned('a', 'right');
    fixture.detectChanges();
    expect(grid.columnPinnedSide(columnByField('a'))).toBe('right');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" selectable="true" lang="en" (selectionChange)="onSelectionChange($event)">
      <inandu-column title="Name" field="name"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class SelectableHostComponent {
  rows: InanduGridRow[] = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }];
  lastSelection: InanduGridRow[] | undefined;
  onSelectionChange(rows: InanduGridRow[]): void {
    this.lastSelection = rows;
  }
}

describe('InanduGridComponent row selection', () => {
  const headerCheckbox = (fixture: ComponentFixture<SelectableHostComponent>) => fixture.debugElement
    .query(By.css('thead .inandu-select-checkbox')).nativeElement as HTMLInputElement;
  const rowCheckboxes = (fixture: ComponentFixture<SelectableHostComponent>) => fixture.debugElement
    .queryAll(By.css('tbody .inandu-select-checkbox')).map(el => el.nativeElement as HTMLInputElement);

  it('does not render selection checkboxes when selectable is not set', () => {
    const fixture = TestBed.createComponent(PagingHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-select-checkbox'))).toBeNull();
  });

  it('toggling a row checkbox selects it and emits selectionChange', () => {
    const fixture = TestBed.createComponent(SelectableHostComponent);
    fixture.detectChanges();

    rowCheckboxes(fixture)[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.lastSelection).toEqual([{ name: 'Alice' }]);
    expect(rowCheckboxes(fixture)[0].checked).toBeTrue();
    expect(rowCheckboxes(fixture)[1].checked).toBeFalse();
  });

  it('the header checkbox has an aria-label, selects/deselects every row, and reflects a tri-state', () => {
    const fixture = TestBed.createComponent(SelectableHostComponent);
    fixture.detectChanges();

    expect(headerCheckbox(fixture).getAttribute('aria-label')).toBe('Select all rows');
    expect(headerCheckbox(fixture).checked).toBeFalse();
    expect(headerCheckbox(fixture).indeterminate).toBeFalse();

    rowCheckboxes(fixture)[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(headerCheckbox(fixture).indeterminate).toBeTrue();

    headerCheckbox(fixture).dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(rowCheckboxes(fixture).every(cb => cb.checked)).toBeTrue();
    expect(fixture.componentInstance.lastSelection?.length).toBe(3);

    headerCheckbox(fixture).dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(rowCheckboxes(fixture).every(cb => !cb.checked)).toBeTrue();
    expect(fixture.componentInstance.lastSelection).toEqual([]);
  });
});

@Component({
  template: `
    <inandu-grid id="exp" [data]="rows" [paging]="paging" exportable="true" lang="en">
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Score" field="score" type="number"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ExportHostComponent {
  rows: InanduGridRow[] = [
    { name: 'Alice', score: 10 },
    { name: 'Doe, Jane', score: 20 },
    { name: 'Charlie', score: 30 },
  ];
  paging: InanduGridPagingOptions = { pageSize: 2 };
}

@Component({
  template: `<inandu-grid id="empty" [data]="rows" exportable="true"></inandu-grid>`,
  imports: [InanduGridComponent],
})
class EmptyExportHostComponent {
  rows: InanduGridRow[] = [];
}

describe('InanduGridComponent export', () => {
  let fixture: ComponentFixture<ExportHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExportHostComponent] });
    fixture = TestBed.createComponent(ExportHostComponent);
    fixture.detectChanges();
  });

  const toolbarButtons = () => fixture.debugElement.queryAll(By.css('.inandu-toolbar button')).map(el => el.nativeElement as HTMLButtonElement);
  const gridInstance = () => fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

  it('does not render the export toolbar when exportable is not set', () => {
    const noExportFixture = TestBed.createComponent(PagingHostComponent);
    noExportFixture.detectChanges();

    expect(noExportFixture.debugElement.query(By.css('.inandu-toolbar'))).toBeNull();
  });

  it('exports only the currently-visible (current page) rows as CSV, with a UTF-8 BOM and comma escaping', async () => {
    let capturedBlob: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    spyOn(URL, 'revokeObjectURL');
    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');

    toolbarButtons()[0].click();

    expect(clickSpy).toHaveBeenCalled();
    // Blob.text() decodes as UTF-8 and strips a leading BOM per spec (that's exactly why adding one
    // works for Excel), so the BOM has to be asserted on the raw bytes instead of the decoded text.
    const bytes = new Uint8Array(await capturedBlob!.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe(['Name,Score', 'Alice,10', '"Doe, Jane",20'].join('\r\n'));
  });

  it('exports as PDF, downloading a real PDF file via the same downloadBlob() path exportCsv() uses', async () => {
    // exportPdf() builds the PDF with jsPDF but hands the result to the library's own downloadBlob()
    // (via doc.output('blob')) rather than jsPDF's own `.save()` \u2014 see the comment on that call for
    // why \u2014 so this is the same createObjectURL/anchor-click seam the CSV test spies on.
    let capturedBlob: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    spyOn(URL, 'revokeObjectURL');
    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');

    // Calls the method directly rather than clicking the button: dynamic import() isn't a task
    // zone.js patches, so fixture.whenStable() isn't a reliable way to wait for it to resolve.
    await gridInstance().exportPdf();

    expect(clickSpy).toHaveBeenCalled();
    expect(capturedBlob!.type).toBe('application/pdf');
    const text = await capturedBlob!.text();
    expect(text.startsWith('%PDF-')).toBeTrue();
  });

  it('exports as Excel (SpreadsheetML), typing the number column\'s cells as ss:Type="Number"', async () => {
    let capturedBlob: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    spyOn(URL, 'revokeObjectURL');
    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');

    toolbarButtons()[1].click();

    expect(clickSpy).toHaveBeenCalled();
    expect(capturedBlob!.type).toBe('application/vnd.ms-excel');
    const xml = await capturedBlob!.text();
    expect(xml).toContain('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
    expect(xml).toContain('<Data ss:Type="String">Name</Data>');
    expect(xml).toContain('<Data ss:Type="Number">10</Data>');
    expect(xml).toContain('<Data ss:Type="String">Doe, Jane</Data>');
  });

  it('opens a print window with the currently-visible rows and triggers print()', async () => {
    const fakeWindow = {
      document: { write: jasmine.createSpy('write'), close: jasmine.createSpy('close') },
      focus: jasmine.createSpy('focus'),
      print: jasmine.createSpy('print'),
    } as unknown as Window;
    const openSpy = spyOn(window, 'open').and.returnValue(fakeWindow);

    gridInstance().printTable();
    // print() fires from a setTimeout(..., 0) so the popup finishes parsing the written document first.
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    const html = (fakeWindow.document.write as jasmine.Spy).calls.mostRecent().args[0] as string;
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<td>Alice</td>');
    expect(fakeWindow.document.close).toHaveBeenCalled();
    expect(fakeWindow.print).toHaveBeenCalled();
  });

  it('does not throw when the print popup is blocked', () => {
    spyOn(window, 'open').and.returnValue(null);

    expect(() => gridInstance().printTable()).not.toThrow();
  });

  it('disables every export/print button when there is nothing to export', () => {
    const emptyFixture = TestBed.createComponent(EmptyExportHostComponent);
    emptyFixture.detectChanges();

    const buttons = emptyFixture.debugElement.queryAll(By.css('.inandu-toolbar button')).map(el => el.nativeElement as HTMLButtonElement);
    expect(buttons.length).toBe(4);
    expect(buttons.every(button => button.disabled)).toBeTrue();
  });
});

@Component({
  template: `
    <inandu-grid id="esc" [data]="rows" exportable="true">
      <inandu-column title="Name &amp; Co" field="name"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class MarkupEscapingHostComponent {
  rows: InanduGridRow[] = [{ name: '<b>Bold</b> & co' }];
}

describe('InanduGridComponent export markup escaping', () => {
  it('escapes XML/HTML-significant characters in both the Excel and print outputs', async () => {
    const fixture = TestBed.createComponent(MarkupEscapingHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    let capturedBlob: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');

    grid.exportExcel();
    const xml = await capturedBlob!.text();
    expect(xml).toContain('<Data ss:Type="String">Name &amp; Co</Data>');
    expect(xml).toContain('<Data ss:Type="String">&lt;b&gt;Bold&lt;/b&gt; &amp; co</Data>');

    const fakeWindow = {
      document: { write: jasmine.createSpy('write'), close: jasmine.createSpy('close') },
      focus: jasmine.createSpy('focus'),
      print: jasmine.createSpy('print'),
    } as unknown as Window;
    spyOn(window, 'open').and.returnValue(fakeWindow);

    grid.printTable();
    const html = (fakeWindow.document.write as jasmine.Spy).calls.mostRecent().args[0] as string;
    expect(html).toContain('<th>Name &amp; Co</th>');
    expect(html).toContain('<td>&lt;b&gt;Bold&lt;/b&gt; &amp; co</td>');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" selectable="true">
      <inandu-column title="A" field="a" width="50" sticky="true"></inandu-column>
      <inandu-column title="B" field="b" width="80" sticky="true"></inandu-column>
      <inandu-column title="C" field="c" width="60"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class StickyHostComponent {
  rows: InanduGridRow[] = [{ a: 1, b: 2, c: 3 }];
}

describe('InanduGridComponent sticky columns', () => {
  let fixture: ComponentFixture<StickyHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StickyHostComponent] });
    fixture = TestBed.createComponent(StickyHostComponent);
    fixture.detectChanges();
  });

  // Column order in both rows is [select, A, B, C] — the select column is always sticky when selectable.
  const headers = () => fixture.debugElement.queryAll(By.css('th'));
  const bodyCells = () => fixture.debugElement.queryAll(By.css('tbody td'));
  const left = (el: { nativeElement: HTMLElement }) => el.nativeElement.style.insetInlineStart;

  it('does not mark a column sticky by default', () => {
    const cHeader = headers()[3];
    expect(cHeader.nativeElement.classList).not.toContain('inandu-sticky-column');
    expect(left(cHeader)).toBe('');
  });

  it('stacks sticky headers left-to-right, offset by the select column and each other\'s width', () => {
    const [selectHeader, aHeader, bHeader, cHeader] = headers();

    expect(selectHeader.nativeElement.classList).toContain('inandu-sticky-column');
    expect(left(selectHeader)).toBe('0px');

    expect(aHeader.nativeElement.classList).toContain('inandu-sticky-column');
    expect(left(aHeader)).toBe('36px');

    expect(bHeader.nativeElement.classList).toContain('inandu-sticky-column');
    expect(left(bHeader)).toBe('86px');

    expect(cHeader.nativeElement.classList).not.toContain('inandu-sticky-column');
  });

  it('applies the same sticky offsets to data cells', () => {
    const [selectCell, aCell, bCell, cCell] = bodyCells();

    expect(left(selectCell)).toBe('0px');
    expect(left(aCell)).toBe('36px');
    expect(left(bCell)).toBe('86px');
    expect(left(cCell)).toBe('');
  });

  it('recomputes a later sticky column\'s offset when an earlier sticky column is resized', () => {
    const aHandle = headers()[1].query(By.css('.inandu-column-resize-handle')).nativeElement as HTMLElement;
    dragResizeHandle(aHandle, 200, 250); // widens A from 50px to 100px
    fixture.detectChanges();

    expect(left(headers()[2])).toBe('136px'); // 36 (select) + 100 (resized A)
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Cat" field="cat" width="70" sticky="true" groupable="true"></inandu-column>
      <inandu-column title="Val" field="val" width="60"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class StickyGroupedHostComponent {
  rows: InanduGridRow[] = [
    { cat: 'Fruit', val: 1 },
    { cat: 'Veg', val: 2 },
  ];
}

describe('InanduGridComponent sticky columns while grouped', () => {
  it('applies sticky offsets to grouped rows\' data cells too', () => {
    const fixture = TestBed.createComponent(StickyGroupedHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.onColumnDragStart(fakeDragEvent(), 'cat');
    grid.onGroupZoneDrop(fakeDragEvent());
    fixture.detectChanges();

    const catCell = fixture.debugElement.query(By.css('tbody tr.inandu-row td'));
    expect(catCell.nativeElement.classList).toContain('inandu-sticky-column');
    expect((catCell.nativeElement as HTMLElement).style.insetInlineStart).toBe('0px');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" (rowSave)="onRowSave($event)">
      <inandu-column title="Name" field="name" editable="true"></inandu-column>
      <inandu-column title="Score" field="score" type="number" editable="true"></inandu-column>
      <inandu-column title="Active" field="active" type="boolean" editable="true"></inandu-column>
      <inandu-column title="Extra" field="extra"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class EditableHostComponent {
  rows: InanduGridRow[] = [
    { name: 'Alice', score: 10, active: true, extra: 'x' },
    { name: 'Bob', score: 20, active: false, extra: 'y' },
  ];
  lastSave: InanduGridRowSave | undefined;
  onRowSave(save: InanduGridRowSave): void {
    this.lastSave = save;
  }
}

describe('InanduGridComponent row editing', () => {
  let fixture: ComponentFixture<EditableHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EditableHostComponent] });
    fixture = TestBed.createComponent(EditableHostComponent);
    fixture.detectChanges();
  });

  const rowEls = () => fixture.debugElement.queryAll(By.css('tbody tr.inandu-row'));
  // Cell order per row is [Name, Score, Active, Extra, Actions].
  const cellsOfRow = (rowIndex: number) => rowEls()[rowIndex].queryAll(By.css('td'));
  const actionButtons = (rowIndex: number) => rowEls()[rowIndex].query(By.css('.inandu-row-actions')).queryAll(By.css('button'));
  const setInput = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('does not render an actions column when the grid has no editable columns', () => {
    const noEditFixture = TestBed.createComponent(PagingHostComponent);
    noEditFixture.detectChanges();

    expect(noEditFixture.debugElement.query(By.css('.inandu-row-actions'))).toBeNull();
  });

  it('renders a single "Edit" button per row by default', () => {
    expect(actionButtons(0).length).toBe(1);
    expect(actionButtons(0)[0].nativeElement.getAttribute('aria-label')).toBe('Edit');
    expect(actionButtons(1).length).toBe(1);
  });

  it('Edit switches every editable field in that row into a control seeded with raw values, and swaps in Save/Cancel', () => {
    actionButtons(0)[0].nativeElement.click();
    fixture.detectChanges();

    const nameInput = cellsOfRow(0)[0].query(By.css('.inandu-cell-edit-input')).nativeElement as HTMLInputElement;
    const scoreInput = cellsOfRow(0)[1].query(By.css('.inandu-cell-edit-input')).nativeElement as HTMLInputElement;
    const activeCheckbox = cellsOfRow(0)[2].query(By.css('.inandu-cell-edit-checkbox')).nativeElement as HTMLInputElement;
    expect(nameInput.value).toBe('Alice');
    expect(nameInput.getAttribute('aria-label')).toBe('Edit Name');
    expect(scoreInput.value).toBe('10');
    expect(activeCheckbox.checked).toBeTrue();
    // Extra isn't editable, so it stays plain text even while the rest of the row edits.
    expect(cellsOfRow(0)[3].query(By.css('.inandu-cell-edit-input'))).toBeNull();

    const buttons = actionButtons(0);
    expect(buttons.length).toBe(2);
    expect(buttons[0].nativeElement.getAttribute('aria-label')).toBe('Save');
    expect(buttons[1].nativeElement.getAttribute('aria-label')).toBe('Cancel');
  });

  it('disables other rows\' Edit button while one row is being edited', () => {
    actionButtons(0)[0].nativeElement.click();
    fixture.detectChanges();

    expect((actionButtons(1)[0].nativeElement as HTMLButtonElement).disabled).toBeTrue();
  });

  it('Save parses every editable field and emits rowSave, then exits edit mode without mutating the row', async () => {
    actionButtons(0)[0].nativeElement.click();
    fixture.detectChanges();

    setInput(cellsOfRow(0)[0].query(By.css('.inandu-cell-edit-input')).nativeElement, 'Alicia');
    setInput(cellsOfRow(0)[1].query(By.css('.inandu-cell-edit-input')).nativeElement, '99');
    const activeCheckbox = cellsOfRow(0)[2].query(By.css('.inandu-cell-edit-checkbox')).nativeElement as HTMLInputElement;
    activeCheckbox.checked = false;
    activeCheckbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    actionButtons(0)[0].nativeElement.click(); // Save
    // saveRow() is async (it awaits any asyncValidator, even when none is configured — see
    // InanduColumnComponent.asyncValidator), so its effects land a microtask after the click.
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.lastSave).toEqual({
      row: fixture.componentInstance.rows[0],
      values: { name: 'Alicia', score: 99, active: false },
    });
    expect(typeof fixture.componentInstance.lastSave?.values['score']).toBe('number');
    // The grid never writes the edit back into the row itself.
    expect(cellsOfRow(0)[0].nativeElement.textContent.trim()).toBe('Alice');
    expect(actionButtons(0).length).toBe(1);
    expect(actionButtons(0)[0].nativeElement.getAttribute('aria-label')).toBe('Edit');
  });

  it('Cancel discards the draft and exits edit mode without emitting', () => {
    actionButtons(0)[0].nativeElement.click();
    fixture.detectChanges();

    setInput(cellsOfRow(0)[0].query(By.css('.inandu-cell-edit-input')).nativeElement, 'Changed');
    fixture.detectChanges();

    actionButtons(0)[1].nativeElement.click(); // Cancel
    fixture.detectChanges();

    expect(fixture.componentInstance.lastSave).toBeUndefined();
    expect(cellsOfRow(0)[0].nativeElement.textContent.trim()).toBe('Alice');
    expect(actionButtons(0).length).toBe(1);
  });

  it('omits an unparseable/empty number field from the saved values instead of committing garbage', async () => {
    actionButtons(0)[0].nativeElement.click();
    fixture.detectChanges();

    setInput(cellsOfRow(0)[1].query(By.css('.inandu-cell-edit-input')).nativeElement, '');
    fixture.detectChanges();

    actionButtons(0)[0].nativeElement.click(); // Save
    await fixture.whenStable();
    fixture.detectChanges();

    const values = fixture.componentInstance.lastSave?.values ?? {};
    expect('score' in values).toBeFalse();
    expect(values['name']).toBe('Alice');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" deletable="true" [deleteConfirmMessage]="confirmMessage" (rowDelete)="onRowDelete($event)">
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Score" field="score" type="number"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class DeletableHostComponent {
  rows: InanduGridRow[] = [
    { name: 'Alice', score: 10 },
    { name: 'Bob', score: 20 },
  ];
  confirmMessage = '';
  deletedRows: InanduGridRow[] = [];
  onRowDelete(row: InanduGridRow): void {
    this.deletedRows.push(row);
  }
}

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" deletable="true" (rowSave)="onRowSave($event)" (rowDelete)="onRowDelete($event)">
      <inandu-column title="Name" field="name" editable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class EditableDeletableHostComponent {
  rows: InanduGridRow[] = [
    { name: 'Alice' },
    { name: 'Bob' },
  ];
  lastSave: InanduGridRowSave | undefined;
  deletedRows: InanduGridRow[] = [];
  onRowSave(save: InanduGridRowSave): void {
    this.lastSave = save;
  }
  onRowDelete(row: InanduGridRow): void {
    this.deletedRows.push(row);
  }
}

describe('InanduGridComponent row deletion', () => {
  const rowEls = (fixture: ComponentFixture<unknown>) => fixture.debugElement.queryAll(By.css('tbody tr.inandu-row'));
  const actionButtons = (fixture: ComponentFixture<unknown>, rowIndex: number) =>
    rowEls(fixture)[rowIndex].query(By.css('.inandu-row-actions')).queryAll(By.css('button'));

  it('does not render an actions column when the grid is neither editable nor deletable', () => {
    const fixture = TestBed.createComponent(PagingHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-row-actions'))).toBeNull();
  });

  it('renders an actions column with a single Delete button, even with zero editable columns', () => {
    const fixture = TestBed.createComponent(DeletableHostComponent);
    fixture.detectChanges();

    const buttons = actionButtons(fixture, 0);
    expect(buttons.length).toBe(1);
    expect(buttons[0].nativeElement.getAttribute('aria-label')).toBe('Delete');
  });

  it('emits rowDelete immediately when no deleteConfirmMessage is set', () => {
    const fixture = TestBed.createComponent(DeletableHostComponent);
    fixture.detectChanges();

    actionButtons(fixture, 0)[0].nativeElement.click();

    expect(fixture.componentInstance.deletedRows).toEqual([fixture.componentInstance.rows[0]]);
  });

  it('prompts via window.confirm when deleteConfirmMessage is set, and only emits rowDelete if confirmed', () => {
    const fixture = TestBed.createComponent(DeletableHostComponent);
    fixture.componentInstance.confirmMessage = '¿Eliminar esta fila?';
    fixture.detectChanges();

    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    actionButtons(fixture, 0)[0].nativeElement.click();
    expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar esta fila?');
    expect(fixture.componentInstance.deletedRows).toEqual([]);

    confirmSpy.and.returnValue(true);
    actionButtons(fixture, 0)[0].nativeElement.click();
    expect(fixture.componentInstance.deletedRows).toEqual([fixture.componentInstance.rows[0]]);
  });

  it('renders Edit and Delete side by side, and disables both for other rows while one is mid-edit', () => {
    const fixture = TestBed.createComponent(EditableDeletableHostComponent);
    fixture.detectChanges();

    const buttons = actionButtons(fixture, 0);
    expect(buttons.length).toBe(2);
    expect(buttons[0].nativeElement.getAttribute('aria-label')).toBe('Edit');
    expect(buttons[1].nativeElement.getAttribute('aria-label')).toBe('Delete');

    buttons[0].nativeElement.click(); // Edit row 0
    fixture.detectChanges();

    const otherRowButtons = actionButtons(fixture, 1);
    expect((otherRowButtons[0].nativeElement as HTMLButtonElement).disabled).toBeTrue();
    expect((otherRowButtons[1].nativeElement as HTMLButtonElement).disabled).toBeTrue();
  });

  it('does not show a Delete button while that same row is mid-edit', () => {
    const fixture = TestBed.createComponent(EditableDeletableHostComponent);
    fixture.detectChanges();

    actionButtons(fixture, 0)[0].nativeElement.click(); // Edit row 0
    fixture.detectChanges();

    const buttons = actionButtons(fixture, 0);
    expect(buttons.length).toBe(2);
    expect(buttons[0].nativeElement.getAttribute('aria-label')).toBe('Save');
    expect(buttons[1].nativeElement.getAttribute('aria-label')).toBe('Cancel');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" creatable="true" (rowCreate)="onRowCreate($event)">
      <inandu-column title="Name" field="name" editable="true" required="true"></inandu-column>
      <inandu-column title="Score" field="score" type="number" editable="true" min="0" max="100"></inandu-column>
      <inandu-column title="Extra" field="extra"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class CreatableHostComponent {
  rows: InanduGridRow[] = [
    { name: 'Alice', score: 10, extra: 'x' },
  ];
  created: InanduGridNewRowValues[] = [];
  onRowCreate(values: InanduGridNewRowValues): void {
    this.created.push(values);
  }
}

describe('InanduGridComponent row creation', () => {
  let fixture: ComponentFixture<CreatableHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CreatableHostComponent] });
    fixture = TestBed.createComponent(CreatableHostComponent);
    fixture.detectChanges();
  });

  const addButton = () => fixture.debugElement.queryAll(By.css('button')).find(
    b => b.nativeElement.getAttribute('aria-label') === 'Add row'
  );
  const addRowCells = () => fixture.debugElement.query(By.css('tr.inandu-add-row')).queryAll(By.css('td'));
  const addRowActionButtons = () => fixture.debugElement.query(By.css('tr.inandu-add-row .inandu-row-actions')).queryAll(By.css('button'));
  const editButton = () => fixture.debugElement.queryAll(By.css('tbody tr.inandu-row')).find(
    row => row.query(By.css('.inandu-row-actions'))?.query(By.css('button'))?.nativeElement.getAttribute('aria-label') === 'Edit'
  )!.query(By.css('.inandu-row-actions button'));
  const setInput = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('does not render an "Add row" button when the grid is not creatable', () => {
    const noCreateFixture = TestBed.createComponent(PagingHostComponent);
    noCreateFixture.detectChanges();

    expect(noCreateFixture.debugElement.queryAll(By.css('button')).find(
      b => b.nativeElement.getAttribute('aria-label') === 'Add row'
    )).toBeUndefined();
  });

  it('clicking "Add row" reveals inputs for editable columns only, plus Save/Cancel', () => {
    addButton()!.nativeElement.click();
    fixture.detectChanges();

    const cells = addRowCells();
    expect(cells[0].query(By.css('.inandu-cell-edit-input'))).not.toBeNull(); // Name
    expect(cells[1].query(By.css('.inandu-cell-edit-input'))).not.toBeNull(); // Score
    expect(cells[2].query(By.css('.inandu-cell-edit-input'))).toBeNull(); // Extra isn't editable

    const buttons = addRowActionButtons();
    expect(buttons.length).toBe(2);
    expect(buttons[0].nativeElement.getAttribute('aria-label')).toBe('Save');
    expect(buttons[1].nativeElement.getAttribute('aria-label')).toBe('Cancel');
  });

  it('Save with valid values emits rowCreate and returns to the trigger button', async () => {
    addButton()!.nativeElement.click();
    fixture.detectChanges();

    setInput(addRowCells()[0].query(By.css('.inandu-cell-edit-input')).nativeElement, 'Bob');
    setInput(addRowCells()[1].query(By.css('.inandu-cell-edit-input')).nativeElement, '42');

    addRowActionButtons()[0].nativeElement.click(); // Save
    // saveNewRow() is async (see saveRow()'s comment above on why this matters even with no
    // asyncValidator configured), so its effects land a microtask after the click.
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.created).toEqual([{ name: 'Bob', score: 42 }]);
    expect(addButton()).toBeDefined();
  });

  it('Cancel discards the draft without emitting', () => {
    addButton()!.nativeElement.click();
    fixture.detectChanges();

    setInput(addRowCells()[0].query(By.css('.inandu-cell-edit-input')).nativeElement, 'Discarded');

    addRowActionButtons()[1].nativeElement.click(); // Cancel
    fixture.detectChanges();

    expect(fixture.componentInstance.created).toEqual([]);
    expect(addButton()).toBeDefined();
  });

  it('blocks Save and shows an inline error when a required field is empty, staying in create mode', async () => {
    addButton()!.nativeElement.click();
    fixture.detectChanges();
    setInput(addRowCells()[1].query(By.css('.inandu-cell-edit-input')).nativeElement, '5'); // Score only, Name left empty

    addRowActionButtons()[0].nativeElement.click(); // Save
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.created).toEqual([]);
    expect(addRowCells()[0].query(By.css('.inandu-field-error')).nativeElement.textContent.trim()).toBe('This field is required');
    expect(addRowActionButtons().length).toBe(2); // still in create mode
  });

  it('blocks Save and shows the interpolated message when a number is below min', async () => {
    addButton()!.nativeElement.click();
    fixture.detectChanges();
    setInput(addRowCells()[0].query(By.css('.inandu-cell-edit-input')).nativeElement, 'Carol');
    setInput(addRowCells()[1].query(By.css('.inandu-cell-edit-input')).nativeElement, '-5');

    addRowActionButtons()[0].nativeElement.click(); // Save
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.created).toEqual([]);
    expect(addRowCells()[1].query(By.css('.inandu-field-error')).nativeElement.textContent.trim()).toBe('Must be at least 0');
  });

  it('disables the "Add row" trigger while an existing row is mid-edit', () => {
    editButton().nativeElement.click();
    fixture.detectChanges();

    expect((addButton()!.nativeElement as HTMLButtonElement).disabled).toBeTrue();
  });

  it('disables an existing row\'s Edit button while a new row is being added', () => {
    addButton()!.nativeElement.click();
    fixture.detectChanges();

    expect((editButton().nativeElement as HTMLButtonElement).disabled).toBeTrue();
  });

  it('shares validation with row editing: clearing a required field blocks Save on an existing row too', async () => {
    editButton().nativeElement.click();
    fixture.detectChanges();

    const rowEl = fixture.debugElement.queryAll(By.css('tbody tr.inandu-row'))[0];
    setInput(rowEl.query(By.css('.inandu-cell-edit-input')).nativeElement, '');
    const saveButton = rowEl.query(By.css('.inandu-row-actions button'));
    saveButton.nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.created).toEqual([]);
    expect(rowEl.query(By.css('.inandu-field-error')).nativeElement.textContent.trim()).toBe('This field is required');
    expect(rowEl.query(By.css('.inandu-row-actions button')).nativeElement.getAttribute('aria-label')).toBe('Save');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" creatable="true" (rowCreate)="onRowCreate($event)">
      <inandu-column title="Code" field="code" editable="true" pattern="^[A-Z]{3}$"></inandu-column>
      <inandu-column title="Qty" field="qty" type="number" editable="true" [validator]="qtyValidator"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ValidatorHostComponent {
  rows: InanduGridRow[] = [];
  created: InanduGridNewRowValues[] = [];
  readonly qtyValidator: InanduColumnValidator = value =>
    typeof value === 'number' && value % 2 !== 0 ? 'Must be even' : null;
  onRowCreate(values: InanduGridNewRowValues): void {
    this.created.push(values);
  }
}

describe('InanduGridComponent column validation', () => {
  let fixture: ComponentFixture<ValidatorHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ValidatorHostComponent] });
    fixture = TestBed.createComponent(ValidatorHostComponent);
    fixture.detectChanges();
  });

  const addButton = () => fixture.debugElement.queryAll(By.css('button')).find(
    b => b.nativeElement.getAttribute('aria-label') === 'Add row'
  )!;
  const addRowCells = () => fixture.debugElement.query(By.css('tr.inandu-add-row')).queryAll(By.css('td'));
  const addRowActionButtons = () => fixture.debugElement.query(By.css('tr.inandu-add-row .inandu-row-actions')).queryAll(By.css('button'));
  const setInput = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('rejects a value that fails the pattern, with the translated message', async () => {
    addButton().nativeElement.click();
    fixture.detectChanges();
    setInput(addRowCells()[0].query(By.css('.inandu-cell-edit-input')).nativeElement, 'abc');
    setInput(addRowCells()[1].query(By.css('.inandu-cell-edit-input')).nativeElement, '4');

    addRowActionButtons()[0].nativeElement.click(); // Save
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.created).toEqual([]);
    expect(addRowCells()[0].query(By.css('.inandu-field-error')).nativeElement.textContent.trim()).toBe('Invalid format');
  });

  it('accepts a value that matches the pattern', async () => {
    addButton().nativeElement.click();
    fixture.detectChanges();
    setInput(addRowCells()[0].query(By.css('.inandu-cell-edit-input')).nativeElement, 'ABC');
    setInput(addRowCells()[1].query(By.css('.inandu-cell-edit-input')).nativeElement, '4');

    addRowActionButtons()[0].nativeElement.click(); // Save
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.created).toEqual([{ code: 'ABC', qty: 4 }]);
  });

  it('rejects a value based on a custom validator function', async () => {
    addButton().nativeElement.click();
    fixture.detectChanges();
    setInput(addRowCells()[0].query(By.css('.inandu-cell-edit-input')).nativeElement, 'ABC');
    setInput(addRowCells()[1].query(By.css('.inandu-cell-edit-input')).nativeElement, '3');

    addRowActionButtons()[0].nativeElement.click(); // Save
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.created).toEqual([]);
    expect(addRowCells()[1].query(By.css('.inandu-field-error')).nativeElement.textContent.trim()).toBe('Must be even');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" virtualScroll="true" [height]="200" lang="en">
      <inandu-column title="Value" field="value" sortable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class VirtualScrollHostComponent {
  // Descending, so an ascending sort actually changes what renders first — catches a regression
  // back to a virtual-mode render path that bypasses sortedData() and reads data() directly.
  rows: InanduGridRow[] = Array.from({ length: 500 }, (_, i) => ({ value: 500 - i }));
}

@Component({
  template: `
    <inandu-grid [data]="rows" virtualScroll="true" [height]="200" lang="en">
      <inandu-column title="Value" field="value"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class VirtualScrollTallRowsHostComponent {
  // Real rows here render much taller than the 40px fallback (see the inline <style> above) — used
  // to prove auto-measurement reads the real row, not just falling back to the hardcoded default.
  rows: InanduGridRow[] = Array.from({ length: 100 }, (_, i) => ({ value: i + 1 }));
}

@Component({
  template: `
    <inandu-grid [data]="rows" virtualScroll="true" [virtualRowHeight]="15" [height]="200" lang="en">
      <inandu-column title="Value" field="value"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class VirtualScrollExplicitRowHeightHostComponent {
  rows: InanduGridRow[] = Array.from({ length: 100 }, (_, i) => ({ value: i + 1 }));
}

@Component({
  template: `
    <inandu-grid [data]="rows" virtualScroll="true" [paging]="paging" [height]="200" lang="en">
      <inandu-column title="Value" field="value"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class VirtualScrollWithPagingHostComponent {
  rows: InanduGridRow[] = Array.from({ length: 50 }, (_, i) => ({ value: i + 1 }));
  paging: InanduGridPagingOptions = { pageSize: 10 };
}

@Component({
  template: `
    <inandu-grid [data]="rows" virtualScroll="true" [height]="200" lang="en">
      <inandu-column title="City" field="city" groupable="true"></inandu-column>
      <inandu-column title="Value" field="value"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class VirtualScrollGroupedHostComponent {
  rows: InanduGridRow[] = [
    { city: 'Rosario', value: 1 },
    { city: 'Salta', value: 2 },
    { city: 'Rosario', value: 3 },
  ];
}

@Component({
  template: `
    <inandu-grid [data]="rows" virtualScroll="true" [height]="200" lang="en">
      <inandu-column title="City" field="city" groupable="true"></inandu-column>
      <inandu-column title="Value" field="value" editable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class VirtualScrollEditableGroupedHostComponent {
  rows: InanduGridRow[] = [
    { city: 'Rosario', value: 1 },
    { city: 'Salta', value: 2 },
  ];
}

@Component({
  template: `
    <inandu-grid [data]="rows" virtualScroll="true" [height]="200" lang="en">
      <inandu-column title="City" field="city" groupable="true"></inandu-column>
      <inandu-column title="Value" field="value"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class VirtualScrollLargeGroupedHostComponent {
  // Large enough to reproduce a real bug a 3-row fixture never could: switching which *cdkVirtualFor
  // is bound (a separate directive instance per @if/@else-if branch, rather than one persistent
  // instance fed a different array) silently rendered zero rows once grouped, on a real dataset —
  // invisible with only a couple of rows, since a tiny viewport-full renders trivially either way.
  rows: InanduGridRow[] = Array.from({ length: 2000 }, (_, i) => ({ city: i % 5 === 0 ? 'Rosario' : 'Salta', value: i }));
}

describe('InanduGridComponent virtual scroll', () => {
  // cdk-virtual-scroll-viewport measures its own layout size (getBoundingClientRect) to decide how
  // many rows to render — a detached TestBed fixture (the default) always measures 0, so every row
  // count assertion below would silently see an empty viewport. Attached to the real document for
  // the same reason the column-filter "clicking outside" tests are (see that describe block).
  const attached: HTMLElement[] = [];
  const attachedStyles: HTMLStyleElement[] = [];
  function createAttached<T>(component: Type<T>): ComponentFixture<T> {
    const fixture = TestBed.createComponent(component);
    document.body.appendChild(fixture.nativeElement);
    attached.push(fixture.nativeElement);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    attached.splice(0).forEach(el => el.remove());
    attachedStyles.splice(0).forEach(el => el.remove());
  });

  function renderedRowValues(fixture: ComponentFixture<unknown>): string[] {
    return fixture.debugElement
      .queryAll(By.css('tbody tr.inandu-row td'))
      .map(cell => cell.nativeElement.textContent.trim());
  }

  it('does not render a virtual viewport when virtualScroll is off', () => {
    const fixture = createAttached(NoPagingHostComponent);

    expect(fixture.debugElement.query(By.css('cdk-virtual-scroll-viewport'))).toBeNull();
  });

  // CDK's virtual scroll strategy measures the viewport and renders its first range through a
  // multi-hop chain of zone-escaping microtasks plus an `afterNextRender` callback — a plain
  // `fixture.detectChanges()` (or even `await fixture.whenStable()`) doesn't reliably observe the
  // end of that chain. `fakeAsync` + `flush()` (which drains microtasks, timers, and rAF-driven
  // render hooks alike) is the same pattern CDK's own virtual-scroll test suite relies on.
  function settle(fixture: ComponentFixture<unknown>): void {
    flush();
    fixture.detectChanges();
  }

  it('renders a virtual viewport with only a windowed subset of the 500 rows in the DOM', fakeAsync(() => {
    const fixture = createAttached(VirtualScrollHostComponent);
    settle(fixture);

    expect(fixture.debugElement.query(By.css('cdk-virtual-scroll-viewport'))).not.toBeNull();
    const renderedCount = fixture.debugElement.queryAll(By.css('tbody tr.inandu-row')).length;
    expect(renderedCount).toBeGreaterThan(0);
    expect(renderedCount).toBeLessThan(500);
  }));

  it('auto-measures the real rendered row height instead of using the hard-coded 40px fallback', fakeAsync(() => {
    // A component-scoped <style> (even with ViewEncapsulation.None) turned out unreliable here —
    // injected directly into the real document instead, guaranteed global regardless of Angular's
    // own style-scoping timing, and removed again in afterEach with the other attached fixtures.
    // !important is required here: the library's own `.xtable td` rule compiles under Angular's
    // Emulated encapsulation with an extra [_ngcontent-*] attribute selector on every part, which
    // outweighs this plain, unscoped `.inandu-row td` selector's specificity otherwise.
    const style = document.createElement('style');
    style.textContent = '.inandu-row td { padding: 30px 8px !important; }';
    document.head.appendChild(style);
    attachedStyles.push(style);

    const fixture = createAttached(VirtualScrollTallRowsHostComponent);
    settle(fixture);

    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    // 30px top+bottom cell padding alone already exceeds the 40px fallback — a measured value this
    // far past it can only come from reading the real (styled) row, not the hardcoded default.
    expect(grid.effectiveVirtualRowHeight()).toBeGreaterThan(60);
  }));

  it('skips auto-measurement when virtualRowHeight is set explicitly', fakeAsync(() => {
    const fixture = createAttached(VirtualScrollExplicitRowHeightHostComponent);
    settle(fixture);

    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    expect(grid.effectiveVirtualRowHeight()).toBe(15);
  }));

  it('feeds the full 500-row sorted dataset to the virtual repeater, not just a windowed page', fakeAsync(() => {
    // The actual "scroll reveals more rows" behavior is CDK's own tested mechanics (driven by a
    // real native 'scroll' event tied to browser paint timing, which fakeAsync can't simulate
    // deterministically) — what this library is responsible for getting right is handing the
    // repeater the complete sortedData() instead of something already paginated/truncated.
    const fixture = createAttached(VirtualScrollHostComponent);
    settle(fixture);

    const viewport = fixture.debugElement.query(By.directive(CdkVirtualScrollViewport)).componentInstance as CdkVirtualScrollViewport;
    expect(viewport.getDataLength()).toBe(500);
  }));

  it('still sorts while virtualized, without falling back to unsorted data', fakeAsync(() => {
    const fixture = createAttached(VirtualScrollHostComponent);
    settle(fixture);
    expect(renderedRowValues(fixture)[0]).toBe('500');

    fixture.debugElement.query(By.css('.inandu-sort-button')).nativeElement.click();
    settle(fixture);

    expect(renderedRowValues(fixture)[0]).toBe('1');
  }));

  it('hides the pager footer even when paging is also bound', fakeAsync(() => {
    const fixture = createAttached(VirtualScrollWithPagingHostComponent);
    settle(fixture);

    expect(fixture.debugElement.query(By.css('tfoot'))).toBeNull();
    expect(fixture.debugElement.query(By.css('cdk-virtual-scroll-viewport'))).not.toBeNull();
  }));

  it('keeps virtualizing once grouped, rendering group headers inside the same viewport', fakeAsync(() => {
    const fixture = createAttached(VirtualScrollGroupedHostComponent);
    settle(fixture);
    expect(fixture.debugElement.query(By.css('cdk-virtual-scroll-viewport'))).not.toBeNull();

    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    grid.onColumnDragStart({ dataTransfer: null } as unknown as DragEvent, 'city');
    grid.onGroupZoneDrop({ preventDefault: () => undefined, dataTransfer: null } as unknown as DragEvent);
    settle(fixture);

    // Still virtualized (not a fallback to the plain grouped <table>), the pager stays hidden (as it
    // already was pre-grouping, since virtualScroll hides it too), and the flattened list surfaces
    // both group headers and rows through the one viewport.
    expect(fixture.debugElement.query(By.css('cdk-virtual-scroll-viewport'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('tfoot'))).toBeNull();
    expect(fixture.debugElement.queryAll(By.css('.inandu-group-row')).length).toBeGreaterThan(0);
    expect(fixture.debugElement.queryAll(By.css('.inandu-row')).length).toBeGreaterThan(0);
  }));

  it('still renders rows after grouping a large (2000-row) virtualized dataset', fakeAsync(() => {
    const fixture = createAttached(VirtualScrollLargeGroupedHostComponent);
    settle(fixture);
    const beforeCount = fixture.debugElement.queryAll(By.css('.inandu-row')).length;
    expect(beforeCount).toBeGreaterThan(0);

    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    grid.onColumnDragStart({ dataTransfer: null } as unknown as DragEvent, 'city');
    grid.onGroupZoneDrop({ preventDefault: () => undefined, dataTransfer: null } as unknown as DragEvent);
    settle(fixture);

    // The regression this guards against: switching to a *different* `*cdkVirtualFor` directive
    // instance for the grouped branch (rather than re-feeding the same persistent one a different
    // array) silently rendered zero rows here, on a large-enough dataset, despite the viewport's own
    // getDataLength()/getRenderedRange() reporting correctly.
    expect(fixture.debugElement.queryAll(By.css('.inandu-group-row')).length).toBeGreaterThan(0);
    expect(fixture.debugElement.queryAll(By.css('.inandu-row')).length).toBeGreaterThan(0);
  }));

  it('an editable+groupable virtualized grid still supports row editing through the flattened list', fakeAsync(() => {
    const fixture = createAttached(VirtualScrollEditableGroupedHostComponent);
    settle(fixture);

    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    grid.onColumnDragStart({ dataTransfer: null } as unknown as DragEvent, 'city');
    grid.onGroupZoneDrop({ preventDefault: () => undefined, dataTransfer: null } as unknown as DragEvent);
    settle(fixture);

    const editButton = fixture.debugElement.queryAll(By.css('button')).find(b => b.nativeElement.getAttribute('aria-label') === 'Edit')!;
    editButton.nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-cell-edit-input'))).not.toBeNull();
  }));
});

@Component({
  template: `
    <inandu-grid [data]="rows" columnToggle="true" exportable="true" lang="en">
      <inandu-column title="Id" field="id" hideable="false"></inandu-column>
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Score" field="score" type="number"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ColumnToggleHostComponent {
  rows: InanduGridRow[] = [
    { id: 1, name: 'Alice', score: 10 },
    { id: 2, name: 'Bob', score: 20 },
  ];
}

@Component({
  template: `
    <inandu-grid [data]="rows" columnToggle="true" lang="en">
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Score" field="score" type="number"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class TwoHideableColumnsHostComponent {
  rows: InanduGridRow[] = [{ name: 'Alice', score: 10 }];
}

describe('InanduGridComponent column visibility', () => {
  let fixture: ComponentFixture<ColumnToggleHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ColumnToggleHostComponent] });
    fixture = TestBed.createComponent(ColumnToggleHostComponent);
    // Attached to the real document for the same reason the column-filter "clicking outside" tests
    // are (see that describe block) — this popup closes the same document-click way.
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  const toggleButton = () => fixture.debugElement.query(By.css('.inandu-column-toggle-button')).nativeElement as HTMLButtonElement;
  const popupOptionLabels = () => fixture.debugElement.queryAll(By.css('.inandu-column-toggle-option'))
    .map(el => el.nativeElement.textContent.trim());
  const popupCheckbox = (label: string) => fixture.debugElement.queryAll(By.css('.inandu-column-toggle-option'))
    .find(el => el.nativeElement.textContent.trim() === label)!
    .query(By.css('input[type="checkbox"]')).nativeElement as HTMLInputElement;
  const headerTexts = () => fixture.debugElement.queryAll(By.css('thead tr:last-child th'))
    .map(el => el.nativeElement.textContent.trim());
  const firstRowCellCount = () => fixture.debugElement.queryAll(By.css('tbody tr.inandu-row'))[0].queryAll(By.css('td')).length;

  it('does not render a toggle button when columnToggle is not set', () => {
    const plainFixture = TestBed.createComponent(HostComponent);
    plainFixture.detectChanges();

    expect(plainFixture.debugElement.query(By.css('.inandu-column-toggle-button'))).toBeNull();
  });

  it('lists only hideable columns in the popup, all checked by default', () => {
    expect(fixture.debugElement.query(By.css('.inandu-column-toggle-popup'))).toBeNull();

    toggleButton().click();
    fixture.detectChanges();

    // "Id" is hideable="false" — never offered as something the user could hide.
    expect(popupOptionLabels()).toEqual(['Name', 'Score']);
    expect(popupCheckbox('Name').checked).toBeTrue();
    expect(popupCheckbox('Score').checked).toBeTrue();
  });

  it('unchecking a column hides its header and every row\'s cell for it', () => {
    toggleButton().click();
    fixture.detectChanges();
    expect(headerTexts()).toEqual(['Id', 'Name', 'Score']);
    expect(firstRowCellCount()).toBe(3);

    popupCheckbox('Name').click();
    fixture.detectChanges();

    expect(headerTexts()).toEqual(['Id', 'Score']);
    expect(firstRowCellCount()).toBe(2);
  });

  it('re-checking a hidden column brings its header and cells back', () => {
    toggleButton().click();
    fixture.detectChanges();
    popupCheckbox('Name').click();
    fixture.detectChanges();
    expect(headerTexts()).toEqual(['Id', 'Score']);

    popupCheckbox('Name').click();
    fixture.detectChanges();

    expect(headerTexts()).toEqual(['Id', 'Name', 'Score']);
  });

  it('shrinks the colspan of full-width rows (e.g. the empty-state row) to match the visible column count', () => {
    fixture.componentInstance.rows = [];
    fixture.detectChanges();
    toggleButton().click();
    fixture.detectChanges();
    popupCheckbox('Name').click();
    fixture.detectChanges();

    // Id + Score visible (2) + no select/actions columns on this grid.
    const emptyRow = fixture.debugElement.query(By.css('tbody tr.inandu-row td'));
    expect(emptyRow.attributes['colspan']).toBe('2');
  });

  it('excludes a hidden column from CSV export', async () => {
    toggleButton().click();
    fixture.detectChanges();
    popupCheckbox('Name').click();
    fixture.detectChanges();

    let capturedBlob: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');

    fixture.debugElement.query(By.css('[aria-label="Export CSV"]')).nativeElement.click();

    const text = await capturedBlob!.text();
    expect(text).toBe(['Id,Score', '1,10', '2,20'].join('\r\n'));
  });

  it('closes the popup on a click outside of it', () => {
    toggleButton().click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.inandu-column-toggle-popup'))).not.toBeNull();

    document.body.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-column-toggle-popup'))).toBeNull();
  });

  it('refuses to hide the last remaining visible column', () => {
    const twoColFixture = TestBed.createComponent(TwoHideableColumnsHostComponent);
    document.body.appendChild(twoColFixture.nativeElement);
    twoColFixture.detectChanges();

    const grid = twoColFixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    grid.toggleColumnVisibility('name');
    twoColFixture.detectChanges();
    expect(grid.visibleColumns().map(c => c.field())).toEqual(['score']);

    // Only "score" is left visible — hiding it too would leave nothing to render.
    grid.toggleColumnVisibility('score');
    twoColFixture.detectChanges();

    expect(grid.visibleColumns().map(c => c.field())).toEqual(['score']);
    twoColFixture.nativeElement.remove();
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" serverSide="true" [totalItems]="total" [paging]="paging"
      (sortChange)="sortEvents.push($event)" (pageChange)="pageEvents.push($event)" (filterChange)="filterEvents.push($event)">
      <inandu-column title="Name" field="name" sortable="true" filter="yes"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ServerSideHostComponent {
  // Deliberately unsorted — a server-side grid must never reorder data() locally, even though the
  // column is sortable="true".
  rows: InanduGridRow[] = [{ name: 'Zeta' }, { name: 'Alpha' }];
  total = 42;
  paging: InanduGridPagingOptions = { pageSize: 2 };
  sortEvents: InanduGridSortCriterion[][] = [];
  pageEvents: InanduGridPageState[] = [];
  filterEvents: InanduGridFilterState[] = [];
}

describe('InanduGridComponent server-side mode', () => {
  let fixture: ComponentFixture<ServerSideHostComponent>;
  let grid: InanduGridComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ServerSideHostComponent] });
    fixture = TestBed.createComponent(ServerSideHostComponent);
    fixture.detectChanges();
    grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
  });

  function nameValues(): string[] {
    return fixture.debugElement.queryAll(By.css('tbody td')).map(cell => cell.nativeElement.textContent.trim());
  }

  it('renders data() as-is, without locally sorting/filtering/paginating it', () => {
    expect(nameValues()).toEqual(['Zeta', 'Alpha']);
  });

  it('computes totalPages from totalItems(), since data() is only ever one page', () => {
    expect(grid.totalPages()).toBe(21); // ceil(42 / 2)
  });

  it('emits pageChange once on load and sortChange/filterChange when their controls are used', () => {
    expect(fixture.componentInstance.pageEvents).toEqual([{ page: 1, pageSize: 2 }]);
    expect(fixture.componentInstance.sortEvents).toEqual([[]]);
    expect(fixture.componentInstance.filterEvents).toEqual([{ query: '', columnFilters: {} }]);

    fixture.debugElement.query(By.css('.inandu-sort-button')).nativeElement.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.sortEvents.at(-1)).toEqual([{ field: 'name', direction: 'asc' }]);
    // Still not applied locally — the consumer is expected to refetch and rebind data() themselves.
    expect(nameValues()).toEqual(['Zeta', 'Alpha']);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Score" field="score">
        <ng-template let-value let-row="row">
          <strong class="score-cell">{{ value }}!! ({{ row.name }})</strong>
        </ng-template>
      </inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class CellTemplateHostComponent {
  rows: InanduGridRow[] = [{ name: 'Alice', score: 7 }];
}

describe('InanduGridComponent custom cell templates', () => {
  let fixture: ComponentFixture<CellTemplateHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CellTemplateHostComponent] });
    fixture = TestBed.createComponent(CellTemplateHostComponent);
    fixture.detectChanges();
  });

  it('renders a column`s cellTemplate, with the raw value and full row available to it', () => {
    const custom = fixture.debugElement.query(By.css('.score-cell'));
    expect(custom.nativeElement.textContent.trim()).toBe('7!! (Alice)');
  });

  it('falls back to the normal formatted value for a column with no cellTemplate', () => {
    const nameCell = fixture.debugElement.queryAll(By.css('tbody td'))[0];
    expect(nameCell.nativeElement.textContent.trim()).toBe('Alice');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Score" field="score">
        <ng-template #inanduHeaderTemplate let-title>
          <span class="custom-header">★ {{ title }}</span>
        </ng-template>
      </inandu-column>
      <inandu-column title="Bonus" field="bonus">
        <ng-template #inanduHeaderTemplate>
          <span class="bonus-header">Bonus Header</span>
        </ng-template>
        <ng-template let-value let-row="row">
          <em class="bonus-cell">{{ value }}x ({{ row.name }})</em>
        </ng-template>
      </inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class HeaderTemplateHostComponent {
  rows: InanduGridRow[] = [{ name: 'Alice', score: 7, bonus: 2 }];
}

describe('InanduGridComponent custom header templates', () => {
  let fixture: ComponentFixture<HeaderTemplateHostComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderTemplateHostComponent);
    fixture.detectChanges();
  });

  it('falls back to the plain title text for a column with no headerTemplate', () => {
    const headers = fixture.debugElement.queryAll(By.css('th.inandu-column'));
    expect(headers[0].nativeElement.textContent.trim()).toBe('Name');
  });

  it("renders a column's headerTemplate, with the resolved title available to it", () => {
    const custom = fixture.debugElement.query(By.css('.custom-header'));
    expect(custom.nativeElement.textContent.trim()).toBe('★ Score');
  });

  it('a header-only column (no cellTemplate) still uses the normal formatted value for its cells', () => {
    const custom = fixture.debugElement.query(By.css('.custom-header'));
    expect(custom).toBeTruthy();
    const scoreCell = fixture.debugElement.query(By.css('td[data-field="score"]'));
    expect(scoreCell.nativeElement.textContent.trim()).toBe('7');
  });

  it('headerTemplate and cellTemplate coexist on the same column, in either declaration order', () => {
    const header = fixture.debugElement.query(By.css('.bonus-header'));
    const cell = fixture.debugElement.query(By.css('.bonus-cell'));
    expect(header.nativeElement.textContent.trim()).toBe('Bonus Header');
    expect(cell.nativeElement.textContent.trim()).toBe('2x (Alice)');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Dept" field="dept" sortable="true"></inandu-column>
      <inandu-column title="Name" field="name" sortable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class MultiSortHostComponent {
  rows: InanduGridRow[] = [
    { dept: 'B', name: 'Bob' },
    { dept: 'A', name: 'Zoe' },
    { dept: 'A', name: 'Amy' },
  ];
}

describe('InanduGridComponent multi-column sort', () => {
  let fixture: ComponentFixture<MultiSortHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MultiSortHostComponent] });
    fixture = TestBed.createComponent(MultiSortHostComponent);
    fixture.detectChanges();
  });

  function nameValues(): string[] {
    return fixture.debugElement
      .queryAll(By.css('tbody tr'))
      .map(row => row.queryAll(By.css('td'))[1].nativeElement.textContent.trim());
  }

  function sortButtons(): HTMLElement[] {
    return fixture.debugElement.queryAll(By.css('.inandu-sort-button')).map(el => el.nativeElement);
  }

  it('shift-click adds a secondary sort criterion on top of the primary one', () => {
    sortButtons()[0].click(); // Dept ascending
    fixture.detectChanges();
    expect(nameValues()).toEqual(['Zoe', 'Amy', 'Bob']); // dept A (stable: Zoe, Amy), then dept B

    sortButtons()[1].dispatchEvent(new MouseEvent('click', { shiftKey: true, bubbles: true }));
    fixture.detectChanges();
    expect(nameValues()).toEqual(['Amy', 'Zoe', 'Bob']); // within dept A, now also sorted by name
  });

  it('shows a priority badge only once a second criterion is active, and a plain click collapses back to one', () => {
    sortButtons()[0].click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.inandu-sort-priority'))).toBeNull();

    sortButtons()[1].dispatchEvent(new MouseEvent('click', { shiftKey: true, bubbles: true }));
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.inandu-sort-priority')).length).toBe(2);

    sortButtons()[1].click(); // plain click: collapses to a single sort on Name
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.inandu-sort-priority'))).toBeNull();
    expect(nameValues()).toEqual(['Amy', 'Bob', 'Zoe']);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="City" field="city" groupable="true"></inandu-column>
      <inandu-column title="Sales" field="sales" type="number" aggregate="sum"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class GroupAggregateHostComponent {
  rows: InanduGridRow[] = [
    { city: 'NY', sales: 10 },
    { city: 'NY', sales: 20 },
    { city: 'LA', sales: 5 },
  ];
}

describe('InanduGridComponent group-by aggregates', () => {
  let fixture: ComponentFixture<GroupAggregateHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [GroupAggregateHostComponent] });
    fixture = TestBed.createComponent(GroupAggregateHostComponent);
    fixture.detectChanges();
  });

  it('shows the configured aggregate next to each group header once grouped', () => {
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    grid.onColumnDragStart(fakeDragEvent(), 'city');
    grid.onGroupZoneDrop(fakeDragEvent());
    fixture.detectChanges();

    const groupHeaders = fixture.debugElement.queryAll(By.css('.inandu-group-row td'));
    const nyHeader = groupHeaders.find(td => td.nativeElement.textContent.includes('NY'))!;
    expect(nyHeader.query(By.css('.inandu-group-aggregate')).nativeElement.textContent.trim()).toBe('Sales Σ: 30');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" [stateKey]="stateKey" columnToggle="true">
      <inandu-column title="Name" field="name" sortable="true"></inandu-column>
      <inandu-column title="Score" field="score"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class PersistedStateHostComponent {
  stateKey = 'persist-test-grid';
  rows: InanduGridRow[] = [
    { name: 'Bob', score: 1 },
    { name: 'Amy', score: 2 },
  ];
}

describe('InanduGridComponent persisted state', () => {
  const STORAGE_KEY = 'inandu-grid-state:persist-test-grid';

  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('persists a column-visibility change and restores it on a fresh grid sharing the same stateKey', () => {
    TestBed.configureTestingModule({ imports: [PersistedStateHostComponent] });
    const fixture = TestBed.createComponent(PersistedStateHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.toggleColumnVisibility('score');
    fixture.detectChanges();
    expect(grid.visibleColumns().map(c => c.field())).toEqual(['name']);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('score');

    const fixture2 = TestBed.createComponent(PersistedStateHostComponent);
    fixture2.detectChanges();
    const grid2 = fixture2.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    expect(grid2.visibleColumns().map(c => c.field())).toEqual(['name']);
  });

  it('persists setColumnOrder()/setColumnPinned() and restores both on a fresh grid sharing the same stateKey', () => {
    TestBed.configureTestingModule({ imports: [PersistedStateHostComponent] });
    const fixture = TestBed.createComponent(PersistedStateHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.setColumnOrder(['score', 'name']);
    grid.setColumnPinned('score', 'left');
    fixture.detectChanges();
    expect(grid.displayColumns().map(c => c.field())).toEqual(['score', 'name']);
    expect(grid.columnPinnedSide(grid.displayColumns()[0])).toBe('left');

    const fixture2 = TestBed.createComponent(PersistedStateHostComponent);
    fixture2.detectChanges();
    const grid2 = fixture2.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    expect(grid2.displayColumns().map(c => c.field())).toEqual(['score', 'name']);
    expect(grid2.columnPinnedSide(grid2.displayColumns()[0])).toBe('left');
  });

  it('does not persist anything when stateKey is unset', () => {
    @Component({
      template: `
        <inandu-grid [data]="rows" columnToggle="true">
          <inandu-column title="Name" field="name"></inandu-column>
          <inandu-column title="Score" field="score"></inandu-column>
        </inandu-grid>
      `,
      imports: [InanduGridComponent, InanduColumnComponent],
    })
    class NoStateKeyHostComponent {
      rows: InanduGridRow[] = [{ name: 'Bob', score: 1 }];
    }

    TestBed.configureTestingModule({ imports: [NoStateKeyHostComponent] });
    const fixture = TestBed.createComponent(NoStateKeyHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    grid.toggleColumnVisibility('score');
    fixture.detectChanges();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Name" field="name"></inandu-column>
      <inandu-column title="Score" field="score"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class AriaHostComponent {
  rows: InanduGridRow[] = [
    { name: 'Amy', score: 1 },
    { name: 'Bob', score: 2 },
  ];
}

describe('InanduGridComponent grid accessibility', () => {
  let fixture: ComponentFixture<AriaHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AriaHostComponent] });
    fixture = TestBed.createComponent(AriaHostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => fixture.nativeElement.remove());

  it('marks the table/header/data cells with WAI-ARIA grid roles', () => {
    expect(fixture.debugElement.query(By.css('table')).nativeElement.getAttribute('role')).toBe('grid');
    expect(fixture.debugElement.queryAll(By.css('th')).every(th => th.nativeElement.getAttribute('role') === 'columnheader')).toBeTrue();
    expect(fixture.debugElement.queryAll(By.css('tbody td')).every(td => td.nativeElement.getAttribute('role') === 'gridcell')).toBeTrue();
  });

  it('moves focus with ArrowRight/ArrowDown using a roving tabindex', () => {
    const firstHeader = fixture.debugElement.query(By.css('th[role="columnheader"]')).nativeElement as HTMLElement;
    firstHeader.focus();
    firstHeader.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    const secondHeader = fixture.debugElement.queryAll(By.css('th[role="columnheader"]'))[1].nativeElement as HTMLElement;
    expect(document.activeElement).toBe(secondHeader);
    expect(firstHeader.tabIndex).toBe(-1);

    secondHeader.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    const firstDataRowSecondCell = fixture.debugElement.queryAll(By.css('tbody tr.inandu-row'))[0].queryAll(By.css('td'))[1].nativeElement;
    expect(document.activeElement).toBe(firstDataRowSecondCell);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" selectable="true" deletable="true" (rowsDelete)="deleted = $event" (selectionChange)="selectionChanges.push($event)">
      <inandu-column title="Name" field="name"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class BulkDeleteHostComponent {
  rows: InanduGridRow[] = [{ name: 'Amy' }, { name: 'Bob' }];
  deleted: InanduGridRow[] = [];
  selectionChanges: InanduGridRow[][] = [];
}

describe('InanduGridComponent bulk row deletion', () => {
  let fixture: ComponentFixture<BulkDeleteHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BulkDeleteHostComponent] });
    fixture = TestBed.createComponent(BulkDeleteHostComponent);
    fixture.detectChanges();
  });

  function rowCheckboxes(): HTMLInputElement[] {
    return fixture.debugElement.queryAll(By.css('tbody .inandu-select-checkbox')).map(el => el.nativeElement);
  }

  function bulkDeleteButton() {
    return fixture.debugElement.query(By.css('.inandu-toolbar .inandu-icon-delete'));
  }

  it('only shows the bulk-delete toolbar button once at least one row is selected', () => {
    expect(bulkDeleteButton()).toBeNull();

    rowCheckboxes()[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(bulkDeleteButton()).not.toBeNull();
  });

  it('emits rowsDelete with every selected row and clears the selection afterward', () => {
    rowCheckboxes()[0].dispatchEvent(new Event('change'));
    rowCheckboxes()[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    bulkDeleteButton().nativeElement.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.deleted).toEqual(fixture.componentInstance.rows);
    expect(fixture.componentInstance.selectionChanges.at(-1)).toEqual([]);
    expect(bulkDeleteButton()).toBeNull();
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Name" field="name" [width]="100"></inandu-column>
      <inandu-column title="B" field="b" [width]="60" sticky="true" stickySide="right"></inandu-column>
      <inandu-column title="C" field="c" [width]="50" sticky="true" stickySide="right"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class StickyRightHostComponent {
  rows: InanduGridRow[] = [{ name: 'Amy', b: 1, c: 2 }];
}

describe('InanduGridComponent sticky columns on the right', () => {
  let fixture: ComponentFixture<StickyRightHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StickyRightHostComponent] });
    fixture = TestBed.createComponent(StickyRightHostComponent);
    fixture.detectChanges();
  });

  it('anchors stickySide="right" columns via `right`, stacking from the table`s right edge inward', () => {
    const headers = fixture.debugElement.queryAll(By.css('th'));
    const [, headerB, headerC] = headers;

    // C is the last column — nothing sticky renders after it, so its offset is 0.
    expect((headerC.nativeElement as HTMLElement).style.insetInlineEnd).toBe('0px');
    // B has C (width 50) rendering after it, so it's pushed out by C's width.
    expect((headerB.nativeElement as HTMLElement).style.insetInlineEnd).toBe('50px');
    expect((headerB.nativeElement as HTMLElement).style.insetInlineStart).toBe('');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" [loading]="loading" [error]="error" exportable="true">
      <inandu-column title="Name" field="name"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class LoadingErrorHostComponent {
  rows: InanduGridRow[] = [{ name: 'Amy' }];
  loading = false;
  error = '';
}

describe('InanduGridComponent loading and error states', () => {
  let fixture: ComponentFixture<LoadingErrorHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LoadingErrorHostComponent] });
    fixture = TestBed.createComponent(LoadingErrorHostComponent);
    fixture.detectChanges();
  });

  it('shows a loading row instead of data rows, and disables the export toolbar', () => {
    fixture.componentInstance.loading = true;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-loading-row')).nativeElement.textContent.trim()).toBe('Loading…');
    expect(fixture.debugElement.query(By.css('tbody tr.inandu-row:not(.inandu-loading-row)'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.inandu-icon-export-csv')).nativeElement.disabled).toBeTrue();
  });

  it('shows the error message instead of data rows, taking priority over loading', () => {
    fixture.componentInstance.loading = true;
    fixture.componentInstance.error = 'Failed to fetch';
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-error-row')).nativeElement.textContent.trim()).toBe('Failed to fetch');
    expect(fixture.debugElement.query(By.css('.inandu-loading-row'))).toBeNull();
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="Dept" field="dept" groupable="true"></inandu-column>
      <inandu-column title="Name" field="name"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class DragFeedbackHostComponent {
  rows: InanduGridRow[] = [{ dept: 'A', name: 'Amy' }];
}

describe('InanduGridComponent drag-and-drop visual feedback', () => {
  let fixture: ComponentFixture<DragFeedbackHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DragFeedbackHostComponent] });
    fixture = TestBed.createComponent(DragFeedbackHostComponent);
    fixture.detectChanges();
  });

  it('highlights the group-by drop zone while dragged over, clearing on dragleave', () => {
    const zone = fixture.debugElement.query(By.css('.inandu-group-zone'));
    zone.nativeElement.dispatchEvent(new DragEvent('dragover'));
    fixture.detectChanges();
    expect((zone.nativeElement as HTMLElement).classList).toContain('inandu-drag-over');

    zone.nativeElement.dispatchEvent(new DragEvent('dragleave'));
    fixture.detectChanges();
    expect((zone.nativeElement as HTMLElement).classList).not.toContain('inandu-drag-over');
  });

  it('highlights only the header currently being dragged over, and clears it on drop', () => {
    const headers = fixture.debugElement.queryAll(By.css('th'));
    headers[1].nativeElement.dispatchEvent(new DragEvent('dragover'));
    fixture.detectChanges();
    expect((headers[1].nativeElement as HTMLElement).classList).toContain('inandu-drag-over');
    expect((headers[0].nativeElement as HTMLElement).classList).not.toContain('inandu-drag-over');

    headers[1].nativeElement.dispatchEvent(new DragEvent('drop'));
    fixture.detectChanges();
    expect((headers[1].nativeElement as HTMLElement).classList).not.toContain('inandu-drag-over');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" creatable="true" (rowCreate)="onRowCreate($event)">
      <inandu-column title="Code" field="code" editable="true" required="true" [asyncValidator]="codeAsyncValidator"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class AsyncValidatorHostComponent {
  rows: InanduGridRow[] = [];
  created: InanduGridNewRowValues[] = [];
  resolveWith: string | null = null;
  calls: unknown[][] = [];
  readonly codeAsyncValidator: InanduColumnAsyncValidator = (value, row) => {
    this.calls.push([value, row]);
    return Promise.resolve(this.resolveWith);
  };
  onRowCreate(values: InanduGridNewRowValues): void {
    this.created.push(values);
  }
}

describe('InanduGridComponent async column validation', () => {
  let fixture: ComponentFixture<AsyncValidatorHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AsyncValidatorHostComponent] });
    fixture = TestBed.createComponent(AsyncValidatorHostComponent);
    fixture.detectChanges();
  });

  const addButton = () => fixture.debugElement.queryAll(By.css('button')).find(b => b.nativeElement.getAttribute('aria-label') === 'Add row')!;
  const addRowCells = () => fixture.debugElement.query(By.css('tr.inandu-add-row')).queryAll(By.css('td'));
  const saveButton = () => fixture.debugElement.query(By.css('tr.inandu-add-row .inandu-row-actions')).queryAll(By.css('button'))[0];
  const setInput = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('runs the async validator only after sync rules pass, and disables Save/Cancel while pending', async () => {
    addButton().nativeElement.click();
    fixture.detectChanges();
    // Left empty — required (sync) fails, so the async validator must never even be called.
    saveButton().nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.calls.length).toBe(0);

    setInput(addRowCells()[0].query(By.css('.inandu-cell-edit-input')).nativeElement, 'ABC');
    fixture.componentInstance.resolveWith = null;

    const clickPromise = (async () => {
      saveButton().nativeElement.click();
    })();
    // Right after the click, the async check is in flight — Save/Cancel should be disabled.
    fixture.detectChanges();
    expect((saveButton().nativeElement as HTMLButtonElement).disabled).toBeTrue();

    await clickPromise;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.calls.length).toBe(1);
    expect(fixture.componentInstance.created).toEqual([{ code: 'ABC' }]);
  });

  it('blocks the save with the async validator\'s message when it resolves non-null', async () => {
    addButton().nativeElement.click();
    fixture.detectChanges();
    setInput(addRowCells()[0].query(By.css('.inandu-cell-edit-input')).nativeElement, 'DUP');
    fixture.componentInstance.resolveWith = 'Code already exists';

    saveButton().nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.created).toEqual([]);
    expect(addRowCells()[0].query(By.css('.inandu-field-error')).nativeElement.textContent.trim()).toBe('Code already exists');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" [customTranslations]="customTranslations">
      <inandu-column title="Name" field="name"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class CustomTranslationsHostComponent {
  rows: InanduGridRow[] = [];
  customTranslations = { en: { MsgNoData: 'Nothing to show here' } };
}

describe('InanduGridComponent extensible i18n', () => {
  it('merges customTranslations on top of the built-in dictionary, leaving other keys untouched', () => {
    TestBed.configureTestingModule({ imports: [CustomTranslationsHostComponent] });
    const fixture = TestBed.createComponent(CustomTranslationsHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('tbody td')).nativeElement.textContent.trim()).toBe('Nothing to show here');
  });

  it('does not affect a grid with no customTranslations bound', () => {
    @Component({
      template: `
        <inandu-grid [data]="rows" lang="en">
          <inandu-column title="Name" field="name"></inandu-column>
        </inandu-grid>
      `,
      imports: [InanduGridComponent, InanduColumnComponent],
    })
    class PlainHostComponent {
      rows: InanduGridRow[] = [];
    }

    TestBed.configureTestingModule({ imports: [PlainHostComponent] });
    const fixture = TestBed.createComponent(PlainHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('tbody td')).nativeElement.textContent.trim()).toBe('No data');
  });
});

/** A row type narrower than `InanduGridRow` — the recommended pattern (`extends InanduGridRow`) so it's trivially assignable to the grid's `T` constraint. */
interface TypedCustomer extends InanduGridRow {
  name: string;
  score: number;
}

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" selectable="true" deletable="true"
      (selectionChange)="onSelectionChange($event)" (rowDelete)="onRowDelete($event)">
      <inandu-column title="Name" field="name" editable="true"></inandu-column>
      <inandu-column title="Score" field="score" type="number" editable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class TypedRowHostComponent {
  rows: TypedCustomer[] = [
    { name: 'Alice', score: 10 },
    { name: 'Bob', score: 20 },
  ];
  lastSelection: TypedCustomer[] | undefined;
  lastDeleted: TypedCustomer | undefined;
  onSelectionChange(rows: TypedCustomer[]): void {
    this.lastSelection = rows;
  }
  onRowDelete(row: TypedCustomer): void {
    this.lastDeleted = row;
  }
}

describe('InanduGridComponent generic row typing', () => {
  let fixture: ComponentFixture<TypedRowHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TypedRowHostComponent] });
    fixture = TestBed.createComponent(TypedRowHostComponent);
    fixture.detectChanges();
  });

  it('flows a strongly-typed row through selectionChange/rowDelete without any runtime behavior change', () => {
    // The real point of this spec is compile-time: TypedRowHostComponent's handlers are typed
    // TypedCustomer, not InanduGridRow, and this file must still type-check (see ng build/lint in
    // CI) with InanduGridComponent<T> inferring T = TypedCustomer from the [data] binding. The
    // runtime assertions below just confirm nothing else broke along the way.
    const checkbox = fixture.debugElement.query(By.css('tbody .inandu-select-checkbox'));
    checkbox.nativeElement.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.lastSelection).toEqual([{ name: 'Alice', score: 10 }]);

    const firstRow = fixture.debugElement.queryAll(By.css('tbody tr.inandu-row'))[0];
    const deleteButton = firstRow.query(By.css('.inandu-row-actions')).queryAll(By.css('button'))
      .find(b => b.nativeElement.getAttribute('aria-label') === 'Delete')!;
    deleteButton.nativeElement.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.lastDeleted).toEqual({ name: 'Alice', score: 10 });
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en">
      <inandu-column title="Name" field="name"></inandu-column>
      <ng-template let-row>
        <button type="button" class="custom-action" (click)="onCustomAction(row)">Duplicate</button>
      </ng-template>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class RowActionsOnlyHostComponent {
  rows: InanduGridRow[] = [{ name: 'Alice' }, { name: 'Bob' }];
  duplicated: InanduGridRow | undefined;
  onCustomAction(row: InanduGridRow): void {
    this.duplicated = row;
  }
}

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" deletable="true">
      <inandu-column title="Name" field="name"></inandu-column>
      <ng-template let-row>
        <button type="button" class="custom-action">Duplicate {{ row.name }}</button>
      </ng-template>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class RowActionsWithDeleteHostComponent {
  rows: InanduGridRow[] = [{ name: 'Alice' }];
}

describe('InanduGridComponent custom row actions', () => {
  it('does not render an actions column for a grid with no rowActionsTemplate and nothing else row-actiony', () => {
    @Component({
      template: `<inandu-grid [data]="rows"><inandu-column title="Name" field="name"></inandu-column></inandu-grid>`,
      imports: [InanduGridComponent, InanduColumnComponent],
    })
    class NoActionsHostComponent {
      rows: InanduGridRow[] = [{ name: 'Alice' }];
    }
    TestBed.configureTestingModule({ imports: [NoActionsHostComponent] });
    const fixture = TestBed.createComponent(NoActionsHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-row-actions'))).toBeNull();
  });

  it('a rowActionsTemplate alone (no editable/deletable/creatable) is enough to render the actions column', () => {
    TestBed.configureTestingModule({ imports: [RowActionsOnlyHostComponent] });
    const fixture = TestBed.createComponent(RowActionsOnlyHostComponent);
    fixture.detectChanges();

    const firstRowActions = fixture.debugElement.queryAll(By.css('tbody tr.inandu-row'))[0].query(By.css('.inandu-row-actions'));
    expect(firstRowActions).not.toBeNull();
    const button = firstRowActions.query(By.css('.custom-action'));
    expect(button).not.toBeNull();

    button.nativeElement.click();
    expect(fixture.componentInstance.duplicated).toEqual({ name: 'Alice' });
  });

  it('renders after the built-in Delete button, with the correct row bound to let-row', () => {
    TestBed.configureTestingModule({ imports: [RowActionsWithDeleteHostComponent] });
    const fixture = TestBed.createComponent(RowActionsWithDeleteHostComponent);
    fixture.detectChanges();

    const actionsCell = fixture.debugElement.queryAll(By.css('tbody tr.inandu-row'))[0].query(By.css('.inandu-row-actions'));
    const children = actionsCell.queryAll(By.css('button'));
    expect(children[0].nativeElement.getAttribute('aria-label')).toBe('Delete');
    expect(children[1].nativeElement.textContent.trim()).toBe('Duplicate Alice');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" [virtualScroll]="virtual">
      <inandu-column title="Name" field="name" groupable="true"></inandu-column>
      <ng-template inanduDetailTemplate let-row>
        <p class="detail-content">Details for {{ row.name }}</p>
      </ng-template>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent, InanduDetailTemplateDirective],
})
class MasterDetailHostComponent {
  rows: InanduGridRow[] = [{ name: 'Alice' }, { name: 'Bob' }];
  virtual = false;
}

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" [singleDetailExpand]="single">
      <inandu-column title="Name" field="name"></inandu-column>
      <ng-template inanduDetailTemplate let-row>
        <p class="detail-content">Details for {{ row.name }}</p>
      </ng-template>
      <ng-template let-row>
        <button type="button" class="custom-action">Action {{ row.name }}</button>
      </ng-template>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent, InanduDetailTemplateDirective],
})
class MasterDetailWithRowActionsHostComponent {
  rows: InanduGridRow[] = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }];
  single = false;
}

describe('InanduGridComponent master-detail', () => {
  it('does not render a toggle column for a grid with no detailTemplate', () => {
    @Component({
      template: `<inandu-grid [data]="rows"><inandu-column title="Name" field="name"></inandu-column></inandu-grid>`,
      imports: [InanduGridComponent, InanduColumnComponent],
    })
    class NoDetailHostComponent {
      rows: InanduGridRow[] = [{ name: 'Alice' }];
    }
    TestBed.configureTestingModule({ imports: [NoDetailHostComponent] });
    const fixture = TestBed.createComponent(NoDetailHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-detail-toggle-cell'))).toBeNull();
  });

  it('a detailTemplate alone renders the toggle column, collapsed by default', () => {
    TestBed.configureTestingModule({ imports: [MasterDetailHostComponent] });
    const fixture = TestBed.createComponent(MasterDetailHostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('tbody .inandu-detail-toggle-cell')).length).toBe(2);
    expect(fixture.debugElement.query(By.css('.inandu-detail-row'))).toBeNull();
    const toggle = fixture.debugElement.query(By.css('.inandu-detail-toggle-cell button'));
    expect(toggle.nativeElement.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.nativeElement.getAttribute('aria-label')).toBe('Expand row details');
  });

  it('clicking the toggle expands the detail row with the right row bound to let-row', () => {
    TestBed.configureTestingModule({ imports: [MasterDetailHostComponent] });
    const fixture = TestBed.createComponent(MasterDetailHostComponent);
    fixture.detectChanges();

    const firstToggle = fixture.debugElement.queryAll(By.css('.inandu-detail-toggle-cell button'))[0];
    firstToggle.nativeElement.click();
    fixture.detectChanges();

    expect(firstToggle.nativeElement.getAttribute('aria-expanded')).toBe('true');
    expect(firstToggle.nativeElement.getAttribute('aria-label')).toBe('Collapse row details');
    const detailRows = fixture.debugElement.queryAll(By.css('.inandu-detail-row'));
    expect(detailRows.length).toBe(1);
    expect(detailRows[0].query(By.css('.detail-content')).nativeElement.textContent.trim()).toBe('Details for Alice');
  });

  it('the detail row spans every column via totalColumnCount()', () => {
    TestBed.configureTestingModule({ imports: [MasterDetailHostComponent] });
    const fixture = TestBed.createComponent(MasterDetailHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    fixture.debugElement.queryAll(By.css('.inandu-detail-toggle-cell button'))[0].nativeElement.click();
    fixture.detectChanges();

    const cell = fixture.debugElement.query(By.css('.inandu-detail-row td'));
    expect(Number(cell.nativeElement.getAttribute('colspan'))).toBe(grid.totalColumnCount());
  });

  it('clicking the toggle again collapses the detail row', () => {
    TestBed.configureTestingModule({ imports: [MasterDetailHostComponent] });
    const fixture = TestBed.createComponent(MasterDetailHostComponent);
    fixture.detectChanges();

    const toggle = fixture.debugElement.queryAll(By.css('.inandu-detail-toggle-cell button'))[0];
    toggle.nativeElement.click();
    fixture.detectChanges();
    toggle.nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-detail-row'))).toBeNull();
  });

  it('multiple rows can be expanded at once by default', () => {
    TestBed.configureTestingModule({ imports: [MasterDetailHostComponent] });
    const fixture = TestBed.createComponent(MasterDetailHostComponent);
    fixture.detectChanges();

    const toggles = fixture.debugElement.queryAll(By.css('.inandu-detail-toggle-cell button'));
    toggles[0].nativeElement.click();
    toggles[1].nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('.inandu-detail-row')).length).toBe(2);
  });

  it('singleDetailExpand="true" collapses any other expanded row', () => {
    TestBed.configureTestingModule({ imports: [MasterDetailWithRowActionsHostComponent] });
    const fixture = TestBed.createComponent(MasterDetailWithRowActionsHostComponent);
    fixture.componentInstance.single = true;
    fixture.detectChanges();

    const toggles = fixture.debugElement.queryAll(By.css('.inandu-detail-toggle-cell button'));
    toggles[0].nativeElement.click();
    fixture.detectChanges();
    toggles[1].nativeElement.click();
    fixture.detectChanges();

    const detailRows = fixture.debugElement.queryAll(By.css('.inandu-detail-row'));
    expect(detailRows.length).toBe(1);
    expect(detailRows[0].query(By.css('.detail-content')).nativeElement.textContent.trim()).toBe('Details for Bob');
  });

  it('coexists with a separate, unmarked rowActionsTemplate — each renders its own content', () => {
    TestBed.configureTestingModule({ imports: [MasterDetailWithRowActionsHostComponent] });
    const fixture = TestBed.createComponent(MasterDetailWithRowActionsHostComponent);
    fixture.detectChanges();

    const firstRow = fixture.debugElement.queryAll(By.css('tbody tr.inandu-row'))[0];
    expect(firstRow.query(By.css('.inandu-detail-toggle-cell'))).not.toBeNull();
    expect(firstRow.query(By.css('.inandu-row-actions .custom-action')).nativeElement.textContent.trim()).toBe('Action Alice');

    fixture.debugElement.queryAll(By.css('.inandu-detail-toggle-cell button'))[0].nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.detail-content')).nativeElement.textContent.trim()).toBe('Details for Alice');
  });

  it('is disabled (no toggle column) while virtualScroll is on, to avoid misaligning columns', () => {
    TestBed.configureTestingModule({ imports: [MasterDetailHostComponent] });
    const fixture = TestBed.createComponent(MasterDetailHostComponent);
    fixture.componentInstance.virtual = true;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-detail-toggle-cell'))).toBeNull();
  });

  it('is disabled (no toggle column) while grouped, to avoid misaligning columns', () => {
    TestBed.configureTestingModule({ imports: [MasterDetailHostComponent] });
    const fixture = TestBed.createComponent(MasterDetailHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    expect(fixture.debugElement.queryAll(By.css('tbody .inandu-detail-toggle-cell')).length).toBe(2);

    grid.setGroupBy('name');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.inandu-detail-toggle-cell'))).toBeNull();

    grid.setGroupBy(undefined);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('tbody .inandu-detail-toggle-cell')).length).toBe(2);
  });
});

describe('InanduGridComponent select-column width custom property', () => {
  it('sets --inandu-select-column-width on the root element, matching the same width stickyOffset() accounts for', () => {
    @Component({
      template: `
        <inandu-grid [data]="rows" selectable="true">
          <inandu-column title="Name" field="name" sticky="true"></inandu-column>
        </inandu-grid>
      `,
      imports: [InanduGridComponent, InanduColumnComponent],
    })
    class SelectColumnWidthHostComponent {
      rows: InanduGridRow[] = [{ name: 'Alice' }];
    }

    TestBed.configureTestingModule({ imports: [SelectColumnWidthHostComponent] });
    const fixture = TestBed.createComponent(SelectColumnWidthHostComponent);
    fixture.detectChanges();

    const root = fixture.debugElement.query(By.css('.inandu-grid')).nativeElement as HTMLElement;
    const customPropertyValue = root.style.getPropertyValue('--inandu-select-column-width');
    expect(customPropertyValue).toBe('36px');

    // stickyOffset() for the (only) sticky data column should equal that same select-column width —
    // both ultimately read the one SELECT_COLUMN_WIDTH constant.
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    const stickyColumn = grid.visibleColumns()[0];
    expect(grid.stickyOffset(stickyColumn)).toBe(36);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" filter="true" selectable="true" [paging]="paging">
      <inandu-column title="City" field="city" sortable="true" groupable="true" filter="yes"></inandu-column>
      <inandu-column title="Name" field="name" sortable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ProgrammaticApiHostComponent {
  rows: InanduGridRow[] = Array.from({ length: 25 }, (_, i) => ({ city: i % 2 === 0 ? 'Rosario' : 'Salta', name: `Row ${i}` }));
  paging: InanduGridPagingOptions = { pageSize: 10 };
}

describe('InanduGridComponent programmatic API', () => {
  let fixture: ComponentFixture<ProgrammaticApiHostComponent>;
  let grid: InanduGridComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProgrammaticApiHostComponent] });
    fixture = TestBed.createComponent(ProgrammaticApiHostComponent);
    fixture.detectChanges();
    grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
  });

  it('goToPage() jumps directly and clamps out-of-range values via currentPage()', () => {
    grid.goToPage(3);
    fixture.detectChanges();
    expect(grid.currentPage()).toBe(3);

    grid.goToPage(999);
    fixture.detectChanges();
    expect(grid.currentPage()).toBe(grid.totalPages());
  });

  it('setSort()/clearSort() set and clear the multi-column sort directly', () => {
    grid.setSort([{ field: 'name', direction: 'desc' }]);
    fixture.detectChanges();
    expect(grid.sortCriteria()).toEqual([{ field: 'name', direction: 'desc' }]);
    expect(grid.sortedData()[0]['name']).toBe('Row 9');

    grid.clearSort();
    fixture.detectChanges();
    expect(grid.sortCriteria()).toEqual([]);
  });

  it('setFilterQuery() filters and resets to page 1, same as typing in the search box', () => {
    grid.goToPage(2);
    grid.setFilterQuery('Row 1');
    fixture.detectChanges();

    expect(grid.currentPage()).toBe(1);
    expect(grid.filteredData().every(row => String(row['name']).includes('Row 1'))).toBeTrue();
  });

  it('setGroupBy() groups by a groupable field directly, and is a no-op for a non-groupable one', () => {
    grid.setGroupBy('city');
    fixture.detectChanges();
    expect(grid.groupByColumn()?.field()).toBe('city');

    grid.setGroupBy('name'); // not groupable="true"
    fixture.detectChanges();
    expect(grid.groupByColumn()?.field()).toBe('city'); // unchanged

    grid.setGroupBy(undefined);
    fixture.detectChanges();
    expect(grid.groupByColumn()).toBeUndefined();
  });

  it('selectRows()/deselectAll() set the selection directly and emit selectionChange', () => {
    const target = [fixture.componentInstance.rows[0], fixture.componentInstance.rows[1]];
    let lastEmitted: InanduGridRow[] | undefined;
    grid.selectionChange.subscribe(rows => (lastEmitted = rows));

    grid.selectRows(target);
    fixture.detectChanges();
    expect(grid.selectedRowsList()).toEqual(target);
    expect(lastEmitted).toEqual(target);

    grid.deselectAll();
    fixture.detectChanges();
    expect(grid.selectedRowsList()).toEqual([]);
    expect(lastEmitted).toEqual([]);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" rowReorder="true" (rowOrderChange)="onRowOrderChange($event)">
      <inandu-column title="City" field="city" groupable="true"></inandu-column>
      <inandu-column title="Id" field="id"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class RowReorderHostComponent {
  rows: InanduGridRow[] = [
    { id: 1, city: 'Rosario' },
    { id: 2, city: 'Rosario' },
    { id: 3, city: 'Salta' },
    { id: 4, city: 'Salta' },
  ];
  lastEmitted?: InanduGridRow[];

  onRowOrderChange(rows: InanduGridRow[]): void {
    this.lastEmitted = rows;
  }
}

@Component({
  template: `<inandu-grid [data]="rows" lang="en"><inandu-column title="Id" field="id"></inandu-column></inandu-grid>`,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class NoRowReorderHostComponent {
  rows: InanduGridRow[] = [{ id: 1 }, { id: 2 }];
}

describe('InanduGridComponent row reorder', () => {
  const fakeDragEvent = () => ({ preventDefault: () => undefined, dataTransfer: null }) as unknown as DragEvent;

  it('renders no drag-handle column without rowReorder', () => {
    const fixture = TestBed.createComponent(NoRowReorderHostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.inandu-row-drag-cell').length).toBe(0);
  });

  it('renders a drag-handle column, one per row, when rowReorder="true"', () => {
    const fixture = TestBed.createComponent(RowReorderHostComponent);
    fixture.detectChanges();
    const rowEls = fixture.debugElement.queryAll(By.css('tbody tr.inandu-row'));
    expect(rowEls.length).toBe(4);
    for (const rowEl of rowEls) {
      expect(rowEl.query(By.css('.inandu-row-drag-cell'))).toBeTruthy();
      expect(rowEl.nativeElement.getAttribute('draggable')).toBe('true');
    }
  });

  it('dropping a dragged row onto a later row inserts it immediately before the target', () => {
    const fixture = TestBed.createComponent(RowReorderHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    const [row1, , row3] = fixture.componentInstance.rows;

    grid.onRowDragStart(fakeDragEvent(), row1);
    grid.onRowDrop(fakeDragEvent(), row3);

    expect(fixture.componentInstance.lastEmitted?.map(row => row['id'])).toEqual([2, 1, 3, 4]);
  });

  it('dropping a dragged row onto an earlier row inserts it immediately before the target', () => {
    const fixture = TestBed.createComponent(RowReorderHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    const [, row2, , row4] = fixture.componentInstance.rows;

    grid.onRowDragStart(fakeDragEvent(), row4);
    grid.onRowDrop(fakeDragEvent(), row2);

    expect(fixture.componentInstance.lastEmitted?.map(row => row['id'])).toEqual([1, 4, 2, 3]);
  });

  it('dropping a row onto itself is a no-op — no rowOrderChange emitted', () => {
    const fixture = TestBed.createComponent(RowReorderHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    const [row1] = fixture.componentInstance.rows;

    grid.onRowDragStart(fakeDragEvent(), row1);
    grid.onRowDrop(fakeDragEvent(), row1);

    expect(fixture.componentInstance.lastEmitted).toBeUndefined();
  });

  it('hides the drag-handle column while grouped, even with rowReorder="true"', () => {
    const fixture = TestBed.createComponent(RowReorderHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.setGroupBy('city');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.inandu-row-drag-cell').length).toBe(0);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" clipboard="true" (cellsPaste)="onCellsPaste($event)">
      <inandu-column title="Id" field="id"></inandu-column>
      <inandu-column title="Name" field="name" editable="true"></inandu-column>
      <inandu-column title="Active" field="active" type="boolean" editable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class ClipboardHostComponent {
  rows: InanduGridRow[] = [
    { id: 1, name: 'Ana', active: true },
    { id: 2, name: 'Beto', active: false },
    { id: 3, name: 'Caro', active: true },
  ];
  lastPaste?: InanduGridCellPaste[];

  onCellsPaste(paste: InanduGridCellPaste[]): void {
    this.lastPaste = paste;
  }
}

describe('InanduGridComponent clipboard copy/paste', () => {
  let fixture: ComponentFixture<ClipboardHostComponent>;
  let grid: InanduGridComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClipboardHostComponent);
    fixture.detectChanges();
    grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
  });

  it('copyCellText() returns the formatted value for a real cell, "" otherwise', () => {
    const [row1] = fixture.componentInstance.rows;
    expect(grid.copyCellText(row1, 'name')).toBe('Ana');
    expect(grid.copyCellText(row1, 'active')).toBe('true');
    expect(grid.copyCellText(row1, 'no-such-field')).toBe('');
    expect(grid.copyCellText({ id: 999 }, 'name')).toBe('');
  });

  it('pasteAt() writes a single pasted cell into an editable column and emits cellsPaste', () => {
    const [row1] = fixture.componentInstance.rows;
    grid.pasteAt(row1, 'name', 'Zoe');
    expect(fixture.componentInstance.lastPaste).toEqual([{ row: row1, field: 'name', value: 'Zoe' }]);
  });

  it('pasteAt() fans a multi-row/multi-column block out from the anchor cell, parsing booleans as text', () => {
    const [row1, row2] = fixture.componentInstance.rows;
    grid.pasteAt(row1, 'name', 'X\tfalse\nY\ttrue');
    expect(fixture.componentInstance.lastPaste).toEqual([
      { row: row1, field: 'name', value: 'X' },
      { row: row1, field: 'active', value: false },
      { row: row2, field: 'name', value: 'Y' },
      { row: row2, field: 'active', value: true },
    ]);
  });

  it('pasteAt() clips a block that runs past the last row/column instead of extending data()', () => {
    const [, , row3] = fixture.componentInstance.rows;
    grid.pasteAt(row3, 'active', 'true\textra-column\nextra-row-1\textra-row-2');
    expect(fixture.componentInstance.lastPaste).toEqual([{ row: row3, field: 'active', value: true }]);
  });

  it('pasteAt() skips a pasted cell that lands on a non-editable column', () => {
    const [row1] = fixture.componentInstance.rows;
    grid.pasteAt(row1, 'id', 'NewName');
    expect(fixture.componentInstance.lastPaste).toBeUndefined();
  });

  it('pasteAt() ignores a single trailing line break instead of producing a phantom empty row', () => {
    const [row1, row2] = fixture.componentInstance.rows;
    grid.pasteAt(row1, 'name', 'X\nY\n');
    expect(fixture.componentInstance.lastPaste).toEqual([
      { row: row1, field: 'name', value: 'X' },
      { row: row2, field: 'name', value: 'Y' },
    ]);
  });

  it('pasteAt() is a no-op (no emit) when row/field do not resolve to a real cell', () => {
    grid.pasteAt({ id: 999 }, 'name', 'X');
    grid.pasteAt(fixture.componentInstance.rows[0], 'no-such-field', 'X');
    expect(fixture.componentInstance.lastPaste).toBeUndefined();
  });

  it('Ctrl+C on a focused data cell copies its text via the Clipboard API and prevents default', () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    const cell = fixture.debugElement.query(By.css('tbody tr.inandu-row td[data-field="name"]')).nativeElement as HTMLElement;
    const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: cell });
    grid.onGridKeyDown(event);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Ana');
    expect(event.defaultPrevented).toBeTrue();
  });

  it('Ctrl+V on a focused data cell reads the Clipboard API and applies it via pasteAt()', async () => {
    spyOn(navigator.clipboard, 'readText').and.returnValue(Promise.resolve('Zoe'));
    const cell = fixture.debugElement.query(By.css('tbody tr.inandu-row td[data-field="name"]')).nativeElement as HTMLElement;
    const event = new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: cell });
    grid.onGridKeyDown(event);
    expect(event.defaultPrevented).toBeTrue();
    await fixture.whenStable();
    expect(fixture.componentInstance.lastPaste).toEqual([{ row: fixture.componentInstance.rows[0], field: 'name', value: 'Zoe' }]);
  });

  it('does nothing when clipboard() is off (the default)', () => {
    const noClipboardFixture = TestBed.createComponent(PagingHostComponent);
    noClipboardFixture.detectChanges();
    const noClipboardGrid = noClipboardFixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    const cell = noClipboardFixture.debugElement.query(By.css('[role="gridcell"]')).nativeElement as HTMLElement;
    const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: cell });
    noClipboardGrid.onGridKeyDown(event);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBeFalse();
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" showTotals="true" [paging]="paging">
      <inandu-column title="City" field="city" groupable="true"></inandu-column>
      <inandu-column title="Amount" field="amount" type="number" aggregate="sum"></inandu-column>
      <inandu-column title="Qty" field="qty" type="number" aggregate="avg"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class TotalsHostComponent {
  rows: InanduGridRow[] = [
    { city: 'A', amount: 10, qty: 2 },
    { city: 'B', amount: 20, qty: 4 },
    { city: 'A', amount: 30, qty: 6 },
  ];
  paging: InanduGridPagingOptions = { pageSize: 1 };
}

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" virtualScroll="true" showTotals="true" [height]="200">
      <inandu-column title="Amount" field="amount" type="number" aggregate="sum"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class VirtualTotalsHostComponent {
  rows: InanduGridRow[] = [{ amount: 1 }, { amount: 2 }];
}

describe('InanduGridComponent totals footer row', () => {
  it('renders no totals row without showTotals', () => {
    const fixture = TestBed.createComponent(PagingHostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.inandu-totals-row').length).toBe(0);
  });

  it("shows each aggregate column's grand total across all data, not just the current page", () => {
    const fixture = TestBed.createComponent(TotalsHostComponent);
    fixture.detectChanges();
    const cells = fixture.debugElement.queryAll(By.css('.inandu-totals-row td'));
    expect(cells.map(c => (c.nativeElement as HTMLElement).textContent?.trim())).toEqual(['', 'Σ 60', 'x̄ 4']);
  });

  it('still shows the grand total (not a per-group subtotal) while grouped', () => {
    const fixture = TestBed.createComponent(TotalsHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    grid.setGroupBy('city');
    fixture.detectChanges();
    const cells = fixture.debugElement.queryAll(By.css('.inandu-totals-row td'));
    expect(cells.map(c => (c.nativeElement as HTMLElement).textContent?.trim())).toEqual(['', 'Σ 60', 'x̄ 4']);
  });

  it('is ignored while virtualScroll is on, even with showTotals="true"', () => {
    const fixture = TestBed.createComponent(VirtualTotalsHostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.inandu-totals-row').length).toBe(0);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" dir="rtl" lang="en" [paging]="paging">
      <inandu-column title="Name" field="name"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class RtlHostComponent {
  rows: InanduGridRow[] = Array.from({ length: 15 }, (_, i) => ({ name: `Row ${i}` }));
  paging: InanduGridPagingOptions = { pageSize: 5 };
}

@Component({
  template: `<inandu-grid [data]="rows"><inandu-column title="Name" field="name"></inandu-column></inandu-grid>`,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class DefaultDirHostComponent {
  rows: InanduGridRow[] = [{ name: 'A' }];
}

describe('InanduGridComponent RTL support', () => {
  it('defaults to dir="ltr" on the root element', () => {
    const fixture = TestBed.createComponent(DefaultDirHostComponent);
    fixture.detectChanges();
    const root = fixture.debugElement.query(By.css('.inandu'));
    expect(root.nativeElement.getAttribute('dir')).toBe('ltr');
  });

  it('reflects dir="rtl" onto the root element', () => {
    const fixture = TestBed.createComponent(RtlHostComponent);
    fixture.detectChanges();
    const root = fixture.debugElement.query(By.css('.inandu'));
    expect(root.nativeElement.getAttribute('dir')).toBe('rtl');
  });

  it('mirrors the built-in pager chevron icons under dir="rtl"', () => {
    const fixture = TestBed.createComponent(RtlHostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    try {
      const nextButton = fixture.debugElement.queryAll(By.css('.inandu-pager-button'))
        .find(btn => (btn.nativeElement as HTMLElement).classList.contains('inandu-icon-page-next'));
      expect(nextButton).toBeTruthy();
      const transform = getComputedStyle(nextButton!.nativeElement, '::before').transform;
      expect(transform).not.toBe('none');
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
  });

  it('does not mirror the pager chevrons under the default dir="ltr"', () => {
    const fixture = TestBed.createComponent(PagingHostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    try {
      const nextButton = fixture.debugElement.queryAll(By.css('.inandu-pager-button'))
        .find(btn => (btn.nativeElement as HTMLElement).classList.contains('inandu-icon-page-next'));
      expect(nextButton).toBeTruthy();
      const transform = getComputedStyle(nextButton!.nativeElement, '::before').transform;
      expect(transform).toBe('none');
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" cellRangeSelection="true" clipboard="true" (cellRangeChange)="onRangeChange($event)">
      <inandu-column title="A" field="a"></inandu-column>
      <inandu-column title="B" field="b"></inandu-column>
      <inandu-column title="C" field="c"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class CellRangeHostComponent {
  rows: InanduGridRow[] = [
    { a: 'a0', b: 'b0', c: 'c0' },
    { a: 'a1', b: 'b1', c: 'c1' },
    { a: 'a2', b: 'b2', c: 'c2' },
  ];
  lastRange?: InanduGridCellRangeSelection;

  onRangeChange(range: InanduGridCellRangeSelection | undefined): void {
    this.lastRange = range;
  }
}

const fakeMouseEvent = (opts: Partial<MouseEvent> = {}) => ({ button: 0, shiftKey: false, ...opts }) as MouseEvent;

describe('InanduGridComponent cell range selection', () => {
  let fixture: ComponentFixture<CellRangeHostComponent>;
  let grid: InanduGridComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(CellRangeHostComponent);
    fixture.detectChanges();
    grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
  });

  it('renders no range-selected cells without a selection', () => {
    expect(fixture.nativeElement.querySelectorAll('.inandu-cell-range-selected').length).toBe(0);
  });

  it('a plain mousedown selects just that single cell', () => {
    grid.onCellRangeMouseDown(fakeMouseEvent(), 1, 1);
    fixture.detectChanges();

    expect(grid.isCellInRange(1, 1)).toBeTrue();
    expect(grid.isCellInRange(0, 1)).toBeFalse();
    expect(grid.isCellInRange(1, 0)).toBeFalse();
    expect(fixture.componentInstance.lastRange).toEqual({ rows: [fixture.componentInstance.rows[1]], fields: ['b'] });
  });

  it('dragging (mousedown then mouseenter) extends the selection into a rectangle', () => {
    grid.onCellRangeMouseDown(fakeMouseEvent(), 0, 0);
    grid.onCellRangeMouseEnter(1, 1);
    fixture.detectChanges();

    expect(grid.isCellInRange(0, 0)).toBeTrue();
    expect(grid.isCellInRange(1, 1)).toBeTrue();
    expect(grid.isCellInRange(0, 1)).toBeTrue();
    expect(grid.isCellInRange(1, 0)).toBeTrue();
    expect(grid.isCellInRange(2, 2)).toBeFalse();
    expect(fixture.componentInstance.lastRange).toEqual({
      rows: [fixture.componentInstance.rows[0], fixture.componentInstance.rows[1]],
      fields: ['a', 'b'],
    });
  });

  it('a mouseenter with no active drag does not change the selection', () => {
    grid.onCellRangeMouseDown(fakeMouseEvent(), 0, 0);
    grid.onDocumentMouseUp();
    grid.onCellRangeMouseEnter(2, 2);
    fixture.detectChanges();

    expect(grid.isCellInRange(0, 0)).toBeTrue();
    expect(grid.isCellInRange(2, 2)).toBeFalse();
  });

  it('shift+mousedown (without dragging) extends the existing anchor', () => {
    grid.onCellRangeMouseDown(fakeMouseEvent(), 0, 0);
    grid.onDocumentMouseUp();
    grid.onCellRangeMouseDown(fakeMouseEvent({ shiftKey: true }), 2, 2);
    fixture.detectChanges();

    expect(grid.isCellInRange(0, 0)).toBeTrue();
    expect(grid.isCellInRange(1, 1)).toBeTrue();
    expect(grid.isCellInRange(2, 2)).toBeTrue();
  });

  it('ignores a non-primary-button mousedown (e.g. right-click)', () => {
    grid.onCellRangeMouseDown(fakeMouseEvent({ button: 2 }), 1, 1);
    fixture.detectChanges();

    expect(grid.isCellInRange(1, 1)).toBeFalse();
  });

  it('clearCellRangeSelection() clears the range and emits undefined', () => {
    grid.onCellRangeMouseDown(fakeMouseEvent(), 0, 0);
    grid.clearCellRangeSelection();
    fixture.detectChanges();

    expect(grid.isCellInRange(0, 0)).toBeFalse();
    expect(fixture.componentInstance.lastRange).toBeUndefined();
  });

  it('Ctrl+C copies the whole selected range as TSV when more than one cell is selected', () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    grid.onCellRangeMouseDown(fakeMouseEvent(), 0, 0);
    grid.onCellRangeMouseEnter(1, 1);
    fixture.detectChanges();

    const cell = fixture.debugElement.query(By.css('td[data-field="a"]')).nativeElement as HTMLElement;
    const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: cell });
    grid.onGridKeyDown(event);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('a0\tb0\na1\tb1');
  });

  it('Ctrl+C still copies just the focused cell when only a single cell is selected', () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    grid.onCellRangeMouseDown(fakeMouseEvent(), 0, 0);
    fixture.detectChanges();

    const cell = fixture.debugElement.query(By.css('td[data-field="a"]')).nativeElement as HTMLElement;
    const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: cell });
    grid.onGridKeyDown(event);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('a0');
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" virtualScroll="true" serverSide="true" infiniteScroll="true" [height]="200" [virtualRowHeight]="40" (loadMore)="onLoadMore($event)">
      <inandu-column title="Name" field="name"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class InfiniteScrollHostComponent {
  rows: InanduGridRow[] = Array.from({ length: 20 }, (_, i) => ({ name: `Row ${i}` }));
  loadMoreEvents: InanduGridLoadMoreEvent[] = [];

  onLoadMore(event: InanduGridLoadMoreEvent): void {
    this.loadMoreEvents.push(event);
  }
}

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" virtualScroll="true" serverSide="true" [height]="200" [virtualRowHeight]="40" (loadMore)="onLoadMore($event)">
      <inandu-column title="Name" field="name"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class NoInfiniteScrollHostComponent {
  rows: InanduGridRow[] = Array.from({ length: 20 }, (_, i) => ({ name: `Row ${i}` }));
  loadMoreEvents: InanduGridLoadMoreEvent[] = [];

  onLoadMore(event: InanduGridLoadMoreEvent): void {
    this.loadMoreEvents.push(event);
  }
}

describe('InanduGridComponent infinite scroll', () => {
  it('does not emit loadMore while still far from the end of the loaded data', () => {
    const fixture = TestBed.createComponent(InfiniteScrollHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    // 200px viewport / 40px rows = 5 visible; 0 + 5 + threshold(10) = 15 < 20 rows loaded.
    grid.onVirtualScrolledIndexChange(0);

    expect(fixture.componentInstance.loadMoreEvents).toEqual([]);
  });

  it('emits loadMore once scrolling comes within the threshold of the end', () => {
    const fixture = TestBed.createComponent(InfiniteScrollHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    // 6 + 5 + 10 = 21 >= 20 rows loaded.
    grid.onVirtualScrolledIndexChange(6);

    expect(fixture.componentInstance.loadMoreEvents).toEqual([{ loadedCount: 20 }]);
  });

  it('does not re-emit for the same loaded length once already notified', () => {
    const fixture = TestBed.createComponent(InfiniteScrollHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.onVirtualScrolledIndexChange(6);
    grid.onVirtualScrolledIndexChange(7);
    grid.onVirtualScrolledIndexChange(6);

    expect(fixture.componentInstance.loadMoreEvents).toEqual([{ loadedCount: 20 }]);
  });

  it('emits again once data() has grown past the previous notified length', () => {
    const fixture = TestBed.createComponent(InfiniteScrollHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.onVirtualScrolledIndexChange(6);
    fixture.componentInstance.rows = [...fixture.componentInstance.rows, ...Array.from({ length: 10 }, (_, i) => ({ name: `Row ${20 + i}` }))];
    fixture.detectChanges();

    // Still not close enough to the new, larger end.
    grid.onVirtualScrolledIndexChange(6);
    expect(fixture.componentInstance.loadMoreEvents).toEqual([{ loadedCount: 20 }]);

    // 16 + 5 + 10 = 31 >= 30 rows now loaded.
    grid.onVirtualScrolledIndexChange(16);
    expect(fixture.componentInstance.loadMoreEvents).toEqual([{ loadedCount: 20 }, { loadedCount: 30 }]);
  });

  it('never emits when infiniteScroll is off, even with virtualScroll + serverSide on', () => {
    const fixture = TestBed.createComponent(NoInfiniteScrollHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.onVirtualScrolledIndexChange(16);

    expect(fixture.componentInstance.loadMoreEvents).toEqual([]);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" showTotals="true">
      <inandu-column title="Avg" field="avg" type="number" aggregate="avg"></inandu-column>
      <inandu-column title="Low" field="low" type="number" aggregate="min"></inandu-column>
      <inandu-column title="Sum" field="sum" type="number" aggregate="sum"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class AggregateCoercionHostComponent {
  // Rows 2 and 3 have null / '' cells: Number(null) and Number('') are both a finite 0, so a naive
  // coercion would fold them into the maths (avg over 4 not 2, min of 0 not 10). Row 4's sum cell is
  // a numeric *string*, which should still count.
  rows: InanduGridRow[] = [
    { avg: 10, low: 10, sum: 100 },
    { avg: null, low: null, sum: null },
    { avg: '', low: '', sum: '' },
    { avg: 30, low: 30, sum: '50' },
  ];
}

describe('InanduGridComponent aggregate value coercion', () => {
  it('ignores null / blank cells in avg and min, but still counts a numeric string in sum', () => {
    const fixture = TestBed.createComponent(AggregateCoercionHostComponent);
    fixture.detectChanges();
    const cells = fixture.debugElement.queryAll(By.css('.inandu-totals-row td'));
    expect(cells.map(c => (c.nativeElement as HTMLElement).textContent?.trim())).toEqual(['x̄ 20', 'min 10', 'Σ 150']);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" (rowSave)="onSave($event)">
      <inandu-column title="When" field="when" type="date" editable="true"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class DateEditRoundTripHostComponent {
  readonly original = new Date(2025, 5, 15); // 15 Jun 2025, local midnight
  rows: InanduGridRow[] = [{ when: this.original }];
  saved: InanduGridRowSave | undefined;
  onSave(event: InanduGridRowSave): void {
    this.saved = event;
  }
}

describe('InanduGridComponent date edit round-trip', () => {
  it('keeps the same local calendar day when a date field is edited and saved unchanged', async () => {
    const fixture = TestBed.createComponent(DateEditRoundTripHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;
    const row = fixture.componentInstance.rows[0];

    grid.startEditingRow(row);
    await grid.saveRow(row);

    const when = fixture.componentInstance.saved!.values['when'] as Date;
    expect(when instanceof Date).toBeTrue();
    // Parsing the <input type="date"> "yyyy-mm-dd" back as UTC (the pre-fix bug) would land on the
    // previous local day for anyone west of UTC; a local reconstruction round-trips exactly.
    expect(when.getTime()).toBe(new Date(2025, 5, 15).getTime());
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows" creatable="true" (rowCreate)="onCreate($event)">
      <inandu-column title="Code" field="code" editable="true" pattern="["></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class BadPatternHostComponent {
  rows: InanduGridRow[] = [];
  created: InanduGridNewRowValues[] = [];
  onCreate(values: InanduGridNewRowValues): void {
    this.created.push(values);
  }
}

describe('InanduGridComponent invalid column pattern', () => {
  it('does not throw or block the save when a column pattern is not a valid regex', async () => {
    const fixture = TestBed.createComponent(BadPatternHostComponent);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as InanduGridComponent;

    grid.startAddingRow();
    grid.onRowFieldChange(grid.editableColumns()[0], { target: { value: 'anything' } } as unknown as Event);
    await grid.saveNewRow();

    expect(fixture.componentInstance.created).toEqual([{ code: 'anything' }]);
  });
});

@Component({
  template: `
    <inandu-grid [data]="rows">
      <inandu-column title="When" field="when" type="date" format="DD/MM/YYYY HH:mm"></inandu-column>
    </inandu-grid>
  `,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class SpaceSeparatedDateHostComponent {
  // Safari's Date parser rejects a space-separated "yyyy-mm-dd hh:mm" (Chrome accepts it); the grid
  // normalises the space to an ISO 'T' so both browsers format it, rather than falling back to the
  // raw string. This test passes in Chrome regardless — its value is guarding that normalisation.
  rows: InanduGridRow[] = [{ when: '2025-06-15 14:30' }];
}

describe('InanduGridComponent cross-browser date parsing', () => {
  it('formats a space-separated "yyyy-mm-dd hh:mm" cell value instead of falling back to the raw string', () => {
    const fixture = TestBed.createComponent(SpaceSeparatedDateHostComponent);
    fixture.detectChanges();
    const cell = fixture.debugElement.query(By.css('tbody td'));
    expect((cell.nativeElement as HTMLElement).textContent?.trim()).toBe('15/06/2025 14:30');
  });
});
