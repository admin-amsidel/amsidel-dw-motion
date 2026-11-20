/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
// The product catalogue. The ranges, products and reference sheets come from catalogue.generated.ts, which
// tools/import_catalogue.py builds from CATALOGUE/complete-catalogue; this file adds the lookups the pages use.
import { GENERATED_CATEGORIES, GENERATED_PRODUCTS, GENERATED_REFERENCES } from './catalogue.generated';

export type CategoryGroup = 'doors-windows' | 'doors';

/** A product range as the import script writes it. */
export interface CatalogueCategory {
  slug: string;
  name: string;
  short: string;
  group: CategoryGroup;
  tagline: string;
  description: string;
  features: string[];
  applications: string[];
  /** Small image for menus and lists (the range's first product). */
  thumb: string;
  /** Wide room-setting photo for the page banner and the range showcase. */
  banner: string;
}

/** A product (or a reference sheet) as the import script writes it. */
export interface CatalogueItem {
  slug: string;
  /** Amsidel product code, e.g. "ST-027". The only code customers see. */
  code: string;
  name: string;
  category: string;
  /** Section within the range, e.g. "Series 24" or "WPC doors". */
  sub: string;
  /** Full-resolution photo (product page, zoom). */
  image: string;
  /** Lighter copy (about 600 px) for grids, menus and the chat. */
  thumb: string;
  /** Full image size in px, so the layout can reserve the right space. */
  w: number;
  h: number;
  /** Label and value rows (size, type, material, …). Products only. */
  details?: [string, string][];
}

export type Category = CatalogueCategory & { cover: string };

export interface Product extends CatalogueItem {
  /** Same as `code`; kept for older templates. */
  model: string;
  details: [string, string][];
}

/** A section of a range with its products, in catalogue order. */
export interface Section {
  name: string;
  products: Product[];
}

export const CATEGORIES: Category[] = GENERATED_CATEGORIES.map((c) => ({ ...c, cover: c.banner }));

export const PRODUCTS: Product[] = GENERATED_PRODUCTS.map((p) => ({ ...p, model: p.code, details: p.details ?? [] }));

/** Colour cards, profile drawings, glass designs and spec sheets: shown on the range pages, not as products. */
export const REFERENCES: CatalogueItem[] = GENERATED_REFERENCES;

/** Ranges that were renamed or folded into another one, so old links keep working. */
const RENAMED: Record<string, string> = { fibre: 'frp', abs: 'upvc', safety: 'steel', wood: 'designer' };

const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));
const productBySlugMap = new Map(PRODUCTS.map((p) => [p.slug, p]));
const productByCodeMap = new Map(PRODUCTS.map((p) => [p.code, p]));

export function categoryBySlug(slug: string | null | undefined): Category | undefined {
  return slug ? (bySlug.get(slug) ?? bySlug.get(RENAMED[slug] ?? '')) : undefined;
}

export function productsIn(slug: string): Product[] {
  return PRODUCTS.filter((p) => p.category === slug);
}

export function referencesIn(slug: string): CatalogueItem[] {
  return REFERENCES.filter((r) => r.category === slug);
}

export function productBySlug(slug: string | null | undefined): Product | undefined {
  return slug ? productBySlugMap.get(slug) : undefined;
}

/** "st-27", "ST 027", "st027" -> the ST-027 product. */
export function productByCode(code: string): Product | undefined {
  const m = code.trim().toUpperCase().match(/^([A-Z]{2})\s*-?\s*(\d{1,3})$/);
  return m ? productByCodeMap.get(`${m[1]}-${m[2].padStart(3, '0')}`) : undefined;
}

/** The sections of a range, in catalogue order. */
export function sectionsIn(slug: string): Section[] {
  const out = new Map<string, Product[]>();
  for (const p of productsIn(slug)) {
    if (!out.has(p.sub)) out.set(p.sub, []);
    out.get(p.sub)!.push(p);
  }
  return [...out].map(([name, products]) => ({ name, products }));
}

/** Code prefix (UP, AL, WP, ST, …) -> range slug. */
export const CODE_PREFIX = new Map(PRODUCTS.map((p) => [p.code.slice(0, 2), p.category]));

/** Lower-case text a search box matches against. */
export function searchText(p: Product): string {
  return [p.code, p.name, p.sub, bySlug.get(p.category)?.name ?? '', ...p.details.map(([, v]) => v)].join(' ').toLowerCase();
}
