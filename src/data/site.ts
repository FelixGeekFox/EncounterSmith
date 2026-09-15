/**
 * Central site configuration.
 *
 * Anything that differs between a local build and the live site is read from a
 * PUBLIC_ environment variable here. Nothing in this file is secret: PUBLIC_
 * values are compiled into the static output and visible in view-source.
 */

const env = import.meta.env as Record<string, string | undefined>;

function text(key: string): string | undefined {
  const value = env[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function flag(key: string, fallback: boolean): boolean {
  const value = text(key)?.toLowerCase();
  if (value === undefined) return fallback;
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}

export interface SocialLink {
  readonly label: string;
  readonly url: string;
}

export const site = {
  name: 'EncounterSmith',
  tagline: 'For Bolder Games',
  /** One line, used in the footer, meta descriptions and structured data. */
  blurb:
    'Original, system-friendly tabletop RPG tools for busy Game Masters. NPCs, encounters, taverns and story sparks you can take straight to the table.',
  url: (text('PUBLIC_SITE_URL') ?? 'https://encountersmith.com').replace(/\/+$/, ''),
  locale: 'en_AU',
  contactEmail: text('PUBLIC_CONTACT_EMAIL') ?? 'hello@encountersmith.com',
  socials: [] as readonly SocialLink[],

  /** Where the sign-up forms post. Undefined keeps them honestly inactive. */
  emailFormAction: text('PUBLIC_EMAIL_FORM_ACTION'),
  emailProvider: text('PUBLIC_EMAIL_PROVIDER'),

  features: {
    products: flag('PUBLIC_FEATURE_PRODUCTS', true),
    smithPlus: flag('PUBLIC_FEATURE_SMITH_PLUS', true),
    /** Only ever true once a real price and a real checkout both exist. */
    smithPlusPrice: flag('PUBLIC_FEATURE_SMITH_PLUS_PRICE', false),
    /** Product structured data, emitted only for products with a checkout. */
    productSchema: flag('PUBLIC_FEATURE_PRODUCT_SCHEMA', false),
    /** No analytics is loaded either way until a snippet is added by hand. */
    analytics: flag('PUBLIC_FEATURE_ANALYTICS', false),
  },

  smithPlus: {
    price: text('PUBLIC_SMITH_PLUS_PRICE'),
    interval: text('PUBLIC_SMITH_PLUS_INTERVAL') ?? 'month',
  },

  legal: {
    /** True until PUBLIC_LEGAL_REVIEWED says a lawyer has signed the pages off. */
    reviewPending: !flag('PUBLIC_LEGAL_REVIEWED', false),
    updated: text('PUBLIC_LEGAL_UPDATED') ?? '15 September 2026',
    entity: text('PUBLIC_LEGAL_ENTITY') ?? 'EncounterSmith',
    jurisdiction: text('PUBLIC_LEGAL_JURISDICTION') ?? 'New South Wales, Australia',
  },

  /**
   * Brand asset paths, kept here so a new logo or social card is a one-line
   * change rather than a search through the components. Every file is produced
   * by tools/build-assets.py from the originals in the assets folder.
   */
  brand: {
    emblem: '/brand/emblem-640',
    emblemSmall: '/brand/emblem-160',
    favicon32: '/brand/favicon-32.png',
    favicon64: '/brand/favicon-64.png',
    appleTouchIcon: '/brand/apple-touch-icon.png',
    icon192: '/brand/icon-192.png',
    icon512: '/brand/icon-512.png',
    heroScene: '/images/hero-scene',
    ogImage: '/images/og-encountersmith.jpg',
    ogImageSize: { width: 1200, height: 630 },
  },
} as const;

export type SiteConfig = typeof site;

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly feature?: 'products' | 'smithPlus';
}

const nav: readonly NavItem[] = [
  { label: 'Tools', href: '/tools' },
  { label: 'Products', href: '/products', feature: 'products' },
  { label: 'Free Resources', href: '/free-resources' },
  { label: 'Smith+', href: '/smith-plus', feature: 'smithPlus' },
  { label: 'FAQ', href: '/faq' },
];

export const primaryNav: readonly NavItem[] = nav.filter(
  (item) => item.feature === undefined || site.features[item.feature],
);

/** The four-word rhythm painted along the bottom of the supplied banner. */
export const bannerRhythm = ['Create', 'Explore', 'Build', 'Together'] as const;

export const compatibilityNotice =
  'EncounterSmith is an independent project. It is not affiliated with, endorsed, sponsored or approved by Wizards of the Coast or any other game publisher. Every table on this site is written from scratch and kept system-friendly, so it sits alongside most fantasy roleplaying games without borrowing from any of them.';
