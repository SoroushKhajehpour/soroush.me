"use client";

import { useEffect, useRef, useState } from "react";
import { SceneObjects } from "./SceneObjects";
import type { SceneController, ScenePatch } from "@/lib/coast/renderer";
import { environmentAt } from "@/lib/coast/scene-config";
import { readFrame, scene } from "@/lib/coast/scene-manifest";

export interface CoastDebug {
  ready: boolean;
  set(patch: ScenePatch): void;
  get: SceneController["get"];
  reference(): void;
  environment(progress: number): void;
}
declare global { interface Window { __coast?: CoastDebug } }

export function CoastalScene() {
  const windowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready,setReady] = useState(false);

  useEffect(()=> {
    let cancelled = false;
    let owned: SceneController | undefined;
    let observer: ResizeObserver | undefined;
    const frameBox = windowRef.current!;
    const canvas = canvasRef.current!;
    // Upscaled pixel art stays crisp; downscaled art is smoothed so thin dashes never break up.
    function fit(controller?: SceneController) {
      const frame = readFrame(frameBox);
      controller?.setFrame(frame);
      const scale = frameBox.clientWidth / frame.width * (window.devicePixelRatio || 1);
      frameBox.dataset.sharp = String(scale >= 1.75);
      return frame;
    }
    async function initialize() {
      try {
        const { createCoastRenderer } = await import("@/lib/coast/renderer");
        if (cancelled) return;
        owned = await createCoastRenderer(canvas,()=> {
          if (!cancelled) { setReady(false); if (window.__coast) window.__coast.ready=false; }
        },fit());
        if (cancelled) { owned.dispose(); return; }
        const controller=owned;
        window.__coast={ ready:true, set:p=>controller.set(p), get:()=>controller.get(),
          reference:()=>controller.reference(), environment:p=>controller.set({environment:environmentAt(p)}) };
        if (new URLSearchParams(location.search).get("scene")==="reference") controller.reference();
        observer = new ResizeObserver(()=>fit(controller));
        observer.observe(frameBox);
        setReady(true);
      } catch (error) {
        if (!cancelled) { setReady(false); console.warn("Using the static coastal scene.",error); }
      }
    }
    initialize();
    return ()=> {
      cancelled=true;
      observer?.disconnect();
      owned?.dispose();
      delete window.__coast;
    };
  },[]);

  return (
    <div className="scene-window" data-ready={ready} ref={windowRef}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="scene-fallback" src="/coast/still.png" width={scene.width} height={scene.height} alt="" fetchPriority="high" draggable="false" />
      <canvas ref={canvasRef} className="scene-canvas" width={scene.sourceWidth} height={scene.height} aria-hidden="true" />
      <SceneObjects />
    </div>
  );
}
