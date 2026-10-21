import { test, expect, type Page } from '@playwright/test';
import { rearGeometry } from '../lib/photography/camera-rear';

const testPhotos = [
  { id: 'a', src: '/projects/chefit.png', width: 720, height: 480, alt: 'test A', filename: 'IMG_0001.png' },
  { id: 'b', src: '/projects/polyscope.png', width: 720, height: 480, alt: 'test B' },
  { id: 'c', src: '/projects/racing-sim.png', width: 720, height: 480, alt: 'test C' },
  { id: 'd', src: '/projects/chefit.png', width: 720, height: 480, alt: 'test D' },
];

async function ready(page: Page, photos: false | true | 'empty' = false) {
  if (photos) await page.addInitScript(p => { (window as unknown as { __cameraTestPhotos: unknown }).__cameraTestPhotos = p; }, photos === 'empty' ? [] : testPhotos);
  await page.goto('/'); await page.waitForFunction(() => window.__coast?.ready);
}
const pickup = (page: Page) => page.evaluate(() => window.__cameraPickup && { t: window.__cameraPickup.t, phase: window.__cameraPickup.phase });
async function openCamera(page: Page) {
  await page.locator('[data-object="camera"] .object-action').click();
  await expect.poll(() => pickup(page)).toEqual({ t: 1, phase: 'open' });
}

test('the camera is picked up from the sand, turned around and held with the beach behind it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const before = await page.evaluate(() => window.__coast!.get().view);
  const onSand = (await page.locator('[data-object="camera"]').boundingBox())!;
  await page.locator('[data-object="camera"] .object-action').click();
  await page.waitForFunction(() => window.__cameraPickup?.seek);
  // At the handover the lifted sprite sits exactly where the beach drew the camera.
  await page.evaluate(() => window.__cameraPickup!.seek!(0.555));
  const frame = await page.evaluate(() => window.__coast!.get().view);
  expect(frame.width).toBeLessThan(before.width / 1.5);                 // the view leaned in
  const handover = (await page.locator('.camera-front').boundingBox())!;
  const k = 1440 / frame.width;
  const expected = { x: (1179 - frame.x) * k, y: (757 - frame.y) * k, width: 256 * k };
  // The front image is laid out at the held size and scaled; compare its centre and width.
  expect(Math.abs(handover.x + handover.width / 2 - (expected.x + expected.width / 2))).toBeLessThan(2);
  expect(Math.abs(handover.width - expected.width)).toBeLessThan(2);
  expect(onSand.width).toBeGreaterThan(0);
  await page.evaluate(() => window.__cameraPickup!.seek!(1));
  // Held: the back of the camera, large, with the beach still around it.
  const back = (await page.locator('.camera-back').boundingBox())!;
  expect(back.width * rearGeometry.body.width).toBeGreaterThan(1440 * 0.7);
  expect(back.width * rearGeometry.body.width).toBeLessThan(1440 * 0.8);
  await expect(page.locator('.scene-canvas')).toBeVisible();
  await expect(page.locator('.camera-front')).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Camera: photographs' })).toBeVisible();
});

test('the LCD and the camera buttons line up with the artwork at every size', async ({ page }) => {
  for (const [width, height] of [[1440, 900], [1920, 1080], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await ready(page);
    await openCamera(page);
    const back = (await page.locator('.camera-back-art').boundingBox())!;
    const at = (part: keyof typeof rearGeometry) => {
      const g = rearGeometry[part];
      return { x: back.x + g.left * back.width, y: back.y + g.top * back.height, width: g.width * back.width, height: g.height * back.height };
    };
    const lcd = (await page.locator('.lcd').boundingBox())!;
    const want = at('lcd');
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(lcd[key] - want[key])).toBeLessThan(1);
    // The LCD stays inside the screen's measured interior (378–1123 × 310–756).
    expect(lcd.x).toBeGreaterThanOrEqual(back.x + 378 / 1536 * back.width - .5);
    expect(lcd.x + lcd.width).toBeLessThanOrEqual(back.x + 1123 / 1536 * back.width + .5);
    for (const part of ['playback', 'up', 'down', 'left', 'right', 'select', 'lower'] as const) {
      const box = (await page.locator(`.camera-key[data-key="${part}"]`).boundingBox())!;
      const g = at(part);
      expect(Math.abs(box.x - g.x)).toBeLessThan(1);
      expect(Math.abs(box.y - g.y)).toBeLessThan(1);
    }
    await expect(page.locator('.lcd-thumb')).toHaveCount(14);
    await page.keyboard.press('Escape');
    await expect.poll(() => pickup(page)).toBeUndefined();
  }
});

test('an empty memory card says NO IMAGES and nothing else', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page, 'empty');
  await openCamera(page);
  await expect(page.locator('.lcd-empty')).toHaveText('NO IMAGES');
  await expect(page.locator('.lcd-thumb')).toHaveCount(0);
});

test('the d-pad, keyboard and playback buttons browse photos; Escape steps back then closes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page, true);
  await openCamera(page);
  const selected = () => page.locator('.lcd-thumb[aria-current="true"]').getAttribute('data-index');
  await expect(page.locator('.lcd-thumb')).toHaveCount(4);
  expect(await selected()).toBe('0');
  await page.keyboard.press('ArrowRight');
  expect(await selected()).toBe('1');
  await page.keyboard.press('ArrowDown');
  expect(await selected()).toBe('3');
  await page.locator('.camera-key[data-key="up"]').click();
  expect(await selected()).toBe('0');
  await page.locator('.camera-key[data-key="right"]').click();
  await page.locator('.camera-key[data-key="select"]').click();
  await expect(page.locator('.lcd-photo img')).toHaveAttribute('alt', 'test B');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lcd-photo img')).toHaveAttribute('alt', 'test C');
  await expect(page.locator('.lcd-status')).toContainText('0003/0004');
  await page.locator('.camera-key[data-key="playback"]').click();
  await expect(page.locator('.lcd-grid')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('.lcd-photo')).toBeVisible();
  // The beach must not have moved while the arrows were used for the photos.
  expect(await page.locator('.stage').getAttribute('data-zone')).toBe('home');
  await page.keyboard.press('Escape');
  await expect(page.locator('.lcd-grid')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => pickup(page)).toBeUndefined();
  await expect(page.locator('.camera-held')).toHaveCount(0);
});

test('putting the camera down restores the beach exactly and the panorama works again', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const before = await page.evaluate(() => ({ view: window.__coast!.get().view, y: window.scrollY }));
  await openCamera(page);
  await page.locator('.camera-key[data-key="lower"]').click();
  await expect.poll(() => pickup(page)).toBeUndefined();
  expect(await page.evaluate(() => ({ view: window.__coast!.get().view, y: window.scrollY }))).toEqual(before);
  await expect(page.locator('[data-object="camera"] .object-action')).toBeFocused();
  expect(await page.locator('.scene-window').evaluate(e => e.getAttribute('style') ?? '')).not.toMatch(/--ww|--wh|--y0/);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.locator('.stage').getAttribute('data-zone')).toBe('projects');
});

test('rapid clicks, reversing mid-way and the back button never leave a stuck state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const before = await page.evaluate(() => window.__coast!.get().view);
  const camera = page.locator('[data-object="camera"] .object-action');
  await camera.click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');                       // reverse while still leaning in
  await expect.poll(() => pickup(page)).toBeUndefined();
  for (let i = 0; i < 3; i++) await camera.click({ force: true, delay: 10 }).catch(() => {});
  await expect.poll(() => pickup(page)).toEqual({ t: 1, phase: 'open' });
  await page.goBack();                                         // back puts the camera down
  await expect.poll(() => pickup(page)).toBeUndefined();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => window.__coast!.get().view)).toEqual(before);
});

test('reduced motion fades straight to the held camera', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const before = await page.evaluate(() => window.__coast!.get().view);
  const start = Date.now();
  await openCamera(page);
  expect(Date.now() - start).toBeLessThan(1500);
  expect(await page.evaluate(() => window.__coast!.get().view)).toEqual(before);   // no zoom
  await page.keyboard.press('Escape');
  await expect.poll(() => pickup(page)).toBeUndefined();
});

test('without WebGL the camera still lifts off a clean beach', async ({ browser, baseURL }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto(baseURL!);
  await page.locator('[data-object="camera"] .object-action').click();
  await expect.poll(() => pickup(page), { timeout: 10000 }).toEqual({ t: 1, phase: 'open' });
  await expect(page.locator('.scene-fallback-panorama')).toBeVisible();
  await expect(page.locator('[data-object="camera"]')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect.poll(() => pickup(page)).toBeUndefined();
  await expect(page.locator('[data-object="camera"]')).toBeVisible();
  await page.close();
});

test('on a phone the pickup fills the screen and the LCD takes taps', async ({ browser, baseURL }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.addInitScript(p => { (window as unknown as { __cameraTestPhotos: unknown }).__cameraTestPhotos = p; }, testPhotos);
  await page.goto(baseURL!); await page.waitForFunction(() => window.__coast?.ready);
  await page.locator('[data-object="camera"] .object-action').tap();
  await expect.poll(() => pickup(page)).toEqual({ t: 1, phase: 'open' });
  expect(await page.locator('.scene-window').boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
  const back = (await page.locator('.camera-back-art').boundingBox())!;
  expect(back.x + rearGeometry.body.left * back.width).toBeGreaterThanOrEqual(0);
  expect(back.x + (rearGeometry.body.left + rearGeometry.body.width) * back.width).toBeLessThanOrEqual(390);
  await page.locator('.lcd-thumb').nth(2).tap();
  await expect(page.locator('.lcd-photo img')).toHaveAttribute('alt', 'test C');
  await page.locator('.camera-key[data-key="lower"]').tap();
  await page.locator('.camera-key[data-key="lower"]').tap();
  await expect.poll(() => pickup(page)).toBeUndefined();
  await expect(page.locator('.scene-window')).not.toHaveCSS('position', 'fixed');
  await page.close();
});
