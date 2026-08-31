import { TranslateService } from '@ngx-translate/core';
import { resolveInanduGridLang } from './inandu-grid-translations';

function stubTranslateService(browserLang: string | undefined): TranslateService {
  return { getBrowserLang: () => browserLang } as unknown as TranslateService;
}

describe('resolveInanduGridLang', () => {
  it('resolves an explicit lang tag by its primary subtag, case-insensitively', () => {
    const translate = stubTranslateService('en');
    expect(resolveInanduGridLang('es-AR', translate)).toBe('es');
    expect(resolveInanduGridLang('ES-ar', translate)).toBe('es');
    expect(resolveInanduGridLang('fr-FR', translate)).toBe('fr');
    expect(resolveInanduGridLang('it-IT', translate)).toBe('it');
    expect(resolveInanduGridLang('zh-CN', translate)).toBe('zh');
    expect(resolveInanduGridLang('en-US', translate)).toBe('en');
  });

  it('falls back to English for an unsupported explicit lang', () => {
    expect(resolveInanduGridLang('de-DE', stubTranslateService('en'))).toBe('en');
  });

  it('falls back to the browser language when lang is empty', () => {
    expect(resolveInanduGridLang('', stubTranslateService('fr-CA'))).toBe('fr');
  });

  it('falls back to English when the browser language is also unsupported or unavailable', () => {
    expect(resolveInanduGridLang('', stubTranslateService('de-DE'))).toBe('en');
    expect(resolveInanduGridLang('', stubTranslateService(undefined))).toBe('en');
  });
});
