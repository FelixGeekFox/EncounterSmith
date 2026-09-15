import { describe, expect, it } from 'vitest';
import {
  Forge,
  asMarkdown,
  asPlainText,
  isComplete,
  lockedCount,
  namespaceOf,
  tagsFit,
  tagsOf,
  textOf,
  variety,
  type FieldDef,
  type GeneratorDef,
  type Roll,
} from '@/scripts/generator';

/** A deterministic stand-in for Math.random that walks a fixed sequence. */
function sequence(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

const name: FieldDef = {
  id: 'name',
  label: 'Name',
  source: { kind: 'assembled', parts: [['Ash', 'Bram'], ['Venn', 'Crowe']] },
};

const colour: FieldDef = {
  id: 'colour',
  label: 'Colour',
  source: { kind: 'table', entries: ['red', 'green', 'blue', 'amber', 'slate'] },
};

/** Every entry is tagged, so the agreement rule has to bite. */
const ground: FieldDef = {
  id: 'ground',
  label: 'Ground',
  source: {
    kind: 'table',
    entries: [
      { text: 'a flooded ford', tags: ['ground:water'] },
      { text: 'a low cellar', tags: ['ground:below'] },
    ],
  },
};

const footing: FieldDef = {
  id: 'footing',
  label: 'Footing',
  source: {
    kind: 'table',
    entries: [
      { text: 'loose stepping stones', tags: ['ground:water'] },
      { text: 'a dripping stair', tags: ['ground:below'] },
      'churned mud',
    ],
  },
};

const twistA: FieldDef = {
  id: 'twistA',
  label: 'Twist A',
  source: {
    kind: 'table',
    entries: [
      { text: 'somebody is protecting a child', tags: ['turn:protector'] },
      { text: 'a hostage has been taken', tags: ['turn:hostage'] },
    ],
  },
};

const twistB: FieldDef = {
  id: 'twistB',
  label: 'Twist B',
  source: {
    kind: 'table',
    entries: [
      { text: 'the hostage stops cooperating', tags: ['turn:hostage'] },
      { text: 'the beast steps between them', tags: ['turn:protector'] },
      'the weather turns',
    ],
  },
};

const def: GeneratorDef = {
  id: 'test',
  noun: 'Test',
  nounInline: 'test',
  memory: 2,
  tagRules: { agree: ['ground'], unique: ['turn'] },
  fields: [name, colour, ground, footing, twistA, twistB],
};

function valueOf(roll: Roll, id: string): string {
  return roll.find((slot) => slot.id === id)?.value ?? '';
}

function tagsIn(roll: Roll, namespace: string): string[] {
  return roll.flatMap((slot) => slot.tags.filter((tag) => namespaceOf(tag) === namespace));
}

describe('entry helpers', () => {
  it('reads plain strings', () => {
    expect(textOf('plain')).toBe('plain');
    expect(tagsOf('plain')).toEqual([]);
  });

  it('reads tagged entries', () => {
    expect(textOf({ text: 'tagged', tags: ['a:b'] })).toBe('tagged');
    expect(tagsOf({ text: 'tagged', tags: ['a:b'] })).toEqual(['a:b']);
  });

  it('splits a tag namespace from its value', () => {
    expect(namespaceOf('ground:water')).toBe('ground');
    expect(namespaceOf('bare')).toBe('bare');
  });
});

describe('variety', () => {
  it('counts table entries', () => {
    expect(variety(colour)).toBe(5);
  });

  it('multiplies assembled parts', () => {
    expect(variety(name)).toBe(4);
  });
});

describe('tagsFit', () => {
  const rules = { agree: ['ground'], unique: ['turn'] };

  it('allows an untagged candidate through anything', () => {
    expect(tagsFit([], ['ground:water'], rules)).toBe(true);
  });

  it('allows a matching value in an agreeing namespace', () => {
    expect(tagsFit(['ground:water'], ['ground:water'], rules)).toBe(true);
  });

  it('rejects a clashing value in an agreeing namespace', () => {
    expect(tagsFit(['ground:below'], ['ground:water'], rules)).toBe(false);
  });

  it('rejects a second appearance in a unique namespace, even the same value', () => {
    expect(tagsFit(['turn:hostage'], ['turn:hostage'], rules)).toBe(false);
    expect(tagsFit(['turn:protector'], ['turn:hostage'], rules)).toBe(false);
  });

  it('ignores namespaces the rules do not mention', () => {
    expect(tagsFit(['mood:grim'], ['mood:warm'], rules)).toBe(true);
  });
});

describe('Forge.empty', () => {
  it('returns one unlocked, unfilled slot per field', () => {
    const roll = new Forge(def).empty();
    expect(roll).toHaveLength(def.fields.length);
    expect(roll.every((slot) => slot.value === '' && !slot.locked)).toBe(true);
    expect(isComplete(roll)).toBe(false);
  });
});

describe('Forge.roll', () => {
  it('fills every slot', () => {
    const roll = new Forge(def).roll();
    expect(isComplete(roll)).toBe(true);
    expect(roll.map((slot) => slot.label)).toEqual(def.fields.map((field) => field.label));
  });

  it('keeps the ground consistent across a roll, every time', () => {
    const forge = new Forge(def);
    for (let run = 0; run < 250; run += 1) {
      const values = new Set(tagsIn(forge.roll(), 'ground'));
      expect(values.size).toBeLessThanOrEqual(1);
    }
  });

  it('never repeats a unique namespace in one roll', () => {
    const forge = new Forge(def);
    for (let run = 0; run < 250; run += 1) {
      expect(tagsIn(forge.roll(), 'turn')).toHaveLength(1);
    }
  });

  it('is deterministic for a given random sequence', () => {
    const a = new Forge(def, { rng: sequence([0.1, 0.4, 0.7]) }).roll();
    const b = new Forge(def, { rng: sequence([0.1, 0.4, 0.7]) }).roll();
    expect(a.map((slot) => slot.value)).toEqual(b.map((slot) => slot.value));
  });

  it('holds back recently used values while alternatives remain', () => {
    const forge = new Forge(def);
    const first = forge.roll();
    const second = forge.roll(first);
    expect(valueOf(second, 'colour')).not.toBe(valueOf(first, 'colour'));
  });
});

describe('locking', () => {
  it('flips a single lock and leaves the rest alone', () => {
    const forge = new Forge(def);
    const rolled = forge.roll();
    const locked = Forge.setLock(rolled, 'name', true);
    expect(lockedCount(locked)).toBe(1);
    expect(locked.find((slot) => slot.id === 'name')?.locked).toBe(true);
    expect(locked.find((slot) => slot.id === 'colour')?.locked).toBe(false);
  });

  it('keeps a locked slot through a full regenerate', () => {
    const forge = new Forge(def);
    let roll = forge.roll();
    roll = Forge.setLock(roll, 'name', true);
    const pinned = valueOf(roll, 'name');
    for (let run = 0; run < 25; run += 1) {
      roll = forge.roll(roll);
      expect(valueOf(roll, 'name')).toBe(pinned);
    }
  });

  it('still moves the unlocked slots while one is locked', () => {
    const forge = new Forge(def);
    let roll = forge.roll();
    roll = Forge.setLock(roll, 'name', true);
    const before = valueOf(roll, 'colour');
    roll = forge.roll(roll);
    expect(valueOf(roll, 'colour')).not.toBe(before);
  });

  it('keeps everything when every slot is locked', () => {
    const forge = new Forge(def);
    let roll = forge.roll();
    for (const slot of roll) roll = Forge.setLock(roll, slot.id, true);
    expect(forge.roll(roll)).toEqual(roll);
  });

  it('honours a locked slot that carries tags when redrawing the rest', () => {
    const forge = new Forge(def);
    for (let run = 0; run < 150; run += 1) {
      let roll = forge.roll();
      roll = Forge.setLock(roll, 'ground', true);
      roll = forge.roll(roll);
      expect(new Set(tagsIn(roll, 'ground')).size).toBeLessThanOrEqual(1);
    }
  });

  it('ignores a lock on a slot that has no value yet', () => {
    const forge = new Forge(def);
    const blank = Forge.setLock(forge.empty(), 'name', true);
    expect(isComplete(forge.roll(blank))).toBe(true);
  });

  it('unlocking releases the slot again', () => {
    const forge = new Forge(def);
    let roll = Forge.setLock(forge.roll(), 'colour', true);
    const pinned = valueOf(roll, 'colour');
    roll = forge.roll(roll);
    expect(valueOf(roll, 'colour')).toBe(pinned);
    roll = Forge.setLock(roll, 'colour', false);
    roll = forge.roll(roll);
    expect(valueOf(roll, 'colour')).not.toBe(pinned);
  });
});

describe('Forge.reroll', () => {
  it('changes only the named slot', () => {
    const forge = new Forge(def);
    const before = forge.roll();
    const after = forge.reroll(before, 'colour');
    expect(valueOf(after, 'colour')).not.toBe(valueOf(before, 'colour'));
    for (const id of ['name', 'ground', 'footing', 'twistA', 'twistB']) {
      expect(valueOf(after, id)).toBe(valueOf(before, id));
    }
  });

  it('returns the roll untouched for an unknown id', () => {
    const forge = new Forge(def);
    const roll = forge.roll();
    expect(forge.reroll(roll, 'nope')).toBe(roll);
  });

  it('preserves the slot lock state it found', () => {
    const forge = new Forge(def);
    const roll = Forge.setLock(forge.roll(), 'colour', true);
    expect(forge.reroll(roll, 'colour').find((slot) => slot.id === 'colour')?.locked).toBe(true);
  });

  it('does not break the tag rules when rerolling one slot', () => {
    const forge = new Forge(def);
    for (let run = 0; run < 250; run += 1) {
      const rolled = forge.reroll(forge.roll(), 'footing');
      expect(new Set(tagsIn(rolled, 'ground')).size).toBeLessThanOrEqual(1);
    }
  });
});

describe('formatting', () => {
  it('writes plain text with one labelled line per slot', () => {
    const roll = new Forge(def).roll();
    const lines = asPlainText(def, roll).split('\n');
    expect(lines[0]).toBe('TEST');
    expect(lines).toHaveLength(def.fields.length + 1);
    expect(lines[2]).toBe(`Colour: ${valueOf(roll, 'colour')}`);
  });

  it('writes Markdown with the first slot as the heading', () => {
    const roll = new Forge(def).roll();
    const md = asMarkdown(def, roll);
    expect(md.startsWith(`### ${valueOf(roll, 'name')}`)).toBe(true);
    expect(md).toContain(`- **Colour:** ${valueOf(roll, 'colour')}`);
    expect(md).not.toContain('- **Name:**');
  });

  it('writes nothing for an empty roll', () => {
    expect(asMarkdown(def, new Forge(def).empty())).toBe('');
  });
});
