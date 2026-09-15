/**
 * Original line icons drawn for EncounterSmith, following the motif list in the
 * brand guide (d20, quill, pen nib, map, tavern mug, smithing tools, compass,
 * journal, anvil). Every shape here was authored for this project.
 *
 * All icons share a 24x24 viewBox and are stroked with currentColor, so they
 * inherit text colour and scale cleanly. No emoji are used anywhere in the
 * interface.
 */

export type IconShape =
  | { readonly type: 'path'; readonly d: string }
  | { readonly type: 'circle'; readonly cx: number; readonly cy: number; readonly r: number }
  | {
      readonly type: 'line';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
    };

export const icons = {
  d20: [
    { type: 'path', d: 'M12 1.8 21 7v10l-9 5.2L3 17V7Z' },
    { type: 'path', d: 'M12 1.8 18.4 13H5.6Z' },
    { type: 'path', d: 'M5.6 13 12 22.2 18.4 13' },
    { type: 'line', x1: 3, y1: 7, x2: 5.6, y2: 13 },
    { type: 'line', x1: 21, y1: 7, x2: 18.4, y2: 13 },
  ],
  quill: [
    { type: 'path', d: 'M20.5 2.5c-8 .8-13.2 5.6-15 12.4L4 21' },
    { type: 'path', d: 'M4.2 20.8 9.4 19c6.6-2.3 10.6-8.6 11.1-16.5' },
    { type: 'path', d: 'M9.4 19C11 13 14.6 8 20.5 2.5' },
    { type: 'line', x1: 4, y1: 21, x2: 1.8, y2: 22.4 },
  ],
  nib: [
    { type: 'path', d: 'M12 1.6 18.2 8 12 22.4 5.8 8Z' },
    { type: 'circle', cx: 12, cy: 9.2, r: 1.7 },
    { type: 'line', x1: 12, y1: 10.9, x2: 12, y2: 22.4 },
  ],
  map: [
    { type: 'path', d: 'M3 5.8 9 3l6 2.8L21 3v15.2L15 21l-6-2.8L3 21Z' },
    { type: 'line', x1: 9, y1: 3, x2: 9, y2: 18.2 },
    { type: 'line', x1: 15, y1: 5.8, x2: 15, y2: 21 },
    { type: 'path', d: 'm16.6 11.2 2.2 2.2m0-2.2-2.2 2.2' },
  ],
  mug: [
    { type: 'path', d: 'M4.2 8.4h11.6V19a2.4 2.4 0 0 1-2.4 2.4H6.6A2.4 2.4 0 0 1 4.2 19Z' },
    { type: 'path', d: 'M15.8 10.8h2.6a2.8 2.8 0 0 1 0 5.6h-2.6' },
    { type: 'path', d: 'M4.2 8.4c1.8-2.6 3.6.6 5.4-1.6 1.8-2.2 3.6 1.2 6.2 1.6' },
    { type: 'line', x1: 8.4, y1: 12, x2: 8.4, y2: 17.6 },
  ],
  tools: [
    { type: 'path', d: 'M3.6 20.4 13 11' },
    { type: 'path', d: 'M11.6 5.4 18.6 12.4l-2.4 2.4-7-7Z' },
    { type: 'path', d: 'M20.4 3.6 14.6 9.4' },
    { type: 'path', d: 'M4.6 3.4 9.4 8.2 7 10.6 2.2 5.8Z' },
  ],
  compass: [
    { type: 'circle', cx: 12, cy: 12, r: 9.2 },
    { type: 'path', d: 'M12 4.4 13.5 10.5 19.6 12 13.5 13.5 12 19.6 10.5 13.5 4.4 12 10.5 10.5Z' },
  ],
  journal: [
    { type: 'path', d: 'M6 2.6h12.4a1 1 0 0 1 1 1v16.8a1 1 0 0 1-1 1H6a2.4 2.4 0 0 1-2.4-2.4V5A2.4 2.4 0 0 1 6 2.6Z' },
    { type: 'line', x1: 7.4, y1: 2.6, x2: 7.4, y2: 21.4 },
    { type: 'path', d: 'M19.4 10.4h2.2v3.6h-2.2' },
  ],
  anvil: [
    {
      type: 'path',
      d: 'M3 7.6h13.6l4.8 2.4-4.8 2.4h-3L12 16h4.8v4.4H7V16h3.2l1.6-3.6H6L3 10Z',
    },
  ],
  spark: [
    { type: 'path', d: 'M12 2.2 14 9.4l7.2 2-7.2 2-2 7.2-2-7.2-7.2-2 7.2-2Z' },
    { type: 'line', x1: 19.4, y1: 4.2, x2: 21.4, y2: 2.2 },
    { type: 'line', x1: 3.6, y1: 20.8, x2: 5.4, y2: 19 },
  ],
  lock: [
    { type: 'path', d: 'M6.6 10.4h10.8v10H6.6Z' },
    { type: 'path', d: 'M8.8 10.4V7.2a3.2 3.2 0 0 1 6.4 0v3.2' },
  ],
  unlock: [
    { type: 'path', d: 'M6.6 10.4h10.8v10H6.6Z' },
    { type: 'path', d: 'M8.8 10.4V7.2a3.2 3.2 0 0 1 6.2-1' },
  ],
  reroll: [
    { type: 'path', d: 'M20.4 12a8.4 8.4 0 1 1-2.6-6.1' },
    { type: 'path', d: 'M20.8 3.2v4.6h-4.6' },
  ],
  copy: [
    { type: 'path', d: 'M8.6 8.6h10.8v12.8H8.6Z' },
    { type: 'path', d: 'M15.4 8.6V3.8H4.6v12.8h4' },
  ],
  print: [
    { type: 'path', d: 'M7 8.4V3.2h10v5.2' },
    { type: 'path', d: 'M7 17.4H4.2a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h13.6a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H17' },
    { type: 'path', d: 'M7 14h10v6.8H7Z' },
  ],
  arrow: [
    { type: 'line', x1: 3.4, y1: 12, x2: 20, y2: 12 },
    { type: 'path', d: 'M14.2 6.2 20 12l-5.8 5.8' },
  ],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof icons;
