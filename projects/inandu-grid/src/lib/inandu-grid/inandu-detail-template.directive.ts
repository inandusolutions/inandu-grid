import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Marks an `<ng-template>` as `InanduGridComponent`'s master-detail (#4) content, distinguishing
 * it from `rowActionsTemplate` — which also accepts a plain, unmarked `<ng-template>` child and
 * would otherwise ambiguously match this one too, since both are ultimately just `TemplateRef`s
 * (see `InanduGridComponent.detailTemplate`'s doc comment for how the two are told apart).
 *
 * ```html
 * <inandu-grid [data]="rows">
 *   <inandu-column field="name" title="Name"></inandu-column>
 *   <ng-template inanduDetailTemplate let-row>
 *     <p>Details for {{ row.name }}...</p>
 *   </ng-template>
 * </inandu-grid>
 * ```
 */
@Directive({
  selector: 'ng-template[inanduDetailTemplate]',
})
export class InanduDetailTemplateDirective {
  readonly templateRef = inject(TemplateRef);
}
