// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * PUBLIC_SITE_URL drives canonical links, Open Graph URLs, robots.txt and the
 * generated sitemap. Set it in the host's build environment; the fallback here
 * exists only so a local build has something valid to resolve against.
 */
const site = process.env.PUBLIC_SITE_URL ?? 'https://encountersmith.com';

/**
 * Subdirectory the site is served from. Leave unset for a root deployment
 * (Cloudflare Pages, Netlify, a custom domain). A GitHub Pages project site is
 * served from /<repo>/, so it needs PUBLIC_BASE_PATH="/EncounterSmith".
 */
const base = process.env.PUBLIC_BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  build: { inlineStylesheets: 'auto' },
  vite: {
    resolve: { alias: { '@': new URL('./src/', import.meta.url).pathname } },
  },
});
