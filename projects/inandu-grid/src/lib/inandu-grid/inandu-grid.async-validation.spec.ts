import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InanduGridComponent, InanduGridNewRowValues, InanduGridRow, InanduGridRowSave } from './inandu-grid.component';
import { InanduColumnAsyncValidator, InanduColumnAsyncValidatorError, InanduColumnComponent } from '../inandu-column/inandu-column.component';

/**
 * Two decisions from the review of the editing PR: typing while an async check runs invalidates that check (the older values are not saved
 * and what was typed is kept), and the consumer decides what the user sees when the check itself fails.
 */
interface Person extends InanduGridRow {
  name: string;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

@Component({
  template: `
    <inandu-grid [data]="rows" lang="en" (rowSave)="saved.push($event)" (rowCreate)="created.push($event)">
      <inandu-column title="Name" field="name" editable="true" required="true" [asyncValidator]="check" [asyncValidatorError]="formatError"></inandu-column>
    </inandu-grid>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class AsyncValidationHostComponent {
  readonly grid = viewChild.required(InanduGridComponent<Person>);
  rows: Person[] = [{ name: 'Ada' }];
  saved: InanduGridRowSave<Person>[] = [];
  created: InanduGridNewRowValues[] = [];
  check: InanduColumnAsyncValidator = () => Promise.resolve(null);
  formatError: InanduColumnAsyncValidatorError | undefined = undefined;
}

describe('InanduGridComponent async validation: typing during the check, and failures of the check', () => {
  let fixture: ComponentFixture<AsyncValidationHostComponent>;
  let host: AsyncValidationHostComponent;
  const grid = () => host.grid();

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AsyncValidationHostComponent] });
    fixture = TestBed.createComponent(AsyncValidationHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const useCheck = (check: InanduColumnAsyncValidator, formatError?: InanduColumnAsyncValidatorError) => {
    host.check = check;
    host.formatError = formatError;
    fixture.detectChanges();
  };

  describe('typing while the async check runs', () => {
    it('does not save the older values, keeps what was typed, and a second Save checks and saves the new values', async () => {
      const checked: unknown[] = [];
      const first = deferred<string | null>();
      let calls = 0;
      useCheck(value => {
        checked.push(value);
        calls += 1;
        return calls === 1 ? first.promise : Promise.resolve(null);
      });
      grid().startEditingRow(host.rows[0]);
      const saving = grid().saveRow(host.rows[0]);
      grid().setRowDraftValue('name', 'Ada Lovelace'); // typed while the first check is running
      first.resolve(null);
      await saving;
      expect(host.saved.length).toBe(0);
      expect(grid().isEditingRow(host.rows[0])).toBeTrue();
      expect(grid().isValidating()).toBeFalse();

      await grid().saveRow(host.rows[0]);
      expect(checked).toEqual(['Ada', 'Ada Lovelace']); // the second Save checked the new value
      expect(host.saved.length).toBe(1);
      expect(host.saved[0].values).toEqual({ name: 'Ada Lovelace' } as Partial<Person>);
    });

    it('typing when no check is running changes nothing about Save', async () => {
      grid().startEditingRow(host.rows[0]);
      grid().setRowDraftValue('name', 'Grace');
      grid().setRowDraftValue('name', 'Grace H.');
      await grid().saveRow(host.rows[0]);
      expect(host.saved.length).toBe(1);
      expect(host.saved[0].values).toEqual({ name: 'Grace H.' } as Partial<Person>);
    });

    it('applies to a new row too', async () => {
      const gate = deferred<string | null>();
      useCheck(() => gate.promise);
      grid().startAddingRow();
      grid().setRowDraftValue('name', 'Grace');
      const saving = grid().saveNewRow();
      grid().setRowDraftValue('name', 'Grace Hopper');
      gate.resolve(null);
      await saving;
      expect(host.created.length).toBe(0);
      expect(grid().isCreatingRow()).toBeTrue();
    });
  });

  describe('what the user sees when the async check itself fails', () => {
    const save = async (check: InanduColumnAsyncValidator, formatError?: InanduColumnAsyncValidatorError) => {
      useCheck(check, formatError);
      grid().startEditingRow(host.rows[0]);
      await grid().saveRow(host.rows[0]);
      const message = grid().fieldError('name');
      grid().cancelRowEdit();
      return message;
    };
    const fails = (error: unknown): InanduColumnAsyncValidator => () => Promise.reject(error);

    it('by default shows the message of an Error', async () => {
      expect(await save(fails(new Error('Name service is down')))).toBe('Name service is down');
    });

    it('by default shows a generic text, never [object Object], when what was thrown is not an Error', async () => {
      expect(await save(fails({ status: 503 }))).toBe('Validation could not be completed');
      expect(await save(fails(undefined))).toBe('Validation could not be completed');
      expect(await save(fails(new Error('')))).toBe('Validation could not be completed');
    });

    it('asyncValidatorError decides the text, and receives what was thrown', async () => {
      const seen: unknown[] = [];
      const thrown = new Error('ECONNRESET 10.0.0.12:5432 at pg.connect');
      const message = await save(fails(thrown), error => {
        seen.push(error);
        return 'We could not check this name right now. Try again.';
      });
      expect(message).toBe('We could not check this name right now. Try again.');
      expect(seen).toEqual([thrown]);
      expect(message).not.toContain('10.0.0.12'); // the technical detail stays out of the interface
    });

    it('asyncValidatorError can tell failures apart', async () => {
      const format: InanduColumnAsyncValidatorError = e => ((e as { status?: number }).status === 503 ? 'Service unavailable' : 'Could not check');
      expect(await save(fails({ status: 503 }), format)).toBe('Service unavailable');
      expect(await save(fails({ status: 500 }), format)).toBe('Could not check');
    });

    it('falls back to the generic text when asyncValidatorError throws or returns nothing', async () => {
      expect(
        await save(fails(new Error('x')), () => {
          throw new Error('formatter bug');
        }),
      ).toBe('Validation could not be completed');
      expect(await save(fails(new Error('x')), () => '')).toBe('Validation could not be completed');
    });

    it('is not used when the check answers with a message (that is not a failure)', async () => {
      const calls: unknown[] = [];
      expect(
        await save(
          () => Promise.resolve('Name taken'),
          error => {
            calls.push(error);
            return 'never';
          },
        ),
      ).toBe('Name taken');
      expect(calls).toEqual([]);
    });
  });
});
