import {
  Mesh, NearestFilter, NoColorSpace, NoToneMapping, OrthographicCamera,
  PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace, Texture,
  TextureLoader, Vector2, Vector3, Vector4, WebGLRenderer,
} from "three";
import { defaultState, referenceEnvironment, waves, type SceneState } from "./scene-config";
import { scene, type SceneFrame } from "./scene-manifest";
import { vertexShader, fragmentShader } from "./shaders";
import { SceneClock } from "./clock";

export type ScenePatch = Partial<Omit<SceneState, "environment">> & {
  environment?: Partial<SceneState["environment"]>;
};
export interface SceneController {
  set(patch: ScenePatch): void;
  /** Resizes the drawing buffer to the visible window of the scene. */
  setFrame(frame: SceneFrame): void;
  get(): SceneState & { frames: number; averageFrameMs: number; running: boolean; reducedMotion: boolean };
  reference(): void;
  dispose(): void;
}

export async function createCoastRenderer(
  canvas: HTMLCanvasElement,
  onUnavailable: () => void,
  initial: SceneFrame,
  onMotionChange?: (paused: boolean, reduced: boolean) => void,
): Promise<SceneController> {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  renderer.setPixelRatio(1);
  renderer.setSize(Math.round(initial.width), Math.round(initial.height), false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;

  const textures: Texture[] = [];
  const loader = new TextureLoader();
  const assets = [
    ["uGround","ground.png",true], ["uWater","water.png",true],
    ["uAtmosphere","atmosphere.png",true], ["uSun","sun.png",true],
    ["uShore","shore-field.png",false], ["uFlow","flow-field.png",false],
    ["uDetail","water-detail.png",false],
  ] as const;
  const loaded = await Promise.allSettled(assets.map(async ([key,path,color]) => {
    const texture = await loader.loadAsync(`/coast/${path}`);
    textures.push(texture);
    texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;
    return [key,{ value: texture }] as const;
  }));
  if (loaded.some(r => r.status === "rejected")) {
    textures.forEach(t=>t.dispose());
    renderer.dispose();
    throw new Error("A coastal scene texture could not be loaded.");
  }
  const textureUniforms = Object.fromEntries(loaded.flatMap(r=>r.status==="fulfilled" ? [r.value] : []));
  const uniforms = {
    ...textureUniforms,
    uSize: { value: new Vector2(scene.width,scene.height) },
    uBuf: { value: new Vector2(Math.round(initial.width),Math.round(initial.height)) },
    uView: { value: new Vector2(Math.round(initial.x),Math.round(initial.y)) },
    uSunPos: { value: new Vector2(scene.sun.x,scene.sun.y) },
    uTime: { value: 0 }, uSeed: { value: defaultState.seed },
    uMotion: { value: defaultState.motion }, uRunup: { value: defaultState.maxRunup },
    uWaves: { value: waves.map(w=>new Vector4(...w)) },
    uSunOffset: { value: new Vector2() },
    uSkyTint: { value: new Vector3(1,1,1) },
    uWaterTint: { value: new Vector3(1,1,1) },
    uSandTint: { value: new Vector3(1,1,1) },
    uWarmth: { value: 1 }, uReflection: { value: 1 },
  };
  const geometry = new PlaneGeometry(2,2);
  const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest:false, depthWrite:false });
  const world = new Scene();
  world.add(new Mesh(geometry,material));
  const camera = new OrthographicCamera(-1,1,1,-1,0,1);
  const clock = new SceneClock();
  const state: SceneState = { ...defaultState, environment: { ...referenceEnvironment } };
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = media.matches;
  let inView = true;
  let dead = false;
  let failed = false;
  let raf = 0;
  let frames = 0;
  let timedFrames = 0;
  let frameTotal = 0;
  let lastFrame = 0;

  function render() {
    if (dead || failed) return;
    uniforms.uTime.value = reduced ? 0 : state.time;
    uniforms.uSeed.value = state.seed;
    uniforms.uMotion.value = reduced ? 0 : state.motion;
    uniforms.uRunup.value = state.maxRunup;
    const env = reduced ? referenceEnvironment : state.environment;
    uniforms.uSunOffset.value.set(...env.sunOffset);
    uniforms.uSkyTint.value.set(...env.sky);
    uniforms.uWaterTint.value.set(...env.water);
    uniforms.uSandTint.value.set(...env.sand);
    uniforms.uWarmth.value = env.warmth;
    uniforms.uReflection.value = env.reflection;
    renderer.render(world,camera);
    frames++;
  }
  function canAnimate() { return !dead && !failed && !state.paused && !reduced && inView && !document.hidden; }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
    clock.suspend();
  }
  function frame(timestamp: number) {
    raf = 0;
    if (!canAnimate()) return;
    if (lastFrame) { frameTotal += timestamp-lastFrame; timedFrames++; }
    lastFrame = timestamp;
    state.time = clock.tick(timestamp);
    render();
    raf = requestAnimationFrame(frame);
  }
  function reconcile() {
    stop();
    if (!dead && !failed) render();
    if (canAnimate()) raf = requestAnimationFrame(frame);
    onMotionChange?.(state.paused || reduced,reduced);
  }
  function preference() {
    reduced = media.matches;
    if (reduced) { state.time=0; clock.seek(0); }
    reconcile();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    failed = true;
    stop();
    onUnavailable();
  }
  renderer.debug.onShaderError = (gl,program,vertex,fragment) => {
    console.error("Coast shader:", gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment));
    failed = true;
    stop();
    onUnavailable();
  };
  canvas.addEventListener("webglcontextlost", contextLost);
  media.addEventListener("change",preference);
  document.addEventListener("visibilitychange",reconcile);
  const observer = new IntersectionObserver(entries=> {
    inView = entries[0]?.isIntersecting ?? true;
    reconcile();
  });
  observer.observe(canvas);

  const controller: SceneController = {
    setFrame(next) {
      const width = Math.round(next.width), height = Math.round(next.height);
      if (!(width > 0 && height > 0)) return;
      renderer.setSize(width,height,false);
      uniforms.uBuf.value.set(width,height);
      uniforms.uView.value.set(Math.round(next.x),Math.round(next.y));
      if (!dead && !failed) render();
    },
    set(patch) {
      if (patch.time !== undefined && Number.isFinite(patch.time)) { state.time=Math.max(0,patch.time); clock.seek(state.time); }
      if (patch.paused !== undefined) state.paused=patch.paused;
      if (patch.seed !== undefined && Number.isFinite(patch.seed)) state.seed=patch.seed;
      if (patch.motion !== undefined && Number.isFinite(patch.motion)) state.motion=Math.min(1,Math.max(0,patch.motion));
      if (patch.maxRunup !== undefined && Number.isFinite(patch.maxRunup)) state.maxRunup=Math.min(scene.runup,Math.max(0,patch.maxRunup));
      if (patch.environment) state.environment={ ...state.environment,...patch.environment };
      reconcile();
    },
    get() {
      return { ...state, environment: structuredClone(state.environment), frames,
        averageFrameMs: timedFrames ? frameTotal/timedFrames : 0,
        running: canAnimate(), reducedMotion: reduced };
    },
    reference() {
      state.environment={...referenceEnvironment};
      controller.set({ ...defaultState, paused:true, time:0 });
    },
    dispose() {
      dead=true;
      stop();
      observer.disconnect();
      media.removeEventListener("change",preference);
      document.removeEventListener("visibilitychange",reconcile);
      canvas.removeEventListener("webglcontextlost",contextLost);
      textures.forEach(t=>t.dispose());
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
  reconcile();
  if (failed) { controller.dispose(); throw new Error("Coast shader initialization failed."); }
  return controller;
}
