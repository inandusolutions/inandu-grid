import { ChangeDetectionStrategy, Component, contentChildren, input } from '@angular/core';
import { InanduColumnComponent } from '../inandu-column/inandu-column.component';

/**
 * Groups a run of `<inandu-column>` children under one shared header cell spanning two header
 * rows (#26). A content query doesn't cross a *component* boundary, so `<inandu-grid>` can't see
 * an `<inandu-column>` nested in here directly — it reads this group's own `columns()` instead
 * and merges them in (see `InanduGridComponent.columns()`), then drives the extra header row from
 * `columnGroups()`/`fieldToGroup()`/`columnGroupRuns()`.
 *
 * ```html
 * <inandu-grid [data]="rows">
 *   <inandu-column-group title="Contact">
 *     <inandu-column field="email" title="Email"></inandu-column>
 *     <inandu-column field="phone" title="Phone"></inandu-column>
 *   </inandu-column-group>
 *   <inandu-column field="id" title="ID"></inandu-column>
 * </inandu-grid>
 * ```
 *
 * A column not in any group renders with a blank filler cell above it instead of a `rowspan`, the
 * same height as the group row — simpler and safer than `rowspan`-ing that column's own header
 * cell across both rows, given how much `stickyOffset()`/resize/reorder/drag-and-drop already
 * assume about a single uniform header row's `<th>`s.
 *
 * **v1 scope**: one level of nesting only (a group can't contain another group) — declaring one
 * anyway silently drops the inner group's own grouping, its columns still render as its parent's
 * direct members. Groups aren't collapsible yet, and CSV/Excel/PDF export doesn't reflect them
 * (only the on-screen header does). If two columns of the same group end up non-adjacent in
 * `visibleColumns()` (e.g. one was reordered out via drag-and-drop), the group header simply
 * splits into two separate cells with the same title rather than merging non-contiguous columns —
 * see `InanduGridComponent.columnGroupRuns()`.
 */
@Component({
  selector: 'inandu-column-group',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InanduColumnGroupComponent {
  readonly title = input.required<string>();
  readonly columns = contentChildren(InanduColumnComponent);
}
