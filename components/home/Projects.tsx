import { links, projects } from "@/lib/content";
import { pano } from "@/lib/coast/scene-manifest";
import { PixelArrow } from "./PixelArrow";

const github = links.find(link=>link.label === "GitHub");

/* The dusk stretch of beach: heading in the sky, the projects laid out on the sand. */
export function Projects() {
  const strip = pano.strips.projects;
  return (
    <section className="zone zone-projects" id="projects" data-zone="projects" aria-labelledby="projects-title">
      {/* Phones show this stretch of the panorama above the content. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="zone-strip" src="/coast/pano/projects-strip.webp" width={strip.width} height={strip.height} alt="" loading="lazy" decoding="async" />
      <div className="zone-content">
        <header className="zone-head">
          <h2 className="zone-title" id="projects-title" tabIndex={-1}><span className="zone-index">01 /</span> PROJECTS</h2>
          {github && <p className="zone-note">{projects.length} projects · <a href={github.href} target="_blank" rel="noopener noreferrer">more on GitHub<PixelArrow /></a></p>}
        </header>
        <ol className="project-list">
          {projects.map(project=>(
            <li className="project" key={project.title}>
              {project.image && (
                // Plain img, like the rest of the page: fixed 720 × 480 previews.
                // eslint-disable-next-line @next/next/no-img-element
                <img className="project-media" src={project.image.src} alt={project.image.alt} width="720" height="480" loading="lazy" decoding="async" />
              )}
              <h3 className="project-title">
                {project.href
                  ? <a href={project.href} target="_blank" rel="noopener noreferrer">{project.title}<PixelArrow /></a>
                  : project.title}
              </h3>
              <p className="project-text">{project.blurb}</p>
              <ul className="project-tech" aria-label="Built with">
                {project.tech.map(item=><li key={item}>{item}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
