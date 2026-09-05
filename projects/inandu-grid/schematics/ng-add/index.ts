import { Rule, SchematicContext, Tree, chain, schematic } from '@angular-devkit/schematics';
import { NgAddSchematicOptions } from './schema';

/**
 * `ng add @inandu-solutions/grid-angular`
 *
 * The Angular CLI installs the package before calling this; there's nothing to wire into
 * `angular.json` (the themes are component-scoped CSS, no global stylesheet). So `ng-add` just
 * scaffolds a working example component — unless `--skip-example` — and prints where to go next.
 */
export function ngAdd(options: NgAddSchematicOptions): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    const rules: Rule[] = [];

    if (!options.skipExample) {
      rules.push(schematic('grid', { name: options.name || 'grid-demo' }));
    }

    rules.push((_t: Tree, ctx: SchematicContext) => {
      ctx.logger.info('');
      ctx.logger.info('  @inandu-solutions/grid-angular is installed.');
      if (options.skipExample) {
        ctx.logger.info('  Generate an example any time:  ng g @inandu-solutions/grid-angular:grid');
      }
      ctx.logger.info('  Quick start:  https://www.npmjs.com/package/@inandu-solutions/grid-angular#quick-start');
      ctx.logger.info('  Live demo:    https://inandusolutions.github.io/inandu-grid/');
      ctx.logger.info('  Manual + API: https://inandusolutions.github.io/inandu-grid/manual.html');
      ctx.logger.info('');
    });

    return chain(rules)(_tree, context);
  };
}
