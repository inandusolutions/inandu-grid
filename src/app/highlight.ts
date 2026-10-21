/**
 * A tiny, dependency-free syntax highlighter for the code samples on this page. It is not a
 * parser: one regex pass that colours comments, strings, tags, attribute / binding names,
 * keywords and numbers, and escapes everything else. Good enough for short snippets.
 */

const TOKEN = new RegExp(
  [
    '(?<comment>\\/\\/[^\\n]*|<!--[\\s\\S]*?-->)',
    '(?<string>\'[^\'\\n]*\'|"[^"\\n]*"|`[^`]*`)',
    '(?<tag></?[A-Za-z][\\w.-]*)',
    '(?<attr>(?<=\\s)[\\[(*#]?[A-Za-z][\\w.-]*[\\])]?(?==))',
    '(?<keyword>\\b(?:import|from|export|const|let|var|type|function|return|async|await|new|as|true|false|null|undefined)\\b)',
    '(?<number>\\b\\d[\\d_.]*\\b)',
  ].join('|'),
  'g',
);

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function highlight(code: string): string {
  let out = '';
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    out += escapeHtml(code.slice(last, idx));
    const kind = Object.entries(m.groups ?? {}).find(([, v]) => v !== undefined)?.[0] ?? 'plain';
    out += `<span class="tok-${kind}">${escapeHtml(m[0])}</span>`;
    last = idx + m[0].length;
  }
  return out + escapeHtml(code.slice(last));
}
