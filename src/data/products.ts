/**
 * The product catalogue.
 *
 * Checkout and preview links come from environment variables, so a store can be
 * connected without touching a component. A product with neither shows an
 * honest "Coming soon" state; there is no button anywhere that only pretends.
 */

const env = import.meta.env as Record<string, string | undefined>;

function link(key: string): string | undefined {
  const value = env[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export type ProductStatus = 'available' | 'in-progress' | 'planned';

export interface Product {
  readonly slug: string;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
  readonly price: number;
  readonly currency: string;
  readonly status: ProductStatus;
  /**
   * Path under /public once real cover art exists. Undefined renders the house
   * emblem on a forest plate, which is a stated placeholder rather than
   * invented cover artwork.
   */
  readonly coverImage: string | undefined;
  readonly previewUrl: string | undefined;
  readonly purchaseUrl: string | undefined;
  readonly includedItems: readonly string[];
  readonly systemCompatibility: string;
  readonly tags: readonly string[];
  readonly featured?: boolean;
}

export const products: readonly Product[] = [
  {
    slug: 'emergency-session-kit',
    name: 'The Emergency Session Kit',
    subtitle: 'For the week the prep never happened',
    description:
      'A print-and-play kit for running a whole evening from a standing start. Encounters with objectives already attached, a cast who each want something, locations that drop onto any road, and the tracking sheets that keep it all straight while you improvise.',
    price: 14.95,
    currency: 'AUD',
    status: 'in-progress',
    coverImage: undefined,
    previewUrl: link('PUBLIC_PRODUCT_EMERGENCY_KIT_PREVIEW_URL'),
    purchaseUrl: link('PUBLIC_PRODUCT_EMERGENCY_KIT_URL'),
    includedItems: [
      '30 encounters, each with an objective and a complication',
      '40 NPCs with a want, a pressure and a secret apiece',
      '20 locations that fit almost any road or settlement',
      '50 rumours and overheard fragments',
      'Printable session and improv sheets',
    ],
    systemCompatibility: 'System-friendly fantasy',
    tags: ['encounters', 'NPCs', 'printable', 'session prep'],
    featured: true,
  },
  {
    slug: '100-npc-secrets',
    name: '100 NPC Secrets',
    subtitle: 'Turn a shopkeeper into a storyline',
    description:
      'One hundred original secrets, each written to give a forgettable NPC a reason to matter. Every entry carries the pressure that created it and a suggestion for how the truth finally surfaces at the table.',
    price: 7.95,
    currency: 'AUD',
    status: 'in-progress',
    coverImage: undefined,
    previewUrl: link('PUBLIC_PRODUCT_NPC_SECRETS_PREVIEW_URL'),
    purchaseUrl: link('PUBLIC_PRODUCT_NPC_SECRETS_URL'),
    includedItems: [
      '100 original NPC secrets',
      'The pressure behind each one',
      'A suggested reveal for every entry',
      'Indexed by tone, from warm to grim',
    ],
    systemCompatibility: 'System-friendly fantasy',
    tags: ['NPCs', 'story hooks', 'printable'],
  },
  {
    slug: 'bell-beneath-wickhollow',
    name: 'The Bell Beneath Wickhollow',
    subtitle: 'An original dark-fairytale one-shot',
    description:
      'A village with no church, and a bell that rings under it anyway. A single evening of play with a mapped location, a cast who all want something from the party, a clue trail that survives being solved out of order, and three endings that each cost something.',
    price: 11.95,
    currency: 'AUD',
    status: 'planned',
    coverImage: undefined,
    previewUrl: link('PUBLIC_PRODUCT_WICKHOLLOW_PREVIEW_URL'),
    purchaseUrl: link('PUBLIC_PRODUCT_WICKHOLLOW_URL'),
    includedItems: [
      'A complete one-shot for one evening',
      'A hand-drawn style village map',
      'Seven NPCs with connected motives',
      'A clue trail that tolerates any order of play',
      'Three endings with real consequences',
    ],
    systemCompatibility: 'System-friendly fantasy',
    tags: ['adventure', 'one-shot', 'dark fairytale'],
  },
];

export type Cta =
  | { readonly kind: 'buy'; readonly label: 'Buy the pack'; readonly href: string }
  | { readonly kind: 'preview'; readonly label: 'Preview the pack'; readonly href: string }
  | { readonly kind: 'soon'; readonly label: 'Coming soon'; readonly href: undefined };

/** Chooses the only call to action the data can honestly support. */
export function ctaFor(product: Product): Cta {
  if (product.purchaseUrl) return { kind: 'buy', label: 'Buy the pack', href: product.purchaseUrl };
  if (product.previewUrl) return { kind: 'preview', label: 'Preview the pack', href: product.previewUrl };
  return { kind: 'soon', label: 'Coming soon', href: undefined };
}

export function statusLabel(status: ProductStatus): string {
  switch (status) {
    case 'available':
      return 'Available now';
    case 'in-progress':
      return 'On the workbench';
    case 'planned':
      return 'Planned';
  }
}

export function priceLabel(product: Product): string {
  const amount = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: product.currency,
    currencyDisplay: 'narrowSymbol',
  }).format(product.price);
  return product.currency === 'AUD' ? `A${amount}` : amount;
}
