import { experience } from "@/lib/content";
import { pano } from "@/lib/coast/scene-manifest";
import { PixelArrow } from "./PixelArrow";
import { Reveal } from "./Reveal";
import { Meteor } from "./Meteor";

/*
  A pixel-art star like the bright ones in the night sky: a cream core, an inner cross
  and four short rays that dim toward their tips. Drawn on an 11 × 11 grid with crisp
  edges, every ray pixel is its own square (classes r1–r5 by distance from the core), so
  CSS can lengthen the rays by whole pixels: on hover, and in the current star's twinkle.
*/
function Star() {
  const c = 5;
  const rays = [1, 2, 3, 4, 5].flatMap(d => [[c + d, c], [c - d, c], [c, c + d], [c, c - d]].map(([x, y]) => ({ x, y, d })));
  return (
    <svg className="tl-star" viewBox="0 0 11 11" aria-hidden="true" shapeRendering="crispEdges">
      {rays.map(({ x, y, d }) => <rect key={`${x}-${y}`} className={`tl-ray r${d}`} x={x} y={y} width={1} height={1} />)}
      <rect className="tl-glow" x={c - 1} y={c - 1} width={3} height={3} />
      <rect className="tl-core" x={c} y={c} width={1} height={1} />
    </svg>
  );
}

/*
  The night cove: a pixel-art career timeline, newest on the left. Each role has a date,
  a checkpoint on the path and, under it, its logo, company and title. The path is built
  from pixel segments, one per role, running to the next checkpoint; it builds itself left
  to right when the camera arrives (components/home/Reveal).
*/
export function Experience() {
  const strip = pano.strips.experience;
  const beach = pano.strips["experience-beach"];
  return (
    <section className="zone zone-experience" id="experience" data-zone="experience" aria-labelledby="experience-title">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="zone-strip" src="/coast/pano/experience-strip.webp" width={strip.width} height={strip.height} alt="" loading="lazy" decoding="async" />
      <div className="zone-content">
        <h2 className="sr-only" id="experience-title" tabIndex={-1}>Experience</h2>
        <Reveal as="ol" className="timeline" self threshold={.4}>
          {experience.map((job, i) => (
            <li className="tl-item" key={job.company + job.dates} style={{ "--i": i } as React.CSSProperties}
              data-current={i === 0 || undefined} data-last={i === experience.length - 1 || undefined}>
              <p className="tl-date">{job.dates}</p>
              <div className="tl-track" aria-hidden="true">
                <span className="tl-seg" />
                <span className="tl-check"><Star /></span>
              </div>
              <div className="tl-body">
                <h3 className="tl-company">
                  {job.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="tl-logo" src={job.logo} alt="" height="30" loading="lazy" decoding="async" />
                  )}
                  {job.href
                    ? <a href={job.href} target="_blank" rel="noopener noreferrer">{job.company}<PixelArrow /></a>
                    : <span>{job.companyLines
                      ? job.companyLines.map(line => <span key={line} className="tl-line">{line}</span>)
                      : job.company}</span>}
                </h3>
                <p className="tl-role">{job.role}</p>
              </div>
            </li>
          ))}
        </Reveal>
      </div>
      {/* Phones: the cove's beach, where the meteor lands (the desktop one is in the scene). */}
      <div className="meteor-panel" style={{ "--cam": beach.x, "--y0": beach.y, "--ww": beach.width, "--wh": beach.height } as React.CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coast/pano/experience-beach-strip.webp" width={beach.width} height={beach.height} alt="" loading="lazy" decoding="async" />
        <Meteor mode="panel" />
      </div>
    </section>
  );
}
