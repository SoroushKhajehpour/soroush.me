/**
 * The songs, in play order. Each is a Spotify track: paste the share link (or the
 * spotify:track: URI, or just the ID). Title and artist are what the widget's own label
 * shows; the Spotify player shows Spotify's. See README.md here.
 */
export const playlist = [
  { spotify: "https://open.spotify.com/track/50GVx8sCc1TDKHXumgYqEO", title: "Cold Shoulder", artist: "Drake" },
  { spotify: "https://open.spotify.com/track/5xEDRg4tI8ixoAvbrupsEg", title: "Sweet Home", artist: "Don Toliver" },
  { spotify: "https://open.spotify.com/track/1nepx6kDPFlkhUaSYaorbc", title: "Not Nice", artist: "PARTYNEXTDOOR" },
  { spotify: "https://open.spotify.com/track/7ro0hRteUMfnOioTFI5TG1", title: "WHERE SHE GOES", artist: "Bad Bunny" },
] as const satisfies readonly { spotify: string; title?: string; artist?: string }[];
