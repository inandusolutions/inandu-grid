import { ColumnConfig, InanduGridColumnFilterValue, InanduGridRow } from './types';
import { coerceToDate, formatCellValue, NumberFormatter } from './format';

/** Whether `value` has at least one non-empty key — an entry can exist (e.g. after typing then clearing) without actually narrowing anything. */
export function hasMeaningfulFilterValue(value: InanduGridColumnFilterValue | undefined): boolean {
  return !!value && Object.values(value).some(v => !!v);
}

/**
 * Whether `row` satisfies `column`'s own filter control. An empty/absent `filterValue` (no
 * constraint entered for this column yet) always matches. Range checks (`'number'`/`'date'`) are
 * inclusive on both ends; a cell that can't be parsed as that column's type never matches once at
 * least one bound is set.
 */
export function matchesColumnFilter(
  column: ColumnConfig,
  row: InanduGridRow,
  filterValue: InanduGridColumnFilterValue,
  locale: string,
  numberFormatter?: NumberFormatter,
): boolean {
  const raw = row[column.field()];
  switch (column.type()) {
    case 'number': {
      const hasMin = !!filterValue.min;
      const hasMax = !!filterValue.max;
      if (!hasMin && !hasMax) {
        return true;
      }
      const num = typeof raw === 'number' ? raw : Number(raw);
      if (raw == null || Number.isNaN(num)) {
        return false;
      }
      if (hasMin && num < Number(filterValue.min)) return false;
      if (hasMax && num > Number(filterValue.max)) return false;
      return true;
    }
    case 'date': {
      const hasFrom = !!filterValue.from;
      const hasTo = !!filterValue.to;
      if (!hasFrom && !hasTo) {
        return true;
      }
      if (raw == null) {
        return false;
      }
      const date = coerceToDate(raw);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      if (hasFrom && date < new Date(filterValue.from!)) return false;
      if (hasTo) {
        const to = new Date(filterValue.to!);
        to.setHours(23, 59, 59, 999);
        if (date > to) return false;
      }
      return true;
    }
    case 'boolean': {
      if (!filterValue.bool) {
        return true;
      }
      return Boolean(raw) === (filterValue.bool === 'true');
    }
    default: {
      const text = (filterValue.text ?? '').trim().toLowerCase();
      if (!text) {
        return true;
      }
      return formatCellValue(raw, column.type(), column.format(), locale, numberFormatter).toLowerCase().includes(text);
    }
  }
}
