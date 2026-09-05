import { strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  url,
} from '@angular-devkit/schematics';
import { GridSchematicOptions } from './schema';

/**
 * `ng generate @inandu-solutions/grid-angular:grid [name]`
 *
 * Drops a self-contained standalone component that renders a working `<inandu-grid>` with sample
 * columns and rows — so a fresh install has something to look at with one command. Nothing is wired
 * into routing (too fragile across app shapes); the schematic just tells you how to show it.
 */
export function grid(options: GridSchematicOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const name = strings.dasherize(options.name || 'grid-demo');
    const path = (options.path || 'src/app').replace(/\/+$/, '');
    const prefix = strings.dasherize(options.prefix || 'app');
    const folder = `${path}/${name}`;

    const componentPath = `${folder}/${name}.component.ts`;
    if (tree.exists(componentPath)) {
      throw new SchematicsException(
        `${componentPath} already exists — pass a different name, e.g. \`ng g @inandu-solutions/grid-angular:grid my-grid\`.`,
      );
    }

    const templateSource = apply(url('./files'), [
      applyTemplates({ ...strings, name, prefix }),
      move(folder),
    ]);

    return chain([
      mergeWith(templateSource),
      (_tree: Tree, ctx: SchematicContext) => {
        ctx.logger.info('');
        ctx.logger.info(`✔ Created ${componentPath}`);
        ctx.logger.info(
          `  Show it by adding <${prefix}-${name}></${prefix}-${name}> to a template, or route to ${strings.classify(name)}Component.`,
        );
        ctx.logger.info('');
      },
    ])(tree, context);
  };
}
