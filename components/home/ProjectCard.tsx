import type { Project } from "@/lib/content";
import { PixelArrow } from "./PixelArrow";

/** One project: a frosted-glass panel, all of it a link when the project has one. */
export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const body = (
    <>
      {/* The glass: a clear pane, and a frostier one that fades in behind the text. */}
      <span className="pcard-glass" aria-hidden="true" />
      <div className="pcard-media">
        {project.image
          // Plain img, like the rest of the page: fixed 720 × 480 previews.
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={project.image.src} alt={project.image.alt} width="720" height="480" loading="lazy" decoding="async" />
          : <span className="pcard-media-empty" aria-hidden="true" />}
      </div>
      <div className="pcard-body">
        <span className="pcard-frost" aria-hidden="true" />
        <h3 className="pcard-title"><Title text={project.title} arrow={!!project.href} /></h3>
        <p className="pcard-text">{project.blurb}</p>
        <ul className="pcard-tech" aria-label="Built with">
          {project.tech.map(item => <li key={item}>{item}</li>)}
        </ul>
        {project.href && <span className="pcard-link" aria-hidden="true">{linkLabel(project.href)}</span>}
      </div>
    </>
  );
  return (
    <li className="pcard" data-reveal style={{ "--i": index % 3 } as React.CSSProperties}>
      {project.href
        ? <a className="pcard-inner" href={project.href} target="_blank" rel="noopener noreferrer">{body}</a>
        : <div className="pcard-inner">{body}</div>}
    </li>
  );
}

/** The arrow stays with the last word, so it never wraps onto a line of its own. */
function Title({ text, arrow }: { text: string; arrow: boolean }) {
  if (!arrow) return <>{text}</>;
  const cut = text.lastIndexOf(" ");
  return <>{text.slice(0, cut + 1)}<span className="pcard-nowrap">{text.slice(cut + 1)}<PixelArrow /></span></>;
}

function linkLabel(href: string) {
  try {
    const url = new URL(href);
    return url.hostname === "github.com" ? `GitHub · ${url.pathname.split("/").filter(Boolean).slice(-1)[0]}` : url.hostname.replace(/^www\./, "");
  } catch { return "Open"; }
}
