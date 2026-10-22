/** Accept only relative paths that resolve to this app, including after URL normalization. */
export function safeNext(value, fallback = '/today') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const base = new URL('https://app.invalid');
    const target = new URL(value, base);
    if (target.origin !== base.origin) return fallback;
    return target.pathname + target.search + target.hash;
  } catch {
    return fallback;
  }
}
