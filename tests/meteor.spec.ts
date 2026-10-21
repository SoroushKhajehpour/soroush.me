import { test, expect, type Page } from '@playwright/test';
import { LANDING } from '../lib/coast/meteor';

const meteor = (page: Page, scope = '.scene-window') => page.locator(`${scope} .meteor`);
const phase = (page: Page, scope?: string) => meteor(page, scope).getAttribute('data-phase');
/** The contact point on screen, from the sprite's box and its sheet anchor. */
async function contact(page: Page, scope = '.scene-window') {
  return meteor(page, scope).evaluate(el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const ms = parseFloat(cs.getPropertyValue('--ms')) || 2;
    return { x: r.left + parseFloat(cs.getPropertyValue('--ax')) * ms, y: r.top + parseFloat(cs.getPropertyValue('--ay')) * ms };
  });
}
/** Where the landing point is on screen, from the scene window's own variables. */
async function landingOnScreen(page: Page) {
  return page.locator('.scene-window').evaluate((el, L) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), n = (v: string) => parseFloat(cs.getPropertyValue(v));
    return { x: r.left + (L.x - n('--cam')) / n('--ww') * r.width, y: r.top + (L.y - n('--y0')) / n('--wh') * r.height };
  }, LANDING);
}

test('it waits for the camera to settle on Experience, then lands once and stays on the sand', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/'); await page.waitForFunction(() => window.__coast?.ready);
  expect(await phase(page)).toBe('waiting');
  await meteor(page).evaluate(el => {
    const seen: Record<string, number> = ((window as unknown as { __phases: Record<string, number> }).__phases = {});
    new MutationObserver(() => { seen[el.getAttribute('data-phase')!] ??= performance.now(); }).observe(el, { attributeFilter: ['data-phase'] });
  });
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'EXPERIENCE' }).click();
  // Not during the pan.
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.documentElement.dataset.arrived)).not.toBe('experience');
  expect(await phase(page)).toBe('waiting');
  await expect.poll(() => phase(page), { timeout: 8000 }).toBe('flying');
  // The flight's last head position is exactly where the impact begins.
  let lastFlight: { x: number; y: number } | null = null;
  while ((await phase(page)) === 'flying') lastFlight = await contact(page);
  // A 3–4 s journey, not a dash.
  const flight = await page.evaluate(() => (window as unknown as { __phases: Record<string, number> }).__phases);
  expect(flight.impact - flight.flying).toBeGreaterThan(3000);
  expect(flight.impact - flight.flying).toBeLessThan(4200);
  await expect.poll(() => meteor(page).getAttribute('data-seq')).toBe('impact');
  const impactAt = await contact(page);
  const land = await landingOnScreen(page);
  expect(Math.abs(impactAt.x - land.x)).toBeLessThan(1.5); expect(Math.abs(impactAt.y - land.y)).toBeLessThan(1.5);
  expect(lastFlight).not.toBeNull();
  await expect.poll(() => phase(page), { timeout: 4000 }).toBe('landed');
  const rest = await contact(page);
  expect(Math.abs(rest.x - land.x)).toBeLessThan(1.5);
  // Away and back: still there, no second crash.
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await nav.getByRole('link', { name: 'PROJECTS' }).click();
  await page.waitForTimeout(1500);
  await nav.getByRole('link', { name: 'EXPERIENCE' }).click();
  await page.waitForTimeout(2500);
  expect(await phase(page)).toBe('landed');
  const back = await contact(page), land2 = await landingOnScreen(page);
  expect(Math.abs(back.x - land2.x)).toBeLessThan(1.5); expect(Math.abs(back.y - land2.y)).toBeLessThan(1.5);
});

test('leaving mid-flight lands it at once; resizing keeps it on its world point', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#experience'); await page.waitForFunction(() => window.__coast?.ready);
  await expect.poll(() => phase(page), { timeout: 8000 }).toBe('flying');
  await page.setViewportSize({ width: 1280, height: 800 });                 // resize during flight
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'PROJECTS' }).click();
  await expect.poll(() => phase(page)).toBe('landed');
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'EXPERIENCE' }).click();
  await page.waitForTimeout(2500);
  expect(await phase(page)).toBe('landed');
  for (const [w, h] of [[1920, 1080], [1024, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(400);
    const a = await contact(page), b = await landingOnScreen(page);
    expect(Math.abs(a.x - b.x)).toBeLessThan(1.5); expect(Math.abs(a.y - b.y)).toBeLessThan(1.5);
  }
});

test('the meteorite is a button: mouse or keyboard pulses the four stars in order and returns to rest', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#experience'); await page.waitForFunction(() => window.__coast?.ready);
  await expect.poll(() => phase(page), { timeout: 10000 }).toBe('landed');
  const button = page.getByRole('button', { name: 'Activate the meteorite' });
  await button.click();
  await expect(page.locator('.timeline')).toHaveClass(/meteor-pulse/);
  expect(await meteor(page).getAttribute('data-seq')).toBe('activation');
  // Each star warms in turn.
  const order = await page.evaluate(() => new Promise<number[]>(resolve => {
    const items = [...document.querySelectorAll<HTMLElement>('.tl-item')];
    const first: number[] = items.map(() => -1); const t0 = performance.now();
    const f = () => {
      items.forEach((it, i) => { if (first[i] < 0 && getComputedStyle(it).getPropertyValue('--ray').trim() === '#f2a774') first[i] = performance.now() - t0; });
      if (first.every(v => v >= 0) || performance.now() - t0 > 1500) resolve(first); else requestAnimationFrame(f);
    };
    f();
  }));
  expect(order.every((v, i) => i === 0 || v > order[i - 1])).toBe(true);
  await expect(page.locator('.timeline')).not.toHaveClass(/meteor-pulse/, { timeout: 2000 });
  expect(await meteor(page).getAttribute('data-seq')).toBe('idle');
  // Keyboard, with a visible focus ring.
  await button.focus();
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');   // keyboard focus
  await expect(button).toBeFocused();
  expect(await button.evaluate(b => getComputedStyle(b).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter');
  await expect(page.locator('.timeline')).toHaveClass(/meteor-pulse/);
  // The timeline links still work (the button doesn't cover them).
  await page.locator('.timeline a').count();
});

test('reduced motion shows the resting meteorite at once and pulses without movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#experience'); await page.waitForFunction(() => window.__coast?.ready);
  await expect.poll(() => phase(page)).toBe('landed');
  await page.getByRole('button', { name: 'Activate the meteorite' }).click();
  await expect(page.locator('.timeline')).toHaveClass(/meteor-pulse-still/);
  expect(await meteor(page).getAttribute('data-seq')).toBe('idle');
  await expect(page.locator('.timeline')).not.toHaveClass(/meteor-pulse-still/, { timeout: 2000 });
});

test('phones: it crashes into the beach panel\'s sand when that scrolls into view', async ({ browser, baseURL }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.goto(baseURL!); await page.waitForFunction(() => window.__coast?.ready);
  const panel = page.locator('.meteor-panel');
  await expect(panel).toBeVisible();
  await expect(page.locator('.scene-window .meteor')).toHaveCount(0);
  expect(await phase(page, '.meteor-panel')).toBe('waiting');
  await panel.scrollIntoViewIfNeeded();
  await expect.poll(() => phase(page, '.meteor-panel'), { timeout: 8000 }).toBe('landed');
  const c = await contact(page, '.meteor-panel'), box = (await panel.boundingBox())!;
  // The landing point within the panel's crop: dry sand, not the sea above it.
  expect((c.x - box.x) / box.width).toBeCloseTo((LANDING.x - 4420) / 700, 1);
  expect((c.y - box.y) / box.height).toBeCloseTo((LANDING.y - 640) / 352, 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.close();
});
