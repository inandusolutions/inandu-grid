/*
 * Framework-agnostic core of the grid — pure logic with zero `@angular/*` dependency, reusable
 * as-is by a non-Angular port. The Angular components import from here and re-export whatever is
 * part of the library's public API.
 */
export type {
  InanduColumnType,
  InanduColumnStickySide,
  InanduColumnAggregate,
  InanduGridRow,
  InanduGridColumnFilterValue,
  ColumnConfig,
} from './types';

export {
  MIN_COLUMN_WIDTH,
  SELECT_COLUMN_WIDTH,
  ROW_DRAG_COLUMN_WIDTH,
  STATE_STORAGE_PREFIX,
} from './constants';

export {
  coerceToDate,
  formatDateValue,
  formatCellValue,
  defaultNumberFormatter,
} from './format';
export type { NumberFormatter } from './format';

export { compareCellValues } from './sort';
export { hasMeaningfulFilterValue, matchesColumnFilter } from './filter';
export { AGGREGATE_SYMBOLS, computeGroupAggregates } from './aggregate';
export { placeColumnsByOrder } from './columns';
export { parseDraftValue, parsePastedCellValue } from './parse';

export { escapeCsvValue } from './export/csv';
export { escapeMarkup } from './export/markup';
export { truncatePdfText } from './export/pdf';
export { downloadBlob } from './export/download';

export { en, es, fr, it, zh, INANDU_GRID_TRANSLATIONS } from './i18n';
