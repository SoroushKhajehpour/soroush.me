import { test, expect, type Page } from '@playwright/test';
import { speaker } from '../lib/coast/scene-manifest';

/**
 * A stand-in for Spotify's iFrame API with the same surface (createController, loadUri,
 * play/pause/resume/seek, ready/playback_update events), so these tests don't depend on
 * Spotify's servers. "Songs" are 4 s long.
 */
const FAKE_API = `
(() => {
  const SONG = 4000;
  window.__spotify = { calls: [] };
  const api = { createController(host, options, cb) {
    const frame = document.createElement('iframe');
    frame.title = 'Spotify Embed'; frame.height = options.height; frame.width = options.width; frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    host.replaceWith(frame);
    const L = {}; let uri = options.uri, playing = false, pos = 0, timer = 0, last = 0;
    const emit = (e, data) => (L[e] || []).forEach(f => f({ data }));
    const update = () => emit('playback_update', { playingURI: uri, isPaused: !playing, isBuffering: false, position: pos, duration: SONG });
    const tick = () => { const now = performance.now(); pos = Math.min(SONG, pos + now - last); last = now;
      if (pos >= SONG) { playing = false; clearInterval(timer); } update(); };
    const start = () => { playing = true; last = performance.now(); clearInterval(timer); timer = setInterval(tick, 100); emit('playback_started', { playingURI: uri }); update(); };
    const c = {
      addListener(e, f) { (L[e] ||= []).push(f); },
      loadUri(u) { window.__spotify.calls.push('load ' + u); uri = u; pos = 0; playing = false; clearInterval(timer); update(); },
      play() { window.__spotify.calls.push('play'); pos = 0; start(); },
      resume() { window.__spotify.calls.push('resume'); start(); },
      pause() { window.__spotify.calls.push('pause'); playing = false; clearInterval(timer); update(); },
      togglePlay() { playing ? c.pause() : c.resume(); },
      seek(s) { window.__spotify.calls.push('seek ' + s); pos = s * 1000; update(); },
      restart() { pos = 0; start(); }, destroy() {},
    };
    cb(c);
    setTimeout(() => emit('ready', {}), 50);
  } };
  window.onSpotifyIframeApiReady?.(api);
})();`;

const tracks = [
  { spotify: 'https://open.spotify.com/track/50GVx8sCc1TDKHXumgYqEO', title: 'Cold Shoulder', artist: 'Drake' },
  { spotify: 'spotify:track:5xEDRg4tI8ixoAvbrupsEg', title: 'Sweet Home', artist: 'Don Toliver' },
  { spotify: '4uLU6hMCjMI75M1A2tKUQC', title: 'A Very Long Test Song Title That Should Be Truncated Gracefully', artist: 'Test' },
];
type Calls = { __spotify: { calls: string[] } };
const calls = (page: Page) => page.evaluate(() => (window as unknown as Calls).__spotify.calls);

async function open(page: Page, list: unknown[] | null = tracks) {
  await page.route('https://open.spotify.com/embed/iframe-api/v1', r => r.fulfill({ body: FAKE_API, contentType: 'text/javascript' }));
  if (list) await page.addInitScript(l => { (window as unknown as { __musicTestTracks: unknown }).__musicTestTracks = l; }, list);
  await page.goto('/'); await page.waitForFunction(() => window.__coast?.ready);
}
const ready = (page: Page) => page.waitForFunction(() => window.__music?.get().ready);
const state = (page: Page) => page.evaluate(() => { const s = window.__music!.get(); return { playing: s.playing, index: s.index }; });
const key = (page: Page, name: 'previous' | 'playPause' | 'next') =>
  page.locator('.speaker-key').nth(['previous', 'playPause', 'next'].indexOf(name));

test('one speaker, with its buttons on the drawn buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await expect(page.locator('.speaker img')).toHaveAttribute('src', speaker.sprite.src);
  await expect(page.locator('[data-object="speaker"]')).toHaveCount(0);
  const img = (await page.locator('.speaker img').boundingBox())!;
  for (const [i, b] of (['previous', 'playPause', 'next'] as const).entries()) {
    const box = (await page.locator('.speaker-key').nth(i).boundingBox())!;
    const g = speaker.buttons[b];
    expect(Math.abs(box.x + box.width / 2 - (img.x + (g.left + g.width / 2) * img.width))).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - (img.y + (g.top + g.height / 2) * img.height))).toBeLessThan(2);
  }
});

test('the widget holds Spotify\'s 80 px player bottom-left, and nothing autoplays', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await ready(page);
  await expect(page.locator('.music iframe')).toHaveAttribute('height', '80');
  await page.waitForTimeout(800);
  expect(await state(page)).toEqual({ playing: false, index: 0 });
  expect(await calls(page)).toEqual([]);
  // Nothing in the corner until music plays (loading included).
  await expect(page.locator('.music')).toBeHidden();
  await key(page, 'playPause').click();
  await expect(page.locator('.music')).toBeVisible();
  const box = (await page.locator('.music').boundingBox())!;
  expect(box.x).toBeLessThan(24); expect(900 - (box.y + box.height)).toBeLessThan(24);
  expect(box.height).toBeLessThan(130);
  await expect(page.locator('.music iframe')).toHaveAttribute('allow', /encrypted-media/);
  // No panel behind it: the beach shows through.
  expect(await page.locator('.music').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await key(page, 'playPause').click();
  await expect(page.locator('.music')).toBeHidden();
});

test('the JBL and the widget buttons play, pause, skip and go back', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await ready(page);
  await key(page, 'playPause').click();
  await expect.poll(() => state(page)).toEqual({ playing: true, index: 0 });
  await expect(page.locator('.music')).toBeVisible();
  // The speaker dances while it plays.
  const lifts = await page.locator('.speaker-body').evaluate(async e => {
    const out: number[] = [];
    for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 40)); out.push(-new DOMMatrix(getComputedStyle(e).transform).m42); }
    return out;
  });
  expect(Math.max(...lifts)).toBeGreaterThan(2);
  expect(Math.max(...lifts)).toBeLessThan(12);
  await key(page, 'playPause').click();
  await expect.poll(() => state(page)).toEqual({ playing: false, index: 0 });
  await expect(page.locator('.music')).toBeHidden();
  await expect.poll(() => page.locator('.speaker-body').evaluate(e => e.style.transform)).toBe('');
  await key(page, 'next').click();
  await expect.poll(() => state(page)).toEqual({ playing: true, index: 1 });
  // Only Spotify's player: no controls or text of our own above it.
  await expect(page.locator('.music button, .music p, .music span')).toHaveCount(0);
  await key(page, 'next').click();
  await expect.poll(() => state(page)).toEqual({ playing: true, index: 2 });
  await key(page, 'next').click();
  await expect.poll(() => state(page)).toEqual({ playing: true, index: 0 });                             // wraps
  await key(page, 'previous').click();
  await expect.poll(() => state(page)).toEqual({ playing: true, index: 2 });
  expect(await calls(page)).toContain('load spotify:track:5xEDRg4tI8ixoAvbrupsEg');
});

test('previous restarts a song that has been playing for over 3 seconds', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, [{ ...tracks[0] }, { ...tracks[1] }]);
  await ready(page);
  await key(page, 'next').click();
  await expect.poll(() => state(page)).toEqual({ playing: true, index: 1 });
  await page.waitForTimeout(3300);
  await key(page, 'previous').click();
  await expect.poll(async () => (await calls(page)).includes('seek 0')).toBe(true);
  expect((await state(page)).index).toBe(1);
});

test('when a song (or preview) ends the next one plays', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await ready(page);
  await key(page, 'playPause').click();
  await expect.poll(() => state(page), { timeout: 8000 }).toEqual({ playing: true, index: 1 });
});

test('skipping songs never fades or hides the player', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await ready(page);
  await key(page, 'playPause').click();
  await expect(page.locator('.music')).toBeVisible();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const w = window as unknown as { __seen: number[] }; w.__seen = [];
    const el = document.querySelector('.music')!;
    const f = () => { const cs = getComputedStyle(el); w.__seen.push(cs.visibility === 'visible' ? Number(cs.opacity) : 0); requestAnimationFrame(f); };
    f();
  });
  for (let i = 0; i < 3; i++) { await key(page, 'next').click(); await page.waitForTimeout(250); }
  await key(page, 'previous').click();
  await page.waitForTimeout(600);
  const seen = await page.evaluate(() => (window as unknown as { __seen: number[] }).__seen);
  expect(Math.min(...seen)).toBe(1);
});

test('music keeps playing and the widget stays put while panning between zones', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, [{ spotify: tracks[0].spotify, title: 'Long one', artist: 'x' }]);
  await ready(page);
  await key(page, 'playPause').click();
  await expect.poll(() => state(page)).toMatchObject({ playing: true });
  await page.waitForTimeout(500);                         // after its entrance
  const box = await page.locator('.music').boundingBox();
  const frame = await page.locator('.music iframe').elementHandle();
  const nav = page.getByRole('navigation', { name: 'Primary' });
  for (const zone of ['PROJECTS', 'EXPERIENCE']) {
    await nav.getByRole('link', { name: zone }).click();
    await page.waitForTimeout(1200);
    expect(await page.locator('.music').boundingBox()).toEqual(box);
    expect(await state(page)).toMatchObject({ index: 0 });
  }
  // The same Spotify player the whole time: never re-created.
  expect(await frame!.evaluate(f => f.isConnected)).toBe(true);
});

test('an empty playlist shows no widget and the speaker stays idle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, []);
  await expect(page.locator('.music')).toHaveCount(0);
  await key(page, 'playPause').click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__music?.get().playing ?? false)).toBe(false);
});

test('if Spotify can\'t load, nothing pretends to play', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('https://open.spotify.com/**', r => r.abort());
  await page.goto('/'); await page.waitForFunction(() => window.__coast?.ready);
  await page.waitForTimeout(2500);
  await key(page, 'playPause').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.music')).toBeHidden();
  expect(await page.locator('.speaker-body').evaluate(e => e.style.transform)).toBe('');
});

test('on a phone the widget fits and its buttons work', async ({ browser, baseURL }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.route('https://open.spotify.com/embed/iframe-api/v1', r => r.fulfill({ body: FAKE_API, contentType: 'text/javascript' }));
  await page.goto(baseURL!); await page.waitForFunction(() => window.__coast?.ready); await ready(page);
  await page.locator('.speaker-key').nth(1).tap();
  await expect.poll(() => page.evaluate(() => window.__music!.get().playing)).toBe(true);
  const box = (await page.locator('.music').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(12);
  expect(box.x + box.width).toBeLessThanOrEqual(390 - 12);
  await page.close();
});
