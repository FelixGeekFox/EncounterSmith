import type { APIRoute } from 'astro';
import { site } from '@/data/site';
import { absolute } from '@/lib/url';

/**
 * Generated rather than checked in, so the sitemap line always matches whatever
 * PUBLIC_SITE_URL the build was given.
 */
export const GET: APIRoute = () =>
  new Response(['User-agent: *', 'Allow: /', '', `Sitemap: ${absolute(site.url, '/sitemap-index.xml')}`, ''].join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
