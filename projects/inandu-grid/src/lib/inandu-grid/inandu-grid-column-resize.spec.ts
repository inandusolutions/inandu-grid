import { TestBed } from '@angular/core/testing';
import { MIN_COLUMN_WIDTH } from '@inandu-solutions/grid-core';
import { InanduGridColumnResize } from './inandu-grid-column-resize';

describe('InanduGridColumnResize', () => {
  let resize: InanduGridColumnResize;
  let widths: [string, number][];
  const record = (field: string, width: number): void => { widths.push([field, width]); };
  const move = (clientX: number): void => { window.dispatchEvent(new MouseEvent('mousemove', { clientX })); };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [InanduGridColumnResize] });
    resize = TestBed.inject(InanduGridColumnResize);
    widths = [];
  });

  it('reports startWidth plus the pointer movement while dragging, and stops on mouseup', () => {
    resize.start(new MouseEvent('mousedown', { clientX: 200 }), 'name', 100, record);
    move(250);
    move(180);
    window.dispatchEvent(new MouseEvent('mouseup'));
    move(400);

    expect(widths).toEqual([['name', 150], ['name', 80]]);
  });

  it('never reports a width below the minimum', () => {
    resize.start(new MouseEvent('mousedown', { clientX: 200 }), 'name', 100, record);
    move(-1000);
    expect(widths).toEqual([['name', MIN_COLUMN_WIDTH]]);
  });

  it('a new drag replaces the one in progress', () => {
    resize.start(new MouseEvent('mousedown', { clientX: 0 }), 'a', 100, record);
    resize.start(new MouseEvent('mousedown', { clientX: 0 }), 'b', 100, record);
    move(10);
    expect(widths).toEqual([['b', 110]]);
  });

  it('removes its window listeners when the injector is destroyed in the middle of a drag', () => {
    resize.start(new MouseEvent('mousedown', { clientX: 0 }), 'a', 100, record);
    TestBed.resetTestingModule();
    move(50);
    expect(widths).toEqual([]);
  });
});
