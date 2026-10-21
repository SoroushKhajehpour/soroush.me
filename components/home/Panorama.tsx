"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CoastalScene } from "./CoastalScene";
import { CameraGallery } from "./CameraGallery";
import { PixelArrow } from "./PixelArrow";
import type { SceneController } from "@/lib/coast/renderer";
import { zoneCamera, type Zone } from "@/lib/coast/camera";
import { NAV, SECTIONS, WheelGestures, neighbour, plan, sample, wheelDelta, type Motion, type NavSource } from "@/lib/coast/navigation";
import { assetSets, scene } from "@/lib/coast/scene-manifest";

/** Below this the zones stack vertically and only the Home scene is rendered. */
export const STACKED = "(max-width: 700px), (max-aspect-ratio: 4/5), (max-height: 620px)";
const DEBUG = process.env.NODE_ENV !== "production";

export interface NavState {
  /** The camera's left edge and where it is heading, in world px. */
  x: number; targetX: number;
  /** The section last arrived at, and the one the camera is going to (the highlighted link). */
  settled: Zone; target: Zone;
  source: NavSource; moving: boolean; dragging: boolean;
  /** Sections the current move only passes through: their content is hidden. */
  passing: Zone[];
  wheel: WheelGestures["state"];
  at: Record<Zone, number>;
}
declare global { interface Window { __nav?: { state(): NavState } } }

interface Props { nav: ReactNode; intro: ReactNode; children: ReactNode }

function subscribe(change: () => void) {
  const query = window.matchMedia(STACKED);
  query.addEventListener("change",change);
  return ()=>query.removeEventListener("change",change);
}
const layout = ()=>window.matchMedia(STACKED).matches ? "home" as const : "pano" as const;
const zoneFromHash = (): Zone => {
  const hash = location.hash.slice(1) as Zone;
  return SECTIONS.includes(hash) ? hash : "home";
};

/**
 * Desktop: a full-screen stage shows one window of the panorama, and a camera travels it
 * between three exact resting points: Home, Projects and Experience. The page itself does
 * not scroll. One controller below owns the camera: the wheel, trackpad, touch, keys, nav
 * links and browser history all ask it for a section, and it alone animates the camera
 * (one requestAnimationFrame loop), highlights the nav and updates the URL.
 *
 * Phones (STACKED) are an ordinary vertical page and none of this runs.
 */
export function Panorama({ nav, intro, children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const controller = useRef<SceneController | null>(null);
  // Unknown until hydrated, so phones never start loading the panorama's textures.
  const mode = useSyncExternalStore(subscribe,layout,()=>null);
  const [away,setAway] = useState(false);
  // The camera on the beach, picked up (CameraGallery owns the view until it is put down).
  const [held,setHeld] = useState<HTMLButtonElement | null>(null);
  const update = useRef<() => void>(() => {});

  const openCamera = useCallback((button: HTMLButtonElement) => setHeld(current => current ?? button), []);
  const closeCamera = useCallback(() => { setHeld(null); update.current(); }, []);
  const getController = useCallback(() => controller.current, []);

  const onController = useCallback((next: SceneController | null)=> {
    controller.current = next;
    update.current();
  },[]);

  useEffect(()=> {
    if (mode !== "pano") return;
    const stage = stageRef.current!;
    const site = stage.parentElement!;
    const root = document.documentElement;
    const home = stage.querySelector<HTMLElement>(".home-intro");
    const zones: Partial<Record<Zone, HTMLElement>> = Object.fromEntries(
      [...stage.querySelectorAll<HTMLElement>("[data-zone]")].map(el=>[el.dataset.zone,el]));
    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-zone-link]")];
    const hint = stage.querySelector<HTMLElement>(".scroll-hint");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = { x0: scene.padLeft, y0: 0, ww: scene.sourceWidth, wh: scene.height };
    let at: Record<Zone, number> = { home: frame.x0, projects: 0, experience: 0 };
    let span = 1, px = 1;
    let sceneWindow: HTMLElement | null = null;
    let written = { home: NaN, projects: NaN, experience: NaN };
    let wasAway = false;
    let raf = 0;

    // ---- the single source of truth ------------------------------------------------------
    const state = {
      /** The camera's left edge, world px. Lives here, not in React state. */
      x: NaN,
      /** The section last arrived at, and the destination (the highlighted link, the URL). */
      settled: zoneFromHash(),
      target: zoneFromHash(),
      source: "init" as NavSource,
      motion: null as Motion | null,
      passing: new Set<Zone>(),
      /** The section announced as arrived (`coast:arrived`), null while moving. */
      arrived: null as Zone | null,
      /** A nav click's section, whose heading takes focus once the camera arrives. */
      focus: null as Zone | null,
    };
    /** A touch drag in progress: the camera follows the finger, within one section either way. */
    let drag: { from: Zone; base: number; lo: number; hi: number; x: number } | null = null;
    const gestures = new WheelGestures();

    // While the camera is picked up the pickup drives the view; nothing here may move it.
    const holding = ()=>stage.hasAttribute("data-camera");
    const clampX = (x: number)=>Math.min(at.experience, Math.max(at.home, x));

    // All layout reads happen here, on resize, never while moving.
    function measure() {
      const style = getComputedStyle(site);
      const read = (name: string, fallback: number)=> { const v = parseFloat(style.getPropertyValue(name)); return Number.isFinite(v) ? v : fallback; };
      frame = { x0: read("--x0",frame.x0), y0: read("--y0",0), ww: read("--ww",frame.ww), wh: read("--wh",frame.wh) };
      at = { home: frame.x0, projects: zoneCamera("projects",frame.ww), experience: zoneCamera("experience",frame.ww) };
      span = (at.experience - at.home) / 2;
      px = stage.clientWidth / frame.ww;
      sceneWindow = stage.querySelector<HTMLElement>(".scene-window");
      written = { home: NaN, projects: NaN, experience: NaN };
      // The sections moved with the window: rest exactly on one, or re-aim the move at it.
      if (state.motion) {
        const now = performance.now(), { x, v } = sample(state.motion,now);
        state.motion = plan(clampX(x),at[state.target],v,now,span);
      } else if (!drag) state.x = at[state.target];
    }

    // ---- drawing (writes only) -----------------------------------------------------------
    function apply(camera: number) {
      const shift = (name: Zone)=>Math.round((at[name]-camera)*px*100)/100;
      if (home && shift("home") !== written.home) { written.home = shift("home"); home.style.transform = `translate3d(${written.home}px,0,0)`; }
      for (const name of ["projects","experience"] as const) {
        const el = zones[name];
        if (!el || shift(name) === written[name]) continue;
        written[name] = shift(name);
        el.style.transform = `translate3d(${written[name]}px,0,0)`;
        // On very wide screens neighbouring zones share the window; only the one the
        // camera is at keeps its text, the other fades as it slides away.
        const off = Math.abs(at[name]-camera) / frame.ww;
        const presence = Math.max(0,Math.min(1,(0.5-off)/0.25));
        el.style.opacity = String(presence);
        el.toggleAttribute("data-faded",presence===0);
      }
      sceneWindow?.style.setProperty("--cam",String(camera));
      // The nav sits at the window's right edge, where the night arrives first.
      const sky = camera > at.projects + 0.3 * (at.experience - at.projects) ? "night" : "day";
      if (stage.dataset.sky !== sky) stage.dataset.sky = sky;
      if (hint) hint.style.opacity = String(0.55 * (1 - Math.min(1,(camera-at.home) / (0.08 * span))));
      controller.current?.setFrame({ x: camera, y: frame.y0, width: frame.ww, height: frame.wh });
      const isAway = camera > at.home + 0.5;
      if (isAway !== wasAway) { wasAway = isAway; setAway(isAway); }
    }

    // ---- the one animation loop ----------------------------------------------------------
    function tick(now: number) {
      raf = 0;
      if (holding()) return;
      if (drag) state.x = drag.x;
      else if (state.motion) {
        const s = sample(state.motion,now);
        state.x = clampX(s.x);
        if (s.done) { finish(); return; }
      }
      apply(state.x);
      draw();
      if (state.motion) raf = requestAnimationFrame(tick);
    }
    const schedule = ()=> { if (!raf) raf = requestAnimationFrame(tick); };
    /** End the move exactly on its target. */
    function finish() {
      cancelAnimationFrame(raf); raf = 0;
      state.motion = null;
      state.x = at[state.target];
      apply(state.x);
      settle();
    }

    /** The camera has come to rest exactly on its target. */
    function settle() {
      state.settled = state.target;
      setPassing(new Set());
      if (state.arrived !== state.target) {
        state.arrived = state.target;
        // Settled arrival, for anything that waits for the camera (components/home/Meteor).
        root.dataset.arrived = state.target;
        window.dispatchEvent(new CustomEvent("coast:arrived", { detail: state.target }));
      }
      if (state.focus) {
        const title = state.focus === "home" ? null : stage.querySelector<HTMLElement>(`#${state.focus}-title`);
        state.focus = null;
        title?.focus({ preventScroll: true });
      }
      draw();
    }
    function depart() {
      if (state.arrived === null) return;
      state.arrived = null;
      delete root.dataset.arrived;
      window.dispatchEvent(new CustomEvent("coast:arrived", { detail: null }));
    }
    function setPassing(next: Set<Zone>) {
      state.passing = next;
      for (const [name, el] of Object.entries(zones) as [Zone, HTMLElement][]) el.toggleAttribute("data-passing",next.has(name));
    }

    /**
     * Every navigation comes through here. It decides the destination at once (so the nav
     * highlight and URL never lag or flicker), hides the content of any section the camera
     * will only pass through, and starts one move from wherever the camera is now, at the
     * speed it is already going, so an interrupted move simply bends toward the new target.
     */
    function go(zone: Zone, source: NavSource, { v0, focus = false }: { v0?: number; focus?: boolean } = {}) {
      if (holding()) return;
      const now = performance.now();
      const moving = state.motion ? sample(state.motion,now) : null;
      const x = clampX(drag ? drag.x : moving ? moving.x : state.x);
      if (!drag && zone === state.target && (moving || x === at[zone])) {
        // Already going (or gone) there: only a click's focus request still matters.
        if (focus) { state.focus = zone; if (!moving) settle(); }
        return;
      }
      drag = null;
      state.source = source;
      state.focus = focus ? zone : null;
      state.target = zone;
      state.x = x;
      highlight(zone);
      record(zone,source);
      // Sections strictly between the camera and the destination are only passed through.
      // The one the camera is still showing (within a few steps of it) is where it leaves from.
      const margin = 0.15 * frame.ww, lo = Math.min(x,at[zone]) + margin, hi = Math.max(x,at[zone]) - margin;
      setPassing(new Set(SECTIONS.filter(z => z !== zone && at[z] > lo && at[z] < hi)));
      const v = v0 ?? moving?.v ?? 0;
      if (Math.abs(x - at[zone]) >= 0.5) depart();
      if (reduced.matches || (Math.abs(x - at[zone]) < 0.5 && Math.abs(v) < 0.01)) { finish(); return; }
      state.motion = plan(x,at[zone],v,now,span);
      schedule();
      draw();
    }
    function highlight(zone: Zone) {
      for (const link of links) {
        if (link.dataset.zoneLink === zone) link.setAttribute("aria-current","location");
        else link.removeAttribute("aria-current");
      }
      stage.dataset.zone = zone;
    }
    /** The URL follows the destination: nav clicks add a history entry, gestures replace it. */
    function record(zone: Zone, source: NavSource) {
      if (source === "history" || source === "init" || zoneFromHash() === zone) return;
      const url = zone === "home" ? location.pathname + location.search : `#${zone}`;
      if (source === "click") history.pushState(null,"",url);
      else history.replaceState(null,"",url);
    }
    /** One step from where the camera is going: a gesture never moves more than one section. */
    function step(direction: number, source: NavSource, v0?: number) {
      const to = neighbour(state.target,direction);
      if (to !== state.target) go(to,source,{ v0 });
    }

    // ---- what may scroll on its own ------------------------------------------------------
    /**
     * Whether a gesture starting on `target` belongs to something under it rather than the
     * camera: an open dialog, or a scroller (the projects' panel) with room to scroll that way.
     */
    function ownedBelow(target: EventTarget | null, axis: "x" | "y", delta: number) {
      for (let el = target instanceof Element ? target : null; el && el !== root && el !== document.body; el = el.parentElement) {
        if (el.matches("dialog[open], [aria-modal='true']")) return true;
        const style = getComputedStyle(el);
        const overflow = axis === "y" ? style.overflowY : style.overflowX;
        if (!/auto|scroll|overlay/.test(overflow)) continue;
        const [pos, size, view] = axis === "y" ? [el.scrollTop, el.scrollHeight, el.clientHeight] : [Math.abs(el.scrollLeft), el.scrollWidth, el.clientWidth];
        if (size - view < 1) continue;
        if (delta > 0 ? pos + view < size - 1 : pos > 0) return true;
      }
      return false;
    }

    // ---- input ---------------------------------------------------------------------------
    /**
     * Wheel and trackpad. Each gesture (see WheelGestures) moves at most one section; the
     * rest of it, momentum included, is swallowed. A gesture that starts over a scroller
     * that can still scroll its way belongs to that scroller, start to finish.
     */
    function onWheel(event: WheelEvent) {
      if (event.ctrlKey) return;                   // pinch to zoom
      if (holding() || drag) { event.preventDefault(); gestures.consume(); return; }
      const { delta, axis } = wheelDelta(event,window.innerHeight);
      const { step: direction } = gestures.feed(delta,event.timeStamp,()=>!ownedBelow(event.target,axis,delta));
      if (gestures.native) return;
      event.preventDefault();                      // never the browser's back/forward swipe
      if (direction) step(direction,"wheel");
      draw();
    }

    // Touch: the camera follows a drag, then settles on the section it was dragged toward.
    let touch: { x: number; y: number; target: EventTarget | null; axis: "x" | "y" | null; native: boolean; samples: { t: number; d: number }[] } | null = null;
    function onTouchStart(event: TouchEvent) {
      const t = event.touches[0];
      if (event.touches.length !== 1 || !t) { cancelTouch(); return; }
      touch = { x: t.clientX, y: t.clientY, target: event.target, axis: null, native: false, samples: [] };
    }
    function onTouchMove(event: TouchEvent) {
      const t = event.touches[0];
      if (!touch || !t) return;
      if (holding()) { if (event.cancelable) event.preventDefault(); return; }
      if (event.touches.length !== 1) { cancelTouch(); return; }
      // Forward is a drag to the left or up, the way the content moves.
      const dx = touch.x - t.clientX, dy = touch.y - t.clientY;
      if (!touch.axis) {
        if (Math.hypot(dx,dy) < NAV.touch.lockPx) return;
        touch.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        touch.native = ownedBelow(touch.target,touch.axis,touch.axis === "x" ? dx : dy);
        if (!touch.native) grab(touch.axis === "x" ? dx : dy);
      }
      if (touch.native || !drag) return;
      if (event.cancelable) event.preventDefault();
      const d = touch.axis === "x" ? dx : dy;
      touch.samples.push({ t: event.timeStamp, d });
      while (touch.samples.length > 2 && event.timeStamp - touch.samples[0].t > 100) touch.samples.shift();
      drag.x = Math.min(drag.hi,Math.max(drag.lo,drag.base + d / px));
      schedule();
    }
    /**
     * Take hold of the camera (stopping any move) for a drag measured from one section. The
     * camera follows the finger from the point the drag was recognised, so it never jumps.
     */
    function grab(d: number) {
      const x = state.motion ? clampX(sample(state.motion,performance.now()).x) : state.x;
      const from = state.target;
      state.motion = null;
      depart();
      drag = { from, base: x - Math.sign(d) * NAV.touch.lockPx / px, x,
        lo: Math.min(x,at[neighbour(from,-1)]), hi: Math.max(x,at[neighbour(from,1)]) };
      schedule();
    }
    function onTouchEnd() {
      const t = touch;
      touch = null;
      if (!t || t.native || !drag) return;
      const first = t.samples[0], last = t.samples.at(-1);
      const v = first && last && last.t > first.t ? (last.d - first.d) / (last.t - first.t) : 0;   // CSS px per ms
      const offset = (drag.x - at[drag.from]) / span;
      let to = drag.from;
      if (Math.abs(v) >= NAV.touch.flick) {
        // A flick back against the drag returns to where it started.
        if (Math.sign(v) === Math.sign(offset) || Math.abs(offset) < 0.02) to = neighbour(drag.from,Math.sign(v));
      } else if (Math.abs(offset) >= NAV.touch.commit) to = neighbour(drag.from,Math.sign(offset));
      go(to,"touch",{ v0: v / px });
    }
    function cancelTouch() {
      const was = drag;
      touch = null;
      if (was) go(was.from,"touch");
    }

    /**
     * Keys: ← → and the page keys step between sections (the page itself does not scroll).
     * Up/down scroll the projects' own panel first while it has room, as the wheel does.
     */
    function onKey(event: KeyboardEvent) {
      if (holding() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as Element | null;
      if (target?.closest?.("input,textarea,select,[contenteditable],[role=slider],audio,video")) return;
      let direction = 0, to: Zone | null = null, scroll = 0;
      switch (event.key) {
        case "ArrowRight": direction = 1; break;
        case "ArrowLeft": direction = -1; break;
        case "ArrowDown": direction = 1; scroll = 60; break;
        case "ArrowUp": direction = -1; scroll = 60; break;
        case "PageDown": direction = 1; scroll = .85; break;
        case "PageUp": direction = -1; scroll = .85; break;
        case " ":
          if (target?.closest?.("button,a,summary,[role=button]")) return;
          direction = event.shiftKey ? -1 : 1; scroll = .85; break;
        case "Home": to = "home"; break;
        case "End": to = "experience"; break;
        default: return;
      }
      event.preventDefault();
      if (scroll && !state.motion && state.target === "projects") {
        const panel = zones.projects?.querySelector<HTMLElement>(".project-scroll");
        if (panel && ownedBelow(panel,"y",direction)) {
          const by = scroll < 1 ? scroll * panel.clientHeight : scroll;
          panel.scrollBy({ top: direction * by, behavior: reduced.matches ? "auto" : "smooth" });
          return;
        }
      }
      if (event.repeat) return;                    // one press, one section
      if (to) go(to,"key"); else step(direction,"key");
    }
    function onClick(event: MouseEvent) {
      if (holding() || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
      const zone = link?.getAttribute("href")?.slice(1) as Zone | undefined;
      if (!link || !zone || !SECTIONS.includes(zone)) return;
      event.preventDefault();
      go(zone,"click",{ focus: true });
    }
    // Back and forward (and an edited hash) return to the section in the URL.
    const onHistory = ()=>go(zoneFromHash(),"history");
    // Tabbing into a zone that is out of view brings the camera to it.
    function onFocus(event: FocusEvent) {
      const el = event.target as Element | null;
      const zone = el?.closest?.<HTMLElement>("[data-zone]")?.dataset.zone as Zone | undefined;
      if (zone && zone !== state.target) go(zone,"focus");
      else if (!zone && home?.contains(el) && state.target !== "home") go("home","focus");
    }
    // Asking for reduced motion mid-move ends the move where it was going.
    const onMotionPreference = ()=> { if (reduced.matches && state.motion) finish(); };

    // ---- development diagnostics (?nav-debug) --------------------------------------------
    const snapshot = (): NavState => ({
      x: state.x, targetX: at[state.target],
      settled: state.settled, target: state.target, source: state.source,
      moving: !!state.motion, dragging: !!drag, passing: [...state.passing], wheel: gestures.state, at: { ...at },
    });
    const overlay = DEBUG && new URLSearchParams(location.search).has("nav-debug") ? document.createElement("pre") : null;
    if (overlay) { overlay.className = "nav-debug"; document.body.append(overlay); }
    function draw() {
      if (!overlay) return;
      const s = snapshot();
      overlay.textContent = [
        `camera   ${s.x.toFixed(1)} → ${s.targetX.toFixed(1)}`,
        `section  ${s.settled} → ${s.target}  (${s.source})`,
        `moving   ${s.moving}${s.dragging ? "  dragging" : ""}`,
        `wheel    ${s.wheel.native ? "panel's" : s.wheel.consumed ? "consumed" : `building ${s.wheel.sum}`}${s.wheel.decayed ? ", momentum" : ""}`,
        `passing  ${s.passing.join(", ") || "–"}`,
      ].join("\n");
    }
    if (DEBUG) window.__nav = { state: snapshot };

    update.current = ()=> { measure(); if (!holding()) apply(state.x); schedule(); };
    // Arrive at the URL's section without a pan.
    measure();
    highlight(state.target);
    apply(state.x);
    settle();
    const resize = new ResizeObserver(()=>{ measure(); apply(state.x); schedule(); });
    resize.observe(stage);
    const passive = { passive: true }, active = { passive: false };
    window.addEventListener("wheel",onWheel,active);
    stage.addEventListener("touchstart",onTouchStart,passive);
    stage.addEventListener("touchmove",onTouchMove,active);
    stage.addEventListener("touchend",onTouchEnd);
    stage.addEventListener("touchcancel",cancelTouch);
    document.addEventListener("click",onClick);
    document.addEventListener("keydown",onKey);
    window.addEventListener("popstate",onHistory);
    window.addEventListener("hashchange",onHistory);
    stage.addEventListener("focusin",onFocus);
    reduced.addEventListener("change",onMotionPreference);
    return ()=> {
      cancelAnimationFrame(raf);
      update.current = ()=>{};
      resize.disconnect();
      window.removeEventListener("wheel",onWheel);
      stage.removeEventListener("touchstart",onTouchStart);
      stage.removeEventListener("touchmove",onTouchMove);
      stage.removeEventListener("touchend",onTouchEnd);
      stage.removeEventListener("touchcancel",cancelTouch);
      document.removeEventListener("click",onClick);
      document.removeEventListener("keydown",onKey);
      window.removeEventListener("popstate",onHistory);
      window.removeEventListener("hashchange",onHistory);
      stage.removeEventListener("focusin",onFocus);
      reduced.removeEventListener("change",onMotionPreference);
      overlay?.remove();
      if (DEBUG) delete window.__nav;
      // Leaving the panorama (e.g. a window resized into the stacked layout): reset the layers.
      sceneWindow?.style.removeProperty("--cam");
      if (hint) hint.style.opacity = "";
      delete stage.dataset.zone;
      delete stage.dataset.sky;
      if (home) home.style.transform = "";
      for (const el of Object.values(zones)) if (el) {
        el.style.transform = ""; el.style.opacity = "";
        el.removeAttribute("data-faded"); el.removeAttribute("data-passing");
      }
      for (const link of links) link.removeAttribute("aria-current");
      delete root.dataset.arrived;
      setAway(false);
    };
  },[mode]);

  return (
    <div className="stage" ref={stageRef}>
      <div className="homepage">
        {intro}
        <CoastalScene key={mode ?? "pending"} assets={mode} away={away} clean={held !== null} onController={onController} onCameraClick={openCamera} />
        <a className="scroll-hint" href="#projects">scroll<PixelArrow direction="down" /></a>
      </div>
      {nav}
      {children}
      {held && <CameraGallery opener={held} getController={getController} worldWidth={assetSets[mode ?? "home"].width} onClosed={closeCamera} />}
    </div>
  );
}
