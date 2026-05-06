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
      <div className="flex min-h-[38vh] w-full flex-col justify-center sm:min-h-[44vh] md:min-h-[calc(100vh-32rem)]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 md:gap-12">
          <TextFlippingBoard
            text={"[[blue]]Soroush Khajehpour[[/]]\n[[violet]]1B Computer Engineering"}
            duration={0.7}
          />
          <div className="space-y-4 text-left font-serif text-base leading-relaxed text-white md:space-y-5 md:text-lg">
            <p>
              I&apos;m a{" "}
              <a
                href="https://www.uwce.ca/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#93c5fd] no-underline transition-colors hover:text-[#bfdbfe]"
              >
                Computer Engineering
              </a>{" "}
              student at the{" "}
              <img
                src="/waterloo-logo.svg"
                alt="University of Waterloo logo"
                width={16}
                height={16}
                className="mr-1 inline-block size-4 align-[-2px]"
              />
              University of Waterloo{" "}
              with an interest in backend
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
            <div className="pt-3 font-serif md:pt-4">
              <div className="text-sm md:text-[15px]">
                <span className="font-semibold uppercase tracking-[0.16em] text-[#93c5fd]">
                  Relevant coursework
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2.5 text-[13px] text-neutral-200 sm:grid-cols-2 sm:gap-3 md:text-sm">
                <div className="rounded-lg border border-white/10 bg-neutral-900/25 px-3 py-2.5 font-serif shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-sm">
                  <span className="font-semibold text-white">ECE 108</span>{" "}
                  <span className="text-neutral-300">
                    (Discrete Mathematics &amp; Logic 1)
                  </span>
                </div>
                <div className="rounded-lg border border-white/10 bg-neutral-900/25 px-3 py-2.5 font-serif shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-sm">
                  <span className="font-semibold text-white">ECE 124</span>{" "}
                  <span className="text-neutral-300">
                    (Digital Circuits &amp; Systems)
                  </span>
                </div>
                <div className="rounded-lg border border-white/10 bg-neutral-900/25 px-3 py-2.5 font-serif shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-sm">
                  <span className="font-semibold text-white">ECE 140</span>{" "}
                  <span className="text-neutral-300">(Linear Circuits)</span>
                </div>
                <div className="rounded-lg border border-white/10 bg-neutral-900/25 px-3 py-2.5 font-serif shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-sm">
                  <span className="font-semibold text-white">MATH 119</span>{" "}
                  <span className="text-neutral-300">
                    (Calculus 2 for Engineering)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <StarTiltReveal />
    </>
  );
}
