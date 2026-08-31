/** Escapes `&`/`</>` for safe use as XML/HTML element text content — shared by `exportExcel()` and `printTable()`. */
export function escapeMarkup(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
