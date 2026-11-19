import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InanduGridComponent, InanduGridRow } from './inandu-grid.component';
import { InanduColumnComponent } from '../inandu-column/inandu-column.component';

/**
 * The keyboard on a virtual grid, in a real browser (Karma runs Chrome): arrow keys follow the row index across the window, focus waits
 * on the viewport when its row leaves the DOM and comes back, and a grid created while hidden measures itself when it is shown.
 * Layout, scrolling and focus are what is under test, so none of it is mocked.
 */
@Component({
  template: `
    <div [hidden]="hidden">
      <inandu-grid [data]="rows" lang="en" height="200" virtualScroll="true">
        <inandu-column title="Id" field="id" type="number"></inandu-column>
        <inandu-column title="Name" field="name"></inandu-column>
      </inandu-grid>
    </div>
    <input id="outside" aria-label="outside" />
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class VirtualKeyboardHostComponent {
  hidden = false;
  rows: InanduGridRow[] = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, name: `Person ${i + 1}` }));
}

describe('InanduGridComponent virtual scroll: keyboard and focus', () => {
  let fixture: ComponentFixture<VirtualKeyboardHostComponent>;
  let host: VirtualKeyboardHostComponent;

  const root = () => fixture.nativeElement as HTMLElement;
  const viewport = () => root().querySelector('cdk-virtual-scroll-viewport') as HTMLElement;
  const renderedRows = () => Array.from(viewport().querySelectorAll('tbody > tr[data-virtual-index]'));
  const indexOfRow = (el: Element | null) => Number(el?.closest('tr')?.getAttribute('data-virtual-index') ?? NaN);
  const active = () => document.activeElement as HTMLElement | null;

  /** Lets the cdk render and the observers react: polls until `condition` holds (up to `timeout` ms), running change detection. */
  async function waitFor(condition: () => boolean, timeout = 3000): Promise<boolean> {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      fixture.detectChanges();
      if (condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    return condition();
  }

  function focusCell(index: number, col = 0): HTMLElement {
    const cell = viewport().querySelector(`tr[data-virtual-index="${index}"]`)!.querySelectorAll<HTMLElement>('[role="gridcell"]')[col];
    cell.tabIndex = 0;
    cell.focus();
    return cell;
  }

  function press(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    active()!.dispatchEvent(event);
    return event;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [VirtualKeyboardHostComponent] });
    fixture = TestBed.createComponent(VirtualKeyboardHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    expect(await waitFor(() => renderedRows().length >= 5)).toBeTrue();
  });

  it('numbers every rendered row with its position among all the rows', () => {
    const indexes = renderedRows().map(row => Number(row.getAttribute('data-virtual-index')));
    expect(indexes[0]).toBe(0);
    expect(indexes).toEqual(indexes.map((_, i) => i));
  });

  it('a fast run of ArrowDown walks far past the first window without losing a key', async () => {
    focusCell(0);
    for (let i = 0; i < 40; i += 1) {
      press('ArrowDown');
    }
    expect(await waitFor(() => indexOfRow(active()) === 40)).toBeTrue();
  });

  it('a fast run of ArrowUp walks back up through rows that have scrolled out of the DOM', async () => {
    focusCell(0);
    for (let i = 0; i < 40; i += 1) {
      press('ArrowDown');
    }
    expect(await waitFor(() => indexOfRow(active()) === 40)).toBeTrue();
    for (let i = 0; i < 40; i += 1) {
      press('ArrowUp');
    }
    expect(await waitFor(() => indexOfRow(active()) === 0)).toBeTrue();
  });

  it('ArrowUp from the first data row goes to the header, as without virtualization', () => {
    focusCell(0);
    press('ArrowUp');
    expect(active()?.getAttribute('role')).toBe('columnheader');
  });

  it('ArrowDown on the very last row stays there and is consumed', async () => {
    host.rows = host.rows.slice(0, 3);
    fixture.detectChanges();
    expect(await waitFor(() => renderedRows().length === 3)).toBeTrue();
    focusCell(2);
    const event = press('ArrowDown');
    expect(event.defaultPrevented).toBeTrue();
    expect(indexOfRow(active())).toBe(2);
  });

  it('the column of the cell is kept when the arrow keys cross the window', async () => {
    const start = focusCell(0, 1);
    expect(start.textContent).toContain('Person 1');
    for (let i = 0; i < 25; i += 1) {
      press('ArrowDown');
    }
    expect(await waitFor(() => indexOfRow(active()) === 25)).toBeTrue();
    expect(active()?.textContent).toContain('Person 26');
  });

  it('when the focused row scrolls out of the window, focus waits on the viewport instead of falling to <body>', async () => {
    focusCell(0);
    viewport().scrollTop = viewport().scrollHeight / 2;
    expect(await waitFor(() => renderedRows().length > 0 && indexOfRow(renderedRows()[0]) > 100)).toBeTrue();
    expect(await waitFor(() => active() === viewport())).toBeTrue(); // the grid reacts to the rows leaving the DOM a moment later
    expect(active()).not.toBe(document.body);
  });

  it('and when that row is rendered again, focus returns to the same cell', async () => {
    focusCell(0, 1);
    viewport().scrollTop = viewport().scrollHeight / 2;
    expect(await waitFor(() => indexOfRow(renderedRows()[0]) > 100)).toBeTrue();
    viewport().scrollTop = 0;
    expect(await waitFor(() => indexOfRow(active()) === 0)).toBeTrue();
    expect(active()?.textContent).toContain('Person 1');
  });

  it('focus the user moved elsewhere is not taken back when the grid scrolls', async () => {
    focusCell(0);
    const outside = root().querySelector('#outside') as HTMLInputElement;
    outside.focus();
    await new Promise(resolve => setTimeout(resolve, 60)); // the grid forgets its cell once focus has really left it
    viewport().scrollTop = viewport().scrollHeight / 2;
    expect(await waitFor(() => indexOfRow(renderedRows()[0]) > 100)).toBeTrue();
    viewport().scrollTop = 0;
    expect(await waitFor(() => indexOfRow(renderedRows()[0]) === 0)).toBeTrue();
    expect(active()).toBe(outside);
  });

  it('a click elsewhere on the page also makes the grid forget its cell', async () => {
    focusCell(0);
    (active() as HTMLElement).blur();
    await new Promise(resolve => setTimeout(resolve, 60));
    viewport().scrollTop = viewport().scrollHeight / 2;
    expect(await waitFor(() => indexOfRow(renderedRows()[0]) > 100)).toBeTrue();
    expect(active()).not.toBe(viewport());
  });

  it('a grid created while hidden measures itself when it is shown, and fills its viewport', async () => {
    fixture.destroy();
    fixture = TestBed.createComponent(VirtualKeyboardHostComponent);
    host = fixture.componentInstance;
    host.hidden = true;
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 100));
    const whileHidden = renderedRows().length;
    host.hidden = false;
    fixture.detectChanges();
    // 200px of viewport, rows of about 35px: a full window is at least 6 rows; measured at 0px the cdk renders only its minimum buffer.
    expect(await waitFor(() => renderedRows().length >= 6 && renderedRows().length > whileHidden)).toBeTrue();
  });
});
