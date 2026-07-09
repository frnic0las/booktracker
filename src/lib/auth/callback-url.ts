export const DEFAULT_REDIRECT = '/novels';

// The proxy sends users to /login?callbackUrl=<absolute URL>, so the raw value
// cannot be trusted as-is: an attacker-supplied host would turn the post-login
// redirect into an open redirect. Resolving against a dummy origin and keeping
// only the path drops any host, foreign or not.
export function toSafeCallbackPath(value: unknown): string {
  if (typeof value !== 'string' || value === '') {
    return DEFAULT_REDIRECT;
  }

  let url: URL;

  try {
    url = new URL(value, 'http://localhost');
  } catch {
    return DEFAULT_REDIRECT;
  }

  const path = `${url.pathname}${url.search}`;

  // `//evil.com` would be read as a protocol-relative URL by the browser.
  if (!path.startsWith('/') || path.startsWith('//')) {
    return DEFAULT_REDIRECT;
  }

  return path;
}
