# Uplands Retail — Design System Reference

Extracted from https://uplandsretail.co.uk (homepage clone in `site/`).
Stack: WordPress 6.3.5, Uncode theme (UNDSGN) + Uncode Child, MegaMenu, Smart Slider 3 Pro.

## View the clone

Open **http://localhost:8748/home.html** (server: `cd site/uplandsretail.co.uk && python3 -m http.server 8748`), or double-click `site/uplandsretail.co.uk/home.html` — fully offline.

Note: `index.html` in the same folder belongs to a separate Site Induction form project (Next.js app on port 8747) that shares this directory — the homepage clone lives in `home.html` to avoid collisions.

## Brand colors

| Token | Hex | Usage |
|---|---|---|
| **Brand magenta** | `#b0008e` | Primary accent — buttons, links, hover states (most-used accent by far) |
| Black | `#000000` | Headings (`h2`), strong text on light |
| White | `#ffffff` | Backgrounds, button backgrounds, overlay titles |
| Dark gray | `#303133` / `#1b1d1f` / `#141618` | Dark sections / footer surfaces |
| Mid gray | `#777777` | Secondary body text |
| Light gray | `#f7f7f7` / `#eaeaea` / `#dddddd` | Section backgrounds, borders, dividers |
| Support grays | `#999999`, `#444444` | Meta text, captions |

## Typography

| Role | Family | Weight | Notes |
|---|---|---|---|
| H1, H2, H5, H6 | Roboto Slab (serif) | 700 | h2 forced to 29px / weight 300 / black in child theme |
| H3, H4 | Roboto Slab (serif) | 400 | |
| Body copy (`p`) | Roboto (sans) | default | line-height 1.5 |
| Links & bold in body (`p a`, `p strong`) | FF DIN Std Bold (self-hosted) | normal | signature look of inline links/bold |
| Nav menu | Roboto | 400 | UPPERCASE transform |
| Buttons / `.btn-link` | Roboto | 700 | |

Fonts are self-hosted in the clone:
- Google Fonts (Roboto Slab variable 100–900, Roboto multi-weight incl. italics): `site/uplandsretail.co.uk/wp-content/themes/uncode-child/google-fonts.css` + `webfonts/google/*.woff2`
- FF DIN Std Regular/Bold (brand font): `wp-content/themes/uncode-child/webfonts/361DBC_0_0.*` (Regular), `361DBC_1_0.*` (Bold)

```css
@font-face {
  font-family: 'FFDINStdRegular';
  src: url('webfonts/361DBC_0_0.eot');
  src: url('webfonts/361DBC_0_0.eot') format('embedded-opentype'),
       url('webfonts/361DBC_0_0.woff2') format('woff2'),
       url('webfonts/361DBC_0_0.woff') format('woff'),
       url('webfonts/361DBC_0_0.ttf') format('truetype');
}
/* FFDINStdBold = webfonts/361DBC_1_0.* */
```

## Layout

- Content container: **max-width 1200px**, centered
- Mobile logo height: 40px (<960px)
- Header nav breakpoint: 959/960px (Uncode standard)
- Body text line-height: 1.5; pullquotes: 1.4, small text 18px

## Components

**Buttons** (light style): white background, brand-magenta text `color:#b0008e`, padding `13px 20px`.
```css
.btn-default { background: white; padding: 13px 20px; color: #b0008e; }
```

**Breadcrumbs**: uppercase, separator `›`, borderless row.

**Portfolio/news cards**: hover reveals overlay text (`opacity:1`), white title text; read-more button pinned bottom (absolute, 20px); entry text block min-height 230px.

**Project details list**: icon bullets via left background-image (11% size) — `building.svg`, `clock.svg` in uncode-child.

**Quotes**: `.quote-white` (white 20px Roboto Slab on dark) / `.quote-black` (black 20px on light).

## Key CSS files (in clone)

| File | Purpose |
|---|---|
| `wp-content/themes/uncode/library/css/style.css` | Full Uncode framework (~900KB) |
| `wp-content/themes/uncode/library/css/style-custom.css` | Theme-generated custom styles/colors (~268KB) |
| `wp-content/themes/uncode-child/style.css` | **Hand-written client overrides — the real design decisions live here** |
| `wp-content/uploads/maxmegamenu/style.css` | Mega menu styling |
| Inline `<style>` blocks in `index.html` | Page-specific tweaks (container width, nav uppercase, typography overrides) |

## Notes / known gaps

- **Photography is placeholder stock** — all 11 site photos (17 files incl. size variants) were replaced with themed Pexels images, overwritten in place so every relative reference (`src`, `srcset`, CSS `background-image`) still works. Logos/icons/SVGs are original.
- Internal links to other pages (careers/, projects/, etc.) point at the live site or dead paths — only the homepage was cloned.
- Modern Slavery Policy PDF (footer) is bot-blocked upstream (403), not downloaded.
- Original child theme imported fonts.com JS (`/count/361dbc`) — dropped; not needed offline.
