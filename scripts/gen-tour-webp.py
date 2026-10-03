#!/usr/bin/env python3
"""One-off: write a WebP beside every colour tour mark in public/images/tours.

WHY THIS EXISTS. The operators' wordmarks and icons arrive as RGBA PNGs with
soft gradients, and a PNG stores a gradient badly: APL's 380x267 wordmark is
109 KB, which on a phone is most of what the tour and series heroes wait for.
The same pixels as a lossy WebP with alpha are a tenth of that and look the
same at the sizes the site draws them (64 px high at most).

They are also capped in size: a wordmark fits in 480x160 and an icon in
128x128, twice the largest the site draws either (a 67 px rooms tile, a
56 px icon) so they stay sharp on a 2x screen. Shipping Gambier's 900 px
mark into a 38 px tile cost the home page tens of KB per room on mobile.

For each `<name>.png` and `<name>-icon.png` this writes `<name>.webp` and
`<name>-icon.webp`; calendarPage.tours points `logoSrc`/`iconSrc` at the
WebP and the PNG stays as the source of truth (gen-tour-mono.py reads it).

NOT part of `yarn build` — run it when a mark changes and commit the output:

    python3 scripts/gen-tour-webp.py          (needs Pillow: pip install pillow)
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("[gen-tour-webp] Pillow is missing: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
TOURS = ROOT / "public" / "images" / "tours"
QUALITY = 88
WORDMARK_BOX = (480, 160)
ICON_BOX = (128, 128)


def main():
    written = 0
    for src in sorted(TOURS.glob("*.png")):
        if src.stem.endswith("-mono") or src.stem.endswith("-on-dark"):
            continue
        out = src.with_suffix(".webp")
        box = ICON_BOX if src.stem.endswith("-icon") else WORDMARK_BOX
        with Image.open(src) as im:
            im = im.convert("RGBA")
            im.thumbnail(box, Image.LANCZOS)  # only ever shrinks
            im.save(out, "WEBP", quality=QUALITY, method=6)
        before, after = src.stat().st_size // 1024, out.stat().st_size // 1024
        print(f"[gen-tour-webp] {out.name:24} {before:4} KB -> {after:3} KB")
        written += 1
    print(f"[gen-tour-webp] {written} files written")


if __name__ == "__main__":
    main()
