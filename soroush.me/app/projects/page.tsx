import ParallaxCardGrid from "@/components/ui/parallax-card-grid";
import type { ParallaxCardItem } from "@/components/ui/parallax-card-grid";

const PROJECTS: ParallaxCardItem[] = [
  {
    image: {
      src: "/racesimproject.gif",
      alt: "Neuroevolution Racing Simulator",
    },
    title: "Neuroevolution Racing Simulator",
    titleHref: "https://github.com/SoroushKhajehpour/neat_racing_sim",
    description:
      "Tiny pygame racing sim with a human drive mode and a live neuroevolution mode where AI agents evolve to navigate a track using NEAT and reinforcement learning concepts.",
  },
];

export default function ProjectsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6">
      <p className="mb-8 font-serif text-lg font-bold text-white">Projects</p>
      <ParallaxCardGrid
        cards={PROJECTS}
        theme="dark"
        backgroundColor="transparent"
        gap={0}
        singleWide
      />
    </section>
  );
}
