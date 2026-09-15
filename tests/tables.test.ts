import { describe, expect, it } from 'vitest';
import { npcGenerator } from '@/data/generators/npc';
import { encounterGenerator } from '@/data/generators/encounter';
import { tavernGenerator } from '@/data/generators/tavern';
import { hooks, LEAD_MAGNET_COUNT } from '@/data/generators/hooks';
import { Forge, isComplete, namespaceOf, textOf, variety, type GeneratorDef } from '@/scripts/generator';
import { ctaFor, products } from '@/data/products';
import { faqs } from '@/data/faq';
import { tools } from '@/data/tools';

const generators: readonly GeneratorDef[] = [npcGenerator, encounterGenerator, tavernGenerator];

/**
 * Names that must never appear in original, system-friendly tables. A safety
 * net rather than a licence: the rule is that every line is written here.
 */
const forbidden = [
  'forgotten realms',
  'faerûn',
  'waterdeep',
  'baldur',
  'neverwinter',
  'drizzt',
  'eberron',
  'ravenloft',
  'strahd',
  'greyhawk',
  'dungeons & dragons',
  'beholder',
  'mind flayer',
  'illithid',
  'displacer beast',
  'githyanki',
  'tarrasque',
  'owlbear',
  'pathfinder',
  'golarion',
];

function corpusOf(def: GeneratorDef): string {
  return def.fields
    .flatMap((field) =>
      field.source.kind === 'table'
        ? field.source.entries.map(textOf)
        : field.source.parts.flatMap((part) => [...part]),
    )
    .join(' ')
    .toLowerCase();
}

describe.each(generators.map((def) => [def.id, def] as const))('%s tables', (_id, def) => {
  it('offers at least 15 entries for every table-backed field', () => {
    for (const field of def.fields) {
      if (field.source.kind !== 'table') continue;
      expect(field.source.entries.length, `${def.id}.${field.id} is short`).toBeGreaterThanOrEqual(15);
    }
  });

  it('offers real variety for assembled fields', () => {
    for (const field of def.fields) {
      if (field.source.kind !== 'assembled') continue;
      expect(variety(field), `${def.id}.${field.id} is short`).toBeGreaterThanOrEqual(100);
    }
  });

  it('repeats no entry within a field', () => {
    for (const field of def.fields) {
      if (field.source.kind !== 'table') continue;
      const texts = field.source.entries.map(textOf);
      expect(new Set(texts).size, `${def.id}.${field.id} repeats an entry`).toBe(texts.length);
    }
  });

  it('uses unique field ids and labels', () => {
    const ids = def.fields.map((field) => field.id);
    const labels = def.fields.map((field) => field.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('keeps the recent-value memory below the smallest field', () => {
    const smallest = Math.min(...def.fields.map(variety));
    expect(def.memory).toBeLessThan(smallest);
  });

  it('declares every tag namespace it actually uses', () => {
    const declared = new Set([...(def.tagRules?.agree ?? []), ...(def.tagRules?.unique ?? [])]);
    const used = new Set(
      def.fields.flatMap((field) =>
        field.source.kind === 'table'
          ? field.source.entries.flatMap((entry) =>
              (typeof entry === 'string' ? [] : (entry.tags ?? [])).map(namespaceOf),
            )
          : [],
      ),
    );
    for (const namespace of used) {
      expect(declared.has(namespace), `${def.id} uses undeclared tag namespace "${namespace}"`).toBe(true);
    }
  });

  it('can always satisfy an agreeing namespace from at least two fields', () => {
    for (const namespace of def.tagRules?.agree ?? []) {
      const carriers = def.fields.filter(
        (field) =>
          field.source.kind === 'table' &&
          field.source.entries.some((entry) =>
            (typeof entry === 'string' ? [] : (entry.tags ?? [])).some(
              (tag) => namespaceOf(tag) === namespace,
            ),
          ),
      );
      expect(carriers.length, `${def.id}: "${namespace}" is only used by one field`).toBeGreaterThan(1);
    }
  });

  it('never uses a protected setting, character or monster name', () => {
    const corpus = corpusOf(def);
    for (const term of forbidden) {
      expect(corpus, `${def.id} mentions "${term}"`).not.toContain(term);
    }
  });

  it('produces a complete roll every time over many runs', () => {
    const forge = new Forge(def);
    let roll = forge.roll();
    for (let run = 0; run < 200; run += 1) {
      roll = forge.roll(roll);
      expect(isComplete(roll)).toBe(true);
      for (const slot of roll) expect(slot.value.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('story hooks', () => {
  it('has at least the number published on the free resources page', () => {
    expect(hooks.length).toBeGreaterThanOrEqual(LEAD_MAGNET_COUNT);
  });

  it('contains no duplicates', () => {
    expect(new Set(hooks).size).toBe(hooks.length);
  });

  it('never uses a protected setting, character or monster name', () => {
    const corpus = hooks.join(' ').toLowerCase();
    for (const term of forbidden) {
      expect(corpus, `hooks mention "${term}"`).not.toContain(term);
    }
  });
});

describe('products', () => {
  it('uses unique slugs', () => {
    const slugs = products.map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('offers no purchase button without a purchase URL', () => {
    for (const product of products) {
      const cta = ctaFor(product);
      if (cta.kind === 'buy') expect(product.purchaseUrl).toBeTruthy();
      if (cta.kind === 'preview') expect(product.previewUrl).toBeTruthy();
      if (cta.kind === 'soon') {
        expect(product.purchaseUrl).toBeUndefined();
        expect(product.previewUrl).toBeUndefined();
        expect(cta.href).toBeUndefined();
      }
    }
  });

  it('describes what is inside every pack', () => {
    for (const product of products) {
      expect(product.includedItems.length).toBeGreaterThan(2);
      expect(product.description.length).toBeGreaterThan(80);
    }
  });
});

describe('site copy', () => {
  /** Internal, owner-facing language that must never reach a visitor. */
  const banned = [
    'sell once',
    'deliver forever',
    'stripe',
    'gumroad',
    'payhip',
    'recurring revenue',
    'membership is the engine',
    'convertkit',
    'beehiiv',
    'built like a business',
    'free traffic',
    '10,000',
  ];

  const visible = [
    ...faqs.flatMap((item) => [item.question, item.answer]),
    ...products.flatMap((product) => [product.name, product.subtitle, product.description, ...product.includedItems]),
    ...tools.flatMap((tool) => [tool.name, tool.summary, tool.produces, tool.lede, tool.metaDescription]),
  ]
    .join(' ')
    .toLowerCase();

  it('keeps business-facing language off the customer-facing copy', () => {
    for (const phrase of banned) {
      expect(visible, `visitor copy contains "${phrase}"`).not.toContain(phrase);
    }
  });

  it('gives every tool a unique title and description', () => {
    expect(new Set(tools.map((tool) => tool.metaTitle)).size).toBe(tools.length);
    expect(new Set(tools.map((tool) => tool.metaDescription)).size).toBe(tools.length);
  });
});
