export interface GridSchematicOptions {
  /** Component name — a folder and `<name>.component.ts` are created under `path`. */
  name: string;
  /** Where the component folder is created, relative to the workspace root. */
  path: string;
  /** Selector prefix (`<prefix>-<name>`). */
  prefix: string;
}
