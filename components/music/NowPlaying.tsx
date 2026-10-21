"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { EMBED_HEIGHT, music, serverMusicState } from "@/lib/music/player";

/**
 * The music player, bottom-left and fixed to the window (it never pans with the beach):
 * just Spotify's compact 80 px player, only there while music plays. Paused, loading or
 * never started, the corner is empty; the JBL on the beach plays, pauses and skips. While
 * skipping it stays put: Spotify swaps the song inside the same player.
 */
export function NowPlaying() {
  const state = useSyncExternalStore(music.subscribe, music.get, serverMusicState);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    // Spotify loads once the page itself is up, so it never delays the beach.
    const start = () => music.mount(el);
    const idle = window.requestIdleCallback?.(start, { timeout: 2500 }) ?? window.setTimeout(start, 1200);
    return () => { window.cancelIdleCallback?.(idle); window.clearTimeout(idle); };
  }, []);

  if (!state.tracks.length) return null;
  const visible = state.wanted && state.ready;
  return (
    <aside className="music" aria-label="Music" data-visible={visible || undefined} inert={!visible}>
      <div className="music-embed" ref={host} style={{ height: EMBED_HEIGHT }} />
    </aside>
  );
}
