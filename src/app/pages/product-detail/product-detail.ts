/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
import { Component, computed, effect, HostListener, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { categoryBySlug, productBySlug, productsIn } from '../../data/products';
import { SITE, whatsappHref } from '../../data/site.config';
import { ProductCard } from '../../shared/product-card';
import { QuoteForm } from '../../shared/quote-form';
import { ScrollTo } from '../../shared/scroll-to';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, ProductCard, QuoteForm, ScrollTo],
  template: `
    @if (product(); as p) {
      @let c = category()!;
      <div class="crumb-bar">
        <div class="container">
          <ol class="crumbs crumbs--dark">
            <li><a routerLink="/">Home</a></li>
            <li><a routerLink="/products">Products</a></li>
            <li><a [routerLink]="['/category', c.slug]">{{ c.short }}</a></li>
            <li>{{ p.code }}</li>
          </ol>
        </div>
      </div>

      <section class="section detail">
        <div class="container detail__grid">
          <div class="detail__media">
            <button type="button" class="zoom-btn" (click)="zoom.set('fit')" [attr.aria-label]="'Enlarge the photo of ' + p.name">
              <img [src]="p.image" [alt]="p.name" [width]="p.w" [height]="p.h" fetchpriority="high" />
              <span class="zoom-hint" aria-hidden="true">
                <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2" /><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" stroke-width="2" /></svg>
                Tap to zoom
              </span>
            </button>
          </div>
          <div class="detail__info">
            <p class="kicker">{{ c.name }} · {{ p.sub }}</p>
            <h1>{{ p.name }}</h1>
            <p class="model">Product code: <strong>{{ p.code }}</strong></p>
            <p class="desc">{{ c.description }}</p>

            <h2 class="sub">Highlights</h2>
            <ul class="hl">
              @for (f of c.features; track f) { <li>{{ f }}</li> }
            </ul>

            <dl class="specs">
              <div><dt>Range</dt><dd>{{ c.name }}</dd></div>
              <div><dt>Section</dt><dd>{{ p.sub }}</dd></div>
              @for (d of p.details; track d[0]) {
                <div><dt>{{ d[0] }}</dt><dd>{{ d[1] }}</dd></div>
              }
              @if (!hasSize()) {
                <div><dt>Sizes</dt><dd>Made to measure</dd></div>
              }
              <div><dt>Finish</dt><dd>As shown, or choose from our shade card</dd></div>
              <div><dt>Ideal for</dt><dd>{{ c.applications.join(', ') }}</dd></div>
            </dl>

            <div class="actions">
              <a class="btn btn--gold" appScrollTo="enquire">Enquire about this design</a>
              @if (wa(); as link) {
                <a class="btn btn--outline" [href]="link" target="_blank" rel="noopener">WhatsApp us</a>
              } @else {
                <a class="btn btn--outline" [href]="mail()">Email us</a>
              }
            </div>
            <p class="note">Product images are representative. Actual colour and grain can vary slightly with finish and lighting.</p>
          </div>
        </div>
      </section>

      <section class="section section--soft">
        <div class="container enquire">
          <div>
            <p class="kicker">Enquiry</p>
            <h2 id="enquire">Interested in {{ p.code }}?</h2>
            <p class="desc">Tell us where it's going and we'll come back with options, a price and a time for a free site visit.</p>
          </div>
          <app-quote-form [interest]="c.name" [productName]="p.name + ' (' + p.code + ')'" />
        </div>
      </section>

      @if (zoom(); as z) {
        <div class="lightbox" [class.lightbox--full]="z === 'full'" role="dialog" aria-modal="true" [attr.aria-label]="p.name + ', full size'" (click)="zoom.set(null)">
          <img [src]="p.image" [alt]="p.name" (click)="$event.stopPropagation(); zoom.set(z === 'fit' ? 'full' : 'fit')"
               [title]="z === 'fit' ? 'Click for actual size' : 'Click to fit the screen'" />
          <button type="button" class="lightbox__close" aria-label="Close" (click)="zoom.set(null)">×</button>
          <span class="lightbox__note">{{ p.code }} · {{ p.w }} × {{ p.h }} px · {{ z === 'fit' ? 'click the photo for actual size' : 'scroll to look around' }}</span>
        </div>
      }

      @if (related().length) {
        <section class="section">
          <div class="container">
            <div class="section-head">
              <p class="kicker">You may also like</p>
              <h2>More from {{ p.sub }}</h2>
              <span class="title-rule"></span>
            </div>
            <div class="grid">
              @for (r of related(); track r.slug) {
                <app-product-card [product]="r" />
              }
            </div>
          </div>
        </section>
      }
    }
  `,
  styles: `
    .crumb-bar { background: var(--soft); border-bottom: 1px solid var(--line); }
    .crumbs--dark { margin: 0; padding-block: 16px; color: var(--brass-dark); }
    .crumbs--dark a { color: var(--ink); }
    .crumbs--dark li + li::before { color: var(--muted); }
    .detail__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; }
    .detail__media {
      position: sticky; top: calc(var(--header-h) + 24px);
      background: var(--soft); border: 1px solid var(--line); border-radius: 10px; padding: 28px;
    }
    .zoom-btn { display: block; position: relative; width: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }
    .detail__media img { width: 100%; height: auto; max-height: 72vh; object-fit: contain; margin-inline: auto; }
    .zoom-hint {
      position: absolute; right: 8px; bottom: 8px; display: inline-flex; align-items: center; gap: 6px;
      background: rgba(17, 17, 19, .78); color: #fff; font-size: .74rem; letter-spacing: .06em; padding: 6px 12px; border-radius: 40px;
    }
    .zoom-hint svg { width: 16px; height: 16px; }
    .lightbox {
      position: fixed; inset: 0; z-index: 1000; background: rgba(10, 10, 12, .94); display: grid; place-items: center;
      padding: 48px 16px; cursor: zoom-out; overflow: auto;
    }
    .lightbox img { max-width: 100%; max-height: calc(100vh - 96px); object-fit: contain; cursor: zoom-in; background: #fff; }
    .lightbox--full { place-items: start; }
    .lightbox--full img { max-width: none; max-height: none; cursor: zoom-out; margin: auto; }
    .lightbox__close {
      position: fixed; top: 14px; right: 16px; width: 44px; height: 44px; border-radius: 50%; border: 0;
      background: rgba(255, 255, 255, .14); color: #fff; font-size: 1.8rem; line-height: 1; cursor: pointer;
    }
    .lightbox__note { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); color: rgba(255, 255, 255, .75); font-size: .8rem; white-space: nowrap; }
    h1 { font-size: clamp(2rem, 4vw, 2.8rem); }
    .model { color: var(--muted); margin: 8px 0 0; }
    .desc { color: var(--muted); margin: 18px 0 0; max-width: 60ch; }
    .sub { font-size: 1.3rem; margin: 30px 0 12px; }
    .hl { margin: 0; padding-left: 20px; display: grid; gap: 6px; }
    .hl li::marker { color: var(--brass); }
    .specs { margin: 28px 0 0; border-top: 1px solid var(--line); }
    .specs div { display: grid; grid-template-columns: 170px 1fr; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--line); }
    .specs dt { font-weight: 600; font-size: .9rem; }
    .specs dd { margin: 0; color: var(--muted); }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 30px; }
    .note { font-size: .8rem; color: var(--muted); margin: 18px 0 0; }
    .enquire { display: grid; grid-template-columns: 1fr 1.4fr; gap: 64px; align-items: start; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
    @media (max-width: 1080px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 860px) {
      .detail__grid, .enquire { grid-template-columns: 1fr; gap: 36px; }
      .detail__media { position: static; }
    }
    @media (max-width: 560px) { .grid { gap: 14px; } .specs div { grid-template-columns: 1fr; gap: 2px; } }
  `,
})
export class ProductDetail {
  readonly slug = input.required<string>();

  protected readonly product = computed(() => productBySlug(this.slug()));
  /** Full-screen photo: fitted to the screen, or at its actual pixel size. */
  protected readonly zoom = signal<'fit' | 'full' | null>(null);

  @HostListener('document:keydown.escape')
  protected closeZoom(): void {
    this.zoom.set(null);
  }
  protected readonly category = computed(() => categoryBySlug(this.product()?.category));
  protected readonly related = computed(() => {
    const p = this.product();
    if (!p) return [];
    const others = productsIn(p.category).filter((r) => r.slug !== p.slug);
    // same section first, nearest designs in catalogue order
    const same = others.filter((r) => r.sub === p.sub);
    return [...same, ...others.filter((r) => r.sub !== p.sub)].slice(0, 4);
  });
  protected readonly hasSize = computed(() => !!this.product()?.details.some(([k]) => /size|height|width/i.test(k)));
  protected readonly wa = computed(() => {
    const p = this.product();
    return SITE.whatsapp && SITE.whatsappActive && p ? whatsappHref(`Hello Amsidel, I'm interested in ${p.name} (${p.code}).`) : '';
  });
  protected readonly mail = computed(
    () => `mailto:${SITE.altEmail}?subject=${encodeURIComponent('Enquiry – ' + (this.product()?.name ?? '') + ' (' + (this.product()?.code ?? '') + ')')}`,
  );

  constructor() {
    const title = inject(Title);
    const router = inject(Router);
    effect(() => {
      const p = this.product();
      if (!p) {
        router.navigate(['/products']);
        return;
      }
      this.zoom.set(null);
      title.setTitle(`${p.name} (${p.code}) · Amsidel Doors & Windows`);
    });
  }
}
