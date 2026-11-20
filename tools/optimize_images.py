"""
Copyright (c) 2026 IANEL Technologies. All rights reserved.

Turns high-quality PNG/JPG photos dropped into public/images into the web-sized WebP files the site uses,
with the same name (gallery-04.png -> gallery-04.webp), then moves the originals out of the repo.

  * full photos (product pages, banners, hero, gallery): longest side at most FULL_MAX px, WebP quality QUALITY_FULL
  * grid thumbnails (the "thumb" paths in catalogue.generated.ts, *-sm.webp): THUMB_MAX px, quality QUALITY_THUMB
  * never enlarges, keeps transparency
  * updates the "w"/"h" of catalogue items in src/app/data/catalogue.generated.ts to the new image sizes
  * originals are moved to ../image-originals/<same path> (outside the repo), not deleted

Usage (from the amsidel-DnW folder):
    python tools/optimize_images.py              # convert and move originals
    python tools/optimize_images.py --keep       # convert, leave originals in place

Requires Pillow (pip install pillow). Settings match tools/import_catalogue.py.
"""
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

WEB = Path(__file__).resolve().parent.parent
IMAGES = WEB / 'public' / 'images'
ORIGINALS = WEB.parent / 'image-originals'
DATA = WEB / 'src' / 'app' / 'data' / 'catalogue.generated.ts'

FULL_MAX = 2400
THUMB_MAX = 600
QUALITY_FULL = 90
QUALITY_THUMB = 82
SOURCE_EXT = {'.png', '.jpg', '.jpeg'}


def to_webp(src: Path, dst: Path, max_side: int, quality: int) -> tuple[int, int]:
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        has_alpha = im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getextrema()[3][0] < 255
        im = im.convert('RGBA' if has_alpha else 'RGB')
        im.thumbnail((max_side, max_side), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=quality, method=6)
        return im.size


def main() -> None:
    keep = '--keep' in sys.argv
    text = DATA.read_text(encoding='utf-8')
    thumbs = set(re.findall(r'"thumb": "(images/[^"]+)"', text))

    sources = sorted(p for p in IMAGES.rglob('*') if p.suffix.lower() in SOURCE_EXT)
    if not sources:
        print('No PNG/JPG files in public/images: nothing to do.')
        return

    sizes: dict[str, tuple[int, int]] = {}
    before = after = 0
    for src in sources:
        dst = src.with_suffix('.webp')
        rel = dst.relative_to(WEB / 'public').as_posix()
        thumb = rel in thumbs
        w, h = to_webp(src, dst, THUMB_MAX if thumb else FULL_MAX, QUALITY_THUMB if thumb else QUALITY_FULL)
        sizes[rel] = (w, h)
        before += src.stat().st_size
        after += dst.stat().st_size
        if not keep:
            target = ORIGINALS / src.relative_to(IMAGES)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(target))
        print(f'{rel:55} {w}x{h}{"  (thumb)" if thumb else ""}')

    # keep the catalogue's width/height (used for layout before the image loads) in step with the new files
    def fix(m: re.Match) -> str:
        new = sizes.get(m.group(2))
        if not new:
            return m.group(0)
        return f'{m.group(1)}"w": {new[0]},{m.group(3)}"h": {new[1]}'

    pattern = re.compile(r'("image": "(images/[^"]+)",\s*"thumb": "[^"]+",\s*)"w": \d+,(\s*)"h": \d+')
    new_text, n = pattern.subn(fix, text)
    if new_text != text:
        DATA.write_text(new_text, encoding='utf-8')

    print(f'\n{len(sources)} images: {before / 1e6:.0f} MB -> {after / 1e6:.0f} MB')
    print(f'catalogue sizes checked: {n}')
    if not keep:
        print(f'originals moved to {ORIGINALS}')

    # every image the catalogue points at should now exist
    missing = [p for p in json.loads('[' + ','.join(f'"{x}"' for x in re.findall(r'"(images/[^"]+\.webp)"', text)) + ']')
               if not (WEB / 'public' / p).exists()]
    if missing:
        print(f'\nWARNING: {len(missing)} images the catalogue uses are missing:')
        for p in missing:
            print('  ', p)


if __name__ == '__main__':
    main()
