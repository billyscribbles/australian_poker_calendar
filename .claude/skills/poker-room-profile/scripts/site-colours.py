#!/usr/bin/env python3
"""Read a poker room's brand colours off its own website. Dependency-free.

  python3 .claude/skills/poker-room-profile/scripts/site-colours.py <url> [--top N]

Fetches the page and every stylesheet it links, then prints:
  - named CSS custom properties that look like brand tokens (--primary, --accent,
    --brand, --color-*), with their values
  - the most-used hex colours across the stylesheets, greys separated from colour
  - <meta name="theme-color">, and the logo images the page references

Frequency is a lead, not an answer: the most common colour is usually the page
background. The brand colour is the one on the nav, the buttons and the logo;
confirm it against `brand-assets.py palette <logo>`.
"""

import re
import sys
import urllib.request
from collections import Counter
from urllib.parse import urljoin

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "replace")


def expand(h: str) -> str:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return "#" + h.upper()


# Framework defaults that every Bootstrap / MDB / Material site carries whether or
# not it uses them. They are never the room's brand; drop them from the tally.
FRAMEWORK = set(
    """#0D6EFD #6610F2 #6F42C1 #D63384 #DC3545 #FD7E14 #FFC107 #198754 #20C997 #0DCAF0
    #6C757D #007BFF #28A745 #17A2B8 #F44336 #E91E63 #9C27B0 #673AB7 #3F51B5 #2196F3
    #03A9F4 #00BCD4 #009688 #4CAF50 #8BC34A #CDDC39 #FFEB3B #FF9800 #FF5722 #795548
    #607D8B #00C851 #4285F4 #AA66CC #FFBB33 #FF4444 #33B5E5 #2BBBAD #FF8800 #CC0000
    #007E33 #0099CC #9933CC #0D47A1 #FF3547 #00695C #FFA000 #4B515D #3B5998 #55ACEE
    #DD4B39 #0082CA #FF6F00 #1565C0 #C51162 #D81B60 #8E24AA #5E35B1 #1976D2 #00B74A
    #F93154 #39C0ED #FFA900 #1266F1 #B23CFD""".split()
)


def is_grey(h: str) -> bool:
    r, g, b = (int(h[i : i + 2], 16) for i in (1, 3, 5))
    return max(r, g, b) - min(r, g, b) < 18


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    url = sys.argv[1]
    top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 12
    html = fetch(url)

    sheets = [urljoin(url, m) for m in re.findall(r'<link[^>]+rel=["\']?stylesheet["\']?[^>]*href=["\']([^"\']+)', html, re.I)]
    sheets += [urljoin(url, m) for m in re.findall(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\']?stylesheet', html, re.I)]
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.S | re.I))
    for s in dict.fromkeys(sheets):
        try:
            css += "\n" + fetch(s.replace("&amp;", "&"))
        except Exception as e:  # noqa: BLE001
            print(f"  (skipped {s[:80]}: {e})")
    print(f"{url}\n  {len(set(sheets))} stylesheet(s), {len(css) // 1024} KB of CSS\n")

    theme = re.findall(r'<meta[^>]+name=["\']theme-color["\'][^>]+content=["\']([^"\']+)', html, re.I)
    if theme:
        print("theme-color:", ", ".join(theme), "\n")

    tokens = Counter()
    for name, val in re.findall(r"(--[\w-]*(?:primary|secondary|accent|brand|colou?r)[\w-]*)\s*:\s*([^;}]+)", css, re.I):
        tokens[(name.strip(), val.strip()[:40])] += 1
    if tokens:
        print("brand-looking custom properties:")
        for (name, val), n in tokens.most_common(top):
            print(f"  {name}: {val}  (x{n})")
        print()

    hexes = Counter(expand(h) for h in re.findall(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b", css))
    colour = [(h, n) for h, n in hexes.most_common() if not is_grey(h) and h not in FRAMEWORK]
    grey = [(h, n) for h, n in hexes.most_common() if is_grey(h)]
    print("most used colours (not grey, framework defaults dropped):")
    for h, n in colour[:top]:
        print(f"  {h}  x{n}")
    print("most used greys / blacks / whites:")
    for h, n in grey[: max(4, top // 2)]:
        print(f"  {h}  x{n}")

    logos = [urljoin(url, m) for m in re.findall(r'<img[^>]+src=["\']([^"\']*logo[^"\']*)', html, re.I)]
    logos += [urljoin(url, m) for m in re.findall(r'<link[^>]+rel=["\'](?:icon|apple-touch-icon)["\'][^>]+href=["\']([^"\']+)', html, re.I)]
    if logos:
        print("\nlogo / icon files on the page:")
        for l in dict.fromkeys(logos):
            print(f"  {l}")


if __name__ == "__main__":
    main()
