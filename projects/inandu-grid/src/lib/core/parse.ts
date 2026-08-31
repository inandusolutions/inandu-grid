import { InanduColumnType } from './types';

/**
 * Parses a row-edit draft's raw control value (a string for text/number/date, a boolean for the
 * checkbox — see `InanduGridComponent.onRowFieldChange`) per the column's `type`. Returns `undefined` for
 * an unparseable `'number'`/`'date'`, the signal `saveRow()` uses to omit that field from `values`
 * rather than committing garbage.
 */
export function parseDraftValue(raw: unknown, type: InanduColumnType): unknown {
  switch (type) {
    case 'number': {
      // An empty string is what a native <input type="number"> actually reports for non-numeric
      // input (the browser silently rejects it and resets `.value` to '' — it never holds invalid
      // text like "abc" the way a plain text input would), so this is the realistic "unparseable" case.
      if (raw === '' || raw === undefined) {
        return undefined;
      }
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    case 'date': {
      // A native `<input type="date">` value is a bare `yyyy-mm-dd`, which `new Date(str)` parses as
      // **UTC** midnight — but the string was produced from *local* date parts (`dateEditValue()`), so
      // round-tripping through UTC shifts the day for anyone west of UTC. Reconstruct it as a local date.
      const match = typeof raw === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw) : null;
      const parsed = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(raw as string);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    case 'boolean':
      return !!raw;
    default:
      return raw;
  }
}

/**
 * Parses one pasted TSV cell's raw text per `type` — like `parseDraftValue()`, except `'boolean'`:
 * a pasted cell is always plain text (`"true"`/`"false"`, whatever the clipboard actually held),
 * never an already-boolean checkbox `.checked` the way a manual row edit's draft value is.
 */
export function parsePastedCellValue(raw: string, type: InanduColumnType): unknown {
  if (type === 'boolean') {
    return raw.trim().toLowerCase() === 'true';
  }
  return parseDraftValue(raw, type);
}
