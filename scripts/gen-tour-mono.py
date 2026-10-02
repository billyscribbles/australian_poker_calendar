#!/usr/bin/env python3
"""One-off: build the greyscale tour wordmarks in public/images/tours.

WHY THIS EXISTS. The tour strip on the calendar page shows every operator's
logo in a row. In full colour that row is eight competing brands shouting at
once (APL's lime, Kings' red, Aurum's blue) and the site's own gold loses the
page. In one neutral grey it reads as one quiet strip of marks, and a tile can
light up in colour on hover. A CSS `filter: grayscale()` cannot do this: a
dark lockup (Crown, Aurum) goes near-black and vanishes on the dark card, and
a mid-green (APL) ends up a dim mud. Each mark needs its own tone mapping,
and that is a build step, not a stylesheet.

For each PNG in TOURS this writes `<name>-mono.png`:

  1. luminance per pixel, alpha kept as-is
  2. a mark that is dark-on-transparent (tourBrands `logo: 'dark'`) is
     inverted, so its ink becomes light ink
  3. a gentle gamma lift so mid-tones (APL green, Kings red) don't sink
  4. the brightest opaque pixel is scaled to TONE, so every mark shares one
     ceiling and sits at the same weight as the pill text beside it

Nouméa's wordmark is an SVG in a single cream, so it is a colour swap.

NOT part of `yarn build` — run it when a wordmark changes and commit the
output, so the deploy needs no image tooling:

    python3 scripts/gen-tour-mono.py          (needs Pillow: pip install pillow)
"""

import re
import sys
from base64 import b64decode, b64encode
from io import BytesIO
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("[gen-tour-mono] Pillow is missing: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
TOURS = ROOT / "public" / "images" / "tours"

# Neutral light grey: the resting tone every mark's brightest ink maps to.
TONE = 0xC8
GAMMA = 0.7

# name -> True when the shipped mark is dark ink (see src/content/tourBrands.js `logo`)
PNG_MARKS = {
    "apt": False,
    "apl": False,
    "aplpt": False,
    "kings": False,
    "crown": False,
    "aurum": True,
    "playlive": False,
}
SVG_MARKS = {"nps": "#F5F2EB"}


def to_mono(im: Image.Image, dark: bool) -> tuple[Image.Image, int]:
    """The grey version of an RGBA image, and the peak luminance it was scaled from."""
    alpha = im.getchannel("A")
    lum = im.convert("L")
    if dark:
        lum = lum.point(lambda v: 255 - v)
    lum = lum.point(lambda v: round(255 * (v / 255) ** GAMMA))

    # Ceiling from opaque pixels only; a translucent edge must not set the scale.
    peak = max(
        (l for l, a in zip(lum.tobytes(), alpha.tobytes()) if a >= 200), default=255
    )
    scale = TONE / max(peak, 1)
    lum = lum.point(lambda v: min(255, round(v * scale)))

    return Image.merge("RGBA", (lum, lum, lum, alpha)), peak


def mono_png(name: str, dark: bool) -> None:
    im = Image.open(TOURS / f"{name}.png").convert("RGBA")
    out, peak = to_mono(im, dark)
    out.save(TOURS / f"{name}-mono.png", optimize=True)
    print(f"[gen-tour-mono] {name}-mono.png  peak {peak} -> {TONE}")


def mono_svg(name: str, colour: str) -> None:
    """Swap the vector fill, and grey any raster the SVG embeds (Nouméa's "N"
    mark is a base64 PNG clipped by a path, and keeps its gradient otherwise)."""
    src = (TOURS / f"{name}.svg").read_text()
    grey = f"#{TONE:02X}{TONE:02X}{TONE:02X}"
    out, n = re.subn(re.escape(colour), grey, src, flags=re.IGNORECASE)
    if n == 0:
        sys.exit(f"[gen-tour-mono] {name}.svg no longer uses {colour}; update SVG_MARKS")

    def grey_raster(m: re.Match) -> str:
        im = Image.open(BytesIO(b64decode(m.group(1)))).convert("RGBA")
        mono, _ = to_mono(im, dark=False)
        buf = BytesIO()
        mono.save(buf, format="PNG", optimize=True)
        return "data:image/png;base64," + b64encode(buf.getvalue()).decode("ascii")

    out, rasters = re.subn(r"data:image/png;base64,([A-Za-z0-9+/=]+)", grey_raster, out)
    (TOURS / f"{name}-mono.svg").write_text(out)
    print(f"[gen-tour-mono] {name}-mono.svg  {n} fills -> {grey}, {rasters} embedded raster(s)")


if __name__ == "__main__":
    for name, dark in PNG_MARKS.items():
        mono_png(name, dark)
    for name, colour in SVG_MARKS.items():
        mono_svg(name, colour)
