# EncounterSmith launch checklist

Everything that has to be true before this site goes public. Items marked
**blocker** should stop a launch; the rest can follow shortly after.

---

## 1. Final domain

- [ ] **Blocker.** Domain registered and pointed at the host
- [ ] `PUBLIC_SITE_URL` set to it in the production build environment, no
      trailing slash
- [ ] Confirm `https://<domain>/robots.txt` and `/sitemap-index.xml` show the
      real domain rather than the placeholder
- [ ] Decide `www` versus apex and set up the redirect
- [ ] HTTPS certificate issued and forced

## 2. Final logo check

- [ ] Look at the emblem at its real sizes: 46 px in the header, 72 px in the
      footer, 128 px in page headers, 96 px on a product cover
- [ ] **Vector wordmark**, if one exists. The site currently sets the name in
      Cinzel, because the supplied files have it baked onto opaque parchment.
      A vector version would go into `src/components/Wordmark.astro`.
- [ ] **A text-free banner**, if one can be produced. The supplied banner has a
      painted "Explore the tools" button, which is why only its illustrated half
      is used on the page. A clean version could become a full-width hero.
- [ ] **The icon set** from the brand guide, as eight separate SVGs. In the
      guide sheet they render at roughly 55 px each, far too small to extract.
      The tool cards are typographic in the meantime.
- [ ] **A seamless pattern tile**, if the one in the guide exists at full size.
      The current parchment texture is sampled from the banner's own paper.

## 3. Favicon

- [ ] Check `favicon-32.png` in a real browser tab. The full emblem is detailed;
      if it reads as a smudge, supply a simplified mark for the small sizes.
- [ ] Confirm `apple-touch-icon.png` looks right on an iOS home screen
- [ ] Confirm the maskable 512 icon survives Android's circle crop
- [ ] Confirm `manifest.webmanifest` loads and both icons resolve

## 4. Contact email

- [ ] **Blocker.** Real mailbox created and monitored
- [ ] `PUBLIC_CONTACT_EMAIL` set in production
- [ ] Send a test message from the footer link and confirm it arrives
- [ ] Decide who answers licensing questions, which the FAQ and terms both point
      at this address

## 5. Checkout provider

- [ ] Provider chosen (Stripe, Gumroad, Payhip, itch.io, other)
- [ ] Account verified and payouts configured
- [ ] Tax and GST position confirmed for an Australian seller of digital goods
- [ ] One product listed end to end and bought with a real card as a test
- [ ] `PUBLIC_PRODUCT_*_URL` set for every pack genuinely on sale
- [ ] That pack's `status` changed to `'available'` in `src/data/products.ts`
- [ ] Refund policy written and linked from `/terms`
- [ ] Optional: `PUBLIC_FEATURE_PRODUCT_SCHEMA=true` once product data is complete

## 6. Product files

- [ ] The Emergency Session Kit finished, proofread and laid out
- [ ] 100 NPC Secrets finished, proofread and laid out
- [ ] The Bell Beneath Wickhollow finished, proofread and laid out
- [ ] Each exported as a PDF with a print-friendly version in the same file
- [ ] Delivery tested end to end: buy, receive the link, download, open on a phone
- [ ] File sizes sensible; no print-resolution maps embedded by accident
- [ ] `includedItems` in `src/data/products.ts` matches what is actually inside

## 7. Product covers

- [ ] Cover art produced at 720 × 480 (3:2) for each pack
- [ ] Saved under `public/images/products/` and set as `coverImage`
- [ ] Confirm a pack without a cover still falls back to the emblem plate cleanly
- [ ] A portrait cover at 1200 × 1800 for the store listing, if the checkout
      provider wants one (that lives on their side, not in this repository)

## 8. Product previews

- [ ] A genuine sample page or spread published for each pack
- [ ] `PUBLIC_PRODUCT_*_PREVIEW_URL` set
- [ ] Confirm a preview-only pack shows "Preview the pack" rather than a buy button

## 9. Email provider

- [ ] Provider chosen and account created
- [ ] Endpoint copied into `PUBLIC_EMAIL_FORM_ACTION`
- [ ] `PUBLIC_EMAIL_PROVIDER` set, since the privacy notice names it
- [ ] Field names checked against `NewsletterForm.astro` (`email`, `source`)
- [ ] Test submission from **each** of the five forms (home founding, home
      launch, products, free resources, Smith+), confirming the `source` value
      arrives so sign-up origins can be told apart
- [ ] Double opt-in configured and the confirmation email written
- [ ] Unsubscribe link present and working
- [ ] Sender domain authenticated (SPF, DKIM, DMARC)
- [ ] Re-read `/privacy` and confirm the email section is now accurate

## 10. Lead magnet file

- [ ] Decide whether the 25 hooks stay ungated on `/free-resources`, which is
      how they ship today, or move behind the list
- [ ] If they move, keep an honest free sample and update the home page copy,
      which currently promises "no email required"
- [ ] If a PDF version is produced, add it under `public/` and link it
- [ ] Confirm the hooks still read as original and setting-neutral

## 11. Legal review

- [ ] **Blocker.** `/privacy` reviewed by a lawyer
- [ ] **Blocker.** `/terms` reviewed by a lawyer, especially generated content,
      licensing and liability
- [ ] Commercial-use licence for generator output defined, or the current
      "not licensed yet" wording confirmed correct and left alone
- [ ] Australian Consumer Law position on digital goods confirmed
- [ ] Trading entity name and ABN confirmed, and `PUBLIC_LEGAL_ENTITY` set
- [ ] `PUBLIC_LEGAL_UPDATED` set to the review date
- [ ] `PUBLIC_LEGAL_REVIEWED="true"` recorded once it has happened
- [ ] Footer compatibility statement confirmed accurate for whatever systems are
      eventually named

## 12. Analytics decision

- [ ] Decide whether any analytics is wanted. The site loads none today, and the
      privacy notice says so.
- [ ] If yes: choose a cookieless, privacy-respecting provider
- [ ] Add the snippet at the marked slot in `BaseLayout.astro` and set
      `PUBLIC_FEATURE_ANALYTICS=true`
- [ ] Update `/privacy` in the same change
- [ ] Confirm whether a consent banner is legally required for that provider.
      Do not add one otherwise.

## 13. Social metadata

- [ ] Every page has a unique title and description (`verify.mjs` checks this)
- [ ] Open Graph preview tested on at least two platforms with the real domain
- [ ] Twitter/X card preview tested
- [ ] `og:image` resolves to an absolute URL on the live domain
- [ ] Structured data validated in Google's Rich Results Test:
      `WebSite`, `Organization`, `FAQPage`, `BreadcrumbList`, `WebApplication`
- [ ] Sitemap submitted to Google Search Console and Bing Webmaster Tools

## 14. Open Graph artwork

- [ ] Look at `public/images/og-encountersmith.jpg` at 1200 × 630. It is the
      whole supplied banner letterboxed onto parchment, so the parchment bands
      top and bottom are intentional.
- [ ] If a purpose-made 1.91:1 social card is produced, drop it in and update
      `brand.ogImage` in `src/data/site.ts`
- [ ] Confirm it still reads at roughly 300 px wide in a chat window

## 15. Accessibility review

- [ ] Full keyboard pass on every page: skip link first, no focus traps, every
      generator control reachable and operable
- [ ] Screen reader pass on one generator end to end (NVDA or VoiceOver): roll,
      lock, reroll, copy, and confirm each is announced
- [ ] Colour contrast re-checked after any new brand colour lands
- [ ] `prefers-reduced-motion` verified with the OS setting on
- [ ] Zoom to 200% and confirm nothing is cut off or overlapping
- [ ] Automated pass with axe or Lighthouse, and triage anything it finds

## 16. Mobile testing

- [ ] 390, 768, 1024 and 1440 px checked for overflow, header overlap and
      clipped controls (`verify.mjs` covers this; confirm on real hardware too)
- [ ] Real device test on iOS Safari and Android Chrome
- [ ] Mobile menu: opens, closes on Escape, closes after following a link,
      returns focus to the toggle
- [ ] A generator used one-handed on a phone at a table, which is the real use case
- [ ] Copy buttons tested on a phone, including the failure message
- [ ] Print preview checked from a generator page and from `/free-resources`
- [ ] Site loaded with JavaScript off: navigation intact, hooks readable, the
      generator explaining itself rather than sitting silently broken

## 17. Deployment

Currently deployed to **GitHub Pages** from `.github/workflows/deploy.yml`, which
publishes on every push to `main`.

- [ ] Settings → Pages → Source set to **GitHub Actions**
- [ ] First workflow run green, and the site reachable at
      `https://<owner>.github.io/<repo>/`
- [ ] Repository variables set for anything that should differ from the
      defaults: contact email, feature flags, product URLs
- [ ] **When the real domain arrives:** set the `PUBLIC_SITE_URL` repository
      variable to it and `PUBLIC_BASE_PATH` to `/`, or move the site to
      Cloudflare Pages, which serves from the root with no base path at all
- [ ] If moving hosts: build command `npm run build`, output directory `dist`,
      `NODE_VERSION` 20 or newer, all `PUBLIC_*` variables set for Production
      **and** Preview
- [ ] `npm run verify` passes locally (check, tests, build)
- [ ] `node verify.mjs` passes against a local preview
- [ ] Preview deployment reviewed before promoting to production
- [ ] 404 confirmed on the live domain by visiting a nonsense URL
- [ ] Browser console checked on every route after deployment
- [ ] Lighthouse run against the live site

## 18. Backups

- [ ] The three original artwork files backed up somewhere other than this
      repository. `tools/build-assets.py` regenerates everything in `public/`
      from them, so they are the only irreplaceable assets here.
- [ ] Product source files (layouts, artwork, fonts) backed up
- [ ] Access to the registrar, host, checkout provider and email provider
      recorded somewhere safe

## 19. Source control

- [ ] Repository pushed to a remote, main branch protected
- [ ] `.env` confirmed ignored and never committed
- [ ] No secret anywhere in the history
- [ ] A tagged release, or at least a known-good commit, recorded for the launch build

---

## Final sweep before announcing

- [ ] Read every page aloud once, checking that nothing addresses the site owner
      instead of a Game Master
- [ ] Confirm no control exists that only shows a message
- [ ] Confirm no form claims success unless it genuinely submitted
- [ ] Confirm no price reads as purchasable unless it can be purchased
- [ ] Confirm `/smith-plus` still says plainly that nothing is available yet
- [ ] Forge twenty results from each tool and read them; cut anything that does
      not earn its place
