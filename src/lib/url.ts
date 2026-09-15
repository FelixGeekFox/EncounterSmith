/**
 * Base-path aware URL helpers.
 *
 * The site is built to be served from the root of a domain (Cloudflare Pages,
 * Netlify, a custom domain) *or* from a subdirectory — a GitHub Pages project
 * site lives at /<repo>/. Astro rewrites the URLs of its own bundled assets for
 * the configured `base`, but every path written by hand in a component or a
 * data file has to go through here, or it 404s on the subdirectory deployment.
 *
 * `BASE_URL` is '/' by default, and whatever PUBLIC_BASE_PATH was set to at
 * build time otherwise. It is read on each call rather than captured at module
 * load, so tests can stub it.
 */

function base(): string {
  return (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');
}

/** True for anything that already addresses somewhere in its own right. */
function isForeign(to: string): boolean {
  return /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(to);
}

/**
 * Turn a logical site path into one the browser can follow.
 *
 * Absolute URLs, mail links and bare fragments pass through untouched, so the
 * helper is safe to apply to anything.
 *
 *   path('/tools')                 -> '/tools'         or '/EncounterSmith/tools'
 *   path('/')                      -> '/'              or '/EncounterSmith'
 *   path('/free-resources#launch') -> '/free-resources#launch'
 *   path('https://example.com')    -> unchanged
 */
export function path(to: string): string {
  if (isForeign(to)) return to;

  // Idempotent: a path that already carries the base is returned untouched, so
  // a component that prefixes internally can still be handed a prefixed value.
  const prefix = base();
  if (prefix && (to === prefix || to.startsWith(`${prefix}/`) || to.startsWith(`${prefix}#`))) {
    return to;
  }

  const hashAt = to.indexOf('#');
  const bare = hashAt === -1 ? to : to.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : to.slice(hashAt);

  const joined = `${base()}/${bare.replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/');
  const trimmed = joined.length > 1 ? joined.replace(/\/+$/, '') : joined;

  return `${trimmed === '' ? '/' : trimmed}${hash}`;
}

/** The same, resolved against the configured origin, for canonical and og:url. */
export function absolute(origin: string, to: string): string {
  if (isForeign(to) && !to.startsWith('#')) return to;
  return new URL(path(to), `${origin.replace(/\/+$/, '')}/`).href;
}
