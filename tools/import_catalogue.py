"""
Copyright (c) 2026 IANEL Technologies. All rights reserved.

Imports the product catalogue (CATALOGUE/complete-catalogue) into the website:

  * product and reference images  -> public/images/catalogue/<range>/<code>.webp  (web-sized WebP)
  * range banner photos           -> public/images/banners/<range>.webp
  * product data                  -> src/app/data/catalogue.generated.ts

The supplier's original codes and source pages (products.json "ref"/"source"/"page") are deliberately NOT copied:
customers only ever see the Amsidel code.

Usage (from the amsidel-web folder):
    python tools/import_catalogue.py "../CATALOGUE/complete-catalogue"

Requires Pillow (pip install pillow). Safe to run again; it overwrites its own output.
"""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parent.parent
# High definition: product pages get the photo at its full source resolution (capped at FULL_MAX), and the product
# grids a lighter THUMB_MAX copy so pages with 100+ cards stay fast.
FULL_MAX = 2400  # longest side of the full-size photo, px (the catalogue's sources are at most 2400)
THUMB_MAX = 600  # longest side of the grid / menu / chat copy
BANNER_MAX = 2400
QUALITY_FULL = 90
QUALITY_THUMB = 82

# catalogue sections Amsidel does not sell: left out of the website entirely
EXCLUDED_SECTIONS = {'ABS doors', 'Steel utility doors'}

# group: 'doors-windows' = ranges with windows as well as doors; 'doors' = door-only ranges
GROUP = {
    'upvc': 'doors-windows',
    'aluminium': 'doors-windows',
    'wpc': 'doors-windows',
    'steel': 'doors',
    'membrane': 'doors',
    'laminated': 'doors',
    'skin': 'doors',
    'frp': 'doors',
    'designer': 'doors',
}
SHORT = {
    'upvc': 'uPVC',
    'aluminium': 'Aluminium',
    'wpc': 'WPC',
    'steel': 'Steel',
    'membrane': 'Membrane',
    'laminated': 'Laminated',
    'skin': 'Skin',
    'frp': 'FRP',
    'designer': 'Designer',
}
APPLICATIONS = {
    'upvc': ['Apartments', 'Villas', 'Balconies', 'Bedrooms facing traffic'],
    'aluminium': ['Living-room openings', 'Shopfronts & facades', 'Offices', 'Wardrobes & partitions'],
    'wpc': ['Bathrooms', 'Kitchens', 'Coastal homes', 'Main and internal doors'],
    'steel': ['Main entrances', 'Independent houses', 'Villas', 'Utility areas'],
    'membrane': ['Bedrooms', 'Internal doors', 'Rental homes'],
    'laminated': ['Bedrooms', 'Offices', 'Hotels'],
    'skin': ['Internal doors', 'Housing projects', 'Renovations'],
    'frp': ['Bathrooms', 'Utility areas', 'Bedrooms', 'Public toilets'],
    'designer': ['Main entrances', 'Pooja rooms', 'Living areas', 'Bedrooms'],
}


def to_webp(src: Path, dst: Path, max_side: int, quality: int) -> tuple[int, int]:
    """Never enlarges: a small source stays at its own size (upscaling adds blur, not detail)."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
        im.thumbnail((max_side, max_side), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=quality, method=6)
        return im.size


def slugify(s: str) -> str:
    return ''.join(ch if ch.isalnum() else '-' for ch in s.lower()).strip('-')


def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else WEB.parent / 'CATALOGUE' / 'complete-catalogue').resolve()
    site = json.loads((src / 'data' / 'website.json').read_text(encoding='utf-8'))

    out_img = WEB / 'public' / 'images' / 'catalogue'
    if out_img.exists():
        shutil.rmtree(out_img)
    banners = WEB / 'public' / 'images' / 'banners'

    categories = []
    for c in site['categories']:
        cid = c['id']
        to_webp(src / c['hero'], banners / f'{cid}.webp', BANNER_MAX, QUALITY_FULL)
        categories.append(
            {
                'slug': cid,
                'name': c['title'],
                'short': SHORT[cid],
                'group': GROUP[cid],
                'tagline': c['tag'],
                'description': c['intro'].replace(
                    'designer uPVC, ABS and steel utility doors', 'designer uPVC doors'
                ),
                'features': c['feats'],
                'applications': APPLICATIONS[cid],
                'banner': f'images/banners/{cid}.webp',
            }
        )

    products, references = [], []
    for p in site['products']:
        if p['sub'] in EXCLUDED_SECTIONS:
            continue
        code = p['code']
        rel = f"images/catalogue/{p['cat']}/{code.lower()}.webp"
        thumb = f"images/catalogue/{p['cat']}/{code.lower()}-sm.webp"
        is_product = p['kind'] == 'product'
        w, h = to_webp(src / p['img'], WEB / 'public' / rel, FULL_MAX, QUALITY_FULL)
        to_webp(src / p['img'], WEB / 'public' / thumb, THUMB_MAX, QUALITY_THUMB)
        item = {
            'slug': slugify(code),
            'code': code,
            'name': p['name'],
            'category': p['cat'],
            'sub': p['sub'],
            'image': rel,
            'thumb': thumb,
            'w': w,
            'h': h,
        }
        if is_product:
            item['details'] = [[k, v] for k, v in p['details'].items()]
            products.append(item)
        else:
            references.append(item)

    # thumbnail for menus: the first product of each range
    for c in categories:
        c['thumb'] = next(p['thumb'] for p in products if p['category'] == c['slug'])

    ts = WEB / 'src' / 'app' / 'data' / 'catalogue.generated.ts'
    body = (
        '/*\n * Copyright (c) 2026 IANEL Technologies. All rights reserved.\n'
        ' * Designed and developed by IANEL Technologies.\n */\n'
        '// GENERATED by tools/import_catalogue.py from CATALOGUE/complete-catalogue. Do not edit by hand:\n'
        '// change the catalogue data and run the script again (wording overrides belong in products.ts).\n'
        "import type { CatalogueCategory, CatalogueItem } from './products';\n\n"
        f'export const GENERATED_CATEGORIES: CatalogueCategory[] = {json.dumps(categories, ensure_ascii=False, indent=2)};\n\n'
        f'export const GENERATED_PRODUCTS: CatalogueItem[] = {json.dumps(products, ensure_ascii=False, indent=1)};\n\n'
        f'export const GENERATED_REFERENCES: CatalogueItem[] = {json.dumps(references, ensure_ascii=False, indent=1)};\n'
    )
    ts.write_text(body, encoding='utf-8')

    size = sum(f.stat().st_size for f in out_img.rglob('*.webp'))
    print(f'{len(categories)} ranges, {len(products)} products, {len(references)} reference sheets')
    print(f'images: {size / 1e6:.1f} MB in {out_img}')
    print(f'data:   {ts}')


if __name__ == '__main__':
    main()
