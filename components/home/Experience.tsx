import { experience, links, resumeHref } from "@/lib/content";
import { pano } from "@/lib/coast/scene-manifest";
import { PixelArrow } from "./PixelArrow";

/* The night cove: everything sits in the dark sky above the returning sea. */
export function Experience() {
  const strip = pano.strips.experience;
  return (
    <section className="zone zone-experience" id="experience" data-zone="experience" aria-labelledby="experience-title">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="zone-strip" src="/coast/pano/experience-strip.webp" width={strip.width} height={strip.height} alt="" loading="lazy" decoding="async" />
      <div className="zone-content">
        <header className="zone-head">
          <h2 className="zone-title" id="experience-title" tabIndex={-1}><span className="zone-index">02 /</span> EXPERIENCE</h2>
          <ul className="zone-links" aria-label="Elsewhere">
            {links.map(link=><li key={link.label}><a href={link.href} {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{link.label}</a></li>)}
            <li><a href={resumeHref} target="_blank" rel="noopener noreferrer">Resume</a></li>
          </ul>
        </header>
        <ol className="job-list">
          {experience.map(job=>(
            <li className="job" key={job.company+job.dates}>
              <h3 className="job-company">
                {job.href
                  ? <a href={job.href} target="_blank" rel="noopener noreferrer">{job.company}<PixelArrow /></a>
                  : job.company}
              </h3>
              <p className="job-role">{job.role} <span className="job-dates">· {job.dates}</span></p>
              {job.blurb && <p className="job-text">{job.blurb}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
