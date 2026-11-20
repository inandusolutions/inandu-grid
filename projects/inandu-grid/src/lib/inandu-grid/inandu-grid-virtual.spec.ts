import { shouldLoadMore, viewportWindow, virtualMoveTarget, visibleRowCount } from './inandu-grid-virtual';

describe('inandu-grid-virtual', () => {
  describe('visibleRowCount', () => {
    it('rounds up, and treats a row height of 0 as 1', () => {
      expect(visibleRowCount(400, 40)).toBe(10);
      expect(visibleRowCount(401, 40)).toBe(11);
      expect(visibleRowCount(100, 0)).toBe(100);
    });
  });

  describe('viewportWindow', () => {
    it('ends at start plus the visible rows, clamped to the total', () => {
      expect(viewportWindow(0, 400, 40, 1000)).toEqual({ startIndex: 0, endIndex: 10 });
      expect(viewportWindow(995, 400, 40, 1000)).toEqual({ startIndex: 995, endIndex: 1000 });
    });

    it('never starts below 0, and does not clamp when the total is 0 or unknown', () => {
      expect(viewportWindow(-5, 400, 40, 1000).startIndex).toBe(0);
      expect(viewportWindow(0, 400, 40, 0)).toEqual({ startIndex: 0, endIndex: 10 });
    });
  });

  describe('shouldLoadMore', () => {
    it('asks once the window plus the threshold reaches the end, and only once per total', () => {
      expect(shouldLoadMore(0, 10, 5, 100, 0)).toBeFalse();
      expect(shouldLoadMore(85, 10, 5, 100, 0)).toBeTrue();
      expect(shouldLoadMore(85, 10, 5, 100, 100)).toBeFalse();
      expect(shouldLoadMore(85, 10, 5, 200, 100)).toBeFalse();
    });

    it('is true for an empty list that was not asked for yet', () => {
      expect(shouldLoadMore(0, 10, 5, 0, -1)).toBeTrue();
    });
  });

  describe('virtualMoveTarget', () => {
    const base = { current: 20, step: 1 as const, total: 100, renderedStart: 10, renderedEnd: 30, waiting: false };

    it('lets the DOM walk move to a neighbour that is already rendered', () => {
      expect(virtualMoveTarget(base)).toBe('dom');
      expect(virtualMoveTarget({ ...base, step: -1 })).toBe('dom');
    });

    it('scrolls to a neighbour that is outside the rendered range', () => {
      expect(virtualMoveTarget({ ...base, current: 29 })).toEqual({ scrollTo: 30 });
      expect(virtualMoveTarget({ ...base, current: 10, step: -1 })).toEqual({ scrollTo: 9 });
    });

    it('keeps scrolling while an earlier move is waiting, even if the target is rendered', () => {
      expect(virtualMoveTarget({ ...base, waiting: true })).toEqual({ scrollTo: 21 });
    });

    it('going up from the first row leaves it to the header; going down from the last row swallows the key', () => {
      expect(virtualMoveTarget({ ...base, current: 0, step: -1, renderedStart: 0 })).toBe('header');
      expect(virtualMoveTarget({ ...base, current: 99 })).toBe('swallow');
      expect(virtualMoveTarget({ ...base, current: 0, total: 1 })).toBe('swallow');
    });
  });
});
