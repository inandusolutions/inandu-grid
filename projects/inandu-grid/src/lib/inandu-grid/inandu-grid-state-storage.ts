import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { clearSavedGridState, readSavedGridState, writeSavedGridState } from '@inandu-solutions/grid-core';
import type { InanduGridSavedState, InanduGridStatePart } from '@inandu-solutions/grid-core';

/**
 * Where a grid keeps the state its `stateKey` asks to save. The storage itself (`localStorage`, a versioned blob, only the chosen
 * parts, validation of what is read, never throwing) is `grid-core`'s `readSavedGridState` / `writeSavedGridState` /
 * `clearSavedGridState`, the same in every grid. What this adds is Angular's own idea of "no browser": on the server platform
 * nothing is read, written or cleared, even where a `localStorage` happens to exist (a test, say).
 * Provided per grid and not part of the public API.
 */
@Injectable()
export class InanduGridStateStorage {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** What is saved under `key`, limited to `parts`, validated; `{}` when there is nothing, it cannot be read, or it is corrupt. */
  read(key: string, parts: readonly InanduGridStatePart[]): Partial<InanduGridSavedState> {
    return this.isBrowser ? readSavedGridState(key, parts) : {};
  }

  /** Saves the `parts` of `state` under `key`. A save that cannot happen (no storage, quota) is skipped. */
  write(key: string, state: Partial<InanduGridSavedState>, parts: readonly InanduGridStatePart[]): void {
    if (this.isBrowser) {
      writeSavedGridState(key, state, parts);
    }
  }

  /** Removes what is saved under `key`. */
  clear(key: string): void {
    if (this.isBrowser) {
      clearSavedGridState(key);
    }
  }
}
