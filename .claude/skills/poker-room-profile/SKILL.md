---
name: poker-room-profile
description: Use when a poker room, tour or operator needs its brand profile on the Australian Poker Calendar — a new tour code appears in festivals.js, the calendar shows a striped placeholder or the site's gold instead of the room's colours, `yarn status` reports "has no brand profile or tour tile", a room rebrands, or its logo looks wrong on a bar, circle, strip or rooms marquee.
---

# Poker room profile

A room's profile is **one colour record, one tour entry, one accessible name,
and a logo set**. Every calendar surface reads those through the tour `code`;
nothing is styled per room in CSS or components, and nothing else is edited.

| Piece             | Where                                   | Read by                                                       |
| ----------------- | --------------------------------------- | ------------------------------------------------------------- |
| Colours           | `src/content/tourBrands.js`             | bar gradient, circle ring and backing, rooms-strip glow, admin |
| Tour entry        | `src/content/calendarPage.js` `tours[]` | TourLogo, tour strip, rooms strip, JSON-LD organiser, admin   |
| Room name         | `src/content/pokerRooms.js` `names`     | the rooms marquee link text (screen readers)                  |
| Mono registration | `scripts/gen-tour-mono.py` `PNG_MARKS`  | generates the grey wordmark                                   |

`<CODE>` is upper case in content, the file stem `<code>` lower case. The code
must already have rows in `src/content/festivals.js`; a brand without a tour
entry fails a test, and a tour entry without rows is an empty tile.

## The logo set (`public/images/tours/`)

| File                 | Shape                                                                                  | Surface                                                         | Needed                        |
| -------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------- |
| `<code>.png`         | the lockup, transparent, trimmed to its art, about 800px wide, **light ink**           | timeline bars over the brand gradient, rooms strip, tour strip on hover | always                 |
| `<code>-icon.png`    | 256×256, the **square glyph only** (crown, spade, badge), transparent, 22px margin     | 44px circle beside names, list rows, Up Next                    | always                        |
| `<code>-mono.png`    | the wordmark in one grey, generated                                                    | tour strip at rest                                              | always                        |
| `<code>-on-dark.png` | the wordmark with its ink turned white, brand gold kept                                | rooms strip only, via `pokerRooms.js` `overrides`               | only for a dark-ink `<code>.png` |

Rules that come from how the surfaces draw:

- **Wordmark on a dark bar.** The bar fades from the card surface into the brand colour; navy or black ink vanishes there. Ship the lockup with its dark ink turned white and the brand's gold or accent kept (Crown, Star, PlayLive), `logo: 'light'`. Keep a dark lockup only when the mark carries enough colour to read on its own (Aurum's blue spade), `logo: 'dark'`, and then it also needs the on-dark file and an `overrides` entry for the strip, because every strip tile is the same dark card.
- **Icon is a glyph, not the lockup.** A wordmark squeezed into a 44px circle is a smear. Cut the symbol out of the operator's logo file. A disc or tile that is its own backing (NPL's badge, APL's and APT's squares) is shipped full-bleed with `--margin 0`.
- **`iconBg` is the circle's backing.** White ink wants the brand's dark, dark ink wants `#FFFFFF` (Kings' black crown), a full-bleed mark wants its own ground.
- **`primary`** is the colour the room is known by: the mark's main ink, or the nav colour when the mark is white or black. **`secondary`** is the supporting colour: the buttons, the site accent, the logo gradient's second stop. The site's most-used colour is usually the page background, not the brand.
- The mono script handles PNG only; read its docstring before registering anything else.

## Steps

1. **Site, logo, record.** The tour `website` is the room's poker page; a
   festival row's `source` stays the listing it came from. If the operator is
   in `data/poker-series-timeline.json`, `organisers[].brand` is the room's
   `name`; a club tour the scrape does not list uses its trading name, and
   `data/` is never hand-edited for it.
   ```bash
   python3 .claude/skills/poker-room-profile/scripts/site-colours.py https://example-room.com.au/
   ```
   prints the stylesheet colour tally with framework defaults dropped, any
   brand-named custom properties, `theme-color`, and the logo files the page
   references. Download the largest logo (SVG preferred) into the scratchpad
   with `curl -sL -A Mozilla/5.0`; originals are never committed. Firecrawl or
   the Chrome tools are the fallback for a site that renders its chrome
   client-side.
2. **Cut the assets** (helper: `python3 .claude/skills/poker-room-profile/scripts/brand-assets.py`, `--help` lists every command):
   ```bash
   brand-assets.py trim <original> <code> [--key-white]              # <code>.png, trimmed; keys out a white ground
   brand-assets.py palette public/images/tours/<code>.png            # confirm primary/secondary against the mark
   brand-assets.py lighten public/images/tours/<code>.png public/images/tours/<code>.png --keep <GOLD>   # dark ink -> white
   brand-assets.py icon <glyph.png> <code> [--margin 0] [--bg HEX]   # <code>-icon.png
   brand-assets.py on-dark <code> --keep <GOLD>                      # dark-ink wordmarks only
   python3 scripts/gen-tour-mono.py                                  # after "<code>": False|True in PNG_MARKS (True = dark ink)
   brand-assets.py check <code>
   ```
   For a two-tone badge inside the lockup (white letters on a navy disc), keep
   the disc colour too, or the letters and disc both go white. When the disc
   and the text share one colour, crop the badge off the wordmark before
   lightening; the icon carries the badge. The mono script
   regenerates every mark; others come out byte-identical, and any that do not
   are reverted so the commit stays one concern. Open every file and look at
   it; `check` only guesses tone.
3. **Write the profile.** In `tourBrands.js` add `<CODE>` with `primary`,
   `secondary`, `logo`, `iconBg`, `source` (the page and file each colour came
   from) and a two-line comment on what the colours are, in the order the tour
   sits in `calendarPage.tours`. Add the tour entry there: `code`, `label`,
   `name`, `href` `/tours/<slug>`, `website`, `logoSrc`, `iconSrc`,
   `monoSrc`. Add `names.<CODE>` in `pokerRooms.js`, worded as the operator
   names itself, and an `overrides` entry only with an on-dark file. Add the
   sampled values to the tour-brand-profiles memory if one is kept. Up Next
   placement is a separate job that `yarn status` raises; it is not part of
   the profile.
4. **Verify.** `yarn status` has no "has no brand profile or tour tile" job for
   the code and the admin tours table shows logo, icon, mono and both colour
   tags. Then `yarn test` (tourBrands, calendarPage, pokerRooms and seriesStatus
   pin every field and file), `yarn lint && yarn format:check`, `yarn build`,
   and eyeball `/poker-calendar/<year>` bars and the home rooms strip at 375
   and 1280.
5. **Commit the room as one change**, files named explicitly: colours, tour
   entry, room name, mono registration, the three or four image files, and
   the room's festival rows if still uncommitted, in the shape of `0ed409e`
   (NPL). A data rescrape is its own earlier commit.

## Common mistakes

- Colours from a screenshot or memory. Read the site's CSS and the logo file, and record both in `source`.
- The whole lockup in `-icon.png`.
- A dark lockup shipped as `<code>.png` with `logo: 'light'`, or the reverse: the mono script inverts on that flag and the admin picks its preview backing from it.
- `PNG_MARKS` forgotten: the test fails on the missing `-mono.png`, not on the script.
- An `overrides` entry for a light-ink wordmark, or a white strip card instead of an on-dark lockup.
- Tour colours or per-room selectors written into CSS or components.
