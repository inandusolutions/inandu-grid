/** An inclusive rectangle of cells, by row and column index. Not part of the public API. */
export interface InanduGridRange {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export interface InanduGridCellPosition {
  row: number;
  col: number;
}

/** The rectangle between two corners, whichever way the drag went; `undefined` until both corners are known. */
export function normalizeRange(
  anchor: InanduGridCellPosition | undefined,
  focus: InanduGridCellPosition | undefined,
): InanduGridRange | undefined {
  if (!anchor || !focus) {
    return undefined;
  }
  return {
    minRow: Math.min(anchor.row, focus.row),
    maxRow: Math.max(anchor.row, focus.row),
    minCol: Math.min(anchor.col, focus.col),
    maxCol: Math.max(anchor.col, focus.col),
  };
}

/** Whether `(row, col)` is inside any of the rectangles. */
export function rangesContain(ranges: readonly InanduGridRange[], row: number, col: number): boolean {
  return ranges.some(r => row >= r.minRow && row <= r.maxRow && col >= r.minCol && col <= r.maxCol);
}

/** A rectangle of more than one cell: what `Ctrl+C` copies as a block instead of the single focused cell. */
export function isMultiCellRange(range: InanduGridRange): boolean {
  return range.minRow !== range.maxRow || range.minCol !== range.maxCol;
}

/** The rectangle as TSV (one line per row, tab-separated columns), the shape Excel and Sheets put on the clipboard. Cells outside `rows`/`columns` are left out. */
export function rangeToTsv<R, C>(
  range: InanduGridRange,
  rows: readonly R[],
  columns: readonly C[],
  text: (column: C, row: R) => string,
): string {
  const rowSlice = rows.slice(range.minRow, range.maxRow + 1);
  const columnSlice = columns.slice(range.minCol, range.maxCol + 1);
  return rowSlice.map(row => columnSlice.map(column => text(column, row)).join('\t')).join('\n');
}
