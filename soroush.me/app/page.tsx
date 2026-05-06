import dynamic from "next/dynamic";

const TextFlippingBoard = dynamic(
  () =>
    import("@/components/ui/text-flipping-board").then((m) => ({
      default: m.TextFlippingBoard,
    })),
  {
    loading: () => (
      <div
        className="mx-auto h-32 max-w-3xl animate-pulse rounded-xl bg-neutral-800/40 md:h-40"
        aria-hidden
      />
    ),
    ssr: true,
  },
);

const StarTiltReveal = dynamic(() =>
  import("@/components/star-tilt-reveal").then((m) => ({
    default: m.StarTiltReveal,
  })),
);

export default function HomePage() {
  return (
    <>
      <div className="flex min-h-[calc(100vh-32rem)] w-full flex-col justify-center">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
          <TextFlippingBoard
            text={"[[blue]]Soroush Khajehpour[[/]]\n[[violet]]1B Computer Engineering"}
            duration={0.7}
          />
          <div className="space-y-5 text-left font-serif text-lg leading-relaxed text-white">
            <p>
              I&apos;m a{" "}
              <a
                href="https://www.uwce.ca/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 no-underline transition-colors hover:text-blue-300"
              >
                Computer Engineering
              </a>{" "}
              student at the University of Waterloo with an interest in backend
              systems and machine learning.
            </p>
            <p>
              Right now, I&apos;m focused on learning by building. I use projects
              to understand how systems actually work under the hood instead of
              just interacting with them at a high level.
            </p>
            <p>
              I&apos;m still figuring out where I want to specialize, but I&apos;m
              drawn to problems involving performance, decision-making, and
              real-world system behavior.
            </p>
            <p>
              At this stage, my goal is to build a strong technical foundation and
              gain clarity through hands-on work.
            </p>
          </div>
        </div>
      </div>
      <StarTiltReveal />
    </>
  );
}
