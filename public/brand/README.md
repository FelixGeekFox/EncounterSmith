# Brand asset slots

This folder is where the final EncounterSmith brand assets belong. Nothing in it
is a production asset yet.

## Why the logo is typographic for now

The only brand material supplied for this build was a flattened brand-guide
image. Cropping fragments out of that image would produce low-resolution,
off-palette assets, and redrawing the illustrated anvil-and-d20 logo by hand
from a flattened raster would produce an approximation rather than the real
mark. Neither is acceptable in production, so the site currently ships:

- **Wordmark** — `src/components/Wordmark.astro`. Typographic, set in Cinzel,
  with the "For Bolder Games" rule beneath it. Temporary.
- **Monogram** — `src/components/Monogram.astro`. An original inline SVG ring
  with an ES lockup. Temporary, and deliberately not an imitation of the
  illustrated monogram in the guide.
- **Favicon** — `public/favicon.svg`. An original d20 outline. Temporary.
- **Hero art** — `src/components/HeroPanel.astro`. An original CSS and SVG
  composition (ridges, dashed map route, pines, a lit d20). Temporary.
- **Open Graph image** — `public/images/og-default.svg`. Temporary.

All five are designed to be replaced without touching page markup.

## What still needs to be supplied

| Slot | File to add here | Notes |
| --- | --- | --- |
| Primary logo (with tagline) | `logo-primary.svg` | Vector, transparent background. Replace the `<Wordmark />` usage in `Header.astro` and `Footer.astro`. |
| Logo, single colour | `logo-mono.svg` | For dark panels and print. |
| Monogram mark | `monogram.svg` | Replaces `Monogram.astro`. |
| Icon mark (circular) | `icon-mark.svg` | The roundel version from the guide. |
| Favicon set | `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` (180×180) | The SVG in `public/` is temporary. |
| PWA icons | `icon-192.png`, `icon-512.png` | Then add them to `public/site.webmanifest`, which currently lists only the SVG. |
| Open Graph image | `public/images/og-default.png` (1200×630) | **Important:** several social platforms will not render an SVG Open Graph image. Ship a PNG and update `ogImage` in `src/data/site.ts`. |
| Hero illustration | `public/images/hero.*` | Optional. If supplied, swap the `<svg>` inside `HeroPanel.astro` for an `<img>` with explicit `width` and `height` so nothing shifts while it loads. |
| Product covers | `public/images/products/<slug>.*` | Then set `coverImage` on the matching entry in `src/data/products.ts`. Cards fall back to a woven placeholder until you do. |

## Rules for whatever replaces these

- No artwork hotlinked from another website.
- No Dungeons & Dragons artwork, setting material, monsters or trade dress.
- No fragments cropped out of the brand-guide image treated as production files.
- Keep the palette in `src/styles/global.css` as the source of truth; assets
  should match it rather than the other way round.
