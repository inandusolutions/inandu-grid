/** Floor enforced while dragging a resize handle, so a column can never be shrunk to zero/negative width. */
export const MIN_COLUMN_WIDTH = 30;

/** Must match `.inandu-select-column`'s CSS width — used by `stickyOffset()` to account for the (always-sticky) checkbox column. */
export const SELECT_COLUMN_WIDTH = 36;

/** Must match `.inandu-row-drag-column`'s CSS width — used by `stickyOffset()` to account for the (always-leading, when enabled) drag-handle column. */
export const ROW_DRAG_COLUMN_WIDTH = 32;

/** Must match `.inandu-detail-toggle-column`'s CSS width — used by `stickyOffset()` to account for the (always-leading-most, when enabled) master-detail expand/collapse column. */
export const DETAIL_TOGGLE_COLUMN_WIDTH = 32;

/** `localStorage` key prefix for `stateKey`-based persistence, so this library's own saved blobs don't collide with anything else a host app stores. */
export const STATE_STORAGE_PREFIX = 'inandu-grid-state:';
