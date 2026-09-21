/**
 * Escapes `value` for use inside a double-quoted CSS attribute-selector value (e.g.
 * `` `td[data-field="${escaped}"]` ``), for the rare runtime with no native `CSS.escape`. Backslashes
 * MUST be escaped before quotes — escaping only quotes lets a value containing a backslash (e.g.
 * `a\"b`) smuggle an unescaped quote through (`\"` in the output reads back as an escaped backslash
 * followed by a bare, string-terminating `"`), letting the selector break out of the attribute value.
 */
export function escapeAttributeSelectorValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
