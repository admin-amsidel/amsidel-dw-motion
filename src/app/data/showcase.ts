/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
// The 3D landing showcase on the home page: one lead unit per range (plus a matching window or door where we
// have one), drawn as real-time 3D slabs. Textures are flat front elevations in public/images/showcase.
// Adding a unit = one entry here; the rest of each range's content comes from the catalogue (products.ts).
import { CATEGORIES, Category, Product, productsIn } from './products';

/** How a unit opens when you scroll: a hinged leaf swings toward you; a sliding sash glides behind its neighbour. */
export type Opening = 'hinged' | 'sliding';

export interface ShowcaseUnit {
  id: string;
  name: string;
  kind: 'door' | 'window';
  opening: Opening;
  /** Hinge side for hinged leaves (the side away from the handle). */
  hinge?: 'left' | 'right';
  /** Flat front elevation, frame included. */
  img: string;
  /** Height / width of the image. */
  aspect: number;
  /** The moving part inside the frame, as fractions of the image: [left, top, right, bottom]. */
  leaf: [number, number, number, number];
  /** Sliding windows: number of sashes the leaf area splits into (the last one slides). */
  panels?: number;
}

export interface ShowcaseRange {
  slug: string;
  /** Background of the hero when this range is centred, and of its module. */
  colour: string;
  lead: ShowcaseUnit;
  /** A second, smaller unit shown beside the lead in the module (desktop). */
  partner?: ShowcaseUnit;
}

const door = (id: string, name: string, aspect: number, leaf: ShowcaseUnit['leaf'], hinge: 'left' | 'right' = 'left'): ShowcaseUnit => ({
  id, name, kind: 'door', opening: 'hinged', hinge, img: `images/showcase/${id}.webp`, aspect, leaf,
});
const win = (id: string, name: string, aspect: number, leaf: ShowcaseUnit['leaf'], panels = 2): ShowcaseUnit => ({
  id, name, kind: 'window', opening: 'sliding', img: `images/showcase/${id}.webp`, aspect, leaf, panels,
});

export const SHOWCASE: ShowcaseRange[] = [
  {
    slug: 'upvc', colour: '#c9d3d6',
    lead: win('upvc', 'Sliding Window', 1.254, [0.07, 0.06, 0.93, 0.93]),
    partner: door('upvc-door', 'Panel Door', 2.057, [0.11, 0.05, 0.88, 0.995]),
  },
  {
    slug: 'aluminium', colour: '#a6aeb7',
    lead: win('aluminium', '3-Track Slider', 1.056, [0.045, 0.05, 0.955, 0.95], 3),
    partner: door('aluminium-door', 'Glass Door', 2.049, [0.08, 0.05, 0.9, 0.995]),
  },
  {
    slug: 'wpc', colour: '#c2a383',
    lead: door('wpc', 'Grooved WPC Door', 2.049, [0.08, 0.05, 0.91, 0.995]),
    partner: win('wpc-window', 'WPC Window', 1.228, [0.05, 0.05, 0.95, 0.95]),
  },
  {
    slug: 'steel', colour: '#8f99a3',
    lead: door('steel', 'Steel Entrance Door', 2.011, [0.065, 0.05, 0.92, 0.995]),
    partner: win('steel-window', 'Steel Window', 1.176, [0.05, 0.07, 0.95, 0.93]),
  },
  { slug: 'membrane', colour: '#d8c3a5', lead: door('membrane', 'Arch Panel Door', 1.913, [0.08, 0.05, 0.92, 0.995], 'right') },
  { slug: 'laminated', colour: '#aebda9', lead: door('laminated', 'Grooved Laminate Door', 1.922, [0.09, 0.05, 0.9, 0.995], 'right') },
  {
    slug: 'skin', colour: '#c9ae90',
    lead: door('skin', 'Oak Skin Door', 2.094, [0.1, 0.05, 0.9, 0.995]),
    partner: win('skin-window', 'Matching Window', 1.187, [0.05, 0.05, 0.95, 0.95]),
  },
  {
    slug: 'frp', colour: '#a8b9c8',
    lead: door('frp', 'Wave FRP Door', 2.059, [0.09, 0.05, 0.89, 0.995]),
    partner: win('frp-window', 'Frosted Window', 1.112, [0.05, 0.05, 0.95, 0.95]),
  },
  { slug: 'designer', colour: '#b08566', lead: door('designer', 'Chevron Designer Door', 1.911, [0.09, 0.05, 0.91, 0.995], 'right') },
];

/** A showcase range joined with its catalogue range. */
export interface ShowcaseView extends ShowcaseRange {
  cat: Category;
  num: string;
  count: number;
  /** Three short selling points, one per scroll step. */
  points: string[];
  products: Product[];
}

export const SHOWCASE_VIEWS: ShowcaseView[] = SHOWCASE.flatMap((s, i) => {
  const cat = CATEGORIES.find((c) => c.slug === s.slug);
  if (!cat) return [];
  const all = productsIn(s.slug);
  return [{ ...s, cat, num: String(i + 1).padStart(2, '0'), count: all.length, points: cat.features.slice(0, 3), products: all.slice(0, 6) }];
});

/** Brand charcoal: text on every range colour. */
export const INK = '#1e1e21';
