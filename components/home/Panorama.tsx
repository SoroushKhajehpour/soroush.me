"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CoastalScene } from "./CoastalScene";
import { PixelArrow } from "./PixelArrow";
import type { SceneController } from "@/lib/coast/renderer";
import { cameraAt, timeline, zoneCamera, type Zone } from "@/lib/coast/camera";
import { scene } from "@/lib/coast/scene-manifest";

/** Below this the zones stack vertically and only the Home scene is rendered. */
export const STACKED = "(max-width: 700px), (max-aspect-ratio: 4/5), (max-height: 620px)";
const ZONES: Zone[] = ["home", "projects", "experience"];

interface Props { nav: ReactNode; intro: ReactNode; children: ReactNode }

function subscribe(change: () => void) {
  const query = window.matchMedia(STACKED);
  query.addEventListener("change",change);
  return ()=>query.removeEventListener("change",change);
}
const layout = ()=>window.matchMedia(STACKED).matches ? "home" as const : "pano" as const;

/**
 * Desktop: the page is a tall scroll track; a sticky full-screen stage shows one window of
 * the panorama, and the scroll position moves the camera from Home to Projects to
 * Experience (lib/coast/camera.ts). Native scrolling drives everything, so the wheel,
 * trackpad, keyboard, scrollbar and anchor links all work; nothing is hijacked.
 */
export function Panorama({ nav, intro, children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const controller = useRef<SceneController | null>(null);
  // Unknown until hydrated, so phones never start loading the panorama's textures.
  const mode = useSyncExternalStore(subscribe,layout,()=>null);
  const [away,setAway] = useState(false);
  const update = useRef<() => void>(() => {});

  const onController = useCallback((next: SceneController | null)=> {
    controller.current = next;
    update.current();
  },[]);

  useEffect(()=> {
    if (mode !== "pano") return;
    const stage = stageRef.current!;
    const site = stage.parentElement!;
    const home = stage.querySelector<HTMLElement>(".home-intro");
    const zones: Partial<Record<Zone, HTMLElement>> = Object.fromEntries(
      [...stage.querySelectorAll<HTMLElement>("[data-zone]")].map(el=>[el.dataset.zone,el]));
    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-zone-link]")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = { x0: scene.padLeft, y0: 0, ww: scene.sourceWidth, wh: scene.height };
    let raf = 0;
    let wasAway = false;
    // Where a nav jump or arrow key is heading, so repeated presses step from there.
    let heading: Zone | null = null;
    let headingTimer = 0;

    function measure() {
      const style = getComputedStyle(site);
      const read = (name: string, fallback: number)=> { const v = parseFloat(style.getPropertyValue(name)); return Number.isFinite(v) ? v : fallback; };
      frame = { x0: read("--x0",frame.x0), y0: read("--y0",0), ww: read("--ww",frame.ww), wh: read("--wh",frame.wh) };
    }
    function anchors() {
      return { home: frame.x0, projects: zoneCamera("projects",frame.ww), experience: zoneCamera("experience",frame.ww) };
    }
    function render() {
      raf = 0;
      const vh = window.innerHeight;
      const progress = window.scrollY / vh;
      const at = anchors();
      const { camera, objects, zone } = cameraAt(progress, at, reduced.matches);
      const px = stage.clientWidth / frame.ww;
      stage.style.setProperty("--cam",String(camera));
      stage.style.setProperty("--objects",String(objects));
      if (home) home.style.transform = `translate3d(${(at.home-camera)*px}px,0,0)`;
      for (const name of ["projects","experience"] as const) {
        const el = zones[name];
        if (!el) continue;
        el.style.transform = `translate3d(${(at[name]-camera)*px}px,0,0)`;
        // On very wide screens neighbouring zones share the window; only the one the
        // camera is at keeps its text, the other fades as it slides away.
        const off = Math.abs(at[name]-camera) / frame.ww;
        const presence = Math.max(0,Math.min(1,(0.5-off)/0.25));
        el.style.setProperty("--presence",String(presence));
        el.toggleAttribute("data-faded",presence===0);
      }
      stage.dataset.zone = zone;
      // The nav sits at the window's right edge, where the night arrives first.
      stage.dataset.sky = camera > at.projects + 0.3 * (at.experience - at.projects) ? "night" : "day";
      for (const link of links) link.toggleAttribute("aria-current",link.dataset.zoneLink===zone);
      controller.current?.setFrame({ x: camera, y: frame.y0, width: frame.ww, height: frame.wh });
      controller.current?.setObjects(objects);
      const isAway = camera > at.home + 0.5;
      if (isAway !== wasAway) { wasAway = isAway; setAway(isAway); }
    }
    const schedule = ()=> { if (!raf) raf = requestAnimationFrame(render); };
    update.current = ()=> { measure(); render(); };

    function go(zone: Zone, focus: boolean) {
      const top = timeline.anchors[zone] * window.innerHeight;
      // Remember the destination until the scroll gets there (or is already there).
      heading = Math.abs(window.scrollY-top) < 2 ? null : zone;
      clearTimeout(headingTimer);
      const arrived = ()=>{ heading = null; clearTimeout(headingTimer); };
      window.addEventListener("scrollend",arrived,{ once: true });
      headingTimer = window.setTimeout(arrived,1500);
      window.scrollTo({ top, behavior: reduced.matches ? "auto" : "smooth" });
      history.replaceState(null,"",zone==="home" ? location.pathname + location.search : `#${zone}`);
      if (!focus) return;
      const title = zone==="home" ? null : stage.querySelector<HTMLElement>(`#${zone}-title`);
      if (!title) return;
      const done = ()=>title.focus({ preventScroll: true });
      if (reduced.matches || Math.abs(window.scrollY-top) < 2) done();
      else window.addEventListener("scrollend",done,{ once: true });
    }
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
      const zone = link?.getAttribute("href")?.slice(1) as Zone | undefined;
      if (!link || !zone || !ZONES.includes(zone)) return;
      event.preventDefault();
      go(zone,true);
    }
    // ← and → step between zones, like turning the camera to the next stretch of beach.
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if ((event.target as Element | null)?.closest?.("input,textarea,select,[contenteditable]")) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const current = ZONES.indexOf(heading ?? ((stage.dataset.zone as Zone) || "home"));
      const next = ZONES[Math.min(ZONES.length-1,Math.max(0,current + (event.key==="ArrowRight" ? 1 : -1)))];
      event.preventDefault();
      go(next,false);
    }
    // A sideways trackpad swipe moves along the beach too.
    function onWheel(event: WheelEvent) {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.2) window.scrollBy({ top: event.deltaX });
    }
    // Tabbing into a zone that is out of view brings the camera to it.
    function onFocus(event: FocusEvent) {
      const zone = (event.target as Element | null)?.closest?.<HTMLElement>("[data-zone]")?.dataset.zone as Zone | undefined;
      if (zone && zone !== stage.dataset.zone) go(zone,false);
      else if (!zone && home?.contains(event.target as Node) && stage.dataset.zone !== "home") go("home",false);
    }

    measure();
    const initial = location.hash.slice(1) as Zone;
    if (ZONES.includes(initial)) window.scrollTo({ top: timeline.anchors[initial] * window.innerHeight, behavior: "auto" });
    render();
    const resize = new ResizeObserver(()=>{ measure(); schedule(); });
    resize.observe(stage);
    window.addEventListener("scroll",schedule,{ passive: true });
    window.addEventListener("wheel",onWheel,{ passive: true });
    document.addEventListener("click",onClick);
    document.addEventListener("keydown",onKey);
    stage.addEventListener("focusin",onFocus);
    reduced.addEventListener("change",schedule);
    return ()=> {
      cancelAnimationFrame(raf);
      clearTimeout(headingTimer);
      update.current = ()=>{};
      resize.disconnect();
      window.removeEventListener("scroll",schedule);
      window.removeEventListener("wheel",onWheel);
      document.removeEventListener("click",onClick);
      document.removeEventListener("keydown",onKey);
      stage.removeEventListener("focusin",onFocus);
      reduced.removeEventListener("change",schedule);
      // Leaving the panorama (e.g. a window resized into the stacked layout): reset the layers.
      stage.style.removeProperty("--cam");
      stage.style.removeProperty("--objects");
      delete stage.dataset.zone;
      delete stage.dataset.sky;
      if (home) home.style.transform = "";
      for (const el of Object.values(zones)) if (el) { el.style.transform = ""; el.style.removeProperty("--presence"); el.removeAttribute("data-faded"); }
      for (const link of links) link.removeAttribute("aria-current");
      setAway(false);
    };
  },[mode]);

  return (
    <>
      {/* Scroll-snap resting points for Home, Projects and Experience. */}
      <div className="track-stops" aria-hidden="true">
        {ZONES.map(zone=><span key={zone} style={{ top: `${timeline.anchors[zone] * 100}svh` }} />)}
      </div>
      <div className="stage" ref={stageRef}>
        <div className="homepage">
          {intro}
          <CoastalScene key={mode ?? "pending"} assets={mode} away={away} onController={onController} />
          <a className="scroll-hint" href="#projects">scroll<PixelArrow direction="down" /></a>
        </div>
        {nav}
        {children}
      </div>
    </>
  );
}
