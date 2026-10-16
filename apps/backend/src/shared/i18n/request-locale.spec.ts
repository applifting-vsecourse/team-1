import { parseAcceptLanguage } from './request-locale';

describe('parseAcceptLanguage', () => {
  it('reads the language the frontend sends', () => {
    expect(parseAcceptLanguage('cs')).toBe('cs');
    expect(parseAcceptLanguage('en')).toBe('en');
  });

  it('takes the most preferred supported language', () => {
    expect(parseAcceptLanguage('de-DE,de;q=0.9,cs;q=0.8,en;q=0.7')).toBe('cs');
    expect(parseAcceptLanguage('en;q=0.5,cs-CZ;q=0.9')).toBe('cs');
  });

  it('falls back to English', () => {
    expect(parseAcceptLanguage(undefined)).toBe('en');
    expect(parseAcceptLanguage('de,fr;q=0.8')).toBe('en');
  });
});
