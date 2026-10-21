/** A song in the rotation (lib/music/playlist.ts), resolved to a Spotify URI. */
export interface Track {
  id: string;
  uri: string;
  title: string;
  artist: string;
}

/** Accepts a Spotify track link, `spotify:track:` URI or bare ID. */
export function spotifyUri(value: string): string | null {
  const v = value.trim();
  const id = v.match(/^spotify:track:([A-Za-z0-9]{22})$/)?.[1]
    ?? v.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{22})/)?.[1]
    ?? v.match(/^([A-Za-z0-9]{22})$/)?.[1];
  return id ? `spotify:track:${id}` : null;
}

export function toTracks(list: readonly { spotify: string; title?: string; artist?: string }[]): Track[] {
  return list.flatMap(item => {
    const uri = spotifyUri(item.spotify);
    if (!uri) { console.warn("Music: not a Spotify track:", item.spotify); return []; }
    return [{ id: uri.slice(14), uri, title: item.title ?? "", artist: item.artist ?? "" }];
  });
}
