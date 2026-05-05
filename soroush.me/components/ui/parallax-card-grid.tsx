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
import * as React from "react";
import { cn } from "@/lib/utils";

export type ParallaxCardItem = {
  image: { src: string; alt: string };
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
   * One wide landscape card, centered in the grid; pairs with a single `cards` entry.
   */
  singleWide?: boolean;
};

const DEFAULT_CARDS: ParallaxCardItem[] = [
  {
    image: {
      src: "/Roam_logo.jpg",
      alt: "Roam",
    },
    title: "Roam",
    titleHref: "https://www.roam.auto/",
    titleMutedSuffix: " - Software Engineering Intern",
    year: "2026",
    description:
      "Built backend systems and real-time integrations for a fleet maintenance platform.",
  },
];

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
  const titleEl = card.titleHref ? (
    <a
      href={card.titleHref}
      target="_blank"
      rel="noopener noreferrer"
      className="transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
      style={{ color: linkTextColor }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {card.title}
    </a>
  ) : (
    <span style={{ color: textColor }}>{card.title}</span>
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
}: {
  card: ParallaxCardItem;
  index: number;
  /** Legacy portrait ratio: height = width / aspectRatio */
  aspectRatio: number;
  /** Wide, short card (width : height) */
  landscape: boolean;
  /** Height follows image strip; no fixed aspect box */
  singleWide: boolean;
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

  const cardImage = card.image ?? {
    src: "https://framerusercontent.com/images/GfGkADagM4KEibNcIiRUWlfrR0.jpg",
    alt: "Card",
  };

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
          cursor: "pointer",
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
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={() => openLink(card.linkUrl ?? "#")}
        role="button"
        tabIndex={0}
        aria-label={`${card.title}${card.titleMutedSuffix ?? ""}${card.year ? `, ${card.year}` : ""} — ${card.description}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openLink(card.linkUrl ?? "#");
          }
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
            className={cn(
              "flex w-full flex-row items-stretch",
              singleWide ? "min-h-0" : "h-full",
            )}
          >
            <div
              className={cn(
                "relative flex min-h-0 min-w-0 flex-1 flex-col pr-3",
                singleWide
                  ? "justify-start gap-1.5 p-4 py-4"
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
                        theme === "dark" ? "text-neutral-400" : "text-neutral-500",
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
                  onClick={(e) => {
                    e.stopPropagation();
                    openLink(card.linkUrl ?? "#");
                  }}
                >
                  {card.linkLabel}
                </button>
              )}
            </div>
            <div className="flex w-[min(42%,250px)] min-w-[140px] shrink-0 flex-col justify-center self-stretch border-l border-white/10 sm:min-w-[180px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardImage.src}
                alt={cardImage.alt}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ) : (
          <>
            <div
              className="relative h-[60%] w-full bg-cover bg-center"
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
              {card.linkLabel && (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    openLink(card.linkUrl ?? "#");
                  }}
                >
                  {card.linkLabel}
                </button>
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
}: ParallaxCardGridProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
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
  const displayCards = singleWide ? cards.slice(0, 1) : cards;

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
