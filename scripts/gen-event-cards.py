#!/usr/bin/env python3
"""Write a card-sized copy of each home-page event poster.

WHY THIS EXISTS. The series posters in public/images/events are 800x1000 for
the series pages, where the poster is the hero. The home page's events banner
draws the same posters as cards about 280 px wide, so a phone was downloading
up to 130 KB per card to paint a third of the pixels. A card copy at 500x625
is sharp on a 2x screen at that width and a fraction of the bytes.

For each `<name>.webp` in CARDS this writes `<name>-card.webp`;
content/events.js points the banner's `imageSrc` at the card. A poster whose
source is already named `-card` is shrunk in place.

NOT part of `yarn build`: run it when a banner poster changes and commit the
output.

    python3 scripts/gen-event-cards.py          (needs Pillow: pip install pillow)
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("[gen-event-cards] Pillow is missing: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
EVENTS = ROOT / "public" / "images" / "events"
BOX = (500, 625)
QUALITY = 80

# The posters content/events.js shows on the home page's events banner.
CARDS = [
    "apt-melbourne-champs-ii",
    "aurum-sydney-showdown",
    "aplpt-brisbane",
    "victorian-poker-championship-card",
]


def main():
    for name in CARDS:
        src = EVENTS / f"{name}.webp"
        out = src if name.endswith("-card") else EVENTS / f"{name}-card.webp"
        before = src.stat().st_size // 1024
        with Image.open(src) as im:
            im = im.convert("RGB")
            im.thumbnail(BOX, Image.LANCZOS)  # only ever shrinks
            im.save(out, "WEBP", quality=QUALITY, method=6)
        after = out.stat().st_size // 1024
        print(f"[gen-event-cards] {out.name:40} {before:4} KB -> {after:3} KB")


if __name__ == "__main__":
    main()
