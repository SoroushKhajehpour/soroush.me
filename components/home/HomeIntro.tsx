import { profile } from "@/lib/coast/scene-config";

/* Exact extracted bitmap lettering; the editable h1 remains the accessible name. */
export function HomeIntro() {
  return (
    <header className="home-intro" id="home">
      <h1 className="name">
        <span className="sr-only">{profile.name}</span>
        {/* Native images preserve authored pixels; Next image resizing would resample them. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="name-first" src="/coast/name-first.png" width="379" height="65" alt="" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="name-last" src="/coast/name-last.png" width="539" height="65" alt="" aria-hidden="true" />
      </h1>
      <ul className="bio">
        {profile.details.map(detail=><li key={detail}>{detail}</li>)}
      </ul>
    </header>
  );
}
