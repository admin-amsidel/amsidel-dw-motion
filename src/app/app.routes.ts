/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

// Amsidel Doors & Windows website. The Amsidel Group page is a separate website (data/sites.ts).
export const routes: Routes = [
  // links from when the store lived under /doors-windows/... keep working
  {
    path: 'doors-windows',
    children: [
      {
        path: '**',
        redirectTo: (r) =>
          inject(Router).createUrlTree(['/', ...r.url.map((u) => u.path)], { queryParams: r.queryParams, fragment: r.fragment ?? undefined }),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/store-shell/store-shell').then((m) => m.StoreShell),
    children: [
      {
        path: '',
        title: 'Amsidel Doors & Windows',
        loadComponent: () => import('./pages/store-home/store-home').then((m) => m.StoreHome),
      },
      {
        path: 'products',
        title: 'Products · Amsidel Doors & Windows',
        loadComponent: () => import('./pages/products/products').then((m) => m.Products),
      },
      {
        path: 'category/:slug',
        loadComponent: () => import('./pages/category/category').then((m) => m.CategoryPage),
      },
      {
        path: 'product/:slug',
        loadComponent: () => import('./pages/product-detail/product-detail').then((m) => m.ProductDetail),
      },
      {
        path: 'about',
        title: 'About · Amsidel Doors & Windows',
        loadComponent: () => import('./pages/about/about').then((m) => m.About),
      },
      {
        path: 'projects',
        title: 'Projects & Inspiration · Amsidel Doors & Windows',
        loadComponent: () => import('./pages/projects/projects').then((m) => m.Projects),
      },
      {
        path: 'site-visit',
        title: 'Book a Free Site Visit · Amsidel Doors & Windows',
        loadComponent: () => import('./pages/site-visit/site-visit').then((m) => m.SiteVisit),
      },
      {
        path: 'offers',
        title: 'Offers · Amsidel Doors & Windows',
        loadComponent: () => import('./pages/offers/offers').then((m) => m.Offers),
      },
      {
        path: 'contact',
        title: 'Contact · Amsidel Doors & Windows',
        loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
