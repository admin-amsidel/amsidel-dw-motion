/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
import { computed, Injectable, signal } from '@angular/core';
import { Offer, OFFERS } from '../data/offers';

/** yyyy-mm-dd for today in local time. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The website's offers (data/offers.ts) that run today: for the header button, the Offers page and the AMI chat.
 * Static data, so there is nothing to load.
 */
@Injectable({ providedIn: 'root' })
export class SiteNewsService {
  private readonly day = signal(today());

  readonly ready = signal(true);
  readonly offers = computed<Offer[]>(() => {
    const d = this.day();
    return OFFERS.filter((o) => (!o.startDate || o.startDate <= d) && (!o.endDate || o.endDate >= d));
  });

  /** Kept for the pages that call it; the offers are already there. */
  load(): void {
    this.day.set(today());
  }

  image(o: Offer): string | null {
    return o.image ?? null;
  }
}
