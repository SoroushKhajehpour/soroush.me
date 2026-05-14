import dynamic from "next/dynamic";
import type { ParallaxCardItem } from "@/components/ui/parallax-card-grid";

const ParallaxCardGrid = dynamic(() => import("@/components/ui/parallax-card-grid"), {
  loading: () => (
    <div
      className="flex min-h-[min(520px,85vh)] w-full flex-col gap-8"
      aria-hidden
    >
      <div className="h-40 animate-pulse rounded-2xl bg-neutral-800/35 md:h-48" />
      <div className="h-40 animate-pulse rounded-2xl bg-neutral-800/35 md:h-48" />
    </div>
  ),
});

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
  {
    image: {
      src: "/chefit_project_pic.png",
      alt: "ChefIt",
      demoVideoSrc: "/chefitdemo.mov",
      demoButtonLabel: "Play demo",
    },
    title: "ChefIt",
    titleHref: "https://github.com/MatthewKim07/chef-it",
    description:
      "ChefIt helps people decide what to cook using ingredients they already have at home. Users can scan their fridge or pantry with a photo, and the app identifies ingredients and recommends matching recipes. It also helps reduce food waste by suggesting meals before ingredients go unused. The app includes recipe discovery, ingredient tracking, favorites, shopping lists, guided cooking, and a social feed where users can share dishes and recipes.",
  },
  {
    image: {
      src: "/polyscope.png",
      alt: "Polyscope",
      demoVideoSrc: "/polyscope.mp4",
    },
    title: "Polyscope",
    titleHref: "https://github.com/SoroushKhajehpour/PolyScope",
    description:
      "Polyscope helps prediction market users evaluate the fine print before they trade. It analyzes a market's resolution rules, highlights ambiguity and rule changes, and surfaces risks that could make an outcome difficult or disputed to resolve.",
  },
];

export default function ProjectsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl md:px-6">
      <ParallaxCardGrid
        cards={PROJECTS}
        theme="dark"
        backgroundColor="transparent"
        gap={32}
        singleWide
        comfortableSingleWide
        equalizeSingleWideHeights
      />
    </section>
  );
}
