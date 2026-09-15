# EncounterSmith

> Turn ideas into encounters. Build tonight's session in minutes.

The EncounterSmith website: original, system-friendly tabletop RPG tools for
busy Game Masters. Free NPC, encounter and tavern generators, a catalogue of
adventure packs, and a founding list for the planned Smith+ tier.

Built with [Astro](https://astro.build) in strict TypeScript, output as static
files, with a small amount of vanilla JavaScript for the generators. No UI
framework, no third-party scripts, no runtime font requests. The whole site
ships about **43 KB of JavaScript**, and most pages ship none of it.

---

## Contents

- [Phase 1 scope](#phase-1-scope)
- [Technical stack](#technical-stack)
- [Local setup](#local-setup)
- [Commands](#commands)
- [Folder architecture](#folder-architecture)
- [Design system](#design-system)
- [Asset workflow](#asset-workflow)
  - [What was supplied and how each file is used](#what-was-supplied-and-how-each-file-is-used)
  - [Replacing the logo](#replacing-the-logo)
  - [Updating the banner](#updating-the-banner)
  - [Adding product art](#adding-product-art)
- [Configuration](#configuration)
- [Deploying](#deploying)
- [Editing the generator tables](#editing-the-generator-tables)
- [Adding a product](#adding-a-product)
- [Connecting a checkout provider](#connecting-a-checkout-provider)
- [Connecting an email provider](#connecting-an-email-provider)
- [Accessibility](#accessibility)
- [Legal review still required](#legal-review-still-required)
- [Smith+ features that are not implemented](#smith-features-that-are-not-implemented)
- [Suggested Phase 2 architecture](#suggested-phase-2-architecture)

---

## Phase 1 scope

A static commercial-validation site with genuinely useful free tools. It is
deliberately **not** a subscription product yet.

| Route | What it is |
| --- | --- |
| `/` | Home: hero, Tonight's Spark, free tools, how it works, packs, Smith+, free resource, FAQ |
| `/tools` | Index of the three generators and their shared behaviour |
| `/tools/npc-generator` | NPC generator, nine fields |
| `/tools/encounter-generator` | Encounter generator, eight fields |
| `/tools/tavern-generator` | Tavern generator, nine fields |
| `/products` | Product catalogue with honest availability states |
| `/free-resources` | The 25 plot hooks in full, the tools, session-prep guidance, launch list |
| `/smith-plus` | What exists now versus what is planned, and the founding list |
| `/faq` | Full FAQ and the compatibility statement |
| `/privacy`, `/terms` | Legal pages (see [legal review](#legal-review-still-required)) |
| `/404` | Branded "You've wandered off the map" page |
| `/robots.txt`, `/sitemap-index.xml` | Generated from the configured site URL |

**Deliberately not built:** accounts, login, subscription billing, saved
campaigns, a server-side database, entitlement checking, an admin panel, a fake
checkout, a fake email success message, or any AI generation.

**Honesty rules this codebase follows.** No control exists that only shows a
message. No form reports success unless it genuinely posted somewhere. No price
is presented as purchasable when there is nothing to purchase. Every visible
sentence addresses a Game Master, never the site owner. A test in
`tests/tables.test.ts` and a sweep in `verify.mjs` both enforce the last one.

---

## Technical stack

- **Astro 5**, static output, `astro check` in the build
- **TypeScript** in strict mode, plus `noUncheckedIndexedAccess`,
  `noUnusedLocals`, `noImplicitReturns` and `verbatimModuleSyntax`
- **Vanilla TypeScript** for the three generators and the spark panel; no React,
  Vue, Svelte or Tailwind anywhere
- **Fontsource** for self-hosted Cinzel and Lato
- **Vitest** for the generator engine and the data tables
- **Playwright** for the end-to-end check in `verify.mjs`
- **Pillow** (Python) for the asset pipeline in `tools/build-assets.py`

---

## Local setup

Requires **Node 18.20.8 or newer** (Node 20+ recommended) and npm. Python 3 with
Pillow is only needed if you re-run the asset pipeline.

```bash
npm install
cp .env.example .env    # optional locally; sensible defaults apply
npm run dev             # http://localhost:4321
```

There are no secrets in `.env`: every variable is a `PUBLIC_` value compiled
into the static output. Never put an API key in it.

On Windows the same commands work from PowerShell or Command Prompt in the
project folder.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | `astro check` then a production build into `dist/` |
| `npm run build:fast` | Build without the type check |
| `npm run preview` | Serve the built `dist/` exactly as deployed |
| `npm run check` | Type check only |
| `npm test` | Unit tests for the forge and the data tables |
| `npm run verify` | Type check, tests and build in one go |
| `npm run assets` | Rebuild every derived asset from the originals |

An end-to-end browser check also lives in `verify.mjs`. Start
`npm run preview -- --port 4330` in one terminal, then `node verify.mjs` in
another. It needs Playwright installed and checks routes, metadata, headings,
links, images, four viewport widths, the mobile menu, all three generators
(including lock, reroll, copy and the copy-failure path), the spark, the
no-JavaScript experience and the banned-phrase sweep.

---

## Folder architecture

```
src/
  components/        Presentational Astro components
    Emblem.astro     The supplied brand emblem, sized and served as webp/png
    HeroArt.astro    The illustrated half of the supplied banner
    GeneratorShell.astro  Server-rendered generator markup (no logic)
    ...
  layouts/
    BaseLayout.astro Document shell, fonts, metadata, skip link, landmarks
    ToolLayout.astro Shared furniture for the three generator pages
  data/              Content and configuration. No markup lives here.
    site.ts          Central configuration, feature flags, brand asset paths
    products.ts      Catalogue and the call-to-action logic
    tools.ts         Generator metadata for listing pages
    faq.ts           Questions and answers
    generators/      The random tables themselves
  lib/
    url.ts           Base-path aware link and asset helpers
  scripts/
    generator.ts     The forge: pure logic, no DOM, unit tested directly
    generator-ui.ts  Browser wiring only
    clipboard.ts     Copy helper with an honest failure path
  pages/             One file per route
  styles/
    global.css       Design tokens and base styles
    generator.css    The forge panel, loaded only where one appears
.github/workflows/
  deploy.yml         Build, test and publish to GitHub Pages on push to main
public/
  brand/             Emblem, favicons and app icons
  images/            Hero artwork and the social card
  textures/          Parchment grain
  manifest.webmanifest
tools/build-assets.py  Derives everything in public/ from the source artwork
docs/brand-guide.jpg   Reference only; not used on the site
tests/                 Vitest suites
verify.mjs             End-to-end browser check
```

The separation is deliberate: **content** lives in `src/data`, **presentation**
in `src/components` and `src/styles`, and **logic** in `src/scripts/generator.ts`,
which has no DOM access at all and is therefore testable on its own. Someone who
does not write TypeScript can still edit the tables.

---

## Design system

`src/styles/global.css` states the seven brand colours once, then defines
semantic aliases (`--color-background`, `--color-surface`, `--color-surface-dark`,
`--color-text`, `--color-heading`, `--color-primary`, `--color-accent`,
`--color-border`, `--color-focus`, and the rest). Components refer only to the
aliases; no hex codes are scattered through component styles.

Two derived values matter. `--clay-ink` and `--bronze-ink` are darkened
versions of Clay and Bronze: at brand strength neither reaches 4.5:1 against
parchment, so those two carry any text and the brand values stay on rules,
borders and ornament.

Recurring devices, all taken from the supplied artwork rather than invented:

- **The plate** (`.plate`) — a bronze frame with an inner ink rule and small
  bronze corner diamonds, lifted from the banner's border treatment. Used on the
  few surfaces that should read as a mounted panel, not on every block.
- **The diamond rule** under every section heading, from the separators in the
  brand guide.
- **The four-word rhythm** along the foot of the footer, from the
  `Create · Explore · Build · Together` line painted along the bottom of the
  banner.
- **Parchment** as the page ground, from real paper sampled out of the banner.

Typography is Cinzel for display and Lato for body, both bundled through
Fontsource and served from this domain. Cinzel is used selectively: headings,
the wordmark, product names, and the headline slot of a generated result.

---

## Asset workflow

Everything under `public/brand`, `public/images` and `public/textures` is
**derived**, not hand-made. `tools/build-assets.py` reads the three originals
and writes every production file, so the pipeline is repeatable and the
originals are never modified.

```bash
# Point it at wherever the originals live, then run it.
ES_ASSET_SRC="/path/to/EncounterSmith/Assests" npm run assets
```

The script records its crop geometry in constants at the top of the file, so a
crop can be adjusted without guessing.

### What was supplied and how each file is used

The assets folder contained three files.

**`Banner.png` — 2172 × 724, RGB.** A finished 3:1 banner: a parchment panel on
the left carrying the circular emblem, the wordmark, the tagline and a *painted*
"Explore the tools" button, with an illustrated cartographer's desk on the
right.

Used in two ways:

1. **The hero artwork** (`public/images/hero-scene-*.{webp,png}`). The
   illustration is taken from x = 1252 rightwards, at full height, which is the
   point where the painted type ends. Aspect ratio is preserved, nothing is
   stretched, and the "Better Encounters / Brighter Stories" hand lettering
   inside the illustration is kept, because it is a supporting brand phrase
   rather than a heading that would fight the real `<h1>` beside it. Three
   widths are generated and served through `srcset`.
2. **The social card** (`public/images/og-encountersmith.jpg`, 1200 × 630). The
   *whole* banner, letterboxed onto parchment rather than cropped, so the
   wordmark and tagline survive intact. A painted call to action is normal in a
   link preview and harmless there.

The full banner is deliberately **not** used as an on-page hero. It carries a
painted button, and putting a picture of a button next to a real one is exactly
the sort of thing this site is trying not to do. If a text-free version of the
banner is ever produced, `HeroArt.astro` is the single place to swap it in.

**`Logo.png` — 1254 × 1254, RGBA with transparency.** The emblem: an anvil under
a lit d20 with a quill, pines, mountains and a winding path, inside a green ring
on a rounded parchment tile.

This is the workhorse of the site. It appears in the header, the footer, the
page headers of every inner page as a quiet watermark, the Smith+ and 404
panels, and as the placeholder cover on every product card. It is also the
source for `favicon-32.png`, `favicon-64.png`, `apple-touch-icon.png` (180 × 180,
opaque, 6% inset) and the PWA icons at 192 and 512 (4% inset, flattened onto
parchment because several platforms composite transparent icons onto black).

**`ChatGPT Image Sep 15, 2026, 11_15_33 AM.png` — 1448 × 1086, RGB.** The brand
guide sheet: palette with hex values, the icon set, the pattern swatch, the
typography direction and three banner examples.

This is a **reference document, not a production asset**, and nothing on the
site links to it. It is kept at `docs/brand-guide.jpg` at a readable size, and
it is what the palette and typography in `global.css` were taken from. Two parts
of it would be genuinely useful as production files but cannot be used from
this image: the eight-icon set renders at roughly 55 px each here, far too small
to extract, and the pattern swatch is neither large enough nor seamless. Both
are listed in the launch checklist.

**The parchment texture** (`public/textures/parchment.webp`) is sampled from a
clean 256 × 90 patch of real paper inside `Banner.png`, mirrored into a
seamless 512 × 360 tile. It is laid under a parchment wash so it reads as paper
rather than as a repeating pattern, and long body copy always sits on a flatter
surface above it.

### Replacing the logo

Drop a new file in as the source and re-run the pipeline:

```bash
ES_ASSET_SRC="/path/to/assets" npm run assets
```

If the new logo has a different name, change `LOGO` at the top of
`tools/build-assets.py`. Nothing else needs editing: `Emblem.astro` reads its
paths from `site.brand` in `src/data/site.ts`.

If a **vector** wordmark is ever supplied, it belongs in `Wordmark.astro`, which
currently sets the name in Cinzel. That is a deliberate choice rather than a
gap: the supplied files have the wordmark baked onto opaque parchment, so
lifting it would mean matting a raster and losing crispness at every size, while
live type stays selectable, searchable and sharp on any display.

### Updating the banner

Replace `Banner.png` and re-run the pipeline. If the new banner has a different
layout, adjust `HERO_CROP` in `tools/build-assets.py` — it is a plain
`(left, top, right, bottom)` tuple in source pixels. Check the result, then
update the `alt` text in `src/components/HeroArt.astro`, which describes the
current illustration.

### Adding product art

Save each cover as 720 × 480 (3:2, the ratio the card crops to) under
`public/images/products/`, then set `coverImage` on the matching entry in
`src/data/products.ts`:

```ts
coverImage: '/images/products/emergency-session-kit.png',
```

Until then the card shows the house emblem on a forest plate, which is a stated
placeholder rather than invented cover artwork.

---

## Configuration

Everything environment-specific lives in `src/data/site.ts`, which reads
`PUBLIC_*` variables. `.env.example` documents all of them.

| Variable | Effect |
| --- | --- |
| `PUBLIC_SITE_URL` | Canonical links, Open Graph URLs, `robots.txt`, sitemap. **Set before launch.** |
| `PUBLIC_BASE_PATH` | Subdirectory the site is served from. Unset for a root deployment; `/EncounterSmith` for a GitHub Pages project site. |
| `PUBLIC_CONTACT_EMAIL` | Footer, FAQ and both legal pages |
| `PUBLIC_EMAIL_FORM_ACTION` | Where the sign-up forms post. Unset renders them inactive with an explanation. |
| `PUBLIC_EMAIL_PROVIDER` | Named in the privacy notice once a provider is connected |
| `PUBLIC_PRODUCT_*_URL` | A pack's checkout URL. Its presence changes the button. |
| `PUBLIC_PRODUCT_*_PREVIEW_URL` | A pack's preview URL |
| `PUBLIC_FEATURE_PRODUCTS` | Hides the products page and nav entry when false |
| `PUBLIC_FEATURE_SMITH_PLUS` | Hides the Smith+ page and home section when false |
| `PUBLIC_FEATURE_SMITH_PLUS_PRICE` | Only true once a real price *and* a real checkout exist |
| `PUBLIC_FEATURE_PRODUCT_SCHEMA` | Emits `Product` structured data, only for packs with a checkout |
| `PUBLIC_FEATURE_ANALYTICS` | No analytics script is loaded either way; this is the record of the decision |
| `PUBLIC_LEGAL_*` | Entity, jurisdiction, last-updated date, and whether the legal review has happened |

`site.brand` in the same file holds every brand asset path, so a new emblem or
social card is a one-line change rather than a search through components.

**Setting the public site URL.** Locally, put `PUBLIC_SITE_URL="http://localhost:4321"`
in `.env`. In production set it as a build environment variable on the host. No
trailing slash.

**One rule when adding a link or an asset.** Anything written by hand goes
through `path()` from `src/lib/url.ts`, or it breaks on the subdirectory
deployment. `Button`, `ToolCard`, `ProductCard`, `PageHeader`, `Header`,
`Footer`, `Emblem` and `HeroArt` already do it internally, so a logical path
like `/tools` is what you pass them. `path()` is idempotent, so passing an
already-prefixed value is harmless.

---

## Deploying

Pure static output, so no adapter is needed anywhere.

One thing decides everything: **is the site served from the root of a domain, or
from a subdirectory?** `PUBLIC_BASE_PATH` is how you say so, and
`src/lib/url.ts` makes every hand-written link and asset path follow it. Both
shapes are covered by the end-to-end check in `verify.mjs`.

### GitHub Pages (currently live)

`.github/workflows/deploy.yml` builds and publishes on every push to `main`. It
needs no secrets: the deploy uses the workflow's own OIDC token.

One-time setup in the repository:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push to `main`. The workflow type-checks, runs the tests, builds and
   publishes.

The site then lives at `https://<owner>.github.io/<repo>/`. A project site is
served from a subdirectory, so the workflow sets `PUBLIC_BASE_PATH` to the
repository name and `PUBLIC_SITE_URL` to the owner's Pages origin, both derived
from the repository itself.

Everything else is configured with **repository variables** (Settings → Secrets
and variables → Actions → Variables), so the contact address, feature flags and
product URLs change without editing a file or touching the code. Setting
`PUBLIC_SITE_URL` and `PUBLIC_BASE_PATH` as variables overrides the defaults,
which is what you want when a custom domain arrives: set `PUBLIC_SITE_URL` to
it and `PUBLIC_BASE_PATH` to `/`.

### Cloudflare Pages, Netlify, or any static host

These serve from the root, so leave `PUBLIC_BASE_PATH` unset.

1. Connect the repository.
2. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** set `NODE_VERSION` to `20` or newer if the default is older.
3. Add the `PUBLIC_*` variables that apply, for both Production and Preview. At
   minimum set `PUBLIC_SITE_URL` to the real domain in Production.
4. Deploy, then attach the custom domain.

Cloudflare Pages serves `dist/404.html` for unmatched routes automatically, so
the 404 page needs no extra configuration.

### Checking a subdirectory build locally

```bash
PUBLIC_SITE_URL="https://felixgeekfox.github.io" \
PUBLIC_BASE_PATH="/EncounterSmith" npm run build:fast

PUBLIC_BASE_PATH="/EncounterSmith" npm run preview -- --port 4331
VERIFY_ORIGIN=http://127.0.0.1:4331 VERIFY_BASE=/EncounterSmith node verify.mjs
```

---

## Editing the generator tables

Each generator is one file in `src/data/generators/`, shaped by the types in
`src/scripts/generator.ts`. To add an entry, add a string:

```ts
{
  id: 'want',
  label: 'Want',
  help: 'What they will act on tonight.',
  source: {
    kind: 'table',
    entries: [
      'to be out of the district before the frost, quietly',
      'your new entry here',
    ],
  },
},
```

### Tags, and how coherence is kept

An entry can carry `namespace:value` tags instead of being a plain string:

```ts
{ text: 'a flooded ford', tags: ['ground:water'] },
```

The generator declares how each namespace behaves across one result:

```ts
tagRules: { agree: ['ground'], unique: ['turn'] },
```

- **`agree`** — wherever the namespace appears in a result, the value must
  match. This is what pairs an underground situation with underground terrain
  instead of open water, and what stops a softly spoken NPC being handed a
  parade-ground voice.
- **`unique`** — at most one slot in a result may carry the namespace at all.
  This stops the current problem, the rumour and the hidden feature all
  describing the same piece of business.

Namespaces not listed in `tagRules` are ignored, so most entries need no tags.
A test asserts that every namespace actually used is declared, and that an
`agree` namespace appears on more than one field (otherwise it can never bind).

### Rules for new entries

- **Original only.** Nothing copied from a published book, table or adventure.
- **No protected names.** No settings, characters, monsters or trademarks
  belonging to another publisher. `tests/tables.test.ts` fails the build on a
  list of the most common ones, but that list is a safety net, not a licence.
- **System-friendly.** Describe people, places and situations, never statistics,
  dice or rules terms.
- **Keep `memory` below the smallest table.** It is how many recent values are
  held back per field; a test enforces the relationship.

Run `npm test` after editing. The suite checks minimum table sizes, duplicates,
tag declarations, and that 200 consecutive rolls always produce a complete
result.

---

## Adding a product

Add an entry to `products` in `src/data/products.ts`. Every field is typed, so
the editor will say if something is missing.

```ts
{
  slug: 'my-new-pack',
  name: 'My New Pack',
  subtitle: 'One line that sells it',
  description: 'A paragraph describing what a Game Master gets.',
  price: 9.95,
  currency: 'AUD',
  status: 'planned',            // 'available' | 'in-progress' | 'planned'
  coverImage: undefined,        // '/images/products/my-new-pack.png'
  previewUrl: link('PUBLIC_PRODUCT_MY_NEW_PACK_PREVIEW_URL'),
  purchaseUrl: link('PUBLIC_PRODUCT_MY_NEW_PACK_URL'),
  includedItems: ['What is inside, one line each'],
  systemCompatibility: 'System-friendly fantasy',
  tags: ['adventure'],
},
```

It then appears on `/products` and in the home preview with no markup changes.
Add the two new variables to `.env.example` at the same time.

The call to action comes from `ctaFor()`:

| Data present | Control |
| --- | --- |
| `purchaseUrl` | **Buy the pack** → the checkout |
| `previewUrl` only | **Preview the pack** → the preview |
| Neither | **Coming soon**, as a label, with a link to the launch list underneath |

There is deliberately no fourth case, and no disabled button that invites a
click.

---

## Connecting a checkout provider

Nothing is tied to a particular provider. When a pack has a product page on
Stripe, Gumroad, Payhip, itch.io or anywhere else:

1. Set the matching `PUBLIC_PRODUCT_*_URL`.
2. Change that pack's `status` to `'available'` in `src/data/products.ts`.
3. Redeploy.

The card switches to **Buy the pack**, the "not on sale yet" note disappears,
and the price stops being labelled as planned. For `Product` structured data,
also set `PUBLIC_FEATURE_PRODUCT_SCHEMA=true`; it is only emitted for packs that
have a real checkout URL.

---

## Connecting an email provider

The sign-up forms are plain HTML forms that POST to
`PUBLIC_EMAIL_FORM_ACTION`. There is no JavaScript interception, so the browser
performs a genuine submission and the provider's own confirmation page takes
over.

While the variable is unset the forms render **disabled**, with a visible
explanation that the list is not open and the contact address as an
alternative. In development only, a note also names the variable to set. Nothing
pretends to have worked, and no address is ever echoed back.

To connect one:

1. Create a form in your provider and copy its POST endpoint.
   - **MailerLite:** embedded form → the `<form action="...">` URL
   - **Kit:** form → HTML embed → the `action` URL
   - **Buttondown:** `https://buttondown.email/api/emails/embed-subscribe/<user>`
   - **Beehiiv:** embed → the `action` URL
2. Set `PUBLIC_EMAIL_FORM_ACTION`, and `PUBLIC_EMAIL_PROVIDER` to the provider's
   name (used in the privacy notice).
3. Check the field names it expects. The forms send `email` and a `source` field
   identifying which page the sign-up came from. A different field name is a
   one-line change in `src/components/NewsletterForm.astro`.
4. Redeploy, submit a test address, confirm it arrives.
5. Re-read `/privacy`: the email section changes automatically once the variable
   is set, but confirm the wording matches what the provider actually does.

### The lead magnet

The advertised "25 Session-Saving Plot Hooks" are **published in full** on
`/free-resources`, free and ungated, with copy and print buttons. That was a
deliberate decision: with no provider connected, a gated download would have
been a promise the site could not keep. If you later want them delivered by
email instead, that page is the place to change, and the honest version should
stay available either way.

---

## Accessibility

The site targets a practical WCAG 2.2 AA baseline:

- Semantic landmarks, a skip link as the first tab stop, one `<h1>` per page and
  no skipped heading levels (both checked in `verify.mjs`)
- Every form control labelled; generator slot buttons use `aria-describedby` to
  name the field they act on
- Lock state is never colour alone: the button carries a text label and
  `aria-pressed`, and the slot gains a "Locked" chip
- A polite `aria-live` region per generator, announcing rolls, rerolls, locks,
  and copy success *or failure*; focus moves into the result on the first roll
- Visible focus styles throughout, inverted on dark panels
- `prefers-reduced-motion` respected: transitions collapse and the result scroll
  becomes instant
- Touch targets at least 40 px tall, checked at 390 px
- The mobile menu ships open in the markup and is collapsed by script, so a
  visitor without JavaScript keeps every link

A manual screen-reader pass is still on the launch checklist.

---

## Legal review still required

**`/privacy` and `/terms` are preliminary and must be reviewed by a lawyer
before launch.** They are written in plain public-facing language and describe
how the site actually behaves today (no analytics, no cookies, no accounts,
nothing stored), so there is no developer placeholder text on either page. That
does not make them reviewed.

`PUBLIC_LEGAL_REVIEWED` records whether the review has happened. It does not
change what visitors see; it exists so the answer is written down somewhere
other than memory.

Both pages need revisiting the moment any of this changes:

- An email provider is connected (data starts flowing to a third party)
- Anything is sold (consumer guarantees, refunds, delivery, licensing)
- Analytics is added (disclosure, and possibly consent)
- The commercial-use licence for generated content is defined

That last point matters. The site currently says commercial reuse is **not**
licensed yet, and says so in the FAQ, the terms and on `/free-resources`. Do not
soften that wording until a real licence exists.

---

## Smith+ features that are not implemented

Everything on `/smith-plus` is planned, and the page says so in three places.
None of it exists:

- Deeper generator tables with regional and tonal variants
- Saved ideas organised by campaign
- Printable PDF and index-card exports
- Monthly content drops
- Campaign organisation

There is no account system, no billing, no price and no checkout. The only
working element on that page is the founding-list form, which is itself inactive
until an email provider is connected.

Also not implemented, and not advertised: user accounts, login, saved results
between visits, and entitlement checking for premium content.

---

## Suggested Phase 2 architecture

The current split makes the next step an addition rather than a rewrite.

**Stay static, add an edge layer.** Move from `output: 'static'` to
`output: 'hybrid'` with the Cloudflare adapter, so individual routes can opt in
to server rendering while everything public stays static and cached.

1. **Accounts.** Cloudflare Access, Clerk or Supabase Auth, whichever you would
   rather not maintain. Add `src/middleware.ts` to attach a session and keep it
   out of the public pages entirely.
2. **Storage.** Cloudflare D1 for relational data (users, entitlements, saved
   results) and KV for cheap reads. Both sit in the same account as Pages.
3. **Entitlements.** One `entitlements` table keyed by user and product. Stripe
   webhooks write to it and nothing else does. Premium routes check it in
   middleware, never in a component.
4. **Saved campaigns.** A roll is already a plain ordered array of
   `{ id, label, value, tags, locked }`. Persisting one is a `POST` of that
   array; `generator.ts` needs no change at all.
5. **Premium tables.** Keep the free tables where they are and load deeper ones
   from an authenticated endpoint at roll time. `Forge` takes its definition as
   a constructor argument, so this is a data-fetch change rather than a logic
   change.
6. **PDF export.** Render server-side and print to PDF at the edge, or give the
   existing print stylesheet a dedicated layout. The print rules in
   `generator.css` already do most of this.
7. **Content management.** Astro content collections under `src/content/`, with
   entitlement checks on the routes rather than on the content.
8. **More generators.** Add a definition file and a page; the shell, the UI
   wiring, the tests and the styling are all shared already.

Two rules worth protecting as it grows: `generator.ts` stays DOM-free and
directly testable, and `src/data` stays free of markup. Those two are what keep
the tables editable by someone who does not write TypeScript.

---

## Licence and content

All generator tables, copy, code and derived assets in this repository are
original work for EncounterSmith. The site is independent and not affiliated
with, endorsed, sponsored or approved by Wizards of the Coast or any other game
publisher.
