"use client";

import { useEffect, useRef, useState } from "react";
import { SceneObjects } from "./SceneObjects";
import type { SceneController, ScenePatch } from "@/lib/coast/renderer";
import { environmentAt } from "@/lib/coast/scene-config";
import { assetSets, boundsStyle, pano, readFrame, scene, speaker, type AssetSetName } from "@/lib/coast/scene-manifest";
import { Speaker } from "./Speaker";
import { Meteor } from "./Meteor";

export interface CoastDebug {
  ready: boolean;
  set(patch: ScenePatch): void;
  get: SceneController["get"];
  reference(): void;
  environment(progress: number): void;
}
declare global { interface Window { __coast?: CoastDebug } }

export interface CoastalSceneProps {
  /** Which texture set to draw: the Home scene (stacked phones) or the whole panorama.
   *  Nothing is loaded until it is known. */
  assets?: AssetSetName | null;
  /** True once the camera has left Home, so a missing renderer falls back to the panorama still. */
  away?: boolean;
  onController?: (controller: SceneController | null) => void;
  onCameraClick?: (button: HTMLButtonElement) => void;
  /** Show the object-free panorama still if the renderer is unavailable (camera picked up). */
  clean?: boolean;
}

export function CoastalScene({ assets = "home", away = false, clean = false, onController, onCameraClick }: CoastalSceneProps) {
  const set = assets ?? "home";
  const windowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const report = useRef(onController);
  const [ready,setReady] = useState(false);

  useEffect(()=> { report.current = onController; },[onController]);

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
    function unavailable() {
      if (cancelled) return;
      setReady(false);
      if (window.__coast) window.__coast.ready=false;
      report.current?.(null);
    }
    async function initialize() {
      try {
        const { createCoastRenderer } = await import("@/lib/coast/renderer");
        if (cancelled) return;
        owned = await createCoastRenderer(canvas,unavailable,fit(),undefined,assets!);
        if (cancelled) { owned.dispose(); return; }
        const controller=owned;
        window.__coast={ ready:true, set:p=>controller.set(p), get:()=>controller.get(),
          reference:()=>controller.reference(), environment:p=>controller.set({environment:environmentAt(p)}) };
        if (new URLSearchParams(location.search).get("scene")==="reference") controller.reference();
        observer = new ResizeObserver(()=>fit(controller));
        observer.observe(frameBox);
        setReady(true);
        report.current?.(controller);
      } catch (error) {
        if (!cancelled) { unavailable(); console.warn("Using the static coastal scene.",error); }
      }
    }
    // Mounted again (keyed by set) when the set changes, so state starts fresh.
    if (!assets) return;
    initialize();
    return ()=> {
      cancelled=true;
      observer?.disconnect();
      owned?.dispose();
      report.current?.(null);
      delete window.__coast;
    };
  },[assets]);

  // At Home the Home still is exact; away from it only the clean panorama is correct.
  const panorama = !ready && ((assets === "pano" && away) || clean);
  return (
    <div className="scene-window" data-ready={ready} data-fallback={panorama ? "panorama" : "home"} ref={windowRef}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="scene-fallback" src="/coast/still.png" width={scene.width} height={scene.height} alt="" fetchPriority="high" draggable="false" />
      {panorama && (
        // The whole clean panorama, only fetched when the renderer is unavailable away from Home.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="scene-fallback scene-fallback-panorama" src="/coast/pano/still.webp" width={pano.width} height={pano.height} alt="" draggable="false" />
      )}
      <canvas ref={canvasRef} className="scene-canvas" width={assetSets[set].width} height={scene.height} aria-hidden="true" />
      {/* The playable speaker. Without the renderer, the sand it stands on covers the old
          speaker painted into the Home still. */}
      {!ready && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="speaker-sand" src={speaker.sand.src} alt="" draggable="false" style={boundsStyle(speaker.sand)} />
      )}
      {assets === "pano" && <Meteor mode="pano" />}
      <Speaker />
      <SceneObjects onAction={onCameraClick && !away ? { "open-life": onCameraClick } : undefined} />
    </div>
  );
}
