/**
 * The built-in per-language message dictionaries. Plain `Record<string, string>` data with no
 * framework dependency — `lib/i18n/inandu-grid-translations.ts` wires these into `@ngx-translate`
 * for the Angular component; a non-Angular consumer can feed them to any i18n runtime.
 *
 * `en.ts` is the canonical key list; the other four must stay in lockstep with it.
 */
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { zh } from './zh';

export { en, es, fr, it, zh };

/** Every built-in dictionary, keyed by primary language subtag. */
export const INANDU_GRID_TRANSLATIONS: Record<string, Record<string, string>> = { en, es, fr, it, zh };
