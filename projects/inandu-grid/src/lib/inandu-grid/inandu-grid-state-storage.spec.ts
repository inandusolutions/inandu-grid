import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ALL_GRID_STATE_PARTS, GRID_STATE_VERSION, STATE_STORAGE_PREFIX } from '@inandu-solutions/grid-core';
import type { InanduGridSavedState } from '@inandu-solutions/grid-core';
import { InanduGridStateStorage } from './inandu-grid-state-storage';

describe('InanduGridStateStorage', () => {
  const KEY = 'state-storage-spec';
  const STORAGE_KEY = STATE_STORAGE_PREFIX + KEY;
  const state: InanduGridSavedState = {
    columnWidths: { name: 150 },
    reorderedFields: ['score', 'name'],
    hiddenFields: ['id'],
    pinnedOverrides: {},
    sortCriteria: [{ field: 'name', direction: 'asc' }],
    filterQuery: 'amy',
    columnFilters: {},
  };

  const create = (platform: 'browser' | 'server' = 'browser'): InanduGridStateStorage => {
    TestBed.configureTestingModule({ providers: [InanduGridStateStorage, { provide: PLATFORM_ID, useValue: platform }] });
    return TestBed.inject(InanduGridStateStorage);
  };

  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('writes a versioned blob and reads the same state back', () => {
    const storage = create();
    storage.write(KEY, state, ALL_GRID_STATE_PARTS);

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string).v).toBe(GRID_STATE_VERSION);
    expect(storage.read(KEY, ALL_GRID_STATE_PARTS)).toEqual(state);
  });

  it('saves and restores only the parts it is asked for', () => {
    const storage = create();
    storage.write(KEY, state, ['sortCriteria', 'columnWidths']);

    expect(Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).sort()).toEqual(['columnWidths', 'sortCriteria', 'v']);
    expect(storage.read(KEY, ['sortCriteria'])).toEqual({ sortCriteria: state.sortCriteria });
  });

  it('reads {} when there is nothing, when the blob is not JSON, or when it comes from a newer version', () => {
    const storage = create();
    expect(storage.read(KEY, ALL_GRID_STATE_PARTS)).toEqual({});

    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(storage.read(KEY, ALL_GRID_STATE_PARTS)).toEqual({});

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: GRID_STATE_VERSION + 1, filterQuery: 'x' }));
    expect(storage.read(KEY, ALL_GRID_STATE_PARTS)).toEqual({});
  });

  it('keeps only the parts with the right shape', () => {
    const storage = create();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, filterQuery: 42, columnWidths: { name: 120 } }));
    expect(storage.read(KEY, ALL_GRID_STATE_PARTS)).toEqual({ columnWidths: { name: 120 } });
  });

  it('never throws when storage fails, and clear() removes the blob', () => {
    const storage = create();
    storage.write(KEY, state, ALL_GRID_STATE_PARTS);
    storage.clear(KEY);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    const spies = [
      spyOn(Storage.prototype, 'getItem').and.throwError('denied'),
      spyOn(Storage.prototype, 'setItem').and.throwError('quota'),
      spyOn(Storage.prototype, 'removeItem').and.throwError('denied'),
    ];
    expect(storage.read(KEY, ALL_GRID_STATE_PARTS)).toEqual({});
    expect(() => storage.write(KEY, state, ALL_GRID_STATE_PARTS)).not.toThrow();
    expect(() => storage.clear(KEY)).not.toThrow();
    // afterEach cleans up through the same prototype, so let the calls through again.
    spies.forEach(spy => spy.and.callThrough());
  });

  it('does nothing without a key', () => {
    const storage = create();
    const setSpy = spyOn(Storage.prototype, 'setItem').and.callThrough();
    storage.write('', state, ALL_GRID_STATE_PARTS);
    expect(setSpy).not.toHaveBeenCalled();
    expect(storage.read('', ALL_GRID_STATE_PARTS)).toEqual({});
  });

  it('does not touch localStorage on the server', () => {
    const storage = create('server');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, filterQuery: 'x' }));
    const getSpy = spyOn(Storage.prototype, 'getItem').and.callThrough();
    const setSpy = spyOn(Storage.prototype, 'setItem').and.callThrough();
    const removeSpy = spyOn(Storage.prototype, 'removeItem').and.callThrough();

    expect(storage.read(KEY, ALL_GRID_STATE_PARTS)).toEqual({});
    storage.write(KEY, state, ALL_GRID_STATE_PARTS);
    storage.clear(KEY);

    expect(getSpy).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
  });
});
