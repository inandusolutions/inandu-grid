import { ASYNC_VALIDATOR_FAILED_MESSAGE, validateAndParseDraft, validateColumnValue } from './inandu-grid-validation';
import type { InanduGridValidatedColumn, InanduGridValidationMessages } from './inandu-grid-validation';

describe('inandu-grid-validation', () => {
  const messages: InanduGridValidationMessages = {
    required: () => 'required',
    min: min => `min ${min}`,
    max: max => `max ${max}`,
    pattern: () => 'pattern',
  };

  /** A column made of plain functions: the validation only calls them, it does not need Angular signals. */
  const column = (field: string, rules: Record<string, unknown> = {}): InanduGridValidatedColumn => ({
    field: () => field,
    type: () => (rules['type'] as string | undefined) ?? 'string',
    required: () => !!rules['required'],
    min: () => rules['min'] as number | undefined,
    max: () => rules['max'] as number | undefined,
    pattern: () => (rules['pattern'] as string | undefined) ?? '',
    validator: () => rules['validator'] as never,
    asyncValidator: () => rules['asyncValidator'] as never,
    asyncValidatorError: () => rules['asyncValidatorError'] as never,
  }) as unknown as InanduGridValidatedColumn;

  describe('validateColumnValue', () => {
    it('required: empty, undefined and null fail; 0 and false do not', () => {
      const col = column('a', { required: true });
      for (const raw of ['', undefined, null]) {
        expect(validateColumnValue(col, raw, raw, {}, messages)).toBe('required');
      }
      expect(validateColumnValue(col, 0, 0, {}, messages)).toBeNull();
      expect(validateColumnValue(col, false, false, {}, messages)).toBeNull();
    });

    it('min and max apply to numbers only, inclusive', () => {
      const col = column('n', { type: 'number', min: 1, max: 5 });
      expect(validateColumnValue(col, '0', 0, {}, messages)).toBe('min 1');
      expect(validateColumnValue(col, '6', 6, {}, messages)).toBe('max 5');
      expect(validateColumnValue(col, '1', 1, {}, messages)).toBeNull();
      expect(validateColumnValue(col, '5', 5, {}, messages)).toBeNull();
      expect(validateColumnValue(col, 'abc', undefined, {}, messages)).toBeNull();
    });

    it('pattern checks the raw text, skips an empty one, and a malformed pattern counts as none', () => {
      expect(validateColumnValue(column('p', { pattern: '^[0-9]+$' }), 'x1', 'x1', {}, messages)).toBe('pattern');
      expect(validateColumnValue(column('p', { pattern: '^[0-9]+$' }), '12', '12', {}, messages)).toBeNull();
      expect(validateColumnValue(column('p', { pattern: '^[0-9]+$' }), '', '', {}, messages)).toBeNull();
      expect(validateColumnValue(column('p', { pattern: '(' }), 'x', 'x', {}, messages)).toBeNull();
    });

    it('stops at the first failing rule, and a custom validator sees the parsed row', () => {
      const validator = jasmine.createSpy('validator').and.returnValue('custom');
      const col = column('v', { required: true, validator });
      expect(validateColumnValue(col, '', '', {}, messages)).toBe('required');
      expect(validator).not.toHaveBeenCalled();
      expect(validateColumnValue(col, 'x', 'x', { v: 'x', other: 1 }, messages)).toBe('custom');
      expect(validator).toHaveBeenCalledWith('x', { v: 'x', other: 1 });
    });
  });

  describe('validateAndParseDraft', () => {
    it('parses by type, leaves out an unparseable value, and collects every error', async () => {
      const columns = [column('name', { required: true }), column('qty', { type: 'number', max: 10 }), column('bad', { type: 'number' })];
      const { errors, values } = await validateAndParseDraft(columns, { name: '', qty: '42', bad: 'abc' }, messages, () => undefined);

      expect(errors).toEqual({ name: 'required', qty: 'max 10' });
      expect(values).toEqual({});

      const ok = await validateAndParseDraft(columns, { name: 'Amy', qty: '7', bad: 'abc' }, messages, () => undefined);
      expect(ok.errors).toEqual({});
      expect(ok.values).toEqual({ name: 'Amy', qty: 7 });
    });

    it('runs an async validator only after the sync rules pass, together with the others, and reports validating around it', async () => {
      const calls: string[] = [];
      const asyncValidator = jasmine.createSpy('async').and.callFake((value: unknown) => {
        calls.push(String(value));
        return Promise.resolve(value === 'taken' ? 'already used' : null);
      });
      const columns = [column('user', { asyncValidator }), column('mail', { required: true, asyncValidator })];
      const validating: boolean[] = [];

      const result = await validateAndParseDraft(columns, { user: 'taken', mail: '' }, messages, v => validating.push(v));

      expect(calls).toEqual(['taken']); // mail failed `required` first, its async check never ran
      expect(result.errors).toEqual({ user: 'already used', mail: 'required' });
      expect(validating).toEqual([true, false]);
    });

    it('a throwing async validator is a failed check under its field: the column message, the Error message or the generic text', async () => {
      const thrown = (message: string) => () => Promise.reject(new Error(message));
      const columns = [
        column('a', { asyncValidator: thrown('network down') }),
        column('b', { asyncValidator: thrown('x'), asyncValidatorError: () => 'try again' }),
        column('c', { asyncValidator: () => Promise.reject('not an error') }),
        column('d', { asyncValidator: thrown('x'), asyncValidatorError: () => { throw new Error('formatter broke'); } }),
      ];
      const { errors, values } = await validateAndParseDraft(columns, { a: '1', b: '2', c: '3', d: '4' }, messages, () => undefined);

      expect(errors).toEqual({
        a: 'network down',
        b: 'try again',
        c: ASYNC_VALIDATOR_FAILED_MESSAGE,
        d: ASYNC_VALIDATOR_FAILED_MESSAGE,
      });
      expect(values).toEqual({});
    });

    it('validating is switched off again even when every async check failed', async () => {
      const validating: boolean[] = [];
      await validateAndParseDraft([column('a', { asyncValidator: () => Promise.reject(new Error('x')) })], { a: '1' }, messages, v => validating.push(v));
      expect(validating).toEqual([true, false]);
    });
  });
});
