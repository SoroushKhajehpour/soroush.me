"use client";

import { playlist } from "./playlist";
import { toTracks, type Track } from "./tracks";

/**
 * The site's one music player: Spotify's official embed, driven through its iFrame API
 * (https://developer.spotify.com/documentation/embeds/references/iframe-api). It lives
 * for the whole page, outside every panel, so panning never touches it. The speaker on the
 * beach and the widget read the same state (useSyncExternalStore).
 *
 * What the iFrame API allows, and so what this does: load a track (`loadUri`), play,
 * pause/resume, and `playback_update` events (paused, buffering, position, duration).
 * There is no volume or mute, no track metadata, and no audio data: the speaker dances to
 * a beat, not to the song. `play()` "might not be supported in all browsers and for all
 * users" (Safari wants a click inside the player first); visitors not logged in to
 * Spotify hear a short preview.
 */
export interface MusicState {
  tracks: Track[];
  index: number;
  /** The Spotify player is loaded and can be controlled. */
  ready: boolean;
  /** Spotify couldn't be loaded (blocked, offline): nothing can play. */
  failed: boolean;
  playing: boolean;
  /** The visitor pressed play and hasn't paused: true while switching songs, too. */
  wanted: boolean;
  buffering: boolean;
  /** Milliseconds, from Spotify. */
  position: number;
  duration: number;
}

interface Controller {
  loadUri(uri: string, preferVideo?: boolean, startAt?: number, theme?: "dark"): void;
  play(): void; pause(): void; resume(): void; togglePlay(): void; restart(): void;
  seek(seconds: number): void; destroy(): void;
  addListener(event: string, cb: (e: { data: { isPaused?: boolean; isBuffering?: boolean; position?: number; duration?: number; playingURI?: string } }) => void): void;
}
interface IFrameAPI { createController(el: HTMLElement, options: { uri: string; width?: number | string; height?: number | string }, cb: (c: Controller) => void): void }
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
    __music?: typeof music;
    __musicTestTracks?: { spotify: string; title?: string; artist?: string }[];
  }
}

const SCRIPT = "https://open.spotify.com/embed/iframe-api/v1";
export const EMBED_HEIGHT = 80;   // Spotify's compact track player
const listeners = new Set<() => void>();
const initial: MusicState = { tracks: toTracks(playlist), index: 0, ready: false, failed: false, playing: false, wanted: false, buffering: false, position: 0, duration: 0 };
let state = initial;
let controller: Controller | null = null;
let pending: (() => void) | null = null;
let loadedIndex = 0;
let ended = false;
// Spotify reports "paused" while it loads a song; those reports are not the visitor pausing.
let quietUntil = 0;

function set(patch: Partial<MusicState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}
export const serverMusicState = () => initial;

export const music = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  get: () => state,
  mount, toggle, play, pause, next, previous,
  /** Spotify gives no audio data, so the speaker uses its own beat while playing. */
  energy: (): number | null => state.playing ? null : 0,
};

/** Creates the Spotify player in `element` (once). The script loads only now. */
function mount(element: HTMLElement) {
  if (controller || element.dataset.spotify) return;
  element.dataset.spotify = "loading";
  if (process.env.NODE_ENV !== "production" && window.__musicTestTracks) set({ tracks: toTracks(window.__musicTestTracks) });
  if (!state.tracks.length) return;
  const create = (api: IFrameAPI) => {
    const host = document.createElement("div");
    element.replaceChildren(host);
    api.createController(host, { uri: state.tracks[state.index].uri, width: "100%", height: EMBED_HEIGHT }, c => {
      controller = c;
      loadedIndex = state.index;
      c.addListener("ready", () => {
        set({ ready: true, failed: false });
        const run = pending; pending = null; run?.();
      });
      c.addListener("playback_update", ({ data }) => {
        const playing = data.isPaused === false;
        const position = data.position ?? 0, duration = data.duration ?? 0;
        // A song (or its preview) reached its end: on to the next one.
        if (!playing && duration > 0 && position >= duration - 250 && state.playing && !ended) {
          ended = true;
          quietUntil = performance.now() + 2500;
          set({ playing: false, position, duration });
          next();
          return;
        }
        // Paused from inside Spotify's own player: the visitor stopped the music.
        const stopped = !playing && !data.isBuffering && performance.now() > quietUntil;
        set({ playing, buffering: !!data.isBuffering, position, duration, ...(stopped ? { wanted: false } : {}) });
      });
      c.addListener("playback_started", () => { ended = false; });
    });
  };
  window.onSpotifyIframeApiReady = create;
  if (!document.querySelector(`script[src="${SCRIPT}"]`)) {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onerror = () => { element.dataset.spotify = "unavailable"; set({ failed: true }); };
    document.head.appendChild(script);
  }
  // Blocked without an error (privacy extensions, strict tracking protection): give up after a while.
  window.setTimeout(() => { if (!state.ready) set({ failed: true }); }, 15000);
  if (process.env.NODE_ENV !== "production") window.__music = music;
}

function whenReady(run: () => void) {
  if (controller && state.ready) run();
  else pending = run;
}

function load(index: number) {
  const n = state.tracks.length;
  const i = ((index % n) + n) % n;
  set({ index: i, position: 0, duration: 0, wanted: true });
  quietUntil = performance.now() + 2500;
  whenReady(() => {
    if (loadedIndex !== i) { controller!.loadUri(state.tracks[i].uri); loadedIndex = i; }
    ended = false;
    controller!.play();
  });
}

function play() {
  if (!state.tracks.length) return;
  set({ wanted: true });
  quietUntil = performance.now() + 2500;
  whenReady(() => controller!.resume());
}
function pause() { set({ wanted: false }); whenReady(() => controller!.pause()); }
function toggle() { return state.wanted ? pause() : play(); }
function next() { if (state.tracks.length) load(state.index + 1); }
function previous() {
  if (!state.tracks.length) return;
  // First press goes back to the start of the song, like a real player.
  if (state.position > 3000) whenReady(() => { controller!.seek(0); controller!.resume(); });
  else load(state.index - 1);
}
