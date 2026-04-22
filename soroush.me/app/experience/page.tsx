import ParallaxCardGrid from "@/components/ui/parallax-card-grid";

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
