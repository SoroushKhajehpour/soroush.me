"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { SceneController } from "@/lib/coast/renderer";
import { pano, readFrame, scene, type SceneFrame } from "@/lib/coast/scene-manifest";
import { heldBody, pickupPose, type PickupInput } from "@/lib/coast/pickup";
import { rear, rearGeometry, type RearPart } from "@/lib/photography/camera-rear";
import { photographs, photoUrl, type Photograph } from "@/lib/photography/photos";

interface Props {
  /** The camera's hitbox on the beach; the pickup starts from it and focus returns to it. */
  opener: HTMLButtonElement;
  getController: () => SceneController | null;
  worldWidth: number;
  onClosed: () => void;
}

type Phase = "opening" | "open" | "closing";
const OPEN_MS = 1350, CLOSE_MS = 1100, REDUCED_MS = 180;
const COLUMNS = 3;
const pad = (n: number) => String(n).padStart(4, "0");
const pct = (part: RearPart): CSSProperties => {
  const g = rearGeometry[part];
  return { left: `${g.left * 100}%`, top: `${g.top * 100}%`, width: `${g.width * 100}%`, height: `${g.height * 100}%` };
};
// The scene-window variables the pickup animates (the fallback still and objects read them).
const VARS = ["--cam", "--y0", "--ww", "--wh"] as const;

declare global { interface Window { __cameraTestPhotos?: Photograph[]; __cameraPickup?: { t: number; phase: Phase; start: SceneFrame; seek?: (t: number) => void } } }

export function CameraGallery({ opener, getController, worldWidth, onClosed }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const lcdRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("opening");
  const phaseRef = useRef<Phase>("opening");
  const go = useRef<(target: 0 | 1) => void>(() => {});
  const [photos] = useState<Photograph[]>(() =>
    process.env.NODE_ENV !== "production" && typeof window !== "undefined" && window.__cameraTestPhotos ? window.__cameraTestPhotos : photographs);
  const [held, setHeld] = useState(() => heldBody({ width: window.innerWidth, height: window.innerHeight }));

  // ---- the shot ------------------------------------------------------------------------
  useLayoutEffect(() => {
    const sceneWindow = opener.closest<HTMLElement>(".scene-window")!;
    const stage = opener.closest<HTMLElement>(".stage");
    const root = rootRef.current!, front = frontRef.current!, back = backRef.current!, dim = dimRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saved = VARS.map(name => sceneWindow.style.getPropertyValue(name));
    const beachCamera = sceneWindow.querySelector<HTMLElement>('[data-object="camera"]');
    const chrome = [...(stage ?? document.body).querySelectorAll<HTMLElement>(".home-intro, .site-nav, .scroll-hint")];
    const scrollY = window.scrollY;

    // The view as the panorama left it: read with the pickup's own overrides removed.
    function startFrame(): SceneFrame {
      VARS.forEach((name, i) => saved[i] ? sceneWindow.style.setProperty(name, saved[i]) : sceneWindow.style.removeProperty(name));
      return readFrame(sceneWindow);
    }
    let input: PickupInput;
    const boxStyle = sceneWindow.getAttribute("style") ?? "";
    let fills = false;
    function measure() {
      if (fills) sceneWindow.setAttribute("style", boxStyle);
      const box = sceneWindow.getBoundingClientRect();
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      // On phones the scene is a box in the page; it grows to fill the screen behind the camera.
      fills = box.width < viewport.width - 1 || box.height < viewport.height - 1 || box.top !== 0;
      input = { start: startFrame(), camera: pano.cameraSand, world: { width: worldWidth, height: scene.height },
        box: { left: box.left, top: box.top, width: box.width, height: box.height },
        fill: fills ? { left: 0, top: 0, width: viewport.width, height: viewport.height } : undefined,
        viewport, reduced: reduced.matches };
      setHeld(heldBody(viewport));
    }
    measure();

    // Lock the page where it is and hand the beach over to the pickup.
    const html = document.documentElement;
    const lock = { overflow: html.style.overflow, padding: html.style.paddingRight };
    const gutter = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (gutter > 0) html.style.paddingRight = `${gutter}px`;
    stage?.setAttribute("data-camera", "");
    // Everything else on the page is out of reach while the camera is in your hands.
    const muted = [...(root.parentElement?.children ?? [])].filter(el => el !== root) as HTMLElement[];
    muted.forEach(el => { el.inert = true; });

    let t = 0, target: 0 | 1 = 1, raf = 0, last = 0, done = false;
    function pose() {
      const p = pickupPose(t, input);
      const controller = getController();
      // The view: the renderer when it is there, and always the CSS variables, which place
      // the fallback still and the DOM objects in the same window.
      if (fills) Object.assign(sceneWindow.style, { position: "fixed", zIndex: "40", inset: "auto", aspectRatio: "auto",
        left: `${p.box.left}px`, top: `${p.box.top}px`, width: `${p.box.width}px`, height: `${p.box.height}px` });
      sceneWindow.style.setProperty("--cam", String(p.frame.x));
      sceneWindow.style.setProperty("--y0", String(p.frame.y));
      sceneWindow.style.setProperty("--ww", String(p.frame.width));
      sceneWindow.style.setProperty("--wh", String(p.frame.height));
      controller?.setFrame(p.frame);
      controller?.setCameraVisible(p.beachCamera);
      if (beachCamera) beachCamera.style.visibility = p.beachCamera ? "" : "hidden";
      chrome.forEach(el => { el.style.opacity = String(p.chrome); });
      dim.style.opacity = String(p.dim);

      // The sprites are laid out at their current size every frame (no scale transform): a
      // scaled layer is resampled from a stale raster, which smears and warps pixel art.
      // Transforms carry only the turn, roll and lean, about the body's centre.
      const b = p.body;
      // One continuous turn: the back face is the same plane, rotated half a turn, so the
      // faces swap exactly edge-on with no jump in position or size.
      const persp = `perspective(${Math.round(b.width * 3)}px)`;
      const turn = p.turn;
      Object.assign(front.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px`,
        transform: `${persp} rotateZ(${p.tilt}deg) rotateX(${p.lean}deg) rotateY(${turn}deg)` });
      const g = rearGeometry.body;
      const iw = b.width / g.width, ih = b.height / g.height;
      Object.assign(back.style, { left: `${b.left - g.left * iw}px`, top: `${b.top - g.top * ih}px`, width: `${iw}px`, height: `${ih}px`,
        transform: `${persp} rotateZ(${p.tilt}deg) rotateX(${p.lean}deg) rotateY(${turn - 180}deg)` });
      const visible = !p.beachCamera;
      front.style.visibility = visible && turn < 90 ? "visible" : "hidden";
      back.style.visibility = visible && turn >= 90 ? "visible" : "hidden";
      back.style.opacity = String(p.sprite);
      lcdRef.current?.style.setProperty("--power", String(p.lcd));

    }
    // Development only: hold the shot at any point, for review and tests.
    function seek(value: number) {
      cancelAnimationFrame(raf); raf = 0; last = 0;
      t = Math.min(1, Math.max(0, value));
      pose();
    }
    // Puts everything back as it was. Also runs on unmount (and React's development
    // double mount), so it must not report the camera as closed by itself.
    function restore() {
      done = true;
      if (fills) sceneWindow.setAttribute("style", boxStyle);
      VARS.forEach((name, i) => saved[i] ? sceneWindow.style.setProperty(name, saved[i]) : sceneWindow.style.removeProperty(name));
      const controller = getController();
      controller?.setCameraVisible(true);
      controller?.setFrame(input.start);
      if (beachCamera) beachCamera.style.visibility = "";
      chrome.forEach(el => { el.style.opacity = ""; });
      muted.forEach(el => { el.inert = false; });
      stage?.removeAttribute("data-camera");
      html.style.overflow = lock.overflow;
      html.style.paddingRight = lock.padding;
      window.scrollTo({ top: scrollY, behavior: "instant" });
      delete window.__cameraPickup;
    }
    function finish() {
      restore();
      if (opener.isConnected) opener.focus({ preventScroll: true });
      onClosed();
    }
    function tick(now: number) {
      raf = 0;
      const dt = last ? Math.min(50, now - last) : 16;
      last = now;
      const ms = reduced.matches ? REDUCED_MS : target === 1 ? OPEN_MS : CLOSE_MS;
      t = Math.min(1, Math.max(0, t + (target === 1 ? 1 : -1) * dt / ms));
      pose();
      if (t === target) {
        last = 0;
        if (target === 1) { phaseRef.current = "open"; setPhase("open"); }
        else finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    go.current = next => {
      if (done) return;
      target = next;
      phaseRef.current = next === 1 ? "opening" : "closing";
      setPhase(phaseRef.current);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // Without the renderer the Home still has the objects painted in; the pickup waits
    // (briefly) for the clean panorama still so the camera can leave the sand.
    async function begin() {
      if (!getController()) {
        const clean = sceneWindow.querySelector<HTMLImageElement>(".scene-fallback-panorama");
        await Promise.race([clean?.decode().catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
      }
      if (!done) go.current(1);
    }
    // Live state for tooling and tests.
    window.__cameraPickup = {
      get t() { return t; }, get phase() { return phaseRef.current; }, get start() { return input.start; },
      seek: process.env.NODE_ENV !== "production" ? seek : undefined,
    };
    pose();
    begin();

    const onResize = () => { measure(); pose(); };
    window.addEventListener("resize", onResize);
    // The browser's back button puts the camera down instead of leaving the page.
    if (!history.state?.camera) history.pushState({ camera: true }, "");
    const onPop = () => go.current(0);
    window.addEventListener("popstate", onPop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("popstate", onPop);
      if (!done) restore();
    };
    // Mounted once per pickup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    if (phaseRef.current === "closing") return;
    if (history.state?.camera) history.back();   // popstate then runs the close
    else go.current(0);
  }, []);
  const open = useCallback(() => go.current(1), []);

  // ---- the firmware ----------------------------------------------------------------------
  const [mode, setMode] = useState<"grid" | "photo">("grid");
  const [index, setIndex] = useState(0);
  const [pressed, setPressed] = useState<RearPart | null>(null);
  const count = photos.length;
  const ready = phase === "open";

  const move = useCallback((dx: number, dy: number) => {
    if (!count) return;
    setIndex(i => mode === "photo" ? (i + dx + count) % count
      : Math.min(count - 1, Math.max(0, i + dx + dy * COLUMNS)));
  }, [count, mode]);
  const select = useCallback(() => { if (count && mode === "grid") setMode("photo"); }, [count, mode]);
  const back = useCallback(() => { if (mode === "photo") setMode("grid"); else close(); }, [close, mode]);
  const playback = useCallback(() => { if (count) setMode(m => m === "grid" ? "photo" : "grid"); }, [count]);

  const act = useCallback((part: RearPart) => {
    setPressed(part);
    window.setTimeout(() => setPressed(p => p === part ? null : p), 140);
    if (!ready) return;
    if (part === "left") move(-1, 0);
    if (part === "right") move(1, 0);
    if (part === "up") move(0, -1);
    if (part === "down") move(0, 1);
    if (part === "select") select();
    if (part === "playback") playback();
    if (part === "lower") back();
  }, [back, move, playback, ready, select]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const key = event.key;
      if (key === "Tab") {
        const items = [...(rootRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? [])];
        if (!items.length) return;
        const at = items.indexOf(document.activeElement as HTMLElement);
        if (event.shiftKey && at <= 0) { event.preventDefault(); items.at(-1)?.focus(); }
        else if (!event.shiftKey && (at === -1 || at === items.length - 1)) { event.preventDefault(); items[0]?.focus(); }
        return;
      }
      const map: Record<string, RearPart> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", Enter: "select", Escape: "lower" };
      const part = map[key];
      if (!part) return;
      // Enter on a focused camera button presses that button, as any button.
      if ((key === "Enter" || key === " ") && (document.activeElement as Element | null)?.closest(".camera-key, .lcd-thumb")) { event.stopImmediatePropagation(); return; }
      // The beach must not react (arrows would change zones), nor the page scroll.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (key === "Escape" && phaseRef.current === "opening") { close(); return; }
      act(part);
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [act, close]);

  // Focus the LCD once the camera is in your hands.
  useEffect(() => { if (ready) lcdRef.current?.focus({ preventScroll: true }); }, [ready]);
  // Keep the selected thumbnail in view inside the LCD.
  useEffect(() => {
    lcdRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index, mode]);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const photo = photos[index];
  const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const lcdWidth = held.width / rearGeometry.body.width * rearGeometry.lcd.width;
  const image = { width: held.width / rearGeometry.body.width, height: held.width / rearGeometry.body.width * rear.height / rear.width };
  const sharp = image.width * dpr >= rear.width;

  return (
    <div className="camera-held" ref={rootRef} data-phase={phase} role="dialog" aria-modal="true" aria-label="Camera: photographs">
      <div className="camera-dim" ref={dimRef} onClick={ready ? close : open} aria-hidden="true" />
      {/* The same camera that lay on the sand, then its back. Both share the held body box. */}
      {/* Exactly the sprite that lay on the sand, unchanged until it turns over. */}
      <div className="camera-front" ref={frontRef}>
        {/* Everything the beach shows of the camera (scripts/extract-camera-front.py): the
            sand under it is swapped for clean sand at the same moment, so nothing is lost.
            Pre-enlarged 4× with hard edges, so it stays crisp square pixels at any size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coast/camera-front.png" alt="" draggable="false" />
      </div>
      <div className="camera-back" ref={backRef} data-sharp={sharp}
        style={{
          transformOrigin: `${(rearGeometry.body.left + rearGeometry.body.width / 2) * 100}% ${(rearGeometry.body.top + rearGeometry.body.height / 2) * 100}%`,
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="camera-back-art" src={rear.src} width={rear.width} height={rear.height} alt="" draggable="false" />
        <div className="lcd" ref={lcdRef} style={pct("lcd")} tabIndex={-1} data-mode={mode} inert={!ready}
          aria-label={count ? `Playback, photo ${index + 1} of ${count}` : "Playback, no images"}
          onTouchStart={e => { const p = e.touches[0]; touch.current = p ? { x: p.clientX, y: p.clientY } : null; }}
          onTouchEnd={e => {
            const s = touch.current, p = e.changedTouches[0]; touch.current = null;
            if (!s || !p || mode !== "photo") return;
            const dx = p.clientX - s.x;
            if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(p.clientY - s.y)) move(dx < 0 ? 1 : -1, 0);
          }}>
          <div className="lcd-status" aria-hidden="true">
            <span className="lcd-play" />
            <span>{mode === "grid" ? "INDEX" : `${pad(index + 1)}/${pad(count)}`}</span>
            <span className="lcd-gap" />
            {count > 0 && mode === "grid" && <span>{count} IMG</span>}
            <span className="lcd-battery"><i /></span>
          </div>
          {!count ? <p className="lcd-empty">NO IMAGES</p>
            : mode === "grid" ? (
              <ol className="lcd-grid">
                {photos.map((item, i) => (
                  <li key={item.id}>
                    <button type="button" className="lcd-thumb" data-index={i} aria-current={i === index ? "true" : undefined}
                      aria-label={`Photo ${i + 1}: ${item.alt}`} onClick={() => { setIndex(i); setMode("photo"); }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl(item, 256 * dpr)} alt="" loading="lazy" decoding="async" width={item.width} height={item.height} />
                    </button>
                  </li>
                ))}
              </ol>
            ) : photo && (
              <figure className="lcd-photo" key={photo.id}>
                <LcdImage photo={photo} width={lcdWidth * dpr} />
                {(photo.filename || photo.date) && <figcaption>{[photo.filename, photo.date].filter(Boolean).join("  ")}</figcaption>}
                {/* The neighbours, so stepping through is instant. */}
                {[...new Set([(index + 1) % count, (index - 1 + count) % count])].filter(i => i !== index).map(i =>
                  <link key={photos[i].id} rel="preload" as="image" href={photoUrl(photos[i], lcdWidth * dpr)} />)}
              </figure>
            )}
        </div>
        {/* The camera's own buttons. */}
        {([
          ["playback", "Playback: switch between index and photo"],
          ["up", "Up"], ["left", "Left: previous"], ["select", "Select: open photo"], ["right", "Right: next"], ["down", "Down"],
          ["lower", mode === "photo" ? "Back to index" : "Put the camera down"],
        ] as const).map(([part, label]) => (
          <button key={part} type="button" className="camera-key" data-key={part} data-pressed={pressed === part || undefined}
            style={pct(part)} aria-label={label} tabIndex={ready ? 0 : -1} onClick={() => act(part)} />
        ))}
      </div>
    </div>
  );
}

function LcdImage({ photo, width }: { photo: Photograph; width: number }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  return <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photoUrl(photo, width)} alt={photo.alt} width={photo.width} height={photo.height} decoding="async"
      data-state={state} onLoad={() => setState("ready")} onError={() => setState("error")} />
    {state !== "ready" && <p className="lcd-note">{state === "error" ? "FILE ERROR" : "LOADING"}</p>}
  </>;
}
