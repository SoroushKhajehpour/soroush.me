import { projects } from "@/lib/content";
import { pano } from "@/lib/coast/scene-manifest";
import { ProjectCard } from "./ProjectCard";
import { Reveal } from "./Reveal";

/*
  The dusk stretch of beach: the projects as frosted-glass panels, three to a row. On
  desktop the panel area scrolls on its own over the panorama when there are more rows
  than fit; a scroll gesture that begins with room to scroll stays in the panel, and only
  a fresh one at its end moves the camera on (components/home/Panorama.tsx).
*/
export function Projects() {
  const strip = pano.strips.projects;
  return (
    <section className="zone zone-projects" id="projects" data-zone="projects" aria-labelledby="projects-title">
      {/* Phones show this stretch of the panorama above the content. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="zone-strip" src="/coast/pano/projects-strip.webp" width={strip.width} height={strip.height} alt="" loading="lazy" decoding="async" />
      <div className="zone-content project-scroll">
        {/* Named for screen readers and as the nav's focus target; the beach is the visual heading. */}
        <h2 className="sr-only" id="projects-title" tabIndex={-1}>Projects</h2>
        {/* Keeps the panels where they sat when the page had a heading. */}
        <div className="pgrid-spacer" aria-hidden="true" />
        <Reveal as="ol" className="pcard-grid">
          {projects.map((project, i) => <ProjectCard key={project.title} project={project} index={i} />)}
        </Reveal>
      </div>
    </section>
  );
}
