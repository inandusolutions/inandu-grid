import { collectTreeRows } from '@inandu-solutions/grid-core';

/**
 * The tree nodes a given expansion setting opens: `'none'` opens nothing, `'all'` every node that has children, a number the
 * nodes down to that many levels (`1` opens the roots that have children, `2` also their children's, and so on).
 * Pure: `childrenOf` says where a row keeps its children. Not part of the public API.
 */
export function treeRowsToExpand<T extends object>(
  data: readonly T[],
  mode: 'none' | 'all' | number,
  childrenOf: (row: T) => readonly T[] | undefined,
): Set<T> {
  const open = new Set<T>();
  if (mode === 'none') {
    return open;
  }
  if (mode === 'all') {
    for (const row of collectTreeRows(data, childrenOf)) {
      if (childrenOf(row)?.length) open.add(row);
    }
    return open;
  }
  const walk = (level: readonly T[], depth: number): void => {
    if (depth >= mode) return;
    for (const row of level) {
      const children = childrenOf(row);
      if (children?.length) {
        open.add(row);
        walk(children, depth + 1);
      }
    }
  };
  walk(data, 0);
  return open;
}
