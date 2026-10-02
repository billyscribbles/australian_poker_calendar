"""Generate the SEO skill audit flow diagram for the README."""
from PIL import Image, ImageDraw, ImageFont
import math

SCALE = 2
TARGET_W, TARGET_H = 900, 520

def s(val):
    return int(val * SCALE)

# Colors — green-tinted palette to match SEO/growth theme
BG = (13, 17, 23)
CARD_BG = (22, 27, 34)
BORDER = (48, 54, 61)
TEXT = (201, 209, 217)
TEXT_DIM = (125, 133, 144)
GREEN = (74, 158, 95)
GREEN_LIGHT = (126, 231, 135)
GREEN_BG = (26, 46, 34)
BLUE = (88, 166, 255)
WHITE = (240, 246, 252)

# Fonts
font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", s(22))
font_heading = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", s(14))
font_body = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", s(12))
font_small = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", s(10))
font_mono = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", s(11))
font_mono_sm = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", s(9))

img = Image.new("RGB", (s(TARGET_W), s(TARGET_H)), BG)
draw = ImageDraw.Draw(img)

def make_node(x, y, w, h):
    return {
        "rect": (s(x), s(y), s(x + w), s(y + h)),
        "top": (s(x + w / 2), s(y)),
        "bottom": (s(x + w / 2), s(y + h)),
        "left": (s(x), s(y + h / 2)),
        "right": (s(x + w), s(y + h / 2)),
        "center": (s(x + w / 2), s(y + h / 2)),
    }

def draw_arrow(start, end, color, width=2, head_size=8):
    w = s(width)
    hs = s(head_size)
    draw.line([start, end], fill=color, width=w)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    x, y = end
    for da in [2.5, -2.5]:
        ax = x - hs * math.cos(angle + da)
        ay = y - hs * math.sin(angle + da)
        draw.line([(x, y), (int(ax), int(ay))], fill=color, width=w)

# === LAYOUT ===

# Title
draw.text((s(TARGET_W / 2), s(28)), "/seo audit flow", font=font_title, fill=WHITE, anchor="mm")

# Step 1: Invoke
step1 = make_node(50, 65, 160, 50)
# Step 2: Read HTML
step2 = make_node(280, 65, 160, 50)
# Step 3: Audit
step3 = make_node(510, 65, 160, 50)
# Step 4: Report
step4 = make_node(740, 65, 120, 50)

# Draw arrows between top row
draw_arrow(step1["right"], step2["left"], GREEN)
draw_arrow(step2["right"], step3["left"], GREEN)
draw_arrow(step3["right"], step4["left"], GREEN)

# Draw step boxes
for i, (node, label, sublabel) in enumerate([
    (step1, "/seo", "invoke skill"),
    (step2, "Read HTML", "scan all pages"),
    (step3, "Audit", "check 9 categories"),
    (step4, "Report", "pass/fail table"),
]):
    draw.rounded_rectangle(node["rect"], radius=s(8), fill=CARD_BG, outline=GREEN if i == 0 else BORDER, width=s(1))
    draw.text(node["center"], label, font=font_heading, fill=WHITE if i == 0 else TEXT, anchor="mm")
    draw.text((node["center"][0], node["rect"][3] + s(8)), sublabel, font=font_small, fill=TEXT_DIM, anchor="mm")

# === CHECKLIST GRID (3 columns x 3 rows) ===
grid_top = 160
col_w = 260
row_h = 100
col_gap = 30
left_margin = 40

checks = [
    ("Meta Tags", ["<title> 50-60 chars", "<meta description> 150-160 chars", "<link rel=canonical>"], GREEN_LIGHT),
    ("Open Graph", ["og:title, og:description", "og:image 1200x630", "og:url, og:type, og:site_name"], BLUE),
    ("Twitter Cards", ["twitter:card summary_large_image", "twitter:title, twitter:description", "twitter:image"], BLUE),
    ("JSON-LD Schema", ["Person + WebSite (homepage)", "CreativeWork (project pages)", "No deprecated types"], GREEN_LIGHT),
    ("Site Files", ["robots.txt with sitemap ref", "sitemap.xml with all URLs", "lastmod dates current"], GREEN_LIGHT),
    ("Images", ["Descriptive alt text", "loading=lazy below fold", "WebP, <200KB"], TEXT),
    ("Content", ["One h1 per page, name in body", "h1 > h2 > h3 hierarchy", "Internal cross-links"], TEXT),
    ("Technical", ["HTTPS on all links", "Trailing slash consistency", "No broken links"], TEXT),
    ("Post-Deploy", ["Google Search Console", "Submit sitemap", "Test OG card previews"], TEXT),
]

for idx, (title, items, accent) in enumerate(checks):
    col = idx % 3
    row = idx // 3
    x = left_margin + col * (col_w + col_gap)
    y = grid_top + row * (row_h + 12)

    node = make_node(x, y, col_w, row_h)
    draw.rounded_rectangle(node["rect"], radius=s(6), fill=CARD_BG, outline=BORDER, width=s(1))

    # Accent bar on left
    draw.rectangle((s(x), s(y) + s(6), s(x) + s(3), s(y + row_h) - s(6)), fill=accent)

    # Title
    draw.text((s(x + 14), s(y + 12)), title, font=font_heading, fill=accent, anchor="lm")

    # Items
    for j, item in enumerate(items):
        iy = y + 26 + j * 22
        draw.text((s(x + 18), s(iy)), item, font=font_mono_sm, fill=TEXT_DIM, anchor="lm")

# Arrow from report down to grid
draw.line([
    (s(800), s(115)),
    (s(800), s(145)),
    (s(TARGET_W / 2), s(145)),
], fill=GREEN, width=s(1))
draw_arrow((s(TARGET_W / 2), s(145)), (s(TARGET_W / 2), s(160)), GREEN, width=1, head_size=6)

# Bottom note
draw.text((s(TARGET_W / 2), s(TARGET_H - 16)),
    "Claude reads your HTML, checks everything above, reports what's missing, and fixes it.",
    font=font_small, fill=TEXT_DIM, anchor="mm")

# Save
final = img.resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
final.save("C:/Users/aaron/Documents/c-projects/seo-skill/assets/audit-flow.png", quality=95)
print("Done: assets/audit-flow.png")
