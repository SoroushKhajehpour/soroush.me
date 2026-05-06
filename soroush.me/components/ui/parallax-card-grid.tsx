"use client";

/**
 * Port of Framer’s ParallaxCardGrid
 * (https://framer.com/m/ParallaxCardGrid-Mrje.js@RFfRIZKVXJTXviHXdsog) without the `framer` package.
 */
import {
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Play } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import * as React from "react";
import { cn } from "@/lib/utils";

const VIDEO_SRC_RE = /\.(mp4|webm|ogg)(\?|$)/i;

function isVideoSrc(src: string) {
  return VIDEO_SRC_RE.test(src);
}

/** Seconds to skip from the start of demo clips at playback start. */
const DEMO_TRIM_START_SEC = 1;
/** Finish slightly before true EOF so `ended` / decoder tail latency doesn’t stall the poster swap. */
const DEMO_END_ADVANCE_SEC = 0.22;

function DemoVideoPlayer({
  src,
  ariaLabel,
  className,
  onPlaybackComplete,
}: {
  src: string;
  ariaLabel: string;
  className?: string;
  /** Called when the clip finishes once — use to return to poster UI. */
  onPlaybackComplete?: () => void;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const finishedRef = React.useRef(false);

  React.useEffect(() => {
    finishedRef.current = false;
  }, [src]);

  const finishDemo = React.useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const el = ref.current;
    if (el) {
      el.pause();
    }
    onPlaybackComplete?.();
  }, [onPlaybackComplete]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const syncTrimAndPlay = () => {
      const d = el.duration;
      if (Number.isFinite(d) && d > DEMO_TRIM_START_SEC + 0.05) {
        el.currentTime = DEMO_TRIM_START_SEC;
      }
      void el.play().catch(() => {});
    };

    const onLoadedMeta = () => syncTrimAndPlay();
    el.addEventListener("loadedmetadata", onLoadedMeta);
    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) syncTrimAndPlay();
    return () => el.removeEventListener("loadedmetadata", onLoadedMeta);
  }, [src]);

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      playsInline
      muted
      controls
      preload="metadata"
      aria-label={ariaLabel}
      onPlay={(e) => {
        const v = e.currentTarget;
        if (v.currentTime < DEMO_TRIM_START_SEC - 0.05) {
          v.currentTime = DEMO_TRIM_START_SEC;
        }
      }}
      onSeeking={(e) => {
        const v = e.currentTarget;
        if (v.currentTime < DEMO_TRIM_START_SEC)
          v.currentTime = DEMO_TRIM_START_SEC;
      }}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        const d = v.duration;
        if (
          !v.paused &&
          Number.isFinite(d) &&
          d > DEMO_TRIM_START_SEC + DEMO_END_ADVANCE_SEC &&
          v.currentTime >= d - DEMO_END_ADVANCE_SEC
        ) {
          finishDemo();
        }
      }}
      onEnded={finishDemo}
    />
  );
}

function PlayDemoButton({ onPress }: { onPress: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        "absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-full",
        "border border-white/15 bg-neutral-950/30 px-2 py-1 pl-1.5",
        "text-[11px] font-normal tracking-wide text-white/80 antialiased",
        "backdrop-blur-md backdrop-saturate-150",
        "transition-[border-color,background-color,color] duration-200 ease-out",
        "hover:border-white/25 hover:bg-neutral-950/45 hover:text-white",
        "focus:outline-none focus-visible:border-white/35 focus-visible:ring-1 focus-visible:ring-white/20",
      )}
      aria-label="Play demo video"
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <Play
        className="size-3 shrink-0 opacity-90"
        strokeWidth={1.65}
        aria-hidden
      />
      <span className="pr-1">Demo</span>
    </button>
  );
}

export type ParallaxCardItem = {
  image: {
    src: string;
    alt: string;
    /** For standalone video slot (`src` is `.mp4` etc.). */
    poster?: string;
    /** Shows `src` as image until clicked; then plays this clip (first ~1s skipped during playback). */
    demoVideoSrc?: string;
    /**
     * `cover` fills the strip (default — no empty bands). Use `contain` only if you want the whole screenshot visible with letterboxing.
     */
    mediaFit?: "cover" | "contain";
  };
  title: string;
  /** If set, `title` is rendered as a link (e.g. company name). */
  titleHref?: string;
  /** Appended after `title` in a softer gray (e.g. role). */
  titleMutedSuffix?: string;
  /** Shown right-aligned on the title row (e.g. year). */
  year?: string;
  description: string;
  tag?: string;
  linkLabel?: string;
  linkUrl?: string;
};

export type ParallaxCardGridProps = {
  cards?: ParallaxCardItem[];
  className?: string;
  /** light | dark — dark matches this site’s background */
  theme?: "light" | "dark";
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  linkTextColor?: string;
  hoverVariant?: "tilt" | "cards-elevate-on-hover";
  gap?: number;
  borderRadius?: number;
  tiltDepth?: number;
  shadowStrength?: number;
  enableGlare?: boolean;
  enableRevealAnimation?: boolean;
  /**
   * Wide landscape layout per card. Cards stack in a single column (`grid-cols-1`).
   */
  singleWide?: boolean;
  /**
   * When `singleWide`, measure all landscape rows and apply the tallest row’s height as each row’s `min-height` so cards match (e.g. projects grid).
   */
  equalizeSingleWideHeights?: boolean;
  /**
   * Larger padding + min-heights for wide project cards. Omit on Experience so internship rows stay compact.
   */
  comfortableSingleWide?: boolean;
};

const DEFAULT_CARDS: ParallaxCardItem[] = [
  {
    image: {
      src: "/Roam_logo.jpg",
      alt: "Roam",
      mediaFit: "contain",
    },
    title: "Roam",
    titleHref: "https://www.roam.auto/",
    titleMutedSuffix: " - Software Engineering Intern",
    year: "2026",
    description:
      "Built backend systems and real-time integrations for a fleet maintenance platform.",
  },
];

function openLink(url: string) {
  if (!url || url === "#") return;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (url.startsWith("/") || url.startsWith("#")) {
      window.location.href = url;
    } else {
      window.open(`https://${url}`, "_blank", "noopener,noreferrer");
    }
  } catch {
    console.warn("Failed to open URL:", url);
  }
}

function githubRepoHref(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (!/github\.com/i.test(u)) return null;
  try {
    return new URL(u).href;
  } catch {
    const normalized = u.startsWith("http") ? u : `https://${u.replace(/^\/+/, "")}`;
    try {
      return new URL(normalized).href;
    } catch {
      return null;
    }
  }
}

function CardGitHubLink({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 text-gray-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
      aria-label={`${title} on GitHub`}
    >
      <FaGithub className="size-5" aria-hidden />
    </a>
  );
}

function CardTitleText({
  card,
  textColor,
  linkTextColor,
  theme,
}: {
  card: ParallaxCardItem;
  textColor: string;
  linkTextColor: string;
  theme: "light" | "dark";
}) {
  /** Repo cards use the footer GitHub icon only — avoid a wide `<a>` in the title row. */
  const repoHref = githubRepoHref(card.titleHref);
  const titleUsesExternalLink =
    Boolean(card.titleHref) && repoHref === null;

  const titleEl = titleUsesExternalLink ? (
    <a
      href={card.titleHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block max-w-full transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
      style={{ color: linkTextColor }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {card.title}
    </a>
  ) : (
    <span
      style={{
        color: card.titleHref ? linkTextColor : textColor,
      }}
    >
      {card.title}
    </span>
  );

  return (
    <>
      {titleEl}
      {card.titleMutedSuffix ? (
        <span
          className={cn(
            "font-medium",
            theme === "dark" ? "text-neutral-400" : "text-neutral-500",
          )}
        >
          {card.titleMutedSuffix}
        </span>
      ) : null}
    </>
  );
}

function Card({
  card,
  index,
  aspectRatio,
  landscape,
  singleWide,
  borderRadius,
  tiltDepth,
  shadowStrength,
  enableGlare,
  enableRevealAnimation,
  textColor,
  linkTextColor,
  theme,
  hoverVariant = "tilt",
  isInView,
  shouldAnimate,
  uniformLandscapeMinHeight,
  comfortableSingleWide = false,
}: {
  card: ParallaxCardItem;
  index: number;
  /** Legacy portrait ratio: height = width / aspectRatio */
  aspectRatio: number;
  /** Wide, short card (width : height) */
  landscape: boolean;
  /** Height follows image strip; no fixed aspect box */
  singleWide: boolean;
  /** Shared min-height (px) for `singleWide` landscape rows when equalizing card heights */
  uniformLandscapeMinHeight?: number;
  comfortableSingleWide?: boolean;
  borderRadius: number;
  tiltDepth: number;
  shadowStrength: number;
  enableGlare: boolean;
  enableRevealAnimation: boolean;
  textColor: string;
  linkTextColor: string;
  theme: "light" | "dark";
  hoverVariant: "tilt" | "cards-elevate-on-hover";
  isInView: boolean;
  shouldAnimate: boolean;
}) {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const cardImage = card.image ?? {
    src: "https://framerusercontent.com/images/GfGkADagM4KEibNcIiRUWlfrR0.jpg",
    alt: "Card",
  };

  const hasDemoVideo =
    Boolean(cardImage.demoVideoSrc) && isVideoSrc(cardImage.demoVideoSrc ?? "");
  const [demoPlaying, setDemoPlaying] = React.useState(false);
  const mediaIsVideo = isVideoSrc(cardImage.src) && !hasDemoVideo;

  const mediaFitContain = cardImage.mediaFit === "contain";
  const stripMediaClass = mediaFitContain
    ? "h-full w-full object-contain object-center"
    : "h-full w-full object-cover object-center";

  const gitHubHref = githubRepoHref(card.titleHref);

  const comfortableRow = comfortableSingleWide && singleWide;
  const landscapeStripMinH = singleWide
    ? uniformLandscapeMinHeight != null
      ? "min-h-0"
      : comfortableRow
        ? "min-h-[220px]"
        : "min-h-[140px]"
    : "min-h-[140px]";
  const rowMinUntilUniform =
    singleWide && uniformLandscapeMinHeight == null
      ? comfortableRow
        ? "min-h-[220px]"
        : "min-h-[140px]"
      : "";

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!shouldAnimate || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setMousePosition({ x, y });
  };

  const tiltX =
    shouldAnimate && hoverVariant === "tilt" ? mousePosition.y * tiltDepth : 0;
  const tiltY =
    shouldAnimate && hoverVariant === "tilt" ? -mousePosition.x * tiltDepth : 0;

  const glareOpacity = enableGlare && isHovered ? 0.1 : 0;
  const glareX = (mousePosition.x + 1) * 50;
  const glareY = (mousePosition.y + 1) * 50;

  const cardVariants = {
    hidden: { opacity: 0, y: 60, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        delay: enableRevealAnimation ? index * 0.1 : 0,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  const revealProps = enableRevealAnimation
    ? {
        variants: cardVariants,
        initial: "hidden" as const,
        animate: (isInView ? "visible" : "hidden") as "visible" | "hidden",
      }
    : {};

  return (
    <motion.div
      style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
      {...revealProps}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        if (shouldAnimate) setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (shouldAnimate) {
          setIsHovered(false);
          setMousePosition({ x: 0, y: 0 });
        }
      }}
    >
      <motion.div
        ref={cardRef}
        className={
          landscape
            ? cn(
                "flex min-h-0 flex-col",
                singleWide && "h-auto min-h-0",
              )
            : undefined
        }
        style={{
          width: "100%",
          ...(singleWide && landscape
            ? {}
            : {
                aspectRatio: landscape
                  ? `${aspectRatio} / 1`
                  : `1 / ${aspectRatio}`,
              }),
          borderRadius: `${borderRadius}px`,
          /* Don’t clip on the transformed layer — it flattens corners on hover. */
          overflow: "visible",
          cursor: "default",
          position: "relative",
          transformStyle: "preserve-3d",
          backgroundColor: "transparent",
        }}
        animate={
          shouldAnimate
            ? hoverVariant === "cards-elevate-on-hover"
              ? {
                  y: isHovered ? -8 : 0,
                  boxShadow: isHovered
                    ? `0 20px 40px rgba(0, 0, 0, ${shadowStrength * 1.8})`
                    : `0 8px 24px rgba(0, 0, 0, ${shadowStrength})`,
                }
              : {
                  rotateX: tiltX,
                  rotateY: tiltY,
                  boxShadow: isHovered
                    ? `0 ${20 + tiltDepth}px ${40 + tiltDepth * 2}px rgba(0, 0, 0, ${shadowStrength * 1.5})`
                    : `0 8px 24px rgba(0, 0, 0, ${shadowStrength})`,
                }
            : {}
        }
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 36,
          mass: 0.85,
        }}
      >
        <div
          className="h-full min-h-0 overflow-hidden"
          style={{
            borderRadius: `${borderRadius}px`,
            backgroundColor: theme === "dark" ? "#2a2a2a" : "#ffffff",
            transform: "translateZ(0)",
          }}
        >
        {landscape ? (
          <div
            data-parallax-card-row={singleWide ? "" : undefined}
            className={cn(
              "flex w-full flex-col items-stretch md:flex-row",
              singleWide ? "min-h-0" : "h-full",
              rowMinUntilUniform,
            )}
            style={
              singleWide && uniformLandscapeMinHeight != null
                ? { minHeight: uniformLandscapeMinHeight }
                : undefined
            }
          >
            <div
              className={cn(
                "relative flex min-h-0 min-w-0 flex-1 flex-col max-md:pb-3 max-md:pr-0 md:pr-3",
                singleWide
                  ? comfortableRow
                    ? "justify-start gap-2 px-4 py-4 md:px-5 md:py-6"
                    : "justify-start gap-1.5 p-4 py-4"
                  : "justify-between p-4",
              )}
            >
              {enableGlare && (
                <div
                  className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
                  style={{
                    background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, ${glareOpacity}) 0%, transparent 50%)`,
                  }}
                />
              )}
              <div className="relative z-1 flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="min-h-0 flex-1">
                  <div>
                    <h3
                      className={cn(
                        "flex min-w-0 items-baseline gap-2 text-[18px] font-semibold leading-tight",
                        singleWide ? "mb-1" : "mb-2",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <CardTitleText
                          card={card}
                          textColor={textColor}
                          linkTextColor={linkTextColor}
                          theme={theme}
                        />
                      </span>
                      {card.year ? (
                        <span
                          className={cn(
                            "shrink-0 tabular-nums",
                            theme === "dark"
                              ? "text-neutral-400"
                              : "text-neutral-500",
                          )}
                        >
                          {card.year}
                        </span>
                      ) : null}
                    </h3>
                    <p
                      className={cn(
                        "text-[14px] opacity-70",
                        singleWide ? "" : "line-clamp-3",
                      )}
                      style={{ color: textColor }}
                    >
                      {card.description}
                    </p>
                  </div>
                </div>
                {gitHubHref ? (
                  <div className="mt-auto shrink-0 pt-3">
                    <CardGitHubLink href={gitHubHref} title={card.title} />
                  </div>
                ) : null}
              </div>
              {!singleWide && card.linkLabel && (
                <button
                  type="button"
                  className="mt-3 flex w-max cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-[14px] transition-colors"
                  style={{ color: linkTextColor }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      theme === "dark"
                        ? "rgba(96, 165, 250, 0.12)"
                        : "rgba(37, 99, 235, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onClick={() => openLink(card.linkUrl ?? "#")}
                >
                  {card.linkLabel}
                </button>
              )}
            </div>
            <div
              className={cn(
                "flex w-full min-w-0 shrink-0 flex-col justify-center self-stretch border-t border-white/10 max-md:aspect-16/10 max-md:min-h-[156px] md:w-[min(42%,250px)] md:min-w-[180px] md:border-l md:border-t-0",
                mediaFitContain && "bg-[#2a2a2a]",
                landscapeStripMinH,
              )}
            >
              {hasDemoVideo ? (
                <div
                  className={cn(
                    "relative h-full w-full",
                    mediaFitContain &&
                      "flex items-center justify-center p-2 sm:p-2.5",
                    landscapeStripMinH,
                  )}
                >
                  {demoPlaying && cardImage.demoVideoSrc ? (
                    <div
                      className="h-full min-h-0 w-full"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <DemoVideoPlayer
                        src={cardImage.demoVideoSrc}
                        ariaLabel={cardImage.alt}
                        className={stripMediaClass}
                        onPlaybackComplete={() => setDemoPlaying(false)}
                      />
                    </div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cardImage.src}
                        alt={cardImage.alt}
                        className={stripMediaClass}
                      />
                      <PlayDemoButton onPress={() => setDemoPlaying(true)} />
                    </>
                  )}
                </div>
              ) : mediaIsVideo ? (
                <div
                  className={cn("h-full w-full", landscapeStripMinH)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <video
                    className="h-full w-full object-cover object-center"
                    src={cardImage.src}
                    poster={cardImage.poster}
                    playsInline
                    muted
                    loop
                    controls
                    preload="metadata"
                    autoPlay={!prefersReducedMotion}
                    aria-label={cardImage.alt}
                  />
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={cardImage.src}
                  alt={cardImage.alt}
                  className={stripMediaClass}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="relative h-[60%] w-full overflow-hidden bg-neutral-950">
              {hasDemoVideo ? (
                <>
                  {demoPlaying && cardImage.demoVideoSrc ? (
                    <div
                      className={cn(
                        "absolute inset-0",
                        mediaFitContain &&
                          "flex items-center justify-center bg-[#2a2a2a] p-2 sm:p-3",
                      )}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <DemoVideoPlayer
                        src={cardImage.demoVideoSrc}
                        ariaLabel={cardImage.alt}
                        className={
                          mediaFitContain
                            ? "max-h-full max-w-full object-contain object-center"
                            : "h-full w-full object-cover object-center"
                        }
                        onPlaybackComplete={() => setDemoPlaying(false)}
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "relative h-full w-full",
                        mediaFitContain &&
                          "flex items-center justify-center bg-[#2a2a2a] p-2 sm:p-3",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cardImage.src}
                        alt={cardImage.alt}
                        className={
                          mediaFitContain
                            ? "max-h-full max-w-full object-contain object-center"
                            : "h-full w-full object-cover object-center"
                        }
                      />
                      <PlayDemoButton onPress={() => setDemoPlaying(true)} />
                    </div>
                  )}
                  {enableGlare && (
                    <div
                      className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
                      style={{
                        background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, ${glareOpacity}) 0%, transparent 50%)`,
                      }}
                    />
                  )}
                  {card.tag ? (
                    <div
                      className="pointer-events-none absolute top-3 left-3 z-5 rounded-md px-2 py-1 text-[12px]"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "#ffffff",
                      }}
                    >
                      {card.tag}
                    </div>
                  ) : null}
                </>
              ) : mediaIsVideo ? (
                <>
                  <div
                    className="absolute inset-0"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <video
                      className="h-full w-full object-cover object-center"
                      src={cardImage.src}
                      poster={cardImage.poster}
                      playsInline
                      muted
                      loop
                      controls
                      preload="metadata"
                      autoPlay={!prefersReducedMotion}
                      aria-label={cardImage.alt}
                    />
                  </div>
                  {enableGlare && (
                    <div
                      className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
                      style={{
                        background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, ${glareOpacity}) 0%, transparent 50%)`,
                      }}
                    />
                  )}
                </>
              ) : (
                <div
                  className="relative h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${cardImage.src})` }}
                  role="img"
                  aria-label={cardImage.alt}
                >
                  {enableGlare && (
                    <div
                      className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
                      style={{
                        background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, ${glareOpacity}) 0%, transparent 50%)`,
                      }}
                    />
                  )}
                  {card.tag ? (
                    <div
                      className="absolute top-3 left-3 rounded-md px-2 py-1 text-[12px]"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "#ffffff",
                      }}
                    >
                      {card.tag}
                    </div>
                  ) : null}
                </div>
              )}
              {mediaIsVideo && card.tag ? (
                <div
                  className="pointer-events-none absolute top-3 left-3 rounded-md px-2 py-1 text-[12px]"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "#ffffff",
                  }}
                >
                  {card.tag}
                </div>
              ) : null}
            </div>
            <div
              className="flex h-[40%] flex-col justify-between p-4"
              style={{ color: textColor }}
            >
              <div>
                <h3 className="mb-2 flex min-w-0 max-w-full items-baseline gap-2 text-[18px] font-semibold leading-tight">
                  <span className="min-w-0 flex-1">
                    <CardTitleText
                      card={card}
                      textColor={textColor}
                      linkTextColor={linkTextColor}
                      theme={theme}
                    />
                  </span>
                  {card.year ? (
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        theme === "dark" ? "text-neutral-400" : "text-neutral-500",
                      )}
                    >
                      {card.year}
                    </span>
                  ) : null}
                </h3>
                <p
                  className="mb-3 line-clamp-3 text-[14px] opacity-70"
                  style={{ color: textColor }}
                >
                  {card.description}
                </p>
              </div>
              {(gitHubHref || card.linkLabel) && (
                <div className="flex flex-col items-start gap-2">
                  {gitHubHref ? (
                    <CardGitHubLink href={gitHubHref} title={card.title} />
                  ) : null}
                  {card.linkLabel ? (
                    <button
                      type="button"
                      className="flex w-max cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-[14px] transition-colors"
                      style={{ color: linkTextColor }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          theme === "dark"
                            ? "rgba(96, 165, 250, 0.12)"
                            : "rgba(37, 99, 235, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      onClick={() => openLink(card.linkUrl ?? "#")}
                    >
                      {card.linkLabel}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ParallaxCardGrid({
  cards = DEFAULT_CARDS,
  className,
  theme = "dark",
  backgroundColor = "transparent",
  textColor: textColorProp,
  linkTextColor: linkTextColorProp,
  hoverVariant = "tilt",
  gap = 24,
  borderRadius = 16,
  tiltDepth = 8,
  shadowStrength = 0.2,
  enableGlare = true,
  enableRevealAnimation = true,
  singleWide = false,
  equalizeSingleWideHeights = false,
  comfortableSingleWide = false,
}: ParallaxCardGridProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rowsMeasureRef = React.useRef<HTMLDivElement>(null);
  const [uniformLandscapeMinHeight, setUniformLandscapeMinHeight] = React.useState<
    number | undefined
  >(undefined);
  const isInView = useInView(containerRef, { once: true, margin: "-80px" });
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  const textColor = textColorProp ?? (theme === "dark" ? "#f5f5f5" : "#000000");
  const linkTextColor =
    linkTextColorProp ?? (theme === "dark" ? "#93c5fd" : "#2563eb");

  const landscape = singleWide;
  /** Portrait: height factor; landscape: width / height (wider, shorter card) */
  /** Landscape row layout: a bit wider / shallower than the old top-image layout */
  const aspectValue = landscape ? 2.75 : 1.2;
  const displayCards = cards;

  const measureUniformLandscapeHeight = React.useCallback(() => {
    if (!equalizeSingleWideHeights || !rowsMeasureRef.current) return;
    const rows = rowsMeasureRef.current.querySelectorAll<HTMLElement>(
      "[data-parallax-card-row]",
    );
    if (!rows.length) return;
    let max = 0;
    rows.forEach((el) => {
      // Use layout height, not getBoundingClientRect — tilt uses rotateX/Y on an
      // ancestor, and the screen-space AABB grows with rotation and retriggers
      // ResizeObserver → runaway min-height / layout glitch on hover & click.
      const h = el.offsetHeight;
      if (h > 0) max = Math.max(max, h);
    });
    if (max <= 0) return;
    setUniformLandscapeMinHeight((prev) => {
      if (prev !== undefined && Math.abs(prev - max) <= 2) return prev;
      return max;
    });
  }, [equalizeSingleWideHeights]);

  React.useLayoutEffect(() => {
    measureUniformLandscapeHeight();
  }, [measureUniformLandscapeHeight, displayCards]);

  React.useEffect(() => {
    if (!equalizeSingleWideHeights || !rowsMeasureRef.current) return;
    const root = rowsMeasureRef.current;
    let rafId = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        measureUniformLandscapeHeight();
      });
    };
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(root);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [equalizeSingleWideHeights, measureUniformLandscapeHeight]);

  const uniformHeightProp =
    equalizeSingleWideHeights && uniformLandscapeMinHeight != null
      ? uniformLandscapeMinHeight
      : undefined;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-[200px] w-full overflow-visible",
        className,
      )}
      style={{
        backgroundColor,
        padding: gap,
      }}
    >
      <div
        ref={rowsMeasureRef}
        className={cn(
          "grid w-full grid-cols-1",
          !singleWide && "md:grid-cols-2 lg:grid-cols-3",
        )}
        style={{ gap }}
      >
        {displayCards.map((card, index) => (
          <Card
            key={`${card.title}-${index}`}
            card={card}
            index={index}
            aspectRatio={aspectValue}
            landscape={landscape}
            singleWide={singleWide}
            uniformLandscapeMinHeight={uniformHeightProp}
            comfortableSingleWide={comfortableSingleWide}
            borderRadius={borderRadius}
            tiltDepth={tiltDepth}
            shadowStrength={shadowStrength}
            enableGlare={enableGlare}
            enableRevealAnimation={enableRevealAnimation && shouldAnimate}
            textColor={textColor}
            linkTextColor={linkTextColor}
            theme={theme}
            hoverVariant={hoverVariant}
            isInView={isInView}
            shouldAnimate={shouldAnimate}
          />
        ))}
      </div>
    </div>
  );
}
