import { describe, expect, it } from 'vitest';
import {
  RecentMemory,
  drawField,
  entryTags,
  entryText,
  fieldVariety,
  formatAsMarkdown,
  formatAsText,
  generate,
  pickFrom,
  rerollField,
  type FieldDefinition,
  type GeneratorDefinition,
} from '~/scripts/engine';

/** A deterministic stand-in for Math.random that walks a fixed sequence. */
function sequence(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

const colour: FieldDefinition = {
  key: 'colour',
  label: 'Colour',
  source: { kind: 'table', entries: ['red', 'green', 'blue', 'amber'] },
};

const volume: FieldDefinition = {
  key: 'volume',
  label: 'Volume',
  source: {
    kind: 'table',
    entries: [
      { text: 'whispering', tags: ['volume:quiet'] },
      { text: 'bellowing', tags: ['volume:loud'] },
    ],
  },
};

const manner: FieldDefinition = {
  key: 'manner',
  label: 'Manner',
  source: {
    kind: 'table',
    entries: [
      { text: 'mutters', tags: ['volume:quiet'] },
      { text: 'shouts', tags: ['volume:loud'] },
      'fidgets',
    ],
  },
};

const name: FieldDefinition = {
  key: 'name',
  label: 'Name',
  source: { kind: 'composite', parts: [['Ash', 'Bram'], ['Venn', 'Crowe']] },
};

const definition: GeneratorDefinition = {
  id: 'test',
  label: 'Tests',
  noun: 'Test',
  nounLower: 'test',
  recentMemory: 2,
  exclusiveTagGroups: [['volume:quiet', 'volume:loud']],
  fields: [name, colour, volume, manner],
};

describe('entry helpers', () => {
  it('reads plain string entries', () => {
    expect(entryText('plain')).toBe('plain');
    expect(entryTags('plain')).toEqual([]);
  });

  it('reads tagged entries', () => {
    expect(entryText({ text: 'tagged', tags: ['a'] })).toBe('tagged');
    expect(entryTags({ text: 'tagged', tags: ['a'] })).toEqual(['a']);
  });
});

describe('pickFrom', () => {
  it('never overruns the end of the table', () => {
    expect(pickFrom(['a', 'b', 'c'], () => 0.999999)).toBe('c');
    expect(pickFrom(['a', 'b', 'c'], () => 1)).toBe('c');
    expect(pickFrom(['a', 'b', 'c'], () => 0)).toBe('a');
  });

  it('throws on an empty table rather than returning undefined', () => {
    expect(() => pickFrom([], Math.random)).toThrow();
  });
});

describe('fieldVariety', () => {
  it('counts table entries', () => {
    expect(fieldVariety(colour)).toBe(4);
  });

  it('multiplies composite parts', () => {
    expect(fieldVariety(name)).toBe(4);
  });
});

describe('RecentMemory', () => {
  it('keeps only the configured number of values, most recent first', () => {
    const memory = new RecentMemory(2);
    memory.remember('k', 'one');
    memory.remember('k', 'two');
    memory.remember('k', 'three');
    expect(memory.recent('k')).toEqual(['three', 'two']);
  });

  it('does not duplicate a repeated value', () => {
    const memory = new RecentMemory(3);
    memory.remember('k', 'one');
    memory.remember('k', 'two');
    memory.remember('k', 'one');
    expect(memory.recent('k')).toEqual(['one', 'two']);
  });

  it('stores nothing when the limit is zero', () => {
    const memory = new RecentMemory(0);
    memory.remember('k', 'one');
    expect(memory.recent('k')).toEqual([]);
  });
});

describe('drawField', () => {
  it('avoids a recently used value when an alternative exists', () => {
    const memory = new RecentMemory(1);
    const first = drawField(colour, { memory });
    const second = drawField(colour, { memory });
    expect(second.text).not.toBe(first.text);
  });

  it('still returns a value when every option is recent', () => {
    const single: FieldDefinition = {
      key: 'only',
      label: 'Only',
      source: { kind: 'table', entries: ['sole'] },
    };
    const memory = new RecentMemory(4);
    expect(drawField(single, { memory }).text).toBe('sole');
    expect(drawField(single, { memory }).text).toBe('sole');
  });

  it('joins composite parts', () => {
    const value = drawField(name, { rng: sequence([0, 0]) });
    expect(value.text).toBe('Ash Venn');
  });
});

describe('generate', () => {
  it('fills every field', () => {
    const result = generate(definition);
    for (const field of definition.fields) {
      expect(result[field.key]?.text.length).toBeGreaterThan(0);
    }
  });

  it('respects exclusive tag groups across a result', () => {
    for (let run = 0; run < 200; run += 1) {
      const result = generate(definition);
      const tagged = definition.fields.filter((field) =>
        (result[field.key]?.tags ?? []).some((tag) => tag.startsWith('volume:')),
      );
      expect(tagged.length).toBeLessThanOrEqual(1);
    }
  });

  it('keeps locked fields and redraws the rest', () => {
    const memory = new RecentMemory(definition.recentMemory);
    const first = generate(definition, { memory });
    const second = generate(definition, {
      memory,
      locked: ['name'],
      previous: first,
    });
    expect(second['name']?.text).toBe(first['name']?.text);
  });

  it('keeps every field when they are all locked', () => {
    const first = generate(definition);
    const second = generate(definition, {
      locked: definition.fields.map((field) => field.key),
      previous: first,
    });
    expect(second).toEqual(first);
  });

  it('ignores a lock when there is no previous result to carry', () => {
    const result = generate(definition, { locked: ['name'] });
    expect(result['name']?.text).toBeTruthy();
  });

  it('changes unlocked fields over repeated runs', () => {
    const memory = new RecentMemory(definition.recentMemory);
    const first = generate(definition, { memory });
    const second = generate(definition, { memory, locked: ['name'], previous: first });
    expect(second['colour']?.text).not.toBe(first['colour']?.text);
  });
});

describe('rerollField', () => {
  it('changes only the named field', () => {
    const memory = new RecentMemory(definition.recentMemory);
    const first = generate(definition, { memory });
    const second = rerollField(definition, first, 'colour', { memory });
    expect(second['colour']?.text).not.toBe(first['colour']?.text);
    expect(second['name']).toEqual(first['name']);
    expect(second['volume']).toEqual(first['volume']);
    expect(second['manner']).toEqual(first['manner']);
  });

  it('returns the result untouched for an unknown key', () => {
    const first = generate(definition);
    expect(rerollField(definition, first, 'nonexistent')).toBe(first);
  });

  it('does not reintroduce a tag conflict with the other fields', () => {
    for (let run = 0; run < 200; run += 1) {
      const first = generate(definition);
      const next = rerollField(definition, first, 'manner');
      const tagged = definition.fields.filter((field) =>
        (next[field.key]?.tags ?? []).some((tag) => tag.startsWith('volume:')),
      );
      expect(tagged.length).toBeLessThanOrEqual(1);
    }
  });
});

describe('formatting', () => {
  it('renders plain text with one labelled line per field', () => {
    const result = generate(definition);
    const text = formatAsText(definition, result);
    const lines = text.split('\n');
    expect(lines[0]).toBe('TEST');
    expect(lines).toHaveLength(definition.fields.length + 1);
    expect(lines[2]).toBe(`Colour: ${result['colour']?.text}`);
  });

  it('renders Markdown with the first field as the heading', () => {
    const result = generate(definition);
    const markdown = formatAsMarkdown(definition, result);
    expect(markdown.startsWith(`### ${result['name']?.text}`)).toBe(true);
    expect(markdown).toContain(`- **Colour:** ${result['colour']?.text}`);
    expect(markdown).not.toContain('- **Name:**');
  });
});
