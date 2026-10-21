import {
  ImageBitmapLoader, LinearFilter, Mesh, NearestFilter, NoColorSpace, NoToneMapping,
  OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace, Texture,
  Vector2, Vector3, Vector4, WebGLRenderer, WebGLRenderTarget,
} from "three";
import { defaultState, referenceEnvironment, waves, type SceneState } from "./scene-config";
import { assetSets, pano, scene, speaker, type AssetSetName, type SceneFrame } from "./scene-manifest";
import { vertexShader, fragmentShader, presentFragmentShader } from "./shaders";
import { SceneClock } from "./clock";

export type ScenePatch = Partial<Omit<SceneState, "environment">> & {
  environment?: Partial<SceneState["environment"]>;
};
export interface SceneController {
  set(patch: ScenePatch): void;
  /** Moves the camera (any fractional position) and fits the visible window of the scene. */
  setFrame(frame: SceneFrame): void;
  /** Hides the beach camera while its held copy is on screen. */
  setCameraVisible(visible: boolean): void;
  get(): SceneState & { frames: number; averageFrameMs: number; running: boolean; reducedMotion: boolean; view: SceneFrame; assets: AssetSetName };
  reference(): void;
  dispose(): void;
}

export async function createCoastRenderer(
  canvas: HTMLCanvasElement,
  onUnavailable: () => void,
  initial: SceneFrame,
  onMotionChange?: (paused: boolean, reduced: boolean) => void,
  assetName: AssetSetName = "home",
): Promise<SceneController> {
  const set = assetSets[assetName];
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  if (renderer.capabilities.maxTextureSize < set.width) {
    renderer.dispose();
    throw new Error(`This GPU cannot hold the ${set.width} px scene.`);
  }
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;

  const textures: Texture[] = [];
  // Images are decoded off the main thread, exactly as stored (no colour management, no
  // premultiplication: several are data, not pictures).
  const loader = new ImageBitmapLoader();
  loader.setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none", colorSpaceConversion: "none" });
  const objects = scene.objects;
  // The Home sky layers (atmosphere, sun) are shared; the rest come from the chosen set.
  const assets = [
    ["uGround",`${set.dir}ground.png`,true], ["uWater",`${set.dir}water.png`,true],
    ["uAtmosphere","/coast/atmosphere.png",true], ["uSun","/coast/sun.png",true],
    ["uShore",`${set.dir}shore-field.png`,false], ["uFlow",`${set.dir}flow-field.png`,false],
    ["uDetail",`${set.dir}water-detail.png`,false],
    // The Home set is the original art already, so it reuses its own layers as the patch.
    ["uPatchGround",set.patch ? `${set.dir}home-patch-ground.png` : `${set.dir}ground.png`,true],
    ["uPatchWater",set.patch ? `${set.dir}home-patch-water.png` : `${set.dir}water.png`,true],
    ["uCameraSand","/coast/pano/camera-sand.png",true],
    ["uCamera",objects.camera.src,true], ["uSpeakerSand",speaker.sand.src,true], ["uLife",objects.life.src,true],
  ] as const;
  const loaded = await Promise.allSettled(assets.map(async ([key,path,color]) => {
    const texture = new Texture(await loader.loadAsync(path));
    texture.flipY = false;
    texture.needsUpdate = true;
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
    uSize: { value: new Vector2(set.width,set.height) },
    uBuf: { value: new Vector2(1,1) },
    uView: { value: new Vector2() },
    uSunPos: { value: new Vector2(scene.sun.x,scene.sun.y) },
    uDataTop: { value: set.dataTop },
    uAtmoSize: { value: new Vector2(scene.width,scene.horizon) },
    uJoin: { value: set.join },
    uDusk: { value: new Vector2(set.dusk[0],set.dusk[1]) },
    uPatch: { value: set.patch ? new Vector4(set.patch.x,set.patch.y,set.patch.x+set.patch.width,set.patch.y+set.patch.height) : new Vector4() },
    uObjects: { value: 1 },
    uCameraVisible: { value: 1 },
    uCameraSandRect: { value: new Vector4(pano.cameraSand.x,pano.cameraSand.y,pano.cameraSand.width,pano.cameraSand.height) },
    uCameraRect: { value: new Vector4(objects.camera.x,objects.camera.y,objects.camera.width,objects.camera.height) },
    uSpeakerSandRect: { value: new Vector4(speaker.sand.x,speaker.sand.y,speaker.sand.width,speaker.sand.height) },
    uLifeRect: { value: new Vector4(objects.life.x,objects.life.y,objects.life.width,objects.life.height) },
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
  // Pass 1 draws the window in scene pixels into this buffer (sRGB storage, so nothing is
  // lost); pass 2 enlarges it to the canvas's device pixels with sharp bilinear filtering.
  const target = new WebGLRenderTarget(1,1,{ colorSpace: SRGBColorSpace, minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false, depthBuffer: false });
  const present = {
    uImage: { value: target.texture }, uImageSize: { value: new Vector2(1,1) },
    uScale: { value: new Vector2(1,1) }, uOffset: { value: new Vector2() }, uCanvas: { value: new Vector2(1,1) },
  };
  const presentMaterial = new ShaderMaterial({ uniforms: present, vertexShader, fragmentShader: presentFragmentShader, depthTest:false, depthWrite:false });
  const screen = new Scene();
  screen.add(new Mesh(geometry,presentMaterial));
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
    renderer.setRenderTarget(target);
    renderer.render(world,camera);
    renderer.setRenderTarget(null);
    renderer.render(screen,camera);
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

  const view: SceneFrame = { x: 0, y: 0, width: 0, height: 0 };
  // The scene buffer covers whole scene pixels from floor(camera); the camera's fraction is
  // an offset in the enlarging pass, so the art pans smoothly at any position.
  function place(next: SceneFrame) {
    if (!(next.width > 0 && next.height > 0)) return false;
    const x0 = Math.floor(next.x+1e-6), y0 = Math.floor(next.y+1e-6);
    const width = Math.ceil(next.x-x0+next.width)+1, height = Math.ceil(next.y-y0+next.height)+1;
    if (width !== uniforms.uBuf.value.x || height !== uniforms.uBuf.value.y) {
      target.setSize(width,height);
      uniforms.uBuf.value.set(width,height);
      present.uImageSize.value.set(width,height);
    }
    uniforms.uView.value.set(x0,y0);
    // Device pixels, capped at 2x: beyond that the extra pixels are invisible but costly.
    const ratio = Math.min(2,window.devicePixelRatio || 1);
    const cw = Math.max(1,Math.round((canvas.clientWidth || window.innerWidth)*ratio));
    const ch = Math.max(1,Math.round((canvas.clientHeight || window.innerHeight)*ratio));
    if (cw !== canvas.width || ch !== canvas.height) renderer.setSize(cw,ch,false);
    present.uCanvas.value.set(cw,ch);
    present.uScale.value.set(cw/next.width,ch/next.height);
    present.uOffset.value.set(next.x-x0,next.y-y0);
    Object.assign(view,next);
    return true;
  }
  place(initial);

  const controller: SceneController = {
    setCameraVisible(visible) {
      if (uniforms.uCameraVisible.value === (visible ? 1 : 0)) return;
      uniforms.uCameraVisible.value = visible ? 1 : 0;
      if (!dead && !failed && !raf) render();
    },
    setFrame(next) {
      if (place(next) && !dead && !failed && !raf) render();
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
        running: canAnimate(), reducedMotion: reduced, view: { ...view }, assets: assetName };
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
      textures.forEach(t=>{ t.dispose(); (t.image as ImageBitmap | undefined)?.close?.(); });
      geometry.dispose();
      material.dispose();
      presentMaterial.dispose();
      target.dispose();
      renderer.dispose();
    },
  };
  reconcile();
  if (failed) { controller.dispose(); throw new Error("Coast shader initialization failed."); }
  return controller;
}
