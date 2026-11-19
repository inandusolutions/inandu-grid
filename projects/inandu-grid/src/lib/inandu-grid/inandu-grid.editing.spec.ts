import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InanduGridComponent, InanduGridNewRowValues, InanduGridRow, InanduGridRowSave } from './inandu-grid.component';
import { InanduColumnAsyncValidator, InanduColumnComponent } from '../inandu-column/inandu-column.component';

/**
 * Row editing as a state machine (review point C3): start, change, save, cancel, and what happens when an async validator is still
 * running while the user cancels, edits another row (or the same one again), or presses Save twice.
 */
interface Person extends InanduGridRow {
  name: string;
  age: number;
}

/** A promise the test resolves by hand, to hold an async validator open. */
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
      <inandu-column title="Name" field="name" editable="true" required="true" [asyncValidator]="check"></inandu-column>
      <inandu-column title="Age" field="age" type="number" editable="true" min="0" max="120"></inandu-column>
      <inandu-column title="Group" field="group"></inandu-column>
    </inandu-grid>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InanduGridComponent, InanduColumnComponent],
})
class EditingHostComponent {
  readonly grid = viewChild.required(InanduGridComponent<Person>);
  rows: Person[] = [
    { name: 'Ada', age: 30 },
    { name: 'Alan', age: 25 },
  ];
  saved: InanduGridRowSave<Person>[] = [];
  created: InanduGridNewRowValues[] = [];
  check: InanduColumnAsyncValidator = () => Promise.resolve(null);
}

describe('InanduGridComponent row editing', () => {
  let fixture: ComponentFixture<EditingHostComponent>;
  let host: EditingHostComponent;
  const grid = () => host.grid();

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EditingHostComponent] });
    fixture = TestBed.createComponent(EditingHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const setDraft = (field: string, value: unknown) => grid().setRowDraftValue(field, value);

  it('saves the parsed values and leaves edit mode', async () => {
    grid().startEditingRow(host.rows[0]);
    setDraft('age', '31');
    await grid().saveRow(host.rows[0]);
    expect(host.saved.length).toBe(1);
    expect(host.saved[0].row).toBe(host.rows[0]);
    expect(host.saved[0].values).toEqual({ name: 'Ada', age: 31 } as Partial<Person>);
    expect(grid().isEditingRow(host.rows[0])).toBeFalse();
  });

  it('cancelling discards the draft and never emits rowSave', async () => {
    grid().startEditingRow(host.rows[0]);
    setDraft('name', 'Changed');
    grid().cancelRowEdit();
    expect(grid().isEditingRow(host.rows[0])).toBeFalse();
    await grid().saveRow(host.rows[0]); // nothing is being edited: nothing happens
    expect(host.saved.length).toBe(0);
  });

  it('a failed validation keeps the row in edit mode, and a later valid value saves', async () => {
    grid().startEditingRow(host.rows[0]);
    setDraft('name', '');
    await grid().saveRow(host.rows[0]);
    expect(host.saved.length).toBe(0);
    expect(grid().isEditingRow(host.rows[0])).toBeTrue();
    expect(grid().fieldError('name')).toBeTruthy();
    setDraft('name', 'Ada L.');
    await grid().saveRow(host.rows[0]);
    expect(host.saved.length).toBe(1);
    expect(grid().fieldError('name')).toBe('');
  });

  it('starting another row replaces the draft: the first row is not saved', async () => {
    grid().startEditingRow(host.rows[0]);
    setDraft('name', 'Edited Ada');
    grid().startEditingRow(host.rows[1]);
    await grid().saveRow(host.rows[0]);
    expect(host.saved.length).toBe(0);
    expect(grid().isEditingRow(host.rows[1])).toBeTrue();
  });

  describe('with an async validator', () => {
    it('reports isValidating while it runs, then saves when it passes', async () => {
      const gate = deferred<string | null>();
      host.check = () => gate.promise;
      fixture.detectChanges();
      grid().startEditingRow(host.rows[0]);
      const saving = grid().saveRow(host.rows[0]);
      expect(grid().isValidating()).toBeTrue();
      gate.resolve(null);
      await saving;
      expect(grid().isValidating()).toBeFalse();
      expect(host.saved.length).toBe(1);
    });

    it('a message from the validator keeps the row in edit mode and shows under the field', async () => {
      host.check = () => Promise.resolve('Name taken');
      fixture.detectChanges();
      grid().startEditingRow(host.rows[0]);
      await grid().saveRow(host.rows[0]);
      expect(host.saved.length).toBe(0);
      expect(grid().fieldError('name')).toBe('Name taken');
      expect(grid().isEditingRow(host.rows[0])).toBeTrue();
    });

    it('cancelling while the validator is still running means the row is never saved', async () => {
      const gate = deferred<string | null>();
      host.check = () => gate.promise;
      fixture.detectChanges();
      grid().startEditingRow(host.rows[0]);
      const saving = grid().saveRow(host.rows[0]);
      grid().cancelRowEdit();
      gate.resolve(null);
      await saving;
      expect(host.saved.length).toBe(0);
    });

    it('starting another row while the validator runs means the first row is never saved', async () => {
      const gate = deferred<string | null>();
      host.check = () => gate.promise;
      fixture.detectChanges();
      grid().startEditingRow(host.rows[0]);
      const saving = grid().saveRow(host.rows[0]);
      grid().startEditingRow(host.rows[1]);
      gate.resolve(null);
      await saving;
      expect(host.saved.length).toBe(0);
      expect(grid().isEditingRow(host.rows[1])).toBeTrue();
    });

    it('cancelling and editing the SAME row again while the validator runs does not save the old attempt', async () => {
      const gate = deferred<string | null>();
      host.check = () => gate.promise;
      fixture.detectChanges();
      grid().startEditingRow(host.rows[0]);
      const saving = grid().saveRow(host.rows[0]);
      grid().cancelRowEdit();
      grid().startEditingRow(host.rows[0]);
      gate.resolve(null);
      await saving;
      expect(host.saved.length).toBe(0);
      expect(grid().isEditingRow(host.rows[0])).toBeTrue();
    });

    it('pressing Save twice while the validator runs saves once', async () => {
      const gate = deferred<string | null>();
      host.check = () => gate.promise;
      fixture.detectChanges();
      grid().startEditingRow(host.rows[0]);
      const first = grid().saveRow(host.rows[0]);
      const second = grid().saveRow(host.rows[0]);
      gate.resolve(null);
      await Promise.all([first, second]);
      expect(host.saved.length).toBe(1);
    });

    it('a validator that throws is reported under its field and saveRow settles normally', async () => {
      host.check = () => Promise.reject(new Error('network down'));
      fixture.detectChanges();
      grid().startEditingRow(host.rows[0]);
      await expectAsync(grid().saveRow(host.rows[0])).toBeResolved();
      expect(host.saved.length).toBe(0);
      expect(grid().isValidating()).toBeFalse();
      expect(grid().isEditingRow(host.rows[0])).toBeTrue();
      expect(grid().fieldError('name')).toContain('network down');
    });
  });

  describe('adding a row', () => {
    it('cancelling while the async validator runs means the row is never created', async () => {
      const gate = deferred<string | null>();
      host.check = () => gate.promise;
      fixture.detectChanges();
      grid().startAddingRow();
      setDraft('name', 'Grace');
      const saving = grid().saveNewRow();
      grid().cancelAddRow();
      gate.resolve(null);
      await saving;
      expect(host.created.length).toBe(0);
      expect(grid().isCreatingRow()).toBeFalse();
    });

    it('creates the row with the parsed values and leaves add mode', async () => {
      grid().startAddingRow();
      setDraft('name', 'Grace');
      setDraft('age', '40');
      await grid().saveNewRow();
      expect(host.created).toEqual([{ name: 'Grace', age: 40 }] as InanduGridNewRowValues[]);
      expect(grid().isCreatingRow()).toBeFalse();
    });
  });

  it('the Edit button of a row is disabled while another row is being edited', () => {
    grid().startEditingRow(host.rows[0]);
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('tbody tr.inandu-row')).map(tr => tr.query(By.css('.inandu-row-actions button')));
    expect(buttons.filter(b => b && (b.nativeElement as HTMLButtonElement).textContent?.includes('Edit')).length).toBeLessThanOrEqual(1);
  });
});
