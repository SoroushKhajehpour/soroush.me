import { test, expect, type Page, type CDPSession } from '@playwright/test';
import { NAV, WheelGestures, plan, sample } from '../lib/coast/navigation';

/*
  The desktop camera's navigation (components/home/Panorama.tsx, lib/coast/navigation.ts).
  Wheel input goes through Chrome's real input pipeline (CDP), paced in real time and
  carrying its own timestamps; the trackpad profiles are simulated, not a physical pad.
*/

// ---- pure logic --------------------------------------------------------------------------

let seed = 1;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
/** A trackpad swipe: a ramp, then momentum decaying per frame. Optionally cut off at `until`. */
function swipe({ t0 = 0, peak = 60, ramp = 6, decay = .94, jitter = 0, hz = 60, until = Infinity } = {}) {
  const dt = 1000 / hz, out: [number, number][] = [];
  for (let i = 1; i <= ramp; i++) out.push([t0 + i * dt, peak * i / ramp]);
  let v = peak, t = t0 + ramp * dt;
  while (v > .5) { t += dt; v *= decay; if (t >= until) break; out.push([t, v]); }
  return out.map(([t, v]) => [t, Math.round(v * (1 - jitter + 2 * jitter * rand()))] as [number, number]);
}
const steps = (events: [number, number][]) => { const g = new WheelGestures(); return events.filter(([t, d]) => g.feed(d, t).step).length; };

test('a camera move never overshoots, ends exactly, and a retarget keeps its speed', () => {
  for (let n = 0; n < 200; n++) {
    const from = rand() * 4000, to = rand() * 4000, v0 = (rand() - .5) * 12;
    const m = plan(from, to, v0, 0, 1800);
    expect(m.duration).toBeLessThanOrEqual(NAV.acrossMs);
    expect(m.duration).toBeGreaterThanOrEqual(Math.min(NAV.minMs, NAV.brakeMs));
    expect(sample(m, m.duration)).toEqual({ x: to, v: 0, done: true });
    const ahead = Math.sign(v0) === Math.sign(to - from);
    for (let t = 0; t <= m.duration; t += 4) {
      const { x } = sample(m, t);
      // Heading for the target already, it never passes it; turning around, it only carries on briefly.
      if (ahead) expect((x - to) * Math.sign(to - from)).toBeLessThanOrEqual(1e-6);
    }
    // Interrupt at a random moment: the new move starts where and as fast as the old one was.
    const at = rand() * m.duration, s = sample(m, at), next = plan(s.x, rand() * 4000, s.v, at, 1800);
    const n0 = sample(next, at);
    expect(n0.x).toBeCloseTo(s.x, 6);
    // (Except braking onto a section only a few frames ahead, where the speed is trimmed.)
    if (Math.abs(next.to - s.x) >= Math.abs(s.v) * NAV.brakeMs / 1.4) expect(n0.v).toBeCloseTo(s.v, 6);
  }
  // Adjacent and across: the across move is longer, but not twice as long.
  expect(plan(0, 1900, 0, 0, 1800).duration).toBeGreaterThan(800);
  expect(plan(0, 3600, 0, 0, 1800).duration).toBe(NAV.acrossMs);
});

test('wheel gestures: one swipe is one step, whatever its momentum', () => {
  for (let n = 0; n < 3000; n++) {
    const opts = { peak: 15 + rand() * 230, ramp: 2 + Math.floor(rand() * 10), decay: .9 + rand() * .088, jitter: rand() * .35, hz: rand() < .5 ? 60 : 120 };
    expect(steps(swipe(opts))).toBe(1);
  }
  // A browser that falls behind delivers merged events, each carrying several frames of input.
  for (let n = 0; n < 1000; n++) {
    const raw = swipe({ peak: 20 + rand() * 200, ramp: 2 + Math.floor(rand() * 8), decay: .9 + rand() * .085 });
    const merged: [number, number][] = [];
    for (let i = 0; i < raw.length;) { const k = rand() < .2 ? 2 + Math.floor(rand() * 4) : 1; const part = raw.slice(i, i += k); merged.push([part.at(-1)![0], part.reduce((a, b) => a + b[1], 0)]); }
    expect(steps(merged)).toBe(1);
  }
  // A brush of the pad does nothing; a mouse wheel spun quickly is one step; separate notches are one each.
  expect(steps(swipe({ peak: 3, ramp: 3, decay: .7 }))).toBe(0);
  expect(steps(Array.from({ length: 10 }, (_, i) => [i * 35, 100] as [number, number]))).toBe(1);
  expect(steps([[0, 100], [400, 100], [800, -100]])).toBe(3);
  // A second deliberate swipe once the first has mostly faded (its touch cuts the momentum off) is a second step.
  for (let n = 0; n < 300; n++) {
    const opts = { peak: 30 + rand() * 200, ramp: 2 + Math.floor(rand() * 8), decay: .9 + rand() * .06 };
    const at = 700 + rand() * 400;
    expect(steps([...swipe({ ...opts, until: at }), ...swipe({ ...opts, t0: at, peak: opts.peak * (.7 + .5 * rand()) })])).toBe(2);
  }
});

// ---- in the browser ------------------------------------------------------------------------

declare global { interface Window { __nav?: { state(): import('../components/home/Panorama').NavState } } }
const state = (page: Page) => page.evaluate(() => window.__nav!.state());
async function rest(page: Page) {
  await page.waitForFunction(() => { const s = window.__nav?.state(); return s && !s.moving && !s.dragging; }, null, { timeout: 6000 });
  return state(page);
}
async function open(page: Page, path = '/') {
  await page.goto(path); await page.waitForFunction(() => window.__coast?.ready && window.__nav);
}
const nav = (page: Page) => page.getByRole('navigation', { name: 'Primary' });
const current = (page: Page) => nav(page).locator('[aria-current]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.zoneLink));
/** Real wheel events, paced in real time with their own timestamps. */
async function wheel(cdp: CDPSession, events: [number, number][], axis: 'x' | 'y', sign: 1 | -1, at = { x: 700, y: 450 }) {
  const t0 = Date.now();
  for (const [t, d] of events) {
    if (!d) continue;
    const wait = t0 + t - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...at, deltaX: axis === 'x' ? d * sign : 0, deltaY: axis === 'y' ? d * sign : 0, timestamp: (t0 + t) / 1000 });
  }
}
async function settledOn(page: Page, zone: string) {
  const s = await rest(page);
  expect(s.target).toBe(zone); expect(s.settled).toBe(zone);
  expect(s.x).toBe(s.at[zone as keyof typeof s.at]);           // exactly, not nearly
  expect(await current(page)).toEqual([zone]);
  expect(await page.evaluate(() => document.documentElement.dataset.arrived)).toBe(zone);
  return s;
}

test('every wheel or trackpad gesture moves exactly one section and settles exactly', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  const cdp = await page.context().newCDPSession(page);
  const go = async (events: [number, number][], axis: 'x' | 'y', sign: 1 | -1, zone: string) => { await wheel(cdp, events, axis, sign); await page.waitForTimeout(250); await settledOn(page, zone); };
  await go(swipe(), 'x', 1, 'projects');
  await expect(page).toHaveURL(/#projects$/);
  await go(swipe({ peak: 240, ramp: 3, decay: .965 }), 'x', 1, 'experience');    // a hard flick still stops after one
  await go(swipe({ peak: 120, ramp: 3, decay: .96 }), 'y', 1, 'experience');      // nothing past the last section
  await go(swipe({ peak: 260, ramp: 2, decay: .97 }), 'x', -1, 'projects');
  await go(swipe({ peak: 45, ramp: 12, decay: .985 }), 'y', -1, 'home');          // 2.5 s of momentum, one step
  await go(swipe({ peak: 3, ramp: 3, decay: .7 }), 'x', 1, 'home');               // an accidental brush
  // Two deliberate swipes, the second on the first's momentum: two steps, one continuous move.
  await go([...swipe({ peak: 80, ramp: 5, decay: .95, until: 550 }), ...swipe({ t0: 550, peak: 80, ramp: 5, decay: .95 })], 'x', 1, 'experience');
  expect(await page.evaluate(() => [scrollY, document.documentElement.scrollLeft])).toEqual([0, 0]);
});

test('nav links travel straight to any section; passing Projects shows only the beach', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  // Per frame: the highlighted links, and whether any Projects content is visible.
  await page.evaluate(() => {
    const frames: { cur: string; projects: boolean; revealed: boolean }[] = ((window as unknown as { __frames: unknown[] }).__frames = []) as never;
    const zone = document.querySelector<HTMLElement>('#projects')!, content = zone.querySelector<HTMLElement>('.zone-content')!;
    const f = () => {
      const cs = getComputedStyle(content);
      frames.push({
        cur: [...document.querySelectorAll<HTMLElement>('.site-nav [aria-current]')].map(a => a.dataset.zoneLink).join(','),
        projects: cs.visibility === 'visible' && parseFloat(cs.opacity) > 0 && parseFloat(zone.style.opacity || '0') > 0,
        revealed: zone.querySelector('.pcard')!.hasAttribute('data-shown'),
      });
      requestAnimationFrame(f);
    };
    f();
  });
  const frames = () => page.evaluate(() => (window as unknown as { __frames: { cur: string; projects: boolean; revealed: boolean }[] }).__frames.splice(0));
  let from = 'home';
  for (const [to, passing] of [['experience', true], ['home', true], ['projects', false], ['experience', false], ['projects', false], ['home', false]] as const) {
    await frames();
    await nav(page).getByRole('link', { name: to.toUpperCase() }).click();
    await settledOn(page, to);
    const seen = await frames();
    // The highlight moves once, straight from where it was to the destination: no flicker through Projects.
    const runs = seen.map(f => f.cur).filter((c, i, all) => i === 0 || c !== all[i - 1]);
    expect(runs).toEqual(runs.length === 1 ? [to] : [from, to]);
    from = to;
    if (passing) {
      expect(seen.some(f => f.projects)).toBe(false);
      expect(seen.some(f => f.revealed)).toBe(false);          // its entrance did not play either
    }
    await expect(page.locator('[data-passing]')).toHaveCount(0);           // nothing stays hidden after arrival
  }
  // Visited for real, Projects reveals and is interactive.
  await nav(page).getByRole('link', { name: 'PROJECTS' }).click();
  await settledOn(page, 'projects');
  await expect(page.locator('#projects .pcard').first()).toHaveAttribute('data-shown', '');
  await expect(page.getByRole('heading', { level: 2, name: 'Projects' })).toBeFocused();
  expect(await page.locator('#projects .pcard-inner').first().evaluate(e => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
});

test('interruptions, history, deep links and resizing always end exactly on a section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/#projects');
  await settledOn(page, 'projects');
  const link = (name: string) => nav(page).getByRole('link', { name });
  // Rapid clicks: only the last one counts.
  await link('EXPERIENCE').click(); await page.waitForTimeout(300);
  await link('HOME').click(); await page.waitForTimeout(200);
  await link('EXPERIENCE').click();
  await settledOn(page, 'experience');
  // Reversing mid-pass into Projects shows its content after all.
  await link('HOME').click(); await page.waitForTimeout(600);
  await link('PROJECTS').click();
  await settledOn(page, 'projects');
  await expect(page.locator('#projects .pcard').first()).toBeVisible();
  // A swipe during a click's move steps from where that move was going.
  await link('EXPERIENCE').click(); await page.waitForTimeout(200);
  const cdp = await page.context().newCDPSession(page);
  await wheel(cdp, swipe(), 'y', -1);
  await settledOn(page, 'projects');
  // Back and forward.
  await link('HOME').click(); await settledOn(page, 'home');
  await link('EXPERIENCE').click(); await settledOn(page, 'experience');
  await page.goBack(); await settledOn(page, 'home');
  await page.goForward(); await settledOn(page, 'experience');
  // A reload on a deep link opens there, without a pan.
  await page.reload(); await page.waitForFunction(() => window.__nav);
  expect((await state(page)).moving).toBe(false);
  await settledOn(page, 'experience');
  // Resizing at rest and mid-move.
  await page.setViewportSize({ width: 1200, height: 800 }); await page.waitForTimeout(300);
  await settledOn(page, 'experience');
  await link('HOME').click(); await page.waitForTimeout(400);
  await page.setViewportSize({ width: 1680, height: 1000 });
  await settledOn(page, 'home');
  expect(await page.evaluate(() => [document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight, scrollY])).toEqual([0, 0, 0]);
});

test('touch drags follow the finger, then settle one section at most away', async ({ browser, baseURL }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  await open(page, baseURL!);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', x = 0, y = 450) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y }] });
  async function drag(x0: number, y0: number, x1: number, y1: number, ms: number, n = 12) {
    await touch('touchStart', x0, y0);
    for (let i = 1; i <= n; i++) { await touch('touchMove', x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); await new Promise(r => setTimeout(r, ms / n)); }
    await touch('touchEnd');
  }
  await drag(1350, 450, 100, 450, 250);                 // a long, fast drag
  await settledOn(page, 'projects');
  await drag(800, 450, 700, 450, 600);                  // short and slow: back to where it was
  await settledOn(page, 'projects');
  await drag(900, 450, 760, 450, 60, 4);                // short but quick: a flick
  await settledOn(page, 'experience');
  await drag(400, 250, 400, 850, 300);                  // down, like scrolling up
  await settledOn(page, 'projects');
  await touch('touchStart', 900); await touch('touchMove', 600);
  const mid = await state(page);
  expect(mid.dragging).toBe(true);
  expect(mid.x).toBeGreaterThan(mid.at.projects + 100);
  await touch('touchCancel');
  await settledOn(page, 'projects');
  await page.close();
});

test('the projects panel scrolls on its own; only a fresh gesture at its end moves on', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/#projects');
  // A bigger library than today's: three more rows.
  await page.locator('.pcard-grid').evaluate(ol => { const cards = [...ol.children]; for (let k = 0; k < 3; k++) for (const c of cards) ol.append(c.cloneNode(true)); });
  const panel = page.locator('#projects .project-scroll');
  const scroll = () => panel.evaluate(e => ({ top: e.scrollTop, max: e.scrollHeight - e.clientHeight }));
  expect((await scroll()).max).toBeGreaterThan(200);
  const cdp = await page.context().newCDPSession(page);
  const at = { x: 700, y: 600 };
  await wheel(cdp, swipe(), 'y', 1, at); await page.waitForTimeout(300);
  expect((await scroll()).top).toBeGreaterThan(50);
  expect((await state(page)).target).toBe('projects');
  // A big flick runs into the panel's end; what is left of it never moves the camera.
  await wheel(cdp, swipe({ peak: 200, ramp: 3, decay: .97 }), 'y', 1, at); await page.waitForTimeout(300);
  const end = await scroll();
  expect(end.top).toBeGreaterThanOrEqual(end.max - 1);
  await settledOn(page, 'projects');
  await wheel(cdp, swipe(), 'y', 1, at); await page.waitForTimeout(250);
  await settledOn(page, 'experience');
  await wheel(cdp, swipe(), 'x', -1, at); await page.waitForTimeout(250);
  await settledOn(page, 'projects');
  expect((await scroll()).top).toBeGreaterThanOrEqual(end.max - 1);                // left where it was
  await wheel(cdp, swipe(), 'y', -1, at); await page.waitForTimeout(300);
  expect((await scroll()).top).toBeLessThan(end.max - 50);
  await settledOn(page, 'projects');
  // Keys too: the page keys scroll the panel while it has room.
  await panel.evaluate(e => { e.scrollTop = 0; });
  await page.keyboard.press('PageDown'); await page.waitForTimeout(500);
  expect((await scroll()).top).toBeGreaterThan(100);
  await settledOn(page, 'projects');
});

test('reduced motion: every navigation is an exact cut', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await nav(page).getByRole('link', { name: 'EXPERIENCE' }).click();
  await settle();
  await settledOn(page, 'experience');
  const cdp = await page.context().newCDPSession(page);
  await wheel(cdp, swipe(), 'x', -1);
  await settle();
  await settledOn(page, 'projects');
  await page.keyboard.press('ArrowLeft'); await settle();
  await settledOn(page, 'home');
});

test('the diagnostics overlay appears only when asked for', async ({ page }) => {
  await open(page);
  await expect(page.locator('.nav-debug')).toHaveCount(0);
  await open(page, '/?nav-debug');
  await expect(page.locator('.nav-debug')).toContainText('section  home → home');
});
