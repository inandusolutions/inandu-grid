import { ColumnConfig, InanduColumnAggregate, InanduGridRow } from './types';

/** Short, language-agnostic symbol shown for each `InanduColumnAggregate` kind — deliberately not translated (the same way units like "CSV"/"PDF" aren't). */
export const AGGREGATE_SYMBOLS: Record<Exclude<InanduColumnAggregate, ''>, string> = {
  sum: 'Σ',
  avg: 'x̄',
  min: 'min',
  max: 'max',
  count: '#',
};

/** One numeric aggregate per `aggregateColumns` entry, computed over `rows` — `'count'` just counts rows (works for any column type); the rest ignore rows whose raw value isn't a finite number. */
export function computeGroupAggregates(rows: InanduGridRow[], aggregateColumns: readonly ColumnConfig[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const column of aggregateColumns) {
    const field = column.field();
    const kind = column.aggregate();
    if (kind === 'count') {
      result[field] = rows.length;
      continue;
    }
    // `Number(null)`/`Number('')`/`Number(false)` are all a finite `0`, so coercing indiscriminately
    // would fold empty/blank cells into the maths — skewing `avg`'s denominator and letting a stray
    // `0` win `min`. Drop nullish/blank/boolean cells first, then coerce what's left (so a genuine
    // numeric string like "30" still counts).
    const numbers = rows
      .map(row => row[field])
      .filter(value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean')
      .map(value => Number(value))
      .filter(n => Number.isFinite(n));
    if (numbers.length === 0) {
      result[field] = 0;
      continue;
    }
    switch (kind) {
      case 'sum':
        result[field] = numbers.reduce((sum, n) => sum + n, 0);
        break;
      case 'avg':
        result[field] = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
        break;
      // reduce() rather than Math.min(...numbers)/Math.max(...numbers): a spread of a very large
      // group's values can blow the call-stack argument limit (~65k+), and this grid targets big data.
      case 'min':
        result[field] = numbers.reduce((m, n) => (n < m ? n : m), Infinity);
        break;
      case 'max':
        result[field] = numbers.reduce((m, n) => (n > m ? n : m), -Infinity);
        break;
    }
  }
  return result;
}
