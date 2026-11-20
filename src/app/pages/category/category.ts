/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
import { Component, computed, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIES, categoryBySlug, productsIn, referencesIn, sectionsIn } from '../../data/products';
import { ProductCard } from '../../shared/product-card';
import { QuoteForm } from '../../shared/quote-form';
import { ScrollTo } from '../../shared/scroll-to';

@Component({
  selector: 'app-category',
  imports: [RouterLink, ProductCard, QuoteForm, ScrollTo],
  template: `
    @if (category(); as c) {
      <section class="page-banner" [style.background-image]="'url(' + c.banner + ')'">
        <div class="container">
          <ol class="crumbs">
            <li><a routerLink="/">Home</a></li>
            <li><a routerLink="/products">Products</a></li>
            <li>{{ c.short }}</li>
          </ol>
          <h1>{{ c.name }}</h1>
          <p>{{ c.tagline }}</p>
        </div>
      </section>

      <section class="section intro">
        <div class="container intro__grid">
          <div>
            <p class="kicker">Overview</p>
            <h2>Why choose {{ c.short }}?</h2>
            <p class="desc">{{ c.description }}</p>
            <div class="apps">
              <span class="apps__label">Ideal for</span>
              @for (a of c.applications; track a) { <span class="pill">{{ a }}</span> }
            </div>
          </div>
          <div class="features">
            <h3>Key features</h3>
            <ul>
              @for (f of c.features; track f) { <li>{{ f }}</li> }
            </ul>
            <a class="btn btn--gold" appScrollTo="quote">Ask for a quote</a>
          </div>
        </div>
      </section>

      <section class="section section--soft">
        <div class="container">
          <div class="section-head">
            <p class="kicker">Designs</p>
            <h2>{{ c.name }} collection</h2>
            <span class="title-rule"></span>
            <p class="count">{{ products().length }} designs · tap any design for its details and code</p>
          </div>
          @if (sections().length > 1) {
            <nav class="jump" aria-label="Sections">
              @for (s of sections(); track s.name; let i = $index) {
                <a [href]="'#sec-' + i" (click)="jump($event, i)">{{ s.name }} <span>{{ s.products.length }}</span></a>
              }
            </nav>
          }
          @for (s of sections(); track s.name; let i = $index) {
            <div class="sec" [id]="'sec-' + i">
              <div class="sec__head">
                <h3>{{ s.name }}</h3>
                @if (s.products.length > perSection) {
                  <a [routerLink]="['/products']" [queryParams]="{ type: c.slug, sub: s.name }">See all {{ s.products.length }} →</a>
                }
              </div>
              <div class="grid">
                @for (p of s.products.slice(0, perSection); track p.slug) {
                  <app-product-card [product]="p" />
                }
              </div>
            </div>
          }
        </div>
      </section>

      @if (references().length) {
        <section class="section refs">
          <div class="container">
            <div class="section-head">
              <p class="kicker">Colours, profiles &amp; options</p>
              <h2>Reference sheets</h2>
              <span class="title-rule"></span>
            </div>
            <div class="refs__grid">
              @for (r of references(); track r.slug) {
                <a class="ref" [href]="r.image" target="_blank" rel="noopener" [attr.aria-label]="'Open ' + r.name + ' full size'">
                  <img [src]="r.thumb" [alt]="r.name" loading="lazy" [width]="r.w" [height]="r.h" />
                  <span><small>{{ r.sub }}</small>{{ r.name }}</span>
                </a>
              }
            </div>
          </div>
        </section>
      }

      <section class="section">
        <div class="container quote">
          <div>
            <p class="kicker">Get a Quote</p>
            <h2 id="quote">Price your {{ c.short }} {{ c.group === 'doors' ? 'doors' : 'doors and windows' }}</h2>
            <p class="desc">Send us a few details and we'll call back to arrange a free site visit and measurement.</p>
          </div>
          <app-quote-form [interest]="c.name" />
        </div>
      </section>

      <section class="section section--soft others">
        <div class="container">
          <p class="kicker">Explore more</p>
          <ul>
            @for (o of others(); track o.slug) {
              <li>
                <a [routerLink]="['/category', o.slug]">
                  <img [src]="o.thumb" alt="" width="64" height="64" loading="lazy" />
                  <span>{{ o.name }}</span>
                </a>
              </li>
            }
          </ul>
        </div>
      </section>
    }
  `,
  styles: `
    .intro__grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 64px; align-items: start; }
    .desc { color: var(--muted); margin: 16px 0 0; max-width: 62ch; }
    .apps { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 26px; }
    .apps__label { font-size: .75rem; letter-spacing: .18em; text-transform: uppercase; font-weight: 600; margin-right: 6px; }
    .pill { border: 1px solid var(--line); border-radius: 40px; padding: 6px 14px; font-size: .86rem; }
    .features { background: var(--chip); color: var(--ink); border: 1px solid var(--chip-line); border-radius: 8px; padding: 34px 30px; }
    .features h3 { font-size: 1.4rem; margin-bottom: 14px; }
    .features ul { list-style: none; margin: 0 0 26px; padding: 0; display: grid; gap: 12px; }
    .features li { padding-left: 28px; position: relative; color: var(--ink); }
    .features li::before { content: ''; position: absolute; left: 0; top: 9px; width: 14px; height: 2px; background: var(--gold-hi); }
    .count { color: var(--muted); margin: 14px 0 0; }
    .jump { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: -8px 0 36px; }
    .jump a { border: 1px solid var(--line); background: var(--bg); border-radius: 40px; padding: 7px 14px; font-size: .86rem; text-decoration: none; }
    .jump a:hover { border-color: var(--brass); }
    .jump span { color: var(--muted); font-size: .78rem; }
    .sec { scroll-margin-top: calc(var(--header-h) + 20px); }
    .sec + .sec { margin-top: 48px; }
    .sec__head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 18px; border-bottom: 1px solid var(--line); padding-bottom: 10px; }
    .sec__head h3 { margin: 0; font-size: 1.35rem; }
    .sec__head a { color: var(--brass-dark); font-weight: 600; text-decoration: none; white-space: nowrap; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
    .refs__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .ref { display: grid; gap: 10px; text-decoration: none; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: var(--bg); transition: border-color .2s; }
    .ref:hover { border-color: var(--brass); }
    .ref img { width: 100%; height: 220px; object-fit: contain; background: var(--soft); border-radius: 4px; }
    .ref span { display: grid; font-weight: 600; }
    .ref small { font-size: .7rem; letter-spacing: .14em; text-transform: uppercase; color: var(--brass); }
    .quote { display: grid; grid-template-columns: 1fr 1.4fr; gap: 64px; align-items: start; }
    .others ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .others a { display: flex; align-items: center; gap: 14px; padding: 10px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; text-decoration: none; font-weight: 600; }
    .others a:hover { border-color: var(--brass); }
    .others img { width: 52px; height: 64px; border-radius: 6px; object-fit: contain; padding: 4px; background: var(--soft); flex: none; }
    @media (max-width: 1080px) { .grid { grid-template-columns: repeat(3, 1fr); } .others ul { grid-template-columns: repeat(2, 1fr); } .refs__grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 860px) {
      .intro__grid, .quote { grid-template-columns: 1fr; gap: 36px; }
      .grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
    }
    @media (max-width: 560px) {
      .others ul { grid-template-columns: 1fr; }
      .refs__grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .ref { padding: 8px; gap: 6px; }
      .ref img { height: 120px; }
      .ref span { font-size: .82rem; }
      .ref small { font-size: .6rem; letter-spacing: .1em; }
      .jump { justify-content: flex-start; flex-wrap: nowrap; overflow-x: auto; margin: -8px -20px 28px; padding: 0 20px 6px; }
      .jump a { white-space: nowrap; }
      .sec + .sec { margin-top: 36px; }
      .sec__head h3 { font-size: 1.15rem; }
    }
  `,
})
export class CategoryPage {
  readonly slug = input.required<string>();

  /** Designs shown per section before its "See all" link. */
  protected readonly perSection = 8;

  protected readonly category = computed(() => categoryBySlug(this.slug()));
  protected readonly products = computed(() => productsIn(this.category()?.slug ?? ''));
  protected readonly sections = computed(() => sectionsIn(this.category()?.slug ?? ''));
  protected readonly references = computed(() => referencesIn(this.category()?.slug ?? ''));
  protected readonly others = computed(() => CATEGORIES.filter((c) => c.slug !== this.category()?.slug));

  protected jump(e: Event, i: number): void {
    e.preventDefault();
    document.getElementById('sec-' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  constructor() {
    const title = inject(Title);
    const router = inject(Router);
    effect(() => {
      const c = this.category();
      if (!c) {
        router.navigate(['/products']);
        return;
      }
      // an old range name (e.g. fibre -> frp): show the new address
      if (c.slug !== this.slug()) {
        router.navigate(['/category', c.slug], { replaceUrl: true });
        return;
      }
      title.setTitle(`${c.name} · Amsidel Doors & Windows`);
    });
  }
}
