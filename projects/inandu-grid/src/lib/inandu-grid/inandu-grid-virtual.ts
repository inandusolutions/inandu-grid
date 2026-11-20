/**
 * The arithmetic of the grid's virtual window, apart from the DOM and the CDK. Not part of the public API.
 */

/** How many rows fit in a viewport: its height over the row height (a row height of `0` counts as `1`, never a division by zero). */
export function visibleRowCount(viewportHeight: number, rowHeight: number): number {
  return Math.ceil(viewportHeight / (rowHeight || 1));
}

/**
 * The window of rows on screen: from `startIndex` (never below `0`), `endIndex` exclusive and clamped to `total` when there is a
 * total (an unknown or empty total, `0`, leaves it unclamped).
 */
export function viewportWindow(
  startIndex: number,
  viewportHeight: number,
  rowHeight: number,
  total: number,
): { startIndex: number; endIndex: number } {
  const start = Math.max(0, startIndex);
  const end = start + visibleRowCount(viewportHeight, rowHeight);
  return { startIndex: start, endIndex: total > 0 ? Math.min(total, end) : end };
}

/**
 * Whether scrolling has come close enough to the end of the loaded rows to ask for more (infinite scroll): the window plus
 * `threshold` rows reaches `total`, and this `total` has not been asked for already (`lastRequestedTotal`).
 */
export function shouldLoadMore(
  startIndex: number,
  visibleCount: number,
  threshold: number,
  total: number,
  lastRequestedTotal: number,
): boolean {
  return startIndex + visibleCount + threshold >= total && total !== lastRequestedTotal;
}

/**
 * What an ArrowUp/ArrowDown does in a virtual grid, by item index:
 * - `'header'`: stepping up from the first row, which goes to the header (left to the DOM walk);
 * - `'swallow'`: stepping down from the last row, the key is taken and nothing moves;
 * - `'dom'`: the neighbour is already rendered, so the DOM walk moves focus;
 * - `{ scrollTo }`: the neighbour is not rendered yet (or an earlier move is still waiting): scroll there, focus it once rendered.
 * `current` is where the move starts: the rendered row, or the target of a move that is still waiting (`waiting`), so that
 * keys pressed meanwhile are not lost. `renderedStart`/`renderedEnd` is the rendered range, end exclusive.
 */
export function virtualMoveTarget(options: {
  current: number;
  step: 1 | -1;
  total: number;
  renderedStart: number;
  renderedEnd: number;
  waiting: boolean;
}): 'header' | 'swallow' | 'dom' | { scrollTo: number } {
  const target = options.current + options.step;
  if (target < 0) {
    return 'header';
  }
  if (target >= options.total) {
    return 'swallow';
  }
  if (!options.waiting && target >= options.renderedStart && target < options.renderedEnd) {
    return 'dom';
  }
  return { scrollTo: target };
}
