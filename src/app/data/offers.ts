/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
// Offers shown on the website: the header's Offers button, the Offers page and the AMI chat. Add one entry per offer;
// an offer shows from `startDate` to `endDate` (inclusive, yyyy-mm-dd) and disappears by itself afterwards.
// Put an optional poster in public/images/offers/ and set `image` to e.g. 'images/offers/onam-2026.webp'.

export interface Offer {
  id: string;
  title: string;
  body?: string;
  /** yyyy-mm-dd; shows from this day. Leave out to show straight away. */
  startDate?: string;
  /** yyyy-mm-dd; last day it shows. Leave out for no end date. */
  endDate?: string;
  /** Poster image path in public/. */
  image?: string;
}

export const OFFERS: Offer[] = [
  // {
  //   id: 'onam-2026',
  //   title: 'Onam offer: 10% off uPVC windows',
  //   body: 'On orders confirmed before the end of the month. Includes free site measurement.',
  //   startDate: '2026-08-15',
  //   endDate: '2026-09-15',
  //   image: 'images/offers/onam-2026.webp',
  // },
];
