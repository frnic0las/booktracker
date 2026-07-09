import { describe, expect, it } from 'vitest';

import { toSafeCallbackPath } from './callback-url';

describe('toSafeCallbackPath', () => {
  it('keeps a relative path', () => {
    expect(toSafeCallbackPath('/account')).toBe('/account');
    expect(toSafeCallbackPath('/books/42?tab=notes')).toBe('/books/42?tab=notes');
  });

  it('reduces the absolute URL sent by the proxy to its path', () => {
    expect(toSafeCallbackPath('http://localhost:3000/non-fiction')).toBe('/non-fiction');
  });

  it('strips a foreign host instead of redirecting off-site', () => {
    expect(toSafeCallbackPath('https://evil.com/phishing')).toBe('/phishing');
    expect(toSafeCallbackPath('//evil.com/phishing')).toBe('/phishing');
  });

  it('falls back to the default for anything that is not a path', () => {
    expect(toSafeCallbackPath(undefined)).toBe('/novels');
    expect(toSafeCallbackPath('')).toBe('/novels');
    expect(toSafeCallbackPath(42)).toBe('/novels');
    expect(toSafeCallbackPath('javascript:alert(1)')).toBe('/novels');
  });
});
