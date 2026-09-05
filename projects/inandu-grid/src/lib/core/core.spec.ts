/**
 * Unit specs for the framework-agnostic pure helpers in `../core`. These are deliberately NOT
 * re-exported from `public-api.ts` — they are not public API. Tested here directly (fast, no
 * TestBed / DOM) rather than only indirectly through the component.
 */
import {
  escapeCsvValue,
  escapeMarkup,
  parseDraftValue,
  parsePastedCellValue,
  truncatePdfText,
  computeGroupAggregates,
  compareCellValues,
  coerceToDate,
  formatCellValue,
  formatDateValue,
  defaultNumberFormatter,
  hasMeaningfulFilterValue,
  matchesColumnFilter,
  placeColumnsByOrder,
} from './index';
import type { ColumnConfig } from './types';

/** Minimal `ColumnConfig` stand-in — just the signal getters the helpers read. */
function fakeColumn(overrides: {
  field?: string;
  type?: 'string' | 'number' | 'boolean' | 'date';
  format?: string;
  order?: number | undefined;
  aggregate?: '' | 'sum' | 'avg' | 'min' | 'max' | 'count';
}): ColumnConfig {
  return {
    field: () => overrides.field ?? '',
    type: () => overrides.type ?? 'string',
    format: () => overrides.format ?? '',
    order: () => overrides.order,
    aggregate: () => overrides.aggregate ?? '',
  };
}

describe('pure: escapeCsvValue', () => {
  it('leaves a plain value untouched', () => {
    expect(escapeCsvValue('hello')).toBe('hello');
  });
  it('quotes a value containing a comma', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
  });
  it('quotes and doubles an internal quote', () => {
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
  });
  it('quotes a value containing a newline', () => {
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('pure: escapeMarkup', () => {
  it('escapes &, < and > (ampersand first)', () => {
    expect(escapeMarkup('<b>a & b</b>')).toBe('&lt;b&gt;a &amp; b&lt;/b&gt;');
  });
  it('leaves a plain string untouched', () => {
    expect(escapeMarkup('plain')).toBe('plain');
  });
});

describe('pure: parseDraftValue', () => {
  it('number: parses a numeric string', () => {
    expect(parseDraftValue('12.5', 'number')).toBe(12.5);
  });
  it('number: empty / undefined → undefined (omitted from saved values)', () => {
    expect(parseDraftValue('', 'number')).toBeUndefined();
    expect(parseDraftValue(undefined, 'number')).toBeUndefined();
  });
  it('number: unparseable → undefined', () => {
    expect(parseDraftValue('abc', 'number')).toBeUndefined();
  });
  it('date: a bare yyyy-mm-dd is reconstructed as a LOCAL date (no UTC day-shift)', () => {
    const d = parseDraftValue('2025-06-15', 'date') as Date;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 5, 15]);
    expect(d.getHours()).toBe(0);
  });
  it('date: unparseable → undefined', () => {
    expect(parseDraftValue('not-a-date', 'date')).toBeUndefined();
  });
  it('boolean: coerces to a real boolean', () => {
    expect(parseDraftValue(true, 'boolean')).toBe(true);
    expect(parseDraftValue('', 'boolean')).toBe(false);
  });
  it('string: passes the raw value through', () => {
    expect(parseDraftValue('  x ', 'string')).toBe('  x ');
  });
});

describe('pure: parsePastedCellValue', () => {
  it('boolean: only the literal "true" (case-insensitive, trimmed) is true', () => {
    expect(parsePastedCellValue(' TRUE ', 'boolean')).toBe(true);
    expect(parsePastedCellValue('false', 'boolean')).toBe(false);
    expect(parsePastedCellValue('1', 'boolean')).toBe(false);
  });
  it('delegates to parseDraftValue for other types', () => {
    expect(parsePastedCellValue('7', 'number')).toBe(7);
  });
});

describe('pure: compareCellValues', () => {
  it('numbers compare by subtraction', () => {
    expect(compareCellValues(2, 10)).toBeLessThan(0);
    expect(compareCellValues(10, 2)).toBeGreaterThan(0);
  });
  it('Dates compare chronologically, not by toString()', () => {
    expect(compareCellValues(new Date(2025, 0, 1), new Date(2025, 5, 1))).toBeLessThan(0);
  });
  it('nullish sorts first', () => {
    expect(compareCellValues(null, 'a')).toBe(-1);
    expect(compareCellValues('a', null)).toBe(1);
    expect(compareCellValues(null, undefined)).toBe(0);
  });
  it('falls back to string localeCompare', () => {
    expect(compareCellValues('apple', 'banana')).toBeLessThan(0);
  });
});

describe('pure: coerceToDate', () => {
  it('returns a Date value unchanged (same reference)', () => {
    const d = new Date();
    expect(coerceToDate(d)).toBe(d);
  });
  it('accepts a timestamp number', () => {
    expect(coerceToDate(0).getTime()).toBe(0);
  });
  it('accepts an ISO string', () => {
    expect(coerceToDate('2025-06-15T10:00:00Z').getUTCHours()).toBe(10);
  });
  it('accepts a space-separated "yyyy-mm-dd hh:mm" (Safari would reject the space form)', () => {
    const d = coerceToDate('2025-06-15 14:30');
    expect(Number.isNaN(d.getTime())).toBeFalse();
    expect([d.getHours(), d.getMinutes()]).toEqual([14, 30]);
  });
  it('unparseable input → Invalid Date', () => {
    expect(Number.isNaN(coerceToDate('garbage').getTime())).toBeTrue();
  });
});

describe('pure: formatDateValue', () => {
  const june15 = new Date(2025, 5, 15, 23, 9, 7, 42);
  it('defaults to YYYY-MM-DD', () => {
    expect(formatDateValue(new Date(2025, 0, 5), 'YYYY-MM-DD')).toBe('2025-01-05');
  });
  it('is case-sensitive: MM = month, mm = minutes', () => {
    expect(formatDateValue(june15, 'MM:mm')).toBe('06:09');
  });
  it('renders full patterns with literal separators', () => {
    expect(formatDateValue(june15, 'DD/MM/YYYY HH:mm:ss')).toBe('15/06/2025 23:09:07');
  });
  it('matches sss (milliseconds) before ss', () => {
    expect(formatDateValue(june15, 'sss')).toBe('042');
  });
});

describe('pure: formatCellValue', () => {
  it('null / undefined → empty string', () => {
    expect(formatCellValue(null, 'string', '', 'en-US')).toBe('');
    expect(formatCellValue(undefined, 'number', '1.2-2', 'en-US')).toBe('');
  });
  it('number: applies digitsInfo', () => {
    expect(formatCellValue(1234.5, 'number', '1.2-2', 'en-US')).toBe('1,234.50');
  });
  it('number: a non-numeric value falls back to String(value)', () => {
    expect(formatCellValue('n/a', 'number', '', 'en-US')).toBe('n/a');
  });
  it('boolean: uses the format labels', () => {
    expect(formatCellValue(true, 'boolean', 'Sí|No', 'en-US')).toBe('Sí');
    expect(formatCellValue(false, 'boolean', 'Sí|No', 'en-US')).toBe('No');
  });
  it('string: raw String(value)', () => {
    expect(formatCellValue(42, 'string', '', 'en-US')).toBe('42');
  });
  it('number: an explicit numberFormatter overrides the Intl default', () => {
    const upper = (v: number) => `<${v}>`;
    expect(formatCellValue(5, 'number', '1.0-0', 'en-US', upper)).toBe('<5>');
  });
});

describe('pure: defaultNumberFormatter', () => {
  it('parses the digitsInfo mini-syntax (min int / min frac / max frac)', () => {
    expect(defaultNumberFormatter(1234.5, 'en-US', '1.2-2')).toBe('1,234.50');
    expect(defaultNumberFormatter(1234.567, 'en-US', '1.0-1')).toBe('1,234.6');
  });
  it('follows the locale for grouping/decimal separators', () => {
    expect(defaultNumberFormatter(1234.5, 'de-DE', '1.2-2')).toBe('1.234,50');
  });
  it('with no digitsInfo, allows up to 3 fraction digits (Angular’s default)', () => {
    expect(defaultNumberFormatter(1.23456, 'en-US')).toBe('1.235');
    expect(defaultNumberFormatter(2, 'en-US')).toBe('2');
  });
});

describe('pure: hasMeaningfulFilterValue', () => {
  it('undefined / empty object / all-empty values → false', () => {
    expect(hasMeaningfulFilterValue(undefined)).toBeFalse();
    expect(hasMeaningfulFilterValue({})).toBeFalse();
    expect(hasMeaningfulFilterValue({ text: '' })).toBeFalse();
  });
  it('any non-empty value → true', () => {
    expect(hasMeaningfulFilterValue({ text: 'x' })).toBeTrue();
    expect(hasMeaningfulFilterValue({ min: '0' })).toBeTrue();
  });
  it('an empty values array → true — unlike every other key, presence is what counts, not length', () => {
    expect(hasMeaningfulFilterValue({ values: [] })).toBeTrue();
  });
  it('a non-empty values array → true', () => {
    expect(hasMeaningfulFilterValue({ values: ['a'] })).toBeTrue();
  });
  it('values explicitly undefined → false, same as omitting the key', () => {
    expect(hasMeaningfulFilterValue({ values: undefined })).toBeFalse();
  });
});

describe('pure: matchesColumnFilter', () => {
  const locale = 'en-US';
  it('an empty filter value always matches', () => {
    expect(matchesColumnFilter(fakeColumn({ field: 'a' }), { a: 'x' }, {}, locale)).toBeTrue();
  });
  it('string: substring match on the formatted value', () => {
    const col = fakeColumn({ field: 'city', type: 'string' });
    expect(matchesColumnFilter(col, { city: 'México' }, { text: 'xic' }, locale)).toBeTrue();
    expect(matchesColumnFilter(col, { city: 'Lima' }, { text: 'xic' }, locale)).toBeFalse();
  });
  it('number: inclusive min/max range on the raw value', () => {
    const col = fakeColumn({ field: 'n', type: 'number' });
    expect(matchesColumnFilter(col, { n: 5 }, { min: '5', max: '10' }, locale)).toBeTrue();
    expect(matchesColumnFilter(col, { n: 4 }, { min: '5' }, locale)).toBeFalse();
    expect(matchesColumnFilter(col, { n: null }, { min: '5' }, locale)).toBeFalse();
  });
  it('date: inclusive from/to, with "to" covering the whole day', () => {
    const col = fakeColumn({ field: 'd', type: 'date' });
    expect(matchesColumnFilter(col, { d: new Date(2025, 5, 15, 23, 0) }, { to: '2025-06-15' }, locale)).toBeTrue();
    expect(matchesColumnFilter(col, { d: new Date(2025, 5, 16) }, { to: '2025-06-15' }, locale)).toBeFalse();
  });
  it('boolean: exact equality against the true/false selection', () => {
    const col = fakeColumn({ field: 'b', type: 'boolean' });
    expect(matchesColumnFilter(col, { b: true }, { bool: 'true' }, locale)).toBeTrue();
    expect(matchesColumnFilter(col, { b: true }, { bool: 'false' }, locale)).toBeFalse();
  });
  it('values (set filter): matches against the formatted value, OR within the set', () => {
    const col = fakeColumn({ field: 'city', type: 'string' });
    expect(matchesColumnFilter(col, { city: 'Lima' }, { values: ['Lima', 'Quito'] }, locale)).toBeTrue();
    expect(matchesColumnFilter(col, { city: 'Bogotá' }, { values: ['Lima', 'Quito'] }, locale)).toBeFalse();
  });
  it('values works the same regardless of column type, unlike text/min/max/from/to/bool', () => {
    const col = fakeColumn({ field: 'n', type: 'number', format: '1.2-2' });
    // The set holds the *formatted* value ("5.00"), not the raw number.
    expect(matchesColumnFilter(col, { n: 5 }, { values: ['5.00'] }, locale)).toBeTrue();
    expect(matchesColumnFilter(col, { n: 6 }, { values: ['5.00'] }, locale)).toBeFalse();
  });
  it('values takes over entirely once present, ignoring the type-specific keys', () => {
    const col = fakeColumn({ field: 'n', type: 'number' });
    // min/max would reject 5, but a defined `values` bypasses them.
    expect(matchesColumnFilter(col, { n: 5 }, { min: '10', values: ['5'] }, locale)).toBeTrue();
  });
  it('an empty values array matches nothing — "every checkbox unchecked", not "no constraint"', () => {
    const col = fakeColumn({ field: 'city', type: 'string' });
    // Even with a `text` that would otherwise match, a defined-but-empty `values` wins.
    expect(matchesColumnFilter(col, { city: 'Lima' }, { values: [], text: 'lim' }, locale)).toBeFalse();
  });
  it('values left undefined falls through to the type-specific keys, same as omitting it', () => {
    const col = fakeColumn({ field: 'city', type: 'string' });
    expect(matchesColumnFilter(col, { city: 'Lima' }, { values: undefined, text: 'lim' }, locale)).toBeTrue();
  });
});

describe('pure: computeGroupAggregates', () => {
  const rows = [{ v: 10 }, { v: 20 }, { v: 30 }];
  it('count counts rows regardless of type', () => {
    expect(computeGroupAggregates(rows, [fakeColumn({ field: 'v', aggregate: 'count' })])).toEqual({ v: 3 });
  });
  it('sum / avg / min / max over finite numbers', () => {
    expect(computeGroupAggregates(rows, [fakeColumn({ field: 'v', aggregate: 'sum' })])).toEqual({ v: 60 });
    expect(computeGroupAggregates(rows, [fakeColumn({ field: 'v', aggregate: 'avg' })])).toEqual({ v: 20 });
    expect(computeGroupAggregates(rows, [fakeColumn({ field: 'v', aggregate: 'min' })])).toEqual({ v: 10 });
    expect(computeGroupAggregates(rows, [fakeColumn({ field: 'v', aggregate: 'max' })])).toEqual({ v: 30 });
  });
  it('ignores null / "" / boolean cells (they would coerce to a finite 0)', () => {
    const mixed = [{ v: 10 }, { v: null }, { v: '' }, { v: false }, { v: 30 }];
    expect(computeGroupAggregates(mixed, [fakeColumn({ field: 'v', aggregate: 'avg' })])).toEqual({ v: 20 });
    expect(computeGroupAggregates(mixed, [fakeColumn({ field: 'v', aggregate: 'min' })])).toEqual({ v: 10 });
  });
  it('still counts a genuine numeric string', () => {
    expect(computeGroupAggregates([{ v: '40' }, { v: 60 }], [fakeColumn({ field: 'v', aggregate: 'sum' })])).toEqual({ v: 100 });
  });
  it('no numbers at all → 0', () => {
    expect(computeGroupAggregates([{ v: null }], [fakeColumn({ field: 'v', aggregate: 'sum' })])).toEqual({ v: 0 });
  });
});

describe('pure: truncatePdfText', () => {
  // Fake jsPDF: width == character count.
  const doc = { getTextWidth: (s: string) => s.length } as unknown as Parameters<typeof truncatePdfText>[0];
  it('returns the text unchanged when it fits', () => {
    expect(truncatePdfText(doc, 'abc', 10)).toBe('abc');
  });
  it('truncates with a trailing ellipsis to fit the width', () => {
    const out = truncatePdfText(doc, 'abcdefghij', 5);
    expect(out.endsWith('…')).toBeTrue();
    expect(out.length).toBeLessThanOrEqual(5);
  });
});

describe('pure: placeColumnsByOrder', () => {
  it('keeps declaration order when no column has an explicit order', () => {
    const cols = [fakeColumn({ field: 'a' }), fakeColumn({ field: 'b' }), fakeColumn({ field: 'c' })];
    expect(placeColumnsByOrder(cols).map(c => c.field())).toEqual(['a', 'b', 'c']);
  });
  it('places an explicitly-ordered column at its 0-based slot', () => {
    const cols = [
      fakeColumn({ field: 'a' }),
      fakeColumn({ field: 'b', order: 0 }),
      fakeColumn({ field: 'c' }),
    ];
    expect(placeColumnsByOrder(cols).map(c => c.field())).toEqual(['b', 'a', 'c']);
  });
  it('two ordered columns take slots 0 and 1, the rest flow around them', () => {
    const cols = [
      fakeColumn({ field: 'a' }),
      fakeColumn({ field: 'b' }),
      fakeColumn({ field: 'c', order: 1 }),
      fakeColumn({ field: 'd', order: 0 }),
    ];
    expect(placeColumnsByOrder(cols).map(c => c.field())).toEqual(['d', 'c', 'a', 'b']);
  });
  it('out-of-range order values degrade gracefully to the end, in declaration order', () => {
    const cols = [
      fakeColumn({ field: 'a', order: 99 }),
      fakeColumn({ field: 'b' }),
      fakeColumn({ field: 'c', order: 98 }),
    ];
    expect(placeColumnsByOrder(cols).map(c => c.field())).toEqual(['b', 'c', 'a']);
  });
});
