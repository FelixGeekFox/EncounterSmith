/**
 * The forge: the random-table engine behind all three generators.
 *
 * It touches no DOM, so it can be unit tested directly. The browser wiring
 * lives in `generator-ui.ts`.
 *
 * Two ideas do the work:
 *
 *  - A roll is an ordered list of slots. Locks live on the slot, so a roll is
 *    the complete state of the panel and can be passed around whole.
 *  - Entries carry `namespace:value` tags, and a definition declares how each
 *    namespace behaves across one roll. `agree` namespaces must match wherever
 *    they appear, which is how an underground situation ends up with
 *    underground terrain. `unique` namespaces may appear once, which stops two
 *    slots making the same point twice.
 */

export type Rng = () => number;

export interface TableEntry {
  readonly text: string;
  /** Tags of the form `namespace:value`, e.g. `setting:water`. */
  readonly tags?: readonly string[];
}

export type Entry = string | TableEntry;

export type FieldSource =
  | { readonly kind: 'table'; readonly entries: readonly Entry[] }
  /** One pick from each part, joined. Used for names, where a flat list would
   *  run out of variety long before a session does. */
  | { readonly kind: 'assembled'; readonly parts: readonly (readonly string[])[]; readonly joiner?: string };

export interface FieldDef {
  readonly id: string;
  readonly label: string;
  /** One short line of table-side advice, shown under the label. */
  readonly help?: string;
  readonly source: FieldSource;
}

export interface TagRules {
  /** Namespaces whose value must match wherever it appears in a roll. */
  readonly agree?: readonly string[];
  /** Namespaces that may be carried by at most one slot in a roll. */
  readonly unique?: readonly string[];
}

export interface GeneratorDef {
  readonly id: string;
  /** Singular, as it reads in a heading: "NPC", "Encounter". */
  readonly noun: string;
  /** The same noun mid-sentence: "NPC" stays, "Encounter" lowercases. */
  readonly nounInline: string;
  readonly fields: readonly FieldDef[];
  /** How many recent values per field to hold back. Keep it below the
   *  smallest table, or the generator runs out of room to avoid a repeat. */
  readonly memory: number;
  readonly tagRules?: TagRules;
}

export interface Slot {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tags: readonly string[];
  readonly locked: boolean;
}

export type Roll = readonly Slot[];

/* -------------------------------------------------------------------------- */

export function textOf(entry: Entry): string {
  return typeof entry === 'string' ? entry : entry.text;
}

export function tagsOf(entry: Entry): readonly string[] {
  return typeof entry === 'string' ? [] : (entry.tags ?? []);
}

export function namespaceOf(tag: string): string {
  const cut = tag.indexOf(':');
  return cut === -1 ? tag : tag.slice(0, cut);
}

/** Total distinct outputs a field can produce. */
export function variety(field: FieldDef): number {
  return field.source.kind === 'assembled'
    ? field.source.parts.reduce((total, part) => total * part.length, 1)
    : field.source.entries.length;
}

function choose<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('Cannot choose from an empty list.');
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index] as T;
}

/** Tags already committed by the slots that are staying put. */
function committedTags(slots: readonly Slot[]): readonly string[] {
  return slots.flatMap((slot) => slot.tags);
}

/**
 * Decides whether a candidate's tags sit comfortably with the tags already in
 * the roll. Any namespace not named in the rules is ignored entirely, so most
 * entries need no tags at all.
 */
export function tagsFit(
  candidate: readonly string[],
  committed: readonly string[],
  rules: TagRules | undefined,
): boolean {
  if (!rules || candidate.length === 0) return true;
  const agree = rules.agree ?? [];
  const unique = rules.unique ?? [];

  for (const tag of candidate) {
    const ns = namespaceOf(tag);
    if (agree.includes(ns)) {
      const conflicting = committed.some((other) => namespaceOf(other) === ns && other !== tag);
      if (conflicting) return false;
    }
    if (unique.includes(ns)) {
      const taken = committed.some((other) => namespaceOf(other) === ns);
      if (taken) return false;
    }
  }
  return true;
}

/* -------------------------------------------------------------------------- */

/**
 * Holds the short per-field history that keeps a generator from serving the
 * same line twice in a row.
 */
class History {
  readonly #depth: number;
  readonly #seen = new Map<string, string[]>();

  constructor(depth: number) {
    this.#depth = Math.max(0, depth);
  }

  recent(fieldId: string): readonly string[] {
    return this.#seen.get(fieldId) ?? [];
  }

  record(fieldId: string, value: string): void {
    if (this.#depth === 0) return;
    const previous = this.#seen.get(fieldId) ?? [];
    this.#seen.set(fieldId, [value, ...previous.filter((item) => item !== value)].slice(0, this.#depth));
  }
}

export interface ForgeOptions {
  readonly rng?: Rng;
}

export class Forge {
  readonly def: GeneratorDef;
  readonly #rng: Rng;
  readonly #history: History;

  constructor(def: GeneratorDef, options: ForgeOptions = {}) {
    this.def = def;
    this.#rng = options.rng ?? Math.random;
    this.#history = new History(def.memory);
  }

  /** The panel before anything has been rolled: labels, but no values. */
  empty(): Roll {
    return this.def.fields.map((field) => ({
      id: field.id,
      label: field.label,
      value: '',
      tags: [],
      locked: false,
    }));
  }

  /**
   * Rolls every unlocked slot. Locked slots keep their value, and their tags
   * still constrain what the rest of the roll may draw.
   */
  roll(previous?: Roll): Roll {
    const held = new Map<string, Slot>();
    for (const slot of previous ?? []) {
      if (slot.locked && slot.value !== '') held.set(slot.id, slot);
    }

    const result: Slot[] = [];
    for (const field of this.def.fields) {
      const kept = held.get(field.id);
      if (kept) {
        result.push(kept);
        continue;
      }
      result.push(this.#draw(field, result, false));
    }
    return result;
  }

  /** Rolls one slot, leaving every other slot exactly as it was. */
  reroll(previous: Roll, fieldId: string): Roll {
    const field = this.def.fields.find((candidate) => candidate.id === fieldId);
    if (!field) return previous;
    const others = previous.filter((slot) => slot.id !== fieldId && slot.value !== '');
    const current = previous.find((slot) => slot.id === fieldId);
    const fresh = this.#draw(field, others, current?.locked ?? false);
    return previous.map((slot) => (slot.id === fieldId ? fresh : slot));
  }

  /** Returns a new roll with one slot's lock flipped. */
  static setLock(roll: Roll, fieldId: string, locked: boolean): Roll {
    return roll.map((slot) => (slot.id === fieldId ? { ...slot, locked } : slot));
  }

  #draw(field: FieldDef, siblings: readonly Slot[], locked: boolean): Slot {
    const committed = committedTags(siblings);
    const recent = this.#history.recent(field.id);
    let value: string;
    let tags: readonly string[] = [];

    if (field.source.kind === 'assembled') {
      const { parts, joiner = ' ' } = field.source;
      const attempts = Math.min(24, Math.max(6, variety(field)));
      value = parts.map((part) => choose(part, this.#rng)).join(joiner);
      for (let i = 0; i < attempts && recent.includes(value); i += 1) {
        value = parts.map((part) => choose(part, this.#rng)).join(joiner);
      }
    } else {
      const all = field.source.entries.map((entry) => ({
        text: textOf(entry),
        tags: tagsOf(entry),
      }));
      // Tag fit is a hard rule wherever the table can satisfy it; only a table
      // with nothing compatible at all falls back to the full list.
      const fitting = all.filter((item) => tagsFit(item.tags, committed, this.def.tagRules));
      const pool = fitting.length > 0 ? fitting : all;
      // Avoiding a recent repeat is the softer preference, applied inside it.
      const fresh = pool.filter((item) => !recent.includes(item.text));
      const picked = choose(fresh.length > 0 ? fresh : pool, this.#rng);
      value = picked.text;
      tags = picked.tags;
    }

    this.#history.record(field.id, value);
    return { id: field.id, label: field.label, value, tags, locked };
  }
}

/* -------------------------------------------------------------------------- */

export function isComplete(roll: Roll): boolean {
  return roll.length > 0 && roll.every((slot) => slot.value !== '');
}

export function lockedCount(roll: Roll): number {
  return roll.filter((slot) => slot.locked).length;
}

export function asPlainText(def: GeneratorDef, roll: Roll): string {
  const lines = roll.filter((slot) => slot.value !== '').map((slot) => `${slot.label}: ${slot.value}`);
  return [def.noun.toUpperCase(), ...lines].join('\n');
}

export function asMarkdown(def: GeneratorDef, roll: Roll): string {
  const filled = roll.filter((slot) => slot.value !== '');
  const [first, ...rest] = filled;
  if (!first) return '';
  const body = rest.map((slot) => `- **${slot.label}:** ${slot.value}`);
  // The kicker keeps the kind of thing obvious once it is pasted into a page
  // of notes next to forty other headings.
  return [`### ${first.value}`, `*${def.noun}*`, '', ...body, ''].join('\n');
}
