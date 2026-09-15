/**
 * Metadata for the three free generators.
 *
 * Deliberately separate from the random tables themselves, so a listing page
 * can describe every tool without pulling three sets of tables into the
 * browser bundle.
 */
export interface Tool {
  readonly slug: string;
  readonly name: string;
  readonly href: string;
  /** One line for cards and cross-links. */
  readonly summary: string;
  /** Exactly what the tool produces, for the tools index. */
  readonly produces: string;
  readonly fields: readonly string[];
  readonly metaTitle: string;
  readonly metaDescription: string;
  /** Appears under the page title on the generator page. */
  readonly lede: string;
}

export const tools: readonly Tool[] = [
  {
    slug: 'npc-generator',
    name: 'NPC Generator',
    href: '/tools/npc-generator',
    summary: 'A person with a name, a want, a pressure, and one thing they are not saying.',
    produces:
      'A whole non-player character: name, role, first impression, mannerism, want, pressure, secret, connection to the story and a voice you can hold.',
    fields: [
      'Name',
      'Role',
      'First impression',
      'Mannerism',
      'Want',
      'Fear or pressure',
      'Secret',
      'Connection to the story',
      'Voice cue',
    ],
    metaTitle: 'NPC Generator — names, wants, secrets and voices',
    metaDescription:
      'Generate an original tabletop RPG NPC in one press: name, role, mannerism, want, pressure, secret, story connection and a voice cue. Free, no account, works in any fantasy system.',
    lede: 'A whole person in one press: a name worth saying aloud, a job, a habit, something they want, something pressing on them, and one thing they are not telling you.',
  },
  {
    slug: 'encounter-generator',
    name: 'Encounter Generator',
    href: '/tools/encounter-generator',
    summary: 'A scene with an objective, a complication, and a way through that is not a fight.',
    produces:
      'A scene you can run: the situation, the objective, a complication, a terrain feature, an escalation, a non-combat approach, the reward, and what happens if the party walks away.',
    fields: [
      'Situation',
      'Objective',
      'Complication',
      'Terrain feature',
      'Escalation',
      'Non-combat approach',
      'Reward or discovery',
      'If it is ignored',
    ],
    metaTitle: 'Encounter Generator — situations, complications and consequences',
    metaDescription:
      'Generate an original tabletop RPG encounter: situation, objective, complication, terrain, escalation, a non-combat approach, the reward and the cost of ignoring it. Free and system-friendly.',
    lede: 'A scene with a shape: what the party walks into, what winning looks like, the thing that makes it awkward, and a way through that never needed a sword.',
  },
  {
    slug: 'tavern-generator',
    name: 'Tavern Generator',
    href: '/tools/tavern-generator',
    summary: 'An inn worth stopping at, with a problem, a rumour, and something under the floor.',
    produces:
      'A working establishment: name, atmosphere, proprietor, signature dish, memorable detail, current problem, rumour, an interesting patron and a hidden feature.',
    fields: [
      'Name',
      'Atmosphere',
      'Proprietor',
      'Signature food or drink',
      'Memorable detail',
      'Current problem',
      'Rumour',
      'Interesting patron',
      'Hidden feature',
    ],
    metaTitle: 'Tavern Generator — inns, proprietors, rumours and secrets',
    metaDescription:
      'Generate an original tabletop RPG tavern: name, atmosphere, proprietor, signature dish, memorable detail, current problem, rumour, patron and hidden feature. Free and system-friendly.',
    lede: 'An inn the party will name-drop for the rest of the campaign: who runs it, what to order, what is wrong this week, and what is under the floor.',
  },
];

export function toolBySlug(slug: string): Tool {
  const found = tools.find((tool) => tool.slug === slug);
  if (!found) throw new Error(`Unknown tool: ${slug}`);
  return found;
}
