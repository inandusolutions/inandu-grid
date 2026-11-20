import { isMultiCellRange, normalizeRange, rangesContain, rangeToTsv } from './inandu-grid-range';

describe('inandu-grid-range', () => {
  it('normalizeRange gives the same rectangle whichever corner the drag started from', () => {
    const expected = { minRow: 1, maxRow: 3, minCol: 0, maxCol: 2 };
    expect(normalizeRange({ row: 1, col: 0 }, { row: 3, col: 2 })).toEqual(expected);
    expect(normalizeRange({ row: 3, col: 2 }, { row: 1, col: 0 })).toEqual(expected);
    expect(normalizeRange({ row: 3, col: 0 }, { row: 1, col: 2 })).toEqual(expected);
  });

  it('normalizeRange is undefined until both corners exist', () => {
    expect(normalizeRange(undefined, { row: 0, col: 0 })).toBeUndefined();
    expect(normalizeRange({ row: 0, col: 0 }, undefined)).toBeUndefined();
  });

  it('rangesContain includes the edges and looks through every rectangle', () => {
    const ranges = [{ minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }, { minRow: 4, maxRow: 4, minCol: 3, maxCol: 3 }];
    expect(rangesContain(ranges, 1, 1)).toBeTrue();
    expect(rangesContain(ranges, 4, 3)).toBeTrue();
    expect(rangesContain(ranges, 2, 2)).toBeFalse();
    expect(rangesContain([], 0, 0)).toBeFalse();
  });

  it('isMultiCellRange is false only for a single cell', () => {
    expect(isMultiCellRange({ minRow: 2, maxRow: 2, minCol: 1, maxCol: 1 })).toBeFalse();
    expect(isMultiCellRange({ minRow: 2, maxRow: 3, minCol: 1, maxCol: 1 })).toBeTrue();
    expect(isMultiCellRange({ minRow: 2, maxRow: 2, minCol: 1, maxCol: 2 })).toBeTrue();
  });

  it('rangeToTsv writes tab-separated columns and newline-separated rows, clipped to what exists', () => {
    const rows = ['r0', 'r1', 'r2'];
    const columns = ['a', 'b', 'c'];
    const text = (column: string, row: string): string => `${row}${column}`;

    expect(rangeToTsv({ minRow: 0, maxRow: 1, minCol: 1, maxCol: 2 }, rows, columns, text)).toBe('r0b\tr0c\nr1b\tr1c');
    expect(rangeToTsv({ minRow: 2, maxRow: 9, minCol: 2, maxCol: 9 }, rows, columns, text)).toBe('r2c');
  });
});
