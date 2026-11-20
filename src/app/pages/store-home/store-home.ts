/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES, PRODUCTS } from '../../data/products';
import { ProductCard } from '../../shared/product-card';
import { Showcase } from './showcase/showcase';

@Component({
  selector: 'app-store-home',
  imports: [RouterLink, ProductCard, Showcase],
  templateUrl: './store-home.html',
  styleUrl: './store-home.scss',
})
export class StoreHome {
  protected readonly tabs = [
    { slug: 'all', label: 'All' },
    ...CATEGORIES.slice(0, 6).map((c) => ({ slug: c.slug, label: c.short })),
  ];
  protected readonly tab = signal('all');
  protected readonly featured = computed(() => {
    const t = this.tab();
    if (t !== 'all') return PRODUCTS.filter((p) => p.category === t).slice(0, 8);
    // one from each category for the "All" view
    return CATEGORIES.flatMap((c) => PRODUCTS.filter((p) => p.category === c.slug).slice(0, 1)).slice(0, 8);
  });

  protected readonly reasons = [
    { icon: 'measure', title: 'Measured on site', text: 'We visit, measure every opening and recommend the right system before you pay.' },
    { icon: 'frame', title: 'Made to measure', text: 'Frames are cut and assembled to your exact sizes, not adapted from stock.' },
    { icon: 'tools', title: 'Trained installers', text: 'Our own fitting team installs, seals and finishes, then cleans up after.' },
    { icon: 'quote', title: 'Clear quotations', text: 'Itemised prices for frames, glass, hardware and fitting. No surprises later.' },
    { icon: 'lock', title: 'Quality hardware', text: 'Locks, rollers and hinges chosen to match the weight and use of each door.' },
    { icon: 'support', title: 'After-sales care', text: 'One call to us for adjustments or service, long after installation.' },
  ];

  protected readonly steps = [
    { n: '01', title: 'Consult', text: 'Share your plan or photos. We suggest materials and styles that suit your space and budget.' },
    { n: '02', title: 'Measure', text: 'A free site visit to take precise measurements and check the openings.' },
    { n: '03', title: 'Make', text: 'Your doors and windows are fabricated to size with the finish and glass you choose.' },
    { n: '04', title: 'Install', text: 'Fitted, sealed and tested by our team, with a walkthrough before we hand over.' },
  ];

  protected readonly inspiration = [1, 3, 4, 5, 10, 11].map((n) => `images/gallery/gallery-${String(n).padStart(2, '0')}.webp`);
}
