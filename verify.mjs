import { chromium } from 'playwright';

const ORIGIN = process.env.VERIFY_ORIGIN ?? 'http://127.0.0.1:4330';
// Set VERIFY_BASE to the same value as PUBLIC_BASE_PATH to check a
// subdirectory deployment, e.g. VERIFY_BASE=/EncounterSmith.
const PREFIX = (process.env.VERIFY_BASE ?? '').replace(/\/+$/, '');
const BASE = ORIGIN + PREFIX;
const SHOTS = process.env.VERIFY_SHOTS ?? '/home/claude/es/work/shots';
const ROUTES = [
  '/', '/tools', '/tools/npc-generator', '/tools/encounter-generator', '/tools/tavern-generator',
  '/products', '/free-resources', '/smith-plus', '/faq', '/privacy', '/terms', '/404',
];
const WIDTHS = [390, 768, 1024, 1440];

const problems = [];
const bad = (m) => problems.push(m);

const browser = await chromium.launch();
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });

const consoleErrors = [];
const failedRequests = [];
context.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${m.location().url}: ${m.text()}`); });
context.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
context.on('requestfailed', (r) => {
  const err = r.failure()?.errorText ?? '';
  // Navigating away cancels in-flight srcset candidates; that is not a fault.
  if (err.includes('ERR_ABORTED')) return;
  failedRequests.push(`${r.url()} :: ${err}`);
});
context.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.url()} :: HTTP ${r.status()}`); });

const page = await context.newPage();

// --- routes, metadata, links, images ---------------------------------------
const meta = new Map();
for (const route of ROUTES) {
  const res = await page.goto(BASE + route, { waitUntil: 'networkidle' });
  if (res?.status() !== 200) bad(`ROUTE ${route} -> ${res?.status()}`);

  const title = await page.title();
  const desc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);
  const canonical = await page.locator('link[rel=canonical]').getAttribute('href').catch(() => null);
  const og = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null);
  const tw = await page.locator('meta[name="twitter:card"]').getAttribute('content').catch(() => null);
  const h1 = await page.locator('main h1').count();
  if (h1 !== 1) bad(`H1 ${route} has ${h1} h1 in main`);
  if (!desc) bad(`META ${route} missing description`);
  if (!canonical) bad(`META ${route} missing canonical`);
  if (!og) bad(`META ${route} missing og:image`);
  if (!tw) bad(`META ${route} missing twitter:card`);
  for (const [other, v] of meta) {
    if (v.title === title) bad(`META duplicate title: ${other} / ${route}`);
    if (v.desc === desc) bad(`META duplicate description: ${other} / ${route}`);
  }
  meta.set(route, { title, desc });

  // heading order
  const order = await page.locator('main :is(h1,h2,h3,h4)').evaluateAll((els) =>
    els.map((e) => Number(e.tagName.slice(1))));
  for (let i = 1; i < order.length; i += 1) {
    if (order[i] - order[i - 1] > 1) bad(`HEADINGS ${route} jumps h${order[i - 1]} -> h${order[i]}`);
  }

  // internal links resolve
  const links = await page.locator('a[href^="/"]').evaluateAll((els) =>
    [...new Set(els.map((e) => e.getAttribute('href')))]);
  for (const href of links) {
    const target = href.split('#')[0];
    if (!target) continue;
    if (PREFIX && !target.startsWith(PREFIX)) bad(`BASE ${route} -> ${target} is missing the base path`);
    const r = await page.request.get(ORIGIN + target);
    if (r.status() !== 200) bad(`LINK ${route} -> ${target} is ${r.status()}`);
  }
  // anchors exist
  for (const href of links) {
    const [linkPath, frag] = href.split('#');
    if (!frag || (linkPath && linkPath !== PREFIX + route && linkPath !== route)) continue;
    if ((await page.locator(`#${CSS.escape ? frag : frag}`).count()) === 0) {
      bad(`ANCHOR ${route} -> #${frag} not found`);
    }
  }

  // every image actually decoded
  const imgs = await page.locator('img').evaluateAll((els) =>
    els.map((e) => ({ src: e.currentSrc || e.src, w: e.naturalWidth, alt: e.getAttribute('alt'), aw: e.getAttribute('width'), ah: e.getAttribute('height') })));
  for (const img of imgs) {
    if (img.w === 0) bad(`IMG ${route} failed to load ${img.src}`);
    if (img.alt === null) bad(`IMG ${route} missing alt attribute on ${img.src}`);
    if (!img.aw || !img.ah) bad(`IMG ${route} missing width/height on ${img.src}`);
  }
}

// supplied production assets are actually reachable
for (const p of [
  '/robots.txt', '/sitemap-index.xml', '/manifest.webmanifest',
  '/brand/favicon-32.png', '/brand/favicon-64.png', '/brand/apple-touch-icon.png',
  '/brand/icon-192.png', '/brand/icon-512.png',
  '/brand/emblem-160.webp', '/brand/emblem-160.png', '/brand/emblem-640.webp', '/brand/emblem-640.png',
  '/images/hero-scene-460.webp', '/images/hero-scene-640.webp', '/images/hero-scene-920.webp', '/images/hero-scene-920.png',
  '/images/og-encountersmith.jpg', '/textures/parchment.webp',
]) {
  const r = await page.request.get(BASE + p);
  if (r.status() !== 200) bad(`ASSET ${p} is ${r.status()}`);
}

// robots + sitemap content
const robots = await (await page.request.get(BASE + '/robots.txt')).text();
if (!/Sitemap: https?:\/\/.+sitemap-index\.xml/.test(robots)) bad('ROBOTS missing sitemap line');

// --- responsive sweep -------------------------------------------------------
for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    const o = await page.evaluate(() => {
      const d = document.documentElement;
      const out = [];
      if (d.scrollWidth > d.clientWidth + 1) {
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (r.right > d.clientWidth + 1 || r.left < -1) {
            const cs = getComputedStyle(el);
            if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
            out.push(`${el.tagName.toLowerCase()}.${String(el.className || '').split(' ')[0]} L${Math.round(r.left)} R${Math.round(r.right)}`);
          }
        }
      }
      return { sw: d.scrollWidth, cw: d.clientWidth, out: out.slice(0, 4) };
    });
    if (o.sw > o.cw + 1) bad(`OVERFLOW ${width}px ${route}: ${o.sw}>${o.cw} :: ${o.out.join(' | ')}`);

    const overlap = await page.evaluate(() => {
      const h = document.querySelector('.site-header');
      const t = document.querySelector('main h1');
      if (!h || !t) return null;
      const hr = h.getBoundingClientRect(), tr = t.getBoundingClientRect();
      return tr.top < hr.bottom && tr.bottom > hr.top ? { hb: Math.round(hr.bottom), tt: Math.round(tr.top) } : null;
    });
    if (overlap) bad(`HEADER-OVERLAP ${width}px ${route} ${JSON.stringify(overlap)}`);

    // touch targets on the smallest viewport
    if (width === 390) {
      const small = await page.locator('a.btn, button:not([disabled])').evaluateAll((els) =>
        els.filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.height < 40; })
           .map((e) => `${e.tagName.toLowerCase()}:${(e.textContent || '').trim().slice(0, 24)}`));
      if (small.length) bad(`TOUCH ${route}: ${small.length} control(s) under 40px: ${small.slice(0, 3).join(', ')}`);
    }
  }
}

// --- mobile nav -------------------------------------------------------------
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const toggle = page.locator('[data-nav-toggle]');
const nav = page.locator('[data-nav]');
if (!(await toggle.isVisible())) bad('NAV toggle hidden at 390px');
if (await nav.isVisible()) bad('NAV should start collapsed at 390px');
if ((await toggle.getAttribute('aria-expanded')) !== 'false') bad('NAV aria-expanded should be false when collapsed');
await toggle.click();
if (!(await nav.isVisible())) bad('NAV did not open');
if ((await toggle.getAttribute('aria-expanded')) !== 'true') bad('NAV aria-expanded should be true when open');
const navLinks = await nav.locator('a').count();
if (navLinks < 6) bad(`NAV exposes only ${navLinks} links when open`);
await page.keyboard.press('Escape');
if (await nav.isVisible()) bad('NAV did not close on Escape');
if (!(await page.evaluate(() => document.activeElement?.hasAttribute('data-nav-toggle')))) {
  bad('NAV focus not returned to toggle after Escape');
}
await toggle.click();
await nav.locator('a').first().click();
await page.waitForLoadState('networkidle');
if (!page.url().includes('/tools')) bad('NAV link did not navigate');

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
if (!(await nav.isVisible())) bad('NAV not visible at 1280px');
if (await toggle.isVisible()) bad('NAV toggle should be hidden at 1280px');

// --- generators -------------------------------------------------------------
for (const [route, count, firstId] of [
  ['/tools/npc-generator', 9, 'name'],
  ['/tools/encounter-generator', 8, 'situation'],
  ['/tools/tavern-generator', 9, 'name'],
]) {
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  const forge = page.locator('[data-forge]');
  await forge.waitFor();
  if ((await forge.getAttribute('data-ready')) !== 'true') bad(`GEN ${route} did not mount`);

  const result = forge.locator('[data-result]');
  if (await result.isVisible()) bad(`GEN ${route} should show an empty state first`);
  if (!(await forge.locator('[data-empty]').isVisible())) bad(`GEN ${route} empty state missing`);
  if (!(await forge.locator('[data-act="copy-text"]').isDisabled())) bad(`GEN ${route} copy enabled before rolling`);

  await forge.locator('button[data-act="roll"]').first().click();
  if (!(await result.isVisible())) bad(`GEN ${route} result did not appear`);
  if (await forge.locator('[data-empty]').isVisible()) bad(`GEN ${route} empty state still visible after rolling`);
  if ((await forge.locator('[data-slot]').count()) !== count) bad(`GEN ${route} expected ${count} slots`);
  const unfilled = (await forge.locator('[data-value]').allTextContents()).filter((v) => !v.trim() || v.trim() === 'Not yet forged');
  if (unfilled.length) bad(`GEN ${route} left ${unfilled.length} slot(s) unfilled`);
  if (!(await page.evaluate(() => document.activeElement?.hasAttribute('data-result')))) {
    bad(`GEN ${route} did not move focus to the result`);
  }
  if (!((await forge.locator('[data-live]').textContent()) || '').trim()) bad(`GEN ${route} announced nothing`);

  // lock
  const first = forge.locator(`[data-slot="${firstId}"]`);
  const pinned = ((await first.locator('[data-value]').textContent()) || '').trim();
  await first.locator('[data-act="lock"]').click();
  if ((await first.locator('[data-act="lock"]').getAttribute('aria-pressed')) !== 'true') bad(`GEN ${route} lock aria-pressed not set`);
  if (!(await first.locator('.slot__flag').isVisible())) bad(`GEN ${route} lock state shown by colour alone`);
  let moved = false;
  for (let i = 0; i < 6; i += 1) {
    const before = await forge.locator('[data-value]').allTextContents();
    await forge.locator('button[data-act="roll"]').first().click();
    const after = await forge.locator('[data-value]').allTextContents();
    if (((await first.locator('[data-value]').textContent()) || '').trim() !== pinned) { bad(`GEN ${route} locked slot changed on regenerate`); break; }
    if (before.join('|') !== after.join('|')) moved = true;
  }
  if (!moved) bad(`GEN ${route} unlocked slots never moved across 6 regenerations`);
  await first.locator('[data-act="lock"]').click();
  if ((await first.locator('[data-act="lock"]').getAttribute('aria-pressed')) !== 'false') bad(`GEN ${route} unlock did not reset aria-pressed`);

  // per-field reroll
  const second = forge.locator('[data-slot]').nth(1);
  let rerolled = false;
  for (let i = 0; i < 8 && !rerolled; i += 1) {
    const before = await forge.locator('[data-value]').allTextContents();
    await second.locator('[data-act="reroll"]').click();
    const after = await forge.locator('[data-value]').allTextContents();
    const diffs = after.filter((v, idx) => v !== before[idx]).length;
    if (diffs > 1) bad(`GEN ${route} reroll changed ${diffs} slots`);
    if (diffs === 1) rerolled = true;
  }
  if (!rerolled) bad(`GEN ${route} per-slot reroll never produced a new value`);

  // copy
  await forge.locator('[data-act="copy-text"]').click();
  await page.waitForTimeout(150);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  if (!clip || clip.split('\n').length < count) bad(`GEN ${route} copy-as-text gave ${JSON.stringify(clip).slice(0, 60)}`);
  if (!/copied/i.test(((await forge.locator('[data-live]').textContent()) || ''))) bad(`GEN ${route} did not confirm copy`);

  await forge.locator('[data-act="copy-md"]').click();
  await page.waitForTimeout(150);
  const md = await page.evaluate(() => navigator.clipboard.readText());
  if (!md.startsWith('### ')) bad(`GEN ${route} markdown copy malformed`);

  // clipboard failure path reports honestly
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('nope')) }, configurable: true });
    document.execCommand = () => false;
  });
  await forge.locator('[data-act="copy-text"]').click();
  await page.waitForTimeout(200);
  const failMsg = ((await forge.locator('[data-live]').textContent()) || '').toLowerCase();
  if (!failMsg.includes('blocked')) bad(`GEN ${route} did not report a failed copy honestly ("${failMsg}")`);

  // keyboard
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  const rollBtn = forge.locator('button[data-act="roll"]').first();
  await rollBtn.focus();
  await page.keyboard.press('Enter');
  if (!(await result.isVisible())) bad(`GEN ${route} keyboard activation failed`);
  const outline = await rollBtn.evaluate((el) => { el.focus(); const cs = getComputedStyle(el); return cs.outlineStyle + ' ' + cs.outlineWidth; });
  if (outline.startsWith('none')) bad(`GEN ${route} roll button has no visible focus style`);
}

// --- spark ------------------------------------------------------------------
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const sparkText = page.locator('[data-spark-text]');
const before = await sparkText.textContent();
let sparkMoved = false;
for (let i = 0; i < 10 && !sparkMoved; i += 1) {
  await page.locator('[data-spark-next]').click();
  if ((await sparkText.textContent()) !== before) sparkMoved = true;
}
if (!sparkMoved) bad('SPARK never changed after 10 presses');
await page.locator('[data-spark-copy]').click();
await page.waitForTimeout(150);
if (!/copied/i.test((await page.locator('[data-spark-live]').textContent()) || '')) bad('SPARK copy not confirmed');

// --- free resources copy-all ------------------------------------------------
await page.goto(BASE + '/free-resources', { waitUntil: 'networkidle' });
const hookCount = await page.locator('[data-hooks] li').count();
if (hookCount !== 25) bad(`HOOKS expected 25, found ${hookCount}`);
await page.locator('[data-copy-hooks]').click();
await page.waitForTimeout(200);
const hooksClip = await page.evaluate(() => navigator.clipboard.readText());
if ((hooksClip.match(/\n\d+\. /g) || []).length < 24) bad('HOOKS copy-all did not include the full list');

// --- honesty sweep ----------------------------------------------------------
const banned = ['Sell once', 'ready for Stripe', 'Gumroad', 'Payhip', 'recurring revenue',
  'Membership is the engine', 'ConvertKit', 'MailerLite', 'Beehiiv', 'Built like a business',
  '10,000/month', 'A$10,000', 'Demo checkout', 'demo message', 'launch placeholder', 'lorem ipsum'];
for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const phrase of banned) {
    if (body.includes(phrase.toLowerCase())) bad(`COPY ${route} contains "${phrase}"`);
  }
  // no enabled control that does nothing
  const deadButtons = await page.locator('button:not([disabled])').evaluateAll((els) =>
    els.filter((e) => !e.hasAttribute('data-act') && !e.hasAttribute('data-nav-toggle') &&
      !e.hasAttribute('data-spark-next') && !e.hasAttribute('data-spark-copy') &&
      !e.hasAttribute('data-copy-hooks') && !e.hasAttribute('data-print-hooks') &&
      e.type !== 'submit').map((e) => (e.textContent || '').trim()));
  if (deadButtons.length) bad(`DEAD-BUTTON ${route}: ${deadButtons.join(', ')}`);
}

// --- a11y basics ------------------------------------------------------------
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
const skip = await page.evaluate(() => {
  const el = document.activeElement;
  return el ? { text: el.textContent?.trim(), top: el.getBoundingClientRect().top } : null;
});
if (!skip || !/skip/i.test(skip.text || '')) bad('A11Y skip link is not the first tab stop');
if (skip && skip.top < 0) bad('A11Y skip link not visible when focused');
const landmarks = await page.evaluate(() => ({
  main: document.querySelectorAll('main').length,
  header: document.querySelectorAll('header.site-header').length,
  footer: document.querySelectorAll('footer').length,
}));
if (landmarks.main !== 1) bad(`A11Y expected one <main>, found ${landmarks.main}`);
if (landmarks.footer !== 1) bad(`A11Y expected one <footer>, found ${landmarks.footer}`);
const unlabelled = await page.locator('input').evaluateAll((els) =>
  els.filter((e) => e.type !== 'hidden' && !document.querySelector(`label[for="${e.id}"]`)).length);
if (unlabelled) bad(`A11Y ${unlabelled} input(s) without a label`);

// --- no JavaScript ----------------------------------------------------------
const noJs = await browser.newContext({ javaScriptEnabled: false });
const nj = await noJs.newPage();
await nj.setViewportSize({ width: 390, height: 844 });
await nj.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
if (!(await nj.locator('[data-nav] a').first().isVisible())) bad('NOJS navigation links hidden');
if (!(await nj.locator('[data-spark-text]').first().isVisible())) bad('NOJS spark panel empty');
await nj.goto(BASE + '/tools/npc-generator', { waitUntil: 'domcontentloaded' });
if ((await nj.locator('noscript').count()) === 0) bad('NOJS generator page has no noscript explanation');
await nj.goto(BASE + '/free-resources', { waitUntil: 'domcontentloaded' });
if ((await nj.locator('[data-hooks] li').count()) !== 25) bad('NOJS hooks list not readable');
await noJs.close();

// --- screenshots ------------------------------------------------------------
for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SHOTS}/home-${width}.png`, fullPage: width === 1440 });
}
await page.setViewportSize({ width: 1440, height: 1000 });
for (const [route, file] of [['/tools', 'tools'], ['/products', 'products'], ['/smith-plus', 'plus'], ['/free-resources', 'free'], ['/404', 'notfound']]) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SHOTS}/${file}-1440.png`, fullPage: true });
}
await page.goto(BASE + '/tools/npc-generator', { waitUntil: 'networkidle' });
await page.locator('button[data-act="roll"]').first().click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${SHOTS}/npc-1440.png`, fullPage: true });
await page.setViewportSize({ width: 390, height: 900 });
await page.goto(BASE + '/tools/tavern-generator', { waitUntil: 'networkidle' });
await page.locator('button[data-act="roll"]').first().click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${SHOTS}/tavern-390.png`, fullPage: true });

await browser.close();

for (const e of consoleErrors) bad(`CONSOLE ${e}`);
for (const f of [...new Set(failedRequests)]) bad(`REQUEST ${f}`);

console.log(problems.length === 0 ? 'ALL CHECKS PASSED' : `${problems.length} PROBLEM(S):\n - ${problems.join('\n - ')}`);
