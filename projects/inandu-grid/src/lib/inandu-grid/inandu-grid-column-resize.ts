import { DestroyRef, inject, Injectable } from '@angular/core';
import { MIN_COLUMN_WIDTH } from '@inandu-solutions/grid-core';

/**
 * The column-resize drag of one grid: the pointer listeners on `window` and the width they compute.
 * Provided per grid (in the component's `providers`), so each grid has its own drag, and it is not part of the public API.
 * It owns its listeners: they are removed on `mouseup`, when another drag starts, and when the grid is destroyed mid-drag.
 */
@Injectable()
export class InanduGridColumnResize {
  private field: string | undefined;
  private startX = 0;
  private startWidth = 0;
  private onWidth: ((field: string, width: number) => void) | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Starts a drag on `field` (currently `startWidth` wide); `onWidth` receives the new width, never below the minimum, on every `mousemove`. */
  start(event: MouseEvent, field: string, startWidth: number, onWidth: (field: string, width: number) => void): void {
    this.stop();
    this.field = field;
    this.startX = event.clientX;
    this.startWidth = startWidth;
    this.onWidth = onWidth;
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  /** Ends the drag, if any, and removes the `window` listeners. */
  stop(): void {
    this.field = undefined;
    this.onWidth = undefined;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.field || !this.onWidth) {
      return;
    }
    this.onWidth(this.field, Math.max(MIN_COLUMN_WIDTH, this.startWidth + (event.clientX - this.startX)));
  };

  private readonly onMouseUp = (): void => this.stop();
}
