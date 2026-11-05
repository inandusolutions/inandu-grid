/*
 * Public API Surface of inandu-grid
 */

export { InanduGridComponent } from './lib/inandu-grid/inandu-grid.component';
export type {
  InanduGridRow,
  InanduGridPagingOptions,
  InanduGridRowSave,
  InanduGridNewRowValues,
  InanduGridCellPaste,
  InanduGridCellRangeSelection,
  InanduGridLoadMoreEvent,
  InanduGridViewportRange,
  InanduGridSortCriterion,
  InanduGridPageState,
  InanduGridFilterState,
  InanduGridColumnFilterValue,
  InanduGridStatePart,
  InanduGridCustomTranslations,
  InanduRowActionsContext,
  InanduDetailTemplateContext,
  SortDirection,
} from './lib/inandu-grid/inandu-grid.component';
export { InanduDetailTemplateDirective } from './lib/inandu-grid/inandu-detail-template.directive';
export { InanduColumnGroupComponent } from './lib/inandu-column-group/inandu-column-group.component';
export { InanduColumnComponent } from './lib/inandu-column/inandu-column.component';
export type {
  InanduColumnType,
  InanduColumnValidator,
  InanduColumnAsyncValidator,
  InanduColumnStickySide,
  InanduColumnAggregate,
  InanduCellTemplateContext,
  InanduHeaderTemplateContext,
  InanduEditTemplateContext,
} from './lib/inandu-column/inandu-column.component';

// Used by grid-pro (and handy for any add-on): strict locale-aware paste, the validated saved state, and the print page.
export { parsePastedCell, parsePastedDate, parsePastedBoolean, parseLocaleNumber, sanitizeGridState, buildPrintHtml, printHtmlDocument, GRID_STATE_VERSION } from '@inandu-solutions/grid-core';
export type { InanduPasteOptions, InanduGridSavedState } from '@inandu-solutions/grid-core';
