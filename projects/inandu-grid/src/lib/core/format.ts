import { InanduColumnType } from './types';

/**
 * Turns a raw numeric value into its display string. `digitsInfo` is a `DecimalPipe`-style
 * `'{minInt}.{minFrac}-{maxFrac}'` string (e.g. `"1.2-2"`), or empty for the default.
 *
 * Injected into `formatCellValue()` so the framework layer can choose the implementation: the
 * Angular component passes one backed by `@angular/common`'s `formatNumber` (honouring whatever
 * locale data the host app registered), keeping its output byte-identical to before this folder
 * existed. `defaultNumberFormatter` below is the standalone fallback for a non-Angular consumer.
 */
export type NumberFormatter = (value: number, locale: string, digitsInfo?: string) => string;

const DIGITS_INFO_PATTERN = /^(\d+)?\.(\d+)-(\d+)$/;

/** `Intl.NumberFormat`-based `NumberFormatter`. Parses the `digitsInfo` mini-syntax; falls back to Angular's own default of up to 3 fraction digits (`'1.0-3'`) when it's absent. */
export function defaultNumberFormatter(value: number, locale: string, digitsInfo?: string): string {
  const options: Intl.NumberFormatOptions = {};
  const match = digitsInfo ? DIGITS_INFO_PATTERN.exec(digitsInfo) : null;
  if (match) {
    if (match[1]) {
      options.minimumIntegerDigits = Number(match[1]);
    }
    options.minimumFractionDigits = Number(match[2]);
    options.maximumFractionDigits = Number(match[3]);
  } else {
    options.maximumFractionDigits = 3;
  }
  return new Intl.NumberFormat(locale || undefined, options).format(value);
}

/**
 * Coerces a raw cell value to a `Date` for `type="date"` columns — accepts a `Date`, a timestamp,
 * or a string. Safari's `Date` string parser is stricter than Chrome's; notably it returns an
 * Invalid Date for a space-separated `"yyyy-mm-dd hh:mm[:ss]"` that Chrome happily parses. That one
 * common case is normalised to the ISO `T` form before parsing, so a `type="date"` column renders
 * and filters identically in both. Anything still unparseable comes back as an Invalid Date — every
 * caller already guards with `Number.isNaN(date.getTime())`.
 */
export function coerceToDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/, '$1T$2'));
  }
  return new Date(value as number);
}

// Field names from the ECMA-262 Date Time String Format (case-sensitive: MM = month, mm = minutes).
// 'sss' must be tried before 'ss' or the alternation would match the 'ss' prefix first.
const DATE_TOKEN_PATTERN = /YYYY|sss|MM|DD|HH|mm|ss/g;

export function formatDateValue(date: Date, format: string): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return format.replace(DATE_TOKEN_PATTERN, token => {
    switch (token) {
      case 'YYYY': return String(date.getFullYear());
      case 'MM': return pad(date.getMonth() + 1);
      case 'DD': return pad(date.getDate());
      case 'HH': return pad(date.getHours());
      case 'mm': return pad(date.getMinutes());
      case 'ss': return pad(date.getSeconds());
      case 'sss': return pad(date.getMilliseconds(), 3);
      default: return token;
    }
  });
}

export function formatCellValue(
  value: unknown,
  type: InanduColumnType,
  format: string,
  locale: string,
  numberFormatter: NumberFormatter = defaultNumberFormatter,
): string {
  if (value === null || value === undefined) {
    return '';
  }
  switch (type) {
    case 'number': {
      const num = typeof value === 'number' ? value : Number(value);
      return Number.isNaN(num) ? String(value) : numberFormatter(num, locale, format || undefined);
    }
    case 'date': {
      const date = coerceToDate(value);
      return Number.isNaN(date.getTime()) ? String(value) : formatDateValue(date, format || 'YYYY-MM-DD');
    }
    case 'boolean': {
      const [truthyLabel, falsyLabel] = (format || 'true|false').split('|');
      return value ? truthyLabel : falsyLabel;
    }
    default:
      return String(value);
  }
}
