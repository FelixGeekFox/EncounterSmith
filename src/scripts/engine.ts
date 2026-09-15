/**
 * Generator engine.
 *
 * Deliberately free of DOM access so it can be unit tested in isolation. The
 * browser wiring lives in `mount.ts`.
 */

export interface TableEntry {
  readonly text: string;
  /** Optional tags used by the exclusivity rules below. */
  readonly tags?: readonly string[];
}

export type RawEntry = string | TableEntry;

export type FieldSource =
  | { readonly kind: 'table'; readonly entries: readonly RawEntry[] }
  | {
      /** Joins one pick from each part, e.g. a given name and a family name. */
      readonly kind: 'composite';
      readonly parts: readonly (readonly string[])[];
      readonly join?: string;
    };

export interface FieldDefinition {
  readonly key: string;
  readonly label: string;
  /** Short helper sentence shown under the field label. */
  readonly hint?: string;
  readonly source: FieldSource;
}

export interface GeneratorDefinition {
  readonly id: string;
  /** Plural, used in headings: "NPCs". */
  readonly label: string;
  /** Singular, used in button labels and headings: "NPC". */
  readonly noun: string;
  /**
   * The same noun as it should read mid-sentence. Not always `noun` lowercased:
   * "NPC" stays "NPC" while "Tavern" becomes "tavern".
   */
  readonly nounLower: string;
  readonly fields: readonly FieldDefinition[];
  /**
   * How many recently used values to avoid per field. Set a little below the
   * smallest table size so a generator never runs out of options.
   */
  readonly recentMemory: number;
  /**
   * Each group lists tags that are mutually exclusive within one result: at
   * most one field may carry a tag from a given group. This is what keeps a
   * softly spoken NPC from also having a parade-ground voice.
   */
  readonly exclusiveTagGroups?: readonly (readonly string[])[];
}

export type Rng = () => number;

export interface FieldValue {
  readonly text: string;
  readonly tags: readonly string[];
}

export type GeneratorResult = Readonly<Record<string, FieldValue>>;

export function entryText(entry: RawEntry): string {
  return typeof entry === 'string' ? entry : entry.text;
}

export function entryTags(entry: RawEntry): readonly string[] {
  return typeof entry === 'string' ? [] : (entry.tags ?? []);
}

/** Picks one item, throwing only if handed an empty table (a data bug). */
export function pickFrom<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty table.');
  }
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index] as T;
}

/**
 * Remembers the last few values used for each field so the same option is not
 * served twice in a row. Falls back to the full table when the exclusion list
 * would leave nothing to choose from.
 */
export class RecentMemory {
  readonly #limit: number;
  readonly #seen = new Map<string, string[]>();

  constructor(limit: number) {
    this.#limit = Math.max(0, limit);
  }

  recent(key: string): readonly string[] {
    return this.#seen.get(key) ?? [];
  }

  remember(key: string, value: string): void {
    if (this.#limit === 0) return;
    const list = this.#seen.get(key) ?? [];
    const next = [value, ...list.filter((item) => item !== value)].slice(0, this.#limit);
    this.#seen.set(key, next);
  }

  forget(key: string): void {
    this.#seen.delete(key);
  }
}

function drawComposite(
  source: Extract<FieldSource, { kind: 'composite' }>,
  rng: Rng,
): FieldValue {
  const join = source.join ?? ' ';
  const text = source.parts.map((part) => pickFrom(part, rng)).join(join);
  return { text, tags: [] };
}

/** Number of distinct values a field can produce, used to size retry budgets. */
export function fieldVariety(field: FieldDefinition): number {
  const { source } = field;
  if (source.kind === 'composite') {
    return source.parts.reduce((total, part) => total * part.length, 1);
  }
  return source.entries.length;
}

function violatesExclusivity(
  groups: readonly (readonly string[])[],
  chosen: readonly FieldValue[],
  candidate: FieldValue,
): boolean {
  if (candidate.tags.length === 0) return false;
  for (const group of groups) {
    const candidateHits = candidate.tags.some((tag) => group.includes(tag));
    if (!candidateHits) continue;
    const alreadyUsed = chosen.some((value) => value.tags.some((tag) => group.includes(tag)));
    if (alreadyUsed) return true;
  }
  return false;
}

export interface DrawOptions {
  readonly rng?: Rng;
  readonly memory?: RecentMemory;
  /** Values already fixed in this result, used for the exclusivity check. */
  readonly siblings?: readonly FieldValue[];
  readonly exclusiveTagGroups?: readonly (readonly string[])[];
}

/**
 * Draws a single field value.
 *
 * Tag conflicts are a hard rule wherever the table can satisfy it: the pool is
 * narrowed to entries that do not clash with the values already chosen, and only
 * a table with no compatible entry at all falls back to the full list. Avoiding a
 * recent repeat is a softer preference, applied within whatever pool remains.
 */
export function drawField(field: FieldDefinition, options: DrawOptions = {}): FieldValue {
  const rng = options.rng ?? Math.random;
  const memory = options.memory;
  const siblings = options.siblings ?? [];
  const groups = options.exclusiveTagGroups ?? [];
  const recent = memory ? memory.recent(field.key) : [];

  let chosen: FieldValue;

  if (field.source.kind === 'composite') {
    // Composite values carry no tags, so only the recency preference applies.
    const attempts = Math.min(24, Math.max(6, fieldVariety(field)));
    chosen = drawComposite(field.source, rng);
    for (let attempt = 0; attempt < attempts && recent.includes(chosen.text); attempt += 1) {
      chosen = drawComposite(field.source, rng);
    }
  } else {
    const all: readonly FieldValue[] = field.source.entries.map((entry) => ({
      text: entryText(entry),
      tags: entryTags(entry),
    }));
    const compatible = all.filter((value) => !violatesExclusivity(groups, siblings, value));
    const pool = compatible.length > 0 ? compatible : all;
    const fresh = pool.filter((value) => !recent.includes(value.text));
    chosen = pickFrom(fresh.length > 0 ? fresh : pool, rng);
  }

  memory?.remember(field.key, chosen.text);
  return chosen;
}

export interface GenerateOptions {
  readonly rng?: Rng;
  readonly memory?: RecentMemory;
  /** Keys whose previous value must be preserved. */
  readonly locked?: Iterable<string>;
  /** The result being replaced, used to carry locked fields across. */
  readonly previous?: GeneratorResult | undefined;
}

/**
 * Produces a full result. Locked fields keep their previous value; every other
 * field is redrawn. A lock on a field that has no previous value is ignored.
 */
export function generate(
  definition: GeneratorDefinition,
  options: GenerateOptions = {},
): GeneratorResult {
  const locked = new Set(options.locked ?? []);
  const previous = options.previous;
  const result: Record<string, FieldValue> = {};
  const chosen: FieldValue[] = [];

  for (const field of definition.fields) {
    const carried = locked.has(field.key) ? previous?.[field.key] : undefined;
    if (carried) {
      result[field.key] = carried;
      chosen.push(carried);
      continue;
    }
    const value = drawField(field, {
      rng: options.rng,
      memory: options.memory,
      siblings: chosen,
      exclusiveTagGroups: definition.exclusiveTagGroups,
    });
    result[field.key] = value;
    chosen.push(value);
  }

  return result;
}

/** Redraws exactly one field, leaving the rest of the result untouched. */
export function rerollField(
  definition: GeneratorDefinition,
  result: GeneratorResult,
  key: string,
  options: Omit<GenerateOptions, 'locked' | 'previous'> = {},
): GeneratorResult {
  const field = definition.fields.find((candidate) => candidate.key === key);
  if (!field) return result;
  const siblings = definition.fields
    .filter((candidate) => candidate.key !== key)
    .map((candidate) => result[candidate.key])
    .filter((value): value is FieldValue => value !== undefined);

  const value = drawField(field, {
    rng: options.rng,
    memory: options.memory,
    siblings,
    exclusiveTagGroups: definition.exclusiveTagGroups,
  });

  return { ...result, [key]: value };
}

export function formatAsText(definition: GeneratorDefinition, result: GeneratorResult): string {
  const lines = definition.fields
    .map((field) => {
      const value = result[field.key];
      return value ? `${field.label}: ${value.text}` : undefined;
    })
    .filter((line): line is string => line !== undefined);
  return [definition.noun.toUpperCase(), ...lines].join('\n');
}

export function formatAsMarkdown(definition: GeneratorDefinition, result: GeneratorResult): string {
  const first = definition.fields[0];
  const heading = first ? (result[first.key]?.text ?? definition.noun) : definition.noun;
  const rest = definition.fields
    .slice(1)
    .map((field) => {
      const value = result[field.key];
      return value ? `- **${field.label}:** ${value.text}` : undefined;
    })
    .filter((line): line is string => line !== undefined);
  return [`### ${heading}`, '', ...rest, ''].join('\n');
}
