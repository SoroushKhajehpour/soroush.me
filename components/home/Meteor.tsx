"use client";

import { useEffect, useRef, useState } from "react";
import {
  bakeSheet, duration, FLIGHT, flightPlan, frameAt, impactScales, LANDING, meteorVisit, METEOR_URL, SCENE, sequences, sheetOf,
  variantKey, visibleLength, type FlightSample, type SequenceName, type Sheet,
} from "@/lib/coast/meteor";
import { pano } from "@/lib/coast/scene-manifest";

type Plan = ReturnType<typeof flightPlan>;
/** The trajectory overlay (start, path, horizon, shoreline, timeline band, landing, head anchor): development only, with ?meteor-debug. */
const DEBUG = process.env.NODE_ENV !== "production";

type Phase = "waiting" | "flying" | "impact" | "landed";
const warmSheets = [sheetOf("impact"), sheetOf("idle")];

/** Shows one cell of a sheet (sizes and anchor come with it); `name` is the sequence it belongs to. */
function paint(el: HTMLElement, name: SequenceName, cell: number, sheet: Sheet = sheetOf(name)) {
  el.dataset.seq = name;
  if (el.dataset.sheet !== sheet.url) {
    el.dataset.sheet = sheet.url;
    el.style.setProperty("--fw", String(sheet.fw));
    el.style.setProperty("--fh", String(sheet.fh));
    el.style.setProperty("--fc", String(sheet.fc));
    el.style.setProperty("--ax", String(sheet.ax));
    el.style.setProperty("--ay", String(sheet.ay));
    el.style.backgroundImage = `url("${sheet.url}")`;
  }
  el.style.setProperty("--cell", String(cell));
}

/*
  A meteor that falls once per visit when the camera settles on Experience, crashes into
  the sand and stays there as a button: pressing it sends a warm pulse along the timeline.

  It lives in world coordinates: the element's left/top are CSS calcs of the scene window's
  --cam/--y0/--ww/--wh (the same convention as the other scene objects), so it stays put on
  the sand through camera movement and resizing with no layout reads. Each animation frame
  only writes the world point (--mx/--my), the sheet cell and, as it nears, a bigger, hotter,
  re-aimed sheet (the flight's shape, timing and sizes are FLIGHT in lib/coast/meteor).

  `mode="pano"` sits in the desktop scene window and waits for the camera; `mode="panel"`
  sits in the phones' beach panel (whose crop is set as the same variables) and waits for
  the panel to scroll into view.
*/
export function Meteor({ mode }: { mode: "pano" | "panel" }) {
  const sprite = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<Phase>(() => (meteorVisit.landed ? "landed" : "waiting"));
  const phaseRef = useRef<Phase>(phase);
  const go = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const activating = useRef(false);
  const [debugPlan, setDebugPlan] = useState<Plan | null>(null);

  // Pixel sizes, in whole screen pixels per art pixel: the flight's base size (about 2× the
  // panorama's own scale) and the resting rock's (landedScale × that).
  const px = useRef({ fly: 2, land: 4 });
  useEffect(() => {
    const el = sprite.current?.parentElement;
    if (!el) return;
    const fit = () => {
      const k = el.clientWidth / (parseFloat(getComputedStyle(el).getPropertyValue("--ww")) || 1744);
      const fly = Math.max(1, Math.min(4, Math.round(2 * k))), land = Math.max(1, Math.round(2 * k * FLIGHT.landedScale));
      px.current = { fly, land };
      el.style.setProperty("--mfly", String(fly));
      el.style.setProperty("--mland", String(land));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  useEffect(() => {
    const el = sprite.current!;
    const host = el.parentElement!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Read here, after hydration (the server render never has it); marks the head anchor too.
    const debugOn = DEBUG && new URLSearchParams(window.location.search).has("meteor-debug");
    if (debugOn) el.dataset.debug = "";
    let raf = 0, timer = 0, t0 = 0, alive = true;
    // Sizes are in base sizes (one art pixel per --mfly screen px). The flight ends at the contact
    // size (from the art's measured streak length and the scene's width) and the impact settles
    // from it to the rock's, so both are planned (and baked) for the current layout.
    const load = (name: SequenceName) => new Promise<HTMLImageElement>((ok, no) => {
      const img = new Image(); img.onload = () => ok(img); img.onerror = no; img.src = sheetOf(name).url;
    });
    const art = load("flight"), impactArt = load("impact");
    let artLength = 0;
    /*
      Everything is in panorama world pixels. The scene window maps them to the screen with its
      --cam/--y0/--ww/--wh variables (the phones' panel sets the same variables for its crop), so
      reading those gives the visible part of the world: where the open sky is, and where the
      timeline band sits over it.
    */
    function layout() {
      const rest = px.current.land / px.current.fly;
      const len = mode === "panel" ? FLIGHT.panel.length : FLIGHT.length;
      const streak = Math.min(len.maxPx, Math.max(len.minPx, len.fraction * host.clientWidth));
      const contact = +(streak / (artLength * px.current.fly)).toFixed(4);
      const cs = getComputedStyle(host), n = (v: string, f: number) => { const x = parseFloat(cs.getPropertyValue(v)); return Number.isFinite(x) ? x : f; };
      const cam = n("--cam", n("--x0", 0)), ww = n("--ww", pano.designWindow), y0 = n("--y0", 0), wh = n("--wh", pano.height);
      if (mode === "panel") {
        const start = { x: Math.round(cam + ww - FLIGHT.panel.inset), y: Math.round(y0 + FLIGHT.panel.drop) };
        return { rest, contact, start, bandY: -Infinity };
      }
      // The upper-right open sky of what is on screen, whatever the viewport's shape.
      const start = { x: Math.round(cam + ww - FLIGHT.start.inset), y: Math.round(SCENE.horizon - FLIGHT.start.sky * (SCENE.horizon - y0)) };
      // The timeline band's bottom edge, in world y.
      const tl = document.querySelector(".timeline")?.getBoundingClientRect(), hr = host.getBoundingClientRect();
      const bandY = tl && hr.height ? Math.round(y0 + ((tl.bottom - hr.top) / hr.height) * wh) : -Infinity;
      return { rest, contact, start, bandY };
    }
    let plan: Plan | null = null, planned = "";
    const baked = new Map<string, Sheet>();
    /** The impact's frames drawn at the meteor's size (null: the sheet itself, at the landed pixel size). */
    let impactFrames: (Sheet | null)[] = [];
    let ready: Promise<unknown> | null = null;
    // Bake every size/heading/trail the flight uses and the resized impact frames, once the art is in.
    function prepare() {
      return art.then(img => {
        artLength ||= visibleLength(img);
        const { rest, contact, start, bandY } = layout(), key = `${rest}:${contact}:${start.x}:${start.y}:${bandY}`;
        if (ready && key === planned) return ready;
        planned = key;
        const p = (plan = flightPlan({ mode, contact, start, bandY })), frames: (Sheet | null)[] = [];
        return (ready = Promise.all([
          Promise.all(p.variants.map(async v => {
            const k = variantKey(v);
            if (!baked.has(k)) baked.set(k, await bakeSheet(img, sheetOf("flight"), v.scale, v.angle, undefined, v.trail >= 1 ? Infinity : v.trail * artLength));
          })),
          impactArt.then(imp => Promise.all(impactScales(contact, rest).map(async (scale, i) => {
            frames[i] = scale === rest ? null : await bakeSheet(imp, sheetOf("impact"), scale, 0, i);
          }))).then(() => { impactFrames = frames; }),
        ]));
      }).catch(() => {});
    }

    const show = (name: SequenceName, cell: number) => paint(el, name, cell);
    const at = (x: number, y: number) => { el.style.setProperty("--mx", String(x)); el.style.setProperty("--my", String(y)); };

    function land() {
      cancelAnimationFrame(raf); window.clearTimeout(timer); raf = 0;
      el.style.filter = ""; el.style.opacity = ""; delete el.dataset.px;
      meteorVisit.landed = true;
      at(LANDING.x, LANDING.y);
      show("idle", 0);
      go("landed");
    }
    function fly(now: number) {
      t0 ||= now;
      const ms = now - t0;
      const f = plan!.sample(ms);
      at(f.x, f.y);
      // The final approach favours the two densest flight frames, flickering faster.
      const cell = f.smear > 0 ? 1 + (Math.floor(ms / 60) % 2) : frameAt("flight", ms);
      paint(el, "flight", cell, baked.get(variantKey(f)) ?? sheetOf("flight"));
      el.style.filter = `brightness(${f.glow})${smear(f)}`;
      el.style.opacity = String(f.opacity);
      if (ms < plan!.durationMs) { raf = requestAnimationFrame(fly); return; }
      // This last flight frame has the head exactly on the contact point, at full size; the
      // next frame is the impact's flash on the same point.
      t0 = 0; go("impact");
      raf = requestAnimationFrame(impact);
    }
    /** Hard-edged copies of the meteor's silhouette, stepped back along its tail on the pixel grid. */
    function smear(f: FlightSample) {
      if (!f.smear) return "";
      const fly = px.current.fly, d = Math.round(f.smear * FLIGHT.smear.reach * f.scale / 2);
      return FLIGHT.smear.colors.map((c, i) => {
        const n = d * (i + 1);
        return ` drop-shadow(${Math.round(f.tail.x * n) * fly}px ${Math.round(f.tail.y * n) * fly}px 0 ${c})`;
      }).join("");
    }
    function impact(now: number) {
      if (!t0) { t0 = now; el.style.filter = ""; el.style.opacity = ""; }
      const ms = now - t0;
      if (ms >= duration("impact")) { land(); return; }
      // Early frames are drawn at the meteor's contact size, settling to the rock's.
      const i = frameAt("impact", ms), big = impactFrames[i];
      if (big) { el.dataset.px = "fly"; paint(el, "impact", 0, big); }
      else { delete el.dataset.px; show("impact", i); }
      raf = requestAnimationFrame(impact);
    }
    async function launch() {
      if (phaseRef.current !== "waiting" || meteorVisit.landed) return;
      if (reduced.matches) { land(); return; }
      await prepare();
      if (!alive || !armed || phaseRef.current !== "waiting" || meteorVisit.landed) return;
      if (!plan) { land(); return; }            // the art never loaded: just the resting rock
      const f = plan.sample(0);
      at(f.x, f.y);
      paint(el, "flight", 0, baked.get(variantKey(f)));
      el.style.opacity = "0";
      if (DEBUG && debugOn) setDebugPlan(plan);
      t0 = 0; go("flying");
      raf = requestAnimationFrame(fly);
    }
    let armed = false;
    function arm() {
      armed = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(launch, 350);
    }
    // Leaving mid-flight: it lands at once, so coming back never shows a second crash.
    function leave() { armed = false; if (phaseRef.current === "flying" || phaseRef.current === "impact") land(); else window.clearTimeout(timer); }

    if (meteorVisit.landed || reduced.matches) { land(); return () => cancelAnimationFrame(raf); }
    // Decoded up front and held, so switching to the impact sheet never shows an empty frame.
    const held = Object.values(sequences).map(s => { const i = new Image(); i.src = `${METEOR_URL}/${s.sheet}`; i.decode().catch(() => {}); return i; });
    prepare();
    const urls = () => {
      alive = false; held.length = 0;
      for (const s of [...baked.values(), ...impactFrames]) if (s?.url.startsWith("blob:")) URL.revokeObjectURL(s.url);
    };

    if (mode === "pano") {
      const onArrive = (e: Event) => ((e as CustomEvent).detail === "experience" ? arm() : leave());
      window.addEventListener("coast:arrived", onArrive);
      if (document.documentElement.dataset.arrived === "experience") arm();
      return () => { window.removeEventListener("coast:arrived", onArrive); leave(); cancelAnimationFrame(raf); window.clearTimeout(timer); urls(); };
    }
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? arm() : leave()), { threshold: .75 });
    io.observe(host);
    return () => { io.disconnect(); leave(); cancelAnimationFrame(raf); window.clearTimeout(timer); urls(); };
  }, [mode]);

  // Pressing it: the activation frames once, and a pulse along the four timeline stars.
  function activate() {
    if (activating.current || phaseRef.current !== "landed") return;
    activating.current = true;
    const el = sprite.current!;
    const timeline = document.querySelector<HTMLElement>(".timeline");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timeline?.classList.remove("meteor-pulse", "meteor-pulse-still");
    void timeline?.offsetWidth;
    timeline?.classList.add(reduced ? "meteor-pulse-still" : "meteor-pulse");
    const done = () => { paint(el, "idle", 0); activating.current = false; };
    window.setTimeout(() => timeline?.classList.remove("meteor-pulse", "meteor-pulse-still"), reduced ? 900 : 1150);
    if (reduced) { window.setTimeout(done, 900); return; }
    paint(el, "activation", 0);
    let t0 = 0;
    const step = (now: number) => {
      t0 ||= now;
      const ms = now - t0;
      if (ms >= duration("activation")) { done(); return; }
      paint(el, "activation", frameAt("activation", ms));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return (
    <>
      <span className="meteor" ref={sprite} data-phase={phase} aria-hidden="true" />
      {DEBUG && debugPlan && <MeteorDebug plan={debugPlan} />}
      {(phase === "flying" || phase === "impact") && warmSheets.map(w => (
        // The sheets the impact ends on, painted (all but invisibly) at their landed size meanwhile,
        // so the browser has them rasterised when they are shown: no empty frame on the switch.
        <span key={w.url} className="meteor-warm" aria-hidden="true" style={{
          "--mx": LANDING.x, "--my": LANDING.y, "--fw": w.fw, "--fh": w.fh, "--fc": w.fc,
          "--ax": w.ax, "--ay": w.ay, "--cell": 0, backgroundImage: `url("${w.url}")`,
        } as React.CSSProperties} />
      ))}
      {phase === "landed" && (
        <button type="button" className="meteor-hit" style={{ "--mx": LANDING.x, "--my": LANDING.y } as React.CSSProperties} onClick={activate} aria-label="Activate the meteorite" />
      )}
    </>
  );
}

/*
  Development-only trajectory overlay (?meteor-debug): the horizon, the shoreline, the bottom of
  the timeline band, the straight no-gravity line from the start to the landing, the flight path
  as sampled, the start and landing points; the meteor itself shows its head anchor. It is an SVG
  of the whole panorama, placed with the scene window's variables like everything else in it.
*/
function MeteorDebug({ plan }: { plan: Plan }) {
  const w = pano.width, h = pano.height, line = { vectorEffect: "non-scaling-stroke" as const, fill: "none" };
  return (
    <svg className="meteor-debug" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true"
      style={{ "--pw": w, "--ph": h } as React.CSSProperties}>
      <line x1={0} x2={w} y1={SCENE.horizon} y2={SCENE.horizon} stroke="#5cf" strokeDasharray="6 4" {...line} />
      <polyline points={SCENE.shoreline.map(p => p.join(",")).join(" ")} stroke="#fd5" {...line} />
      {Number.isFinite(plan.bandY) && <line x1={0} x2={w} y1={plan.bandY} y2={plan.bandY} stroke="#f6c" strokeDasharray="2 4" {...line} />}
      <line x1={plan.start.x} y1={plan.start.y} x2={plan.landing.x} y2={plan.landing.y} stroke="#fff8" strokeDasharray="3 5" {...line} />
      <polyline points={plan.path.map(p => `${p.x},${p.y}`).join(" ")} stroke="#f84" {...line} />
      {plan.path.filter((_, i) => i % 12 === 0).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#f84" />)}
      <circle cx={plan.start.x} cy={plan.start.y} r={7} stroke="#5f8" strokeWidth={2} {...line} />
      <path d={`M${plan.landing.x - 10},${plan.landing.y}h20M${plan.landing.x},${plan.landing.y - 10}v20`} stroke="#5f8" strokeWidth={2} {...line} />
    </svg>
  );
}
