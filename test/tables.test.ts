import { describe, expect, it } from 'vitest';
import { npcGenerator } from '~/data/generators/npc';
import { encounterGenerator } from '~/data/generators/encounter';
import { tavernGenerator } from '~/data/generators/tavern';
import { hooks } from '~/data/generators/hooks';
import { entryText, fieldVariety, generate, type GeneratorDefinition } from '~/scripts/engine';

const definitions: readonly GeneratorDefinition[] = [
  npcGenerator,
  encounterGenerator,
  tavernGenerator,
];

/** Names that must never appear in original, system-neutral tables. */
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

describe.each(definitions.map((definition) => [definition.id, definition] as const))(
  '%s generator tables',
  (_id, definition) => {
    it('offers at least 15 options for every table-backed field', () => {
      for (const field of definition.fields) {
        if (field.source.kind !== 'table') continue;
        expect(
          field.source.entries.length,
          `${definition.id}.${field.key} has too few entries`,
        ).toBeGreaterThanOrEqual(15);
      }
    });

    it('offers plenty of variety for composite fields', () => {
      for (const field of definition.fields) {
        if (field.source.kind !== 'composite') continue;
        expect(fieldVariety(field)).toBeGreaterThanOrEqual(100);
      }
    });

    it('has no duplicate entries within a field', () => {
      for (const field of definition.fields) {
        if (field.source.kind !== 'table') continue;
        const texts = field.source.entries.map(entryText);
        expect(new Set(texts).size, `${definition.id}.${field.key} repeats an entry`).toBe(
          texts.length,
        );
      }
    });

    it('has unique field keys and labels', () => {
      const keys = definition.fields.map((field) => field.key);
      const labels = definition.fields.map((field) => field.label);
      expect(new Set(keys).size).toBe(keys.length);
      expect(new Set(labels).size).toBe(labels.length);
    });

    it('keeps the recent-value memory below the smallest table size', () => {
      const smallest = Math.min(
        ...definition.fields.map((field) => fieldVariety(field)),
      );
      expect(definition.recentMemory).toBeLessThan(smallest);
    });

    it('uses no protected setting, character or monster names', () => {
      const corpus = definition.fields
        .flatMap((field) =>
          field.source.kind === 'table'
            ? field.source.entries.map(entryText)
            : field.source.parts.flat(),
        )
        .join(' ')
        .toLowerCase();
      for (const term of forbidden) {
        expect(corpus, `${definition.id} mentions "${term}"`).not.toContain(term);
      }
    });

    it('produces a complete result every time over many runs', () => {
      for (let run = 0; run < 100; run += 1) {
        const result = generate(definition);
        for (const field of definition.fields) {
          expect(result[field.key]?.text.trim().length).toBeGreaterThan(0);
        }
      }
    });
  },
);

describe('story hooks', () => {
  it('provides at least the 25 advertised on the free resources page', () => {
    expect(hooks.length).toBeGreaterThanOrEqual(25);
  });

  it('contains no duplicates', () => {
    expect(new Set(hooks).size).toBe(hooks.length);
  });

  it('uses no protected setting, character or monster names', () => {
    const corpus = hooks.join(' ').toLowerCase();
    for (const term of forbidden) {
      expect(corpus, `hooks mention "${term}"`).not.toContain(term);
    }
  });
});
