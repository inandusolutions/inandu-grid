import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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

  describe('a keyboard jump that has to wait for its row', () => {
    /** The grid, with the private state this part of the behaviour hangs on. */
    interface GridInternals {
      pendingVirtualFocus: { index: number; col: number; at: number; items: readonly unknown[] } | null;
      virtualItems(): readonly unknown[];
    }
    const internals = () => fixture.debugElement.query(By.directive(InanduGridComponent)).componentInstance as unknown as GridInternals;
    /** Asks for row `index` as a keyboard jump would, without it being rendered, so it stays pending until the row shows up. */
    const requestJump = (index: number, ageMs = 0) => {
      internals().pendingVirtualFocus = { index, col: 0, at: Date.now() - ageMs, items: internals().virtualItems() };
    };
    const scrollNear = async (index: number) => {
      viewport().scrollTop = viewport().scrollHeight * (index / host.rows.length);
      expect(await waitFor(() => renderedRows().some(row => indexOfRow(row) === index))).toBeTrue();
      await new Promise(resolve => setTimeout(resolve, 30)); // the grid reacts to the rows arriving a moment later
    };

    it('lands on its row when the row arrives promptly and focus is still in the grid', async () => {
      focusCell(0);
      requestJump(300);
      await scrollNear(300);
      expect(indexOfRow(active())).toBe(300);
    });

    it('never takes focus away from another field when the row finally appears', async () => {
      focusCell(0);
      requestJump(300);
      const outside = root().querySelector('#outside') as HTMLInputElement;
      outside.focus();
      await scrollNear(300);
      expect(active()).toBe(outside);
      expect(internals().pendingVirtualFocus).toBeNull();
    });

    it('is forgotten when it has waited too long', async () => {
      focusCell(0);
      requestJump(300, 5000);
      await scrollNear(300);
      expect(indexOfRow(active())).not.toBe(300);
      expect(internals().pendingVirtualFocus).toBeNull();
    });

    it('is forgotten when the rows change in the meantime (a filter, new data)', async () => {
      focusCell(0);
      requestJump(300);
      host.rows = host.rows.map(row => ({ ...row })); // same size, new rows
      fixture.detectChanges();
      await scrollNear(300);
      expect(indexOfRow(active())).not.toBe(300);
      expect(internals().pendingVirtualFocus).toBeNull();
    });
  });

  describe('focus parked on the viewport while its row is out of the window', () => {
    const park = async () => {
      focusCell(2, 1); // "Person 3"
      viewport().scrollTop = viewport().scrollHeight / 2;
      expect(await waitFor(() => indexOfRow(renderedRows()[0]) > 100)).toBeTrue();
      expect(await waitFor(() => active() === viewport())).toBeTrue();
    };
    const scrollToEnd = async () => {
      viewport().scrollTop = viewport().scrollHeight;
      expect(await waitFor(() => indexOfRow(renderedRows().at(-1)!) >= 495)).toBeTrue();
      await new Promise(resolve => setTimeout(resolve, 30));
    };

    it('returns to the same record after the data was re-ordered, not to the same position', async () => {
      await park();
      host.rows = [...host.rows].reverse(); // the same objects: Person 3 is now at the end
      fixture.detectChanges();
      await scrollToEnd();
      expect(active()?.textContent).toContain('Person 3');
    });

    it('gives focus to nobody when that record is gone, and keeps it on the viewport', async () => {
      await park();
      host.rows = host.rows.filter(row => row['id'] !== 3);
      fixture.detectChanges();
      viewport().scrollTop = 0;
      expect(await waitFor(() => indexOfRow(renderedRows()[0]) === 0)).toBeTrue();
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(active()).toBe(viewport());
    });

    it('with fresh objects (a refresh from an API) the record is not recognised, so focus is not handed to a look-alike', async () => {
      await park();
      host.rows = host.rows.map(row => ({ ...row })); // a grid without a row id identifies a record by its object
      fixture.detectChanges();
      viewport().scrollTop = 0;
      expect(await waitFor(() => indexOfRow(renderedRows()[0]) === 0)).toBeTrue();
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(active()).toBe(viewport());
    });
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
