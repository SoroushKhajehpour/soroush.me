import { profile } from "@/lib/coast/scene-config";
import { NameLetters } from "./NameLetters";
import { Exploring } from "./Exploring";

/* Exact extracted bitmap lettering; the editable h1 remains the accessible name. */
export function HomeIntro() {
  return (
    <header className="home-intro" id="home">
      <h1 className="name">
        <span className="sr-only">{profile.name}</span>
        <NameLetters />
      </h1>
      <ul className="bio">
        <li>{profile.details[0]}</li>
        <li className="bio-exploring"><Exploring /></li>
        {profile.details.slice(1).map(detail=><li key={detail}>{detail}</li>)}
      </ul>
    </header>
  );
}
