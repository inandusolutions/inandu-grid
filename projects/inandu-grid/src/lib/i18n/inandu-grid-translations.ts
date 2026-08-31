import { TranslateService } from '@ngx-translate/core';
import { INANDU_GRID_TRANSLATIONS } from '../core/i18n';

const TRANSLATIONS = INANDU_GRID_TRANSLATIONS;
const DEFAULT_LANG = 'en';

/** Registers all built-in per-language dictionaries onto `translate`'s in-memory store. */
export function registerInanduGridTranslations(translate: TranslateService): void {
  for (const [lang, messages] of Object.entries(TRANSLATIONS)) {
    translate.setTranslation(lang, messages);
  }
}

/**
 * Resolves a BCP 47 tag (e.g. `"es-AR"`, possibly empty) to one of the languages registered by
 * `registerInanduGridTranslations`, matching only the primary subtag case-insensitively (`"es-AR"` and
 * `"es-ES"` both resolve to `"es"`). Falls back to `translate.getBrowserLang()` when `lang` is
 * empty, and to English when neither resolves to a supported language.
 */
export function resolveInanduGridLang(lang: string, translate: TranslateService): string {
  const requested = lang || translate.getBrowserLang() || DEFAULT_LANG;
  const primary = requested.split('-')[0].toLowerCase();
  return primary in TRANSLATIONS ? primary : DEFAULT_LANG;
}
