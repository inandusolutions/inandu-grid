/**
 * Columns with an explicit `order` land at that 0-based slot; columns without one
 * fill the remaining slots in declaration order. Equal/out-of-range `order` values
 * degrade gracefully by falling back to declaration order among themselves.
 *
 * Generic over the column type: works for `InanduColumnComponent` instances or any object with
 * an `order()` accessor.
 */
export function placeColumnsByOrder<C extends { order(): number | undefined }>(columns: readonly C[]): C[] {
  const positioned = columns
    .map((column, index) => ({ column, index }))
    .filter(entry => entry.column.order() !== undefined)
    .sort((a, b) => a.column.order()! - b.column.order()! || a.index - b.index)
    .map(entry => entry.column);
  const flowing = columns.filter(column => column.order() === undefined);

  const result: C[] = [];
  let posIndex = 0;
  let flowIndex = 0;
  let slot = 0;
  while (posIndex < positioned.length || flowIndex < flowing.length) {
    if (posIndex < positioned.length && positioned[posIndex].order()! <= slot) {
      result.push(positioned[posIndex++]);
    } else if (flowIndex < flowing.length) {
      result.push(flowing[flowIndex++]);
    } else {
      result.push(positioned[posIndex++]);
    }
    slot++;
  }
  return result;
}
