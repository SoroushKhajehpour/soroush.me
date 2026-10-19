/* Everything written on the page besides the scene lives here, so updating a job or
   a project never touches a component. */

export const resumeHref = "/resume.pdf";

export const nav = [
  { label: "PROJECTS", href: "#projects" },
  { label: "EXPERIENCE", href: "#experience" },
  { label: "RESUME ↗", href: resumeHref, external: true },
] as const;

export interface Project {
  title: string;
  summary: string;
  /** What the panorama shows: the opening of the summary. */
  blurb: string;
  tech: readonly string[];
  href?: string;
  /** 720 × 480 preview in public/projects. */
  image?: { src: string; alt: string };
}

export const projects: readonly Project[] = [
  {
    title: "ChefIt",
    summary:
      "Figures out what to cook from what you already have. One photo of your fridge or pantry becomes a list of detected ingredients and recipes you can actually make, ranked by overlap, expiry and cook time, with a shopping list for the gaps. Built end to end in 24 hours at ConHacks 2026.",
    blurb: "Figures out what to cook from what you already have: one photo of your fridge becomes recipes you can actually make. Built in 24 hours at ConHacks 2026.",
    tech: ["Swift", "SwiftUI", "Node.js", "Express", "PostgreSQL", "OpenAI", "Docker"],
    href: "https://github.com/MatthewKim07/chef-it",
    image: { src: "/projects/chefit.png", alt: "ChefIt's welcome screen on an iPhone" },
  },
  {
    title: "PolyScope",
    summary:
      "Resolution-risk intelligence for prediction markets. It reads a market's fine print, highlights ambiguity and rule changes, and surfaces the risks that could make an outcome hard or disputed to resolve before you trade.",
    blurb: "Resolution-risk intelligence for prediction markets: it reads a market's fine print and surfaces ambiguity before you trade.",
    tech: ["Ruby", "TypeScript", "Docker"],
    href: "https://github.com/SoroushKhajehpour/PolyScope",
    image: { src: "/projects/polyscope.png", alt: "PolyScope's search page" },
  },
  {
    title: "Neuroevolution Racing Simulator",
    summary:
      "A small pygame racing sim with a human drive mode and a live neuroevolution mode, where a population of agents evolves generation by generation to get around the track using NEAT.",
    blurb: "A pygame racing sim with a human drive mode and a live neuroevolution mode, where agents evolve to get around the track using NEAT.",
    tech: ["Python", "pygame", "NEAT"],
    href: "https://github.com/SoroushKhajehpour/neat_racing_sim",
    image: { src: "/projects/racing-sim.png", alt: "Generation 9 of the racing simulator on a winding track" },
  },
];

export interface Experience {
  company: string;
  role: string;
  dates: string;
  href?: string;
  summary?: string;
  /** What the panorama shows: the opening of the summary. */
  blurb?: string;
}

export const experience: readonly Experience[] = [
  {
    company: "KA Imaging",
    role: "Software Developer Intern",
    dates: "Present",
  },
  {
    company: "Roam",
    role: "Software Engineering Intern",
    dates: "Jan – Apr 2026",
    href: "https://www.roam.auto/",
    summary:
      "Built and shipped a fleet-maintenance platform serving 1,000+ vehicles in Rails, React and PostgreSQL. Integrated Geotab and Samsara telematics for live odometer and vehicle data, and engineered the Sidekiq, Redis and S3 background jobs that process 10,000+ telemetry events a day.",
    blurb: "Built and shipped a fleet-maintenance platform serving 1,000+ vehicles in Rails, React and PostgreSQL, with live Geotab and Samsara telematics.",
  },
  {
    company: "UW Reality Labs",
    role: "Software Developer",
    dates: "Sep – Dec 2025",
    summary:
      "Unity (C#) interaction features for XR prototypes: controller and gesture-based input, reusable interaction components, and Python tooling to log and analyse spatial tracking data streamed into Unity.",
    blurb: "Unity (C#) interaction features for XR prototypes: controller and gesture input, and Python tooling for spatial tracking data.",
  },
  {
    company: "Turner Fenton Rocketry Association",
    role: "Vice President of Software",
    dates: "Mar 2024 – Jun 2025",
    summary:
      "Led embedded software for two rocket launches: Arduino flight-control and launch-automation firmware in C/C++ with IMU sensor fusion. First high-school team to compete at Launch Canada.",
    blurb: "Led embedded software for two rocket launches. First high-school team to compete at Launch Canada.",
  },
];

export const links = [
  { label: "GitHub", href: "https://github.com/SoroushKhajehpour" },
  { label: "Email", href: "mailto:s3khajehpour@uwaterloo.ca" },
] as const;
