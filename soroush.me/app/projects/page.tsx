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
      demoVideoSrc: "/chefitdemo.mp4",
      demoObjectFit: "contain",
      demoSlotBg: "light",
    },
    title: "ChefIt",
    titleHref: "https://github.com/MatthewKim07/chef-it",
    description:
      "ChefIt helps you figure out what to cook using what you already have. It scans your fridge or pantry from a single photo, detects ingredients, and suggests recipes you can actually make without another grocery run. A matching system ranks recipes based on what you own and fills in gaps with a built-in shopping list, alongside step-by-step cooking and saved recipes. Built end-to-end in 24 hours at ConHacks 2026.",
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
    <section className="mx-auto w-full max-w-3xl px-4 md:px-6">
      <ParallaxCardGrid
        cards={PROJECTS}
        theme="dark"
        backgroundColor="transparent"
        gap={32}
        singleWide
        comfortableSingleWide
      />
    </section>
  );
}
