/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES, PRODUCTS, searchText, sectionsIn } from '../../data/products';
import { ProductCard } from '../../shared/product-card';

/** How many cards show at first, and how many more each "Show more" adds. */
const PAGE = 36;

const INDEX = PRODUCTS.map((p) => ({ p, text: searchText(p) }));

/** All products: filter by range (`?type=`), section (`?sub=`) and a search box (`?q=`, code or name). */
@Component({
  selector: 'app-products',
  imports: [RouterLink, ProductCard],
  template: `
    <section class="page-banner" style="background-image: url('images/hero/hero-2.webp')">
      <div class="container">
        <ol class="crumbs">
          <li><a routerLink="/">Home</a></li>
          <li>Products</li>
        </ol>
        <h1>Our Products</h1>
        <p>{{ total }} designs across {{ categories.length }} product ranges. Every one can be made to your sizes and finish.</p>
      </div>
    </section>

    <section class="section">
      <div class="container layout">
        <aside class="filters" aria-label="Product ranges">
          <p class="kicker">Ranges</p>
          <ul>
            <li>
              <a routerLink="." [queryParams]="{ q: query() || null }" [class.is-active]="!type()">
                All products <span>{{ total }}</span>
              </a>
            </li>
            @for (c of categories; track c.slug) {
              <li>
                <a routerLink="." [queryParams]="{ type: c.slug, q: query() || null }" [class.is-active]="type() === c.slug">
                  {{ c.name }} <span>{{ count(c.slug) }}</span>
                </a>
              </li>
            }
          </ul>
        </aside>

        <div>
          <form class="search" role="search" (submit)="$event.preventDefault()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2" /><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" /></svg>
            <input
              type="search"
              [value]="query()"
              (input)="setQuery($any($event.target).value)"
              placeholder="Search by code or name, e.g. ST-027, sliding, glass door"
              aria-label="Search products"
            />
            @if (query()) {
              <button type="button" class="search__clear" aria-label="Clear search" (click)="setQuery('')">×</button>
            }
          </form>

          @if (active(); as c) {
            <div class="subs" role="group" [attr.aria-label]="c.short + ' sections'">
              <a routerLink="." [queryParams]="{ type: c.slug, q: query() || null }" [class.is-active]="!sub()">All {{ c.short }}</a>
              @for (s of sections(); track s.name) {
                <a routerLink="." [queryParams]="{ type: c.slug, sub: s.name, q: query() || null }" [class.is-active]="sub() === s.name">
                  {{ s.name }} <span>{{ s.products.length }}</span>
                </a>
              }
            </div>
          }

          <div class="results-head">
            <p>
              Showing <strong>{{ list().length }}</strong>
              {{ list().length === 1 ? 'design' : 'designs' }}
              @if (active(); as c) { in <strong>{{ sub() || c.name }}</strong> }
              @if (query()) { for “{{ query() }}” }
            </p>
            @if (active(); as c) {
              <a class="more" [routerLink]="['/category', c.slug]">About {{ c.short }} →</a>
            }
          </div>

          @if (list().length) {
            <div class="grid">
              @for (p of shown(); track p.slug) {
                <app-product-card [product]="p" />
              }
            </div>
            @if (shown().length < list().length) {
              <div class="center">
                <button type="button" class="btn btn--outline" (click)="limit.set(limit() + page)">
                  Show more ({{ list().length - shown().length }} left)
                </button>
              </div>
            }
          } @else {
            <div class="empty">
              <p>No design matches “{{ query() }}”.</p>
              <button type="button" class="btn btn--outline" (click)="setQuery('')">Clear search</button>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 48px; align-items: start; }
    /* grid items default to min-width: auto, so the nowrap filter-chip row on phones would stretch the column
       (and the product grid with it) to ~2000px; let it scroll inside the screen width instead */
    .layout > * { min-width: 0; }
    .filters { position: sticky; top: calc(var(--header-h) + 24px); }
    .filters ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
    .filters a {
      display: flex; justify-content: space-between; gap: 12px; padding: 12px 4px;
      border-bottom: 1px solid var(--line); text-decoration: none; font-weight: 500; transition: color .2s, padding .2s;
    }
    .filters a span { color: var(--muted); font-size: .85rem; }
    .filters a:hover { color: var(--brass-dark); padding-left: 8px; }
    .filters a.is-active { color: var(--brass-dark); font-weight: 700; padding-left: 8px; }
    .search { position: relative; margin-bottom: 18px; }
    .search svg { position: absolute; left: 14px; top: 50%; width: 20px; height: 20px; transform: translateY(-50%); color: var(--muted); }
    .search input { width: 100%; padding: 13px 44px; border: 1px solid var(--line); border-radius: 40px; font: inherit; background: var(--bg); }
    .search input:focus { outline: none; border-color: var(--brass); }
    .search input::-webkit-search-cancel-button { display: none; }
    .search__clear {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border: 0;
      border-radius: 50%; background: var(--soft); font-size: 1.2rem; line-height: 1; cursor: pointer; color: var(--ink);
    }
    .subs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .subs a {
      border: 1px solid var(--line); border-radius: 40px; padding: 7px 14px; font-size: .86rem; text-decoration: none;
      white-space: nowrap; transition: border-color .2s, color .2s;
    }
    .subs a span { color: var(--muted); font-size: .78rem; margin-left: 2px; }
    .subs a:hover { border-color: var(--brass); }
    .subs a.is-active { border-color: var(--brass); color: var(--brass-dark); font-weight: 700; }
    .results-head { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: center; margin-bottom: 24px; }
    .results-head p { margin: 0; color: var(--muted); }
    .more { color: var(--brass-dark); font-weight: 600; text-decoration: none; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .center { display: flex; justify-content: center; margin-top: 36px; }
    .empty { text-align: center; padding: 48px 0; color: var(--muted); display: grid; gap: 14px; justify-items: center; }
    .empty p { margin: 0; }
    @media (max-width: 1080px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 860px) {
      .layout { grid-template-columns: minmax(0, 1fr); gap: 28px; }
      .filters { position: static; }
      .filters ul { display: flex; gap: 8px; overflow-x: auto; border: 0; padding-bottom: 6px; }
      .filters li { flex: none; }
      .filters a { border: 1px solid var(--line); border-radius: 40px; padding: 8px 16px; white-space: nowrap; }
      .filters a:hover, .filters a.is-active { padding-left: 16px; border-color: var(--brass); }
      .subs { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 6px; }
    }
    @media (max-width: 560px) { .grid { gap: 14px; } }
  `,
})
export class Products {
  /** Bound from the `?type=` query parameter. */
  readonly type = input<string>();
  /** Bound from the `?sub=` query parameter: a section of the range. */
  readonly sub = input<string>();
  /** Bound from the `?q=` query parameter. */
  readonly q = input<string>();

  protected readonly categories = CATEGORIES;
  protected readonly total = PRODUCTS.length;
  protected readonly page = PAGE;
  protected readonly query = signal('');
  protected readonly limit = signal(PAGE);

  protected readonly active = computed(() => CATEGORIES.find((c) => c.slug === this.type()));
  protected readonly sections = computed(() => (this.active() ? sectionsIn(this.active()!.slug) : []));
  protected readonly list = computed(() => {
    const t = this.active()?.slug;
    const s = this.sub();
    const words = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    return INDEX.filter(
      ({ p, text }) => (!t || p.category === t) && (!t || !s || p.sub === s) && words.every((w) => text.includes(w)),
    ).map(({ p }) => p);
  });
  protected readonly shown = computed(() => this.list().slice(0, this.limit()));

  constructor() {
    // the search box starts from ?q= (links from the chat or a shared URL)
    effect(() => {
      const q = this.q() ?? '';
      untracked(() => this.query.set(q));
    });
    // a new filter starts again from the first page
    effect(() => {
      this.list();
      untracked(() => this.limit.set(PAGE));
    });
  }

  protected setQuery(v: string): void {
    this.query.set(v.trim() ? v : '');
  }

  protected count(slug: string): number {
    return PRODUCTS.filter((p) => p.category === slug).length;
  }
}
