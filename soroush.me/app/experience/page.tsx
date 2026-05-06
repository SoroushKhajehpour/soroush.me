import dynamic from "next/dynamic";

const ParallaxCardGrid = dynamic(() => import("@/components/ui/parallax-card-grid"), {
  loading: () => (
    <div
      className="min-h-[200px] w-full animate-pulse rounded-2xl bg-neutral-800/35"
      aria-hidden
    />
  ),
});

export default function ExperiencePage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6">
      <p className="mb-8 font-serif text-lg font-bold text-white">
        Previously,
      </p>
      <ParallaxCardGrid
        theme="dark"
        backgroundColor="transparent"
        gap={0}
        singleWide
      />
    </section>
  );
}
