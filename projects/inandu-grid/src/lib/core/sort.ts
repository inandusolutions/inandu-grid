export function compareCellValues(a: unknown, b: unknown, locale?: string): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  // String comparison follows the grid's LOCALE_ID (so e.g. accented letters sort where that
  // locale expects), matching how formatCellValue() already respects it.
  return String(a).localeCompare(String(b), locale || undefined);
}
