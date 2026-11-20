import { parseDraftValue } from '@inandu-solutions/grid-core';
import type { InanduColumnComponent } from '../inandu-column/inandu-column.component';

/** The part of a column the validation reads: its rules and its type. Not part of the public API. */
export type InanduGridValidatedColumn = Pick<
  InanduColumnComponent,
  'field' | 'type' | 'required' | 'min' | 'max' | 'pattern' | 'validator' | 'asyncValidator' | 'asyncValidatorError'
>;

/** The texts of the built-in rules, already translated by the grid. */
export interface InanduGridValidationMessages {
  required(): string;
  min(min: number): string;
  max(max: number): string;
  pattern(): string;
}

/** Shown under a field when its `asyncValidator` failed and there is nothing better to show (not an `Error`, or `asyncValidatorError` threw). */
export const ASYNC_VALIDATOR_FAILED_MESSAGE = 'Validation could not be completed';

/**
 * Runs `required` / `min` / `max` / `pattern` / `validator` for one field, in that order, stopping at the first failure.
 * `raw` is the draft's raw control value (what `required` and `pattern` check), `parsed` the same value after `parseDraftValue()`
 * (what `min`, `max` and `validator` check), `parsedRow` every editable field's parsed value, given to `validator` for cross-field checks.
 * Returns the failure message, or `null` when the value is valid.
 */
export function validateColumnValue(
  column: InanduGridValidatedColumn,
  raw: unknown,
  parsed: unknown,
  parsedRow: Record<string, unknown>,
  messages: InanduGridValidationMessages,
): string | null {
  if (column.required() && (raw === '' || raw === undefined || raw === null)) {
    return messages.required();
  }
  if (column.type() === 'number' && typeof parsed === 'number') {
    const min = column.min();
    if (min !== undefined && parsed < min) {
      return messages.min(min);
    }
    const max = column.max();
    if (max !== undefined && parsed > max) {
      return messages.max(max);
    }
  }
  const pattern = column.pattern();
  if (pattern && typeof raw === 'string' && raw !== '') {
    // A malformed `pattern` (dev-supplied config) would otherwise throw out of an `async` validation and reject the save with an
    // unhandled error: treat it as "no pattern" instead.
    let regExp: RegExp | undefined;
    try {
      regExp = new RegExp(pattern);
    } catch {
      regExp = undefined;
    }
    if (regExp && !regExp.test(raw)) {
      return messages.pattern();
    }
  }
  const validator = column.validator();
  if (validator) {
    return validator(parsed, parsedRow);
  }
  return null;
}

/** The text for a field whose `asyncValidator` threw: the column's `asyncValidatorError` if it has one, else the `Error`'s message. */
export function asyncValidatorFailureMessage(column: InanduGridValidatedColumn, error: unknown): string {
  try {
    const format = column.asyncValidatorError();
    if (format) {
      const message = format(error);
      if (typeof message === 'string' && message) {
        return message;
      }
    } else if (error instanceof Error && error.message) {
      return error.message;
    }
  } catch {
    /* the consumer's own formatter failed: fall through to the generic text */
  }
  return ASYNC_VALIDATOR_FAILED_MESSAGE;
}

/**
 * Parses and validates every column of `draft` (`parseDraftValue()` per column type: an unparseable number or date is simply omitted
 * rather than committed as garbage; then the synchronous rules; then any `asyncValidator`). `errors` is non-empty exactly when the
 * draft should not be saved. A field's `asyncValidator` only runs once every synchronous rule has passed for it, and all of them run
 * together, not one after another. A validator that throws is a failed check, shown under its field, never a rejected promise.
 * `setValidating(true)` is called while any async check is pending, `setValidating(false)` after.
 */
export async function validateAndParseDraft(
  columns: readonly InanduGridValidatedColumn[],
  draft: Record<string, unknown>,
  messages: InanduGridValidationMessages,
  setValidating: (validating: boolean) => void,
): Promise<{ errors: Record<string, string>; values: Record<string, unknown> }> {
  const parsedRow: Record<string, unknown> = {};
  for (const column of columns) {
    parsedRow[column.field()] = parseDraftValue(draft[column.field()], column.type());
  }
  const errors: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const pendingAsyncChecks: Promise<void>[] = [];
  for (const column of columns) {
    const field = column.field();
    const message = validateColumnValue(column, draft[field], parsedRow[field], parsedRow, messages);
    if (message) {
      errors[field] = message;
      continue;
    }
    const asyncValidator = column.asyncValidator();
    if (!asyncValidator) {
      if (parsedRow[field] !== undefined) {
        values[field] = parsedRow[field];
      }
      continue;
    }
    pendingAsyncChecks.push(
      asyncValidator(parsedRow[field], parsedRow)
        .then(asyncMessage => {
          if (asyncMessage) {
            errors[field] = asyncMessage;
          } else if (parsedRow[field] !== undefined) {
            values[field] = parsedRow[field];
          }
        })
        .catch((error: unknown) => {
          errors[field] = asyncValidatorFailureMessage(column, error);
        }),
    );
  }
  if (pendingAsyncChecks.length > 0) {
    setValidating(true);
    try {
      await Promise.all(pendingAsyncChecks);
    } finally {
      setValidating(false);
    }
  }
  return { errors, values };
}
