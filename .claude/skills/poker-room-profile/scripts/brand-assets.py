#!/usr/bin/env python3
"""Helpers for a poker room's logo set in public/images/tours (needs Pillow).

  palette <image> [--top N]
      the opaque colours in a logo, most common first (anti-aliasing folded in)
  trim <src> <code> [--key-white] [--width 800] [--out PATH]
      cut the lockup to its art and write <code>.png; --key-white turns a white
      ground transparent (soft edges kept) for a logo that comes on white
  lighten <src> <out> [--keep HEX ...] [--tolerance 60]
      every ink white except pixels near a kept colour; alpha untouched. Use it
      to turn a dark lockup into the light wordmark the bars need, or to make
      <code>-on-dark.png for the rooms strip
  on-dark <code> [--keep HEX ...]
      shortcut: lighten public/images/tours/<code>.png -> <code>-on-dark.png
  icon <src> <code> [--bg HEX] [--margin 22] [--out PATH]
      fit the square glyph into a 256x256 <code>-icon.png, transparent unless
      --bg; --margin 0 for a disc or tile that is its own backing
  check <code>
      size, bbox, ink tone and transparency of each file in the set, which are
      missing, and whether the strip needs an on-dark lockup

Run from the repo root:  python3 .claude/skills/poker-room-profile/scripts/brand-assets.py <cmd> ...
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("[brand-assets] Pillow is missing: pip install pillow")

ROOT = Path(__file__).resolve().parents[4]
TOURS = ROOT / "public" / "images" / "tours"
ICON_SIZE = 256


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb) -> str:
    return "#%02X%02X%02X" % tuple(rgb[:3])


def luminance(rgb) -> float:
    r, g, b = rgb[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def dist(a, b) -> float:
    return sum((x - y) ** 2 for x, y in zip(a[:3], b[:3])) ** 0.5


def pixels(im: Image.Image):
    """Every pixel as an RGBA tuple (Pillow 12 renamed getdata)."""
    get = getattr(im, "get_flattened_data", None)
    return list(get()) if get else list(im.getdata())


def opaque_pixels(im: Image.Image):
    return [p for p in pixels(im) if p[3] >= 200]


def save(im: Image.Image, dest: Path, note: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, optimize=True)
    shown = dest.relative_to(ROOT) if dest.is_relative_to(ROOT) else dest
    print(f"[brand-assets] {shown}  {note}")


# ---------------------------------------------------------------------------


def palette(args) -> None:
    im = Image.open(args.image).convert("RGBA")
    px = opaque_pixels(im)
    if not px:
        sys.exit("[brand-assets] no opaque pixels")
    buckets: dict[tuple, int] = {}
    for r, g, b, _ in px:
        key = (r // 16 * 16 + 8, g // 16 * 16 + 8, b // 16 * 16 + 8)
        buckets[key] = buckets.get(key, 0) + 1
    total = len(px)
    print(f"{args.image}: {im.size[0]}x{im.size[1]}, {total} opaque px")
    for rgb, n in sorted(buckets.items(), key=lambda kv: -kv[1])[: args.top]:
        kind = "light" if luminance(rgb) > 160 else "dark" if luminance(rgb) < 60 else "colour"
        print(f"  {rgb_to_hex(rgb)}  {n / total:5.1%}  {kind}")


def key_white(im: Image.Image) -> Image.Image:
    """White ground -> transparent. Alpha ramps from 0 at pure white to full at
    a 40-unit distance, so anti-aliased edges fade instead of fringing."""
    out = []
    for p in pixels(im):
        d = dist(p, (255, 255, 255))
        a = min(p[3], round(p[3] * min(1.0, d / 40)))
        out.append((p[0], p[1], p[2], a))
    res = Image.new("RGBA", im.size)
    res.putdata(out)
    return res


def trim(args) -> None:
    im = Image.open(args.src).convert("RGBA")
    if args.key_white:
        im = key_white(im)
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        sys.exit("[brand-assets] nothing opaque to trim to")
    im = im.crop(bbox)
    if im.width > args.width:
        im = im.resize((args.width, max(1, round(im.height * args.width / im.width))), Image.LANCZOS)
    dest = Path(args.out) if args.out else TOURS / f"{args.code}.png"
    save(im, dest, f"{im.width}x{im.height}{'  white ground keyed out' if args.key_white else ''}")


def lighten_image(im: Image.Image, keep, tolerance: float) -> tuple[Image.Image, int]:
    out, kept = [], 0
    for p in pixels(im):
        if p[3] == 0:
            out.append(p)
        elif any(dist(p, k) <= tolerance for k in keep):
            out.append(p)
            kept += 1
        else:
            out.append((255, 255, 255, p[3]))
    res = Image.new("RGBA", im.size)
    res.putdata(out)
    return res, kept


def lighten(args) -> None:
    im = Image.open(args.src).convert("RGBA")
    res, kept = lighten_image(im, [hex_to_rgb(h) for h in args.keep], args.tolerance)
    save(res, Path(args.out), f"ink -> white, {kept} px kept")


def on_dark(args) -> None:
    im = Image.open(TOURS / f"{args.code}.png").convert("RGBA")
    res, kept = lighten_image(im, [hex_to_rgb(h) for h in args.keep], args.tolerance)
    save(res, TOURS / f"{args.code}-on-dark.png", f"ink -> white, {kept} px kept")


def icon(args) -> None:
    im = Image.open(args.src).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        sys.exit("[brand-assets] source is fully transparent")
    mark = im.crop(bbox)
    box = ICON_SIZE - 2 * args.margin
    scale = min(box / mark.width, box / mark.height)
    mark = mark.resize((max(1, round(mark.width * scale)), max(1, round(mark.height * scale))), Image.LANCZOS)
    bg = (*hex_to_rgb(args.bg), 255) if args.bg else (0, 0, 0, 0)
    out = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), bg)
    out.alpha_composite(mark, ((ICON_SIZE - mark.width) // 2, (ICON_SIZE - mark.height) // 2))
    dest = Path(args.out) if args.out else TOURS / f"{args.code}-icon.png"
    save(out, dest, f"glyph {mark.width}x{mark.height} on {args.bg or 'transparent'}, margin {args.margin}")


def describe(path: Path):
    """(summary line, ink tone or None)."""
    if path.suffix == ".svg":
        return "svg (check by eye)", None
    im = Image.open(path).convert("RGBA")
    px = opaque_pixels(im)
    if not px:
        return f"{im.size[0]}x{im.size[1]}  fully transparent", None
    bbox = im.getchannel("A").getbbox()
    share = len(px) / (im.size[0] * im.size[1])
    lum = sum(luminance(p) for p in px) / len(px)
    tone = "light" if lum > 128 else "dark"
    full = "  full-bleed" if share > 0.95 else ""
    return f"{im.size[0]}x{im.size[1]}  bbox {bbox}  opaque {share:4.0%}  ink {tone} (mean L {lum:.0f}){full}", tone


def check(args) -> None:
    code = args.code
    sets = [
        ("wordmark  logoSrc", [f"{code}.png", f"{code}.svg"]),
        ("icon      iconSrc", [f"{code}-icon.png", f"{code}-icon.svg"]),
        ("mono      monoSrc", [f"{code}-mono.png", f"{code}-mono.svg"]),
    ]
    wordmark_tone = None
    for label, candidates in sets:
        found = [TOURS / n for n in candidates if (TOURS / n).exists()]
        if found:
            line, tone = describe(found[0])
            if label.startswith("wordmark"):
                wordmark_tone = tone
            print(f"  {label}  {found[0].name:24} {line}")
        else:
            print(f"  {label}  {candidates[0]:24} MISSING")
    od = TOURS / f"{code}-on-dark.png"
    if od.exists():
        print(f"  on-dark   (strip)  {od.name:24} {describe(od)[0]}")
    elif wordmark_tone == "dark":
        print(f"  on-dark   (strip)  {od.name:24} NEEDED: dark-ink wordmark, the rooms strip tile is a dark card")
    else:
        print(f"  on-dark   (strip)  {od.name:24} not needed (light-ink wordmark)")
    print("  tone is a mean-luminance guess; set tourBrands `logo` from the file itself")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("palette"); p.add_argument("image"); p.add_argument("--top", type=int, default=8); p.set_defaults(fn=palette)
    p = sub.add_parser("trim"); p.add_argument("src"); p.add_argument("code"); p.add_argument("--key-white", action="store_true"); p.add_argument("--width", type=int, default=800); p.add_argument("--out"); p.set_defaults(fn=trim)
    p = sub.add_parser("lighten"); p.add_argument("src"); p.add_argument("out"); p.add_argument("--keep", nargs="*", default=[]); p.add_argument("--tolerance", type=float, default=60); p.set_defaults(fn=lighten)
    p = sub.add_parser("on-dark"); p.add_argument("code"); p.add_argument("--keep", nargs="*", default=[]); p.add_argument("--tolerance", type=float, default=60); p.set_defaults(fn=on_dark)
    p = sub.add_parser("icon"); p.add_argument("src"); p.add_argument("code"); p.add_argument("--bg"); p.add_argument("--margin", type=int, default=22); p.add_argument("--out"); p.set_defaults(fn=icon)
    p = sub.add_parser("check"); p.add_argument("code"); p.set_defaults(fn=check)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
