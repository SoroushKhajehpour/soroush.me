# Music

Spotify's official embed, controlled through its iFrame API. The widget (`components/music/NowPlaying.tsx`) sits bottom-left. Collapsed it is a small glass pill (song · artist); opened, a glass card with our controls (previous, play/pause, next, position in the list, minimize) above Spotify's compact 80 px track player. Playing always opens the card, and it can only be minimized while paused, so Spotify's player is never hidden while it plays. Look and placement: the variables at the top of the `.music` rule in `app/globals.css`. The JBL on the beach (`components/home/Speaker.tsx`) has the same three buttons and bounces while music plays. One player for the whole page (`lib/music/player.ts`), so music carries on while panning between Home, Projects and Experience. No MP3s are hosted.

## Adding or removing songs

Edit `lib/music/playlist.ts`. Each entry is a Spotify track, in play order:

```ts
{ spotify: "https://open.spotify.com/track/50GVx8sCc1TDKHXumgYqEO", title: "Cold Shoulder", artist: "Drake" },
```

`spotify` takes the share link (Spotify → … → Share → Copy Song Link), a `spotify:track:…` URI or the 22-character ID. `title` and `artist` are what the widget's line shows; Spotify's player shows its own. Delete an entry to remove a song. Only tracks are supported (not albums or playlists): previous/next step through this list.

## What the iFrame API can and can't do

Checked against https://developer.spotify.com/documentation/embeds/references/iframe-api and in Chrome:

- **Works:** creating the player at 80 px (Spotify's compact size), loading a track, play, pause/resume, seek, and `playback_update` events (paused, buffering, position, duration), which drive the play button, the speaker and auto-advance.
- **Not available:** volume or mute, track metadata (hence the titles in the list), and the audio itself, so the speaker dances to its own beat rather than the song's.
- **`play()` from our buttons** is, in Spotify's words, "not supported in all browsers and for all users". Safari blocks it until the visitor has pressed play inside Spotify's player once; if our buttons don't start it, the player's own button always does.

## What visitors hear

- **Not logged in to Spotify:** a preview of each song (about 20–30 s), marked "Preview" in the player. When a preview ends the next song starts.
- **Logged in to Spotify in the same browser:** full songs, on desktop. On phones Spotify plays previews even when logged in.
- Nothing plays until the visitor presses play; Spotify's player loads shortly after the page does.
