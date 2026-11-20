import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GRID_STATE_VERSION, sanitizeGridState, STATE_STORAGE_PREFIX } from '@inandu-solutions/grid-core';
import type { InanduGridSavedState, InanduGridStatePart } from '@inandu-solutions/grid-core';

/**
 * Where a grid keeps the state its `stateKey` asks to save: `localStorage`, under one key per grid, versioned.
 * Provided per grid and not part of the public API. Everything here is best effort and never throws: there is no storage on
 * the server, and in the browser it can be missing (private mode), full, or hold something stale or edited by hand.
 */
@Injectable()
export class InanduGridStateStorage {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * What is saved under `key`, limited to `parts`. Only the parts with the right shape, types and sizes get through
   * (`sanitizeGridState`), never the raw parsed object. `{}` when there is nothing, it cannot be read, or it is corrupt.
   */
  read(key: string, parts: readonly InanduGridStatePart[]): Partial<InanduGridSavedState> {
    if (!key || !this.isBrowser) {
      return {};
    }
    try {
      const raw = localStorage.getItem(STATE_STORAGE_PREFIX + key);
      return raw ? sanitizeGridState(JSON.parse(raw), parts) : {};
    } catch {
      return {};
    }
  }

  /** Saves the `parts` of `state` under `key`. A save that cannot happen (no storage, quota) is skipped: persistence is a convenience, not a guarantee. */
  write(key: string, state: Partial<InanduGridSavedState>, parts: readonly InanduGridStatePart[]): void {
    if (!key || !this.isBrowser) {
      return;
    }
    try {
      const wanted = new Set(parts);
      const saved = Object.fromEntries(Object.entries(state).filter(([part]) => wanted.has(part as InanduGridStatePart)));
      localStorage.setItem(STATE_STORAGE_PREFIX + key, JSON.stringify({ v: GRID_STATE_VERSION, ...saved }));
    } catch {
      // Nothing to do: the next change tries again.
    }
  }

  /** Removes what is saved under `key`. */
  clear(key: string): void {
    if (!key || !this.isBrowser) {
      return;
    }
    try {
      localStorage.removeItem(STATE_STORAGE_PREFIX + key);
    } catch {
      // Storage may be unavailable; there is nothing saved to clear then.
    }
  }
}
