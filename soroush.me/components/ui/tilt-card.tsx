"use client";

/**
 * Port of Framer’s TiltCard (https://framer.com/m/TiltCard-1-nBci.js@mSFBBLRp2Xy3wAzveJmu)
 * without the `framer` package — same 3D tilt + glare behavior using `motion`.
 */
import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type TiltCardProps = {
  image?: { src: string; alt: string };
  /** Passed to `object-position` when using `object-fit: cover` (e.g. `center 60%` to crop the top). */
  imageObjectPosition?: string;
  tiltFactor?: number;
  perspective?: number;
  borderRadius?: number;
  backgroundColor?: string;
  shadowColor?: string;
  shadowIntensity?: number;
  transitionDuration?: number;
  hoverScale?: number;
  glareEffect?: boolean;
  glareIntensity?: number;
  glarePosition?: number;
  glareSize?: number;
  className?: string;
};

export default function TiltCard(props: TiltCardProps) {
  const {
    image = {
      src: "https://framerusercontent.com/images/YnBYRlxvxFzRXG9rOYVJdkGBg.jpg",
      alt: "Blue flower",
    },
    tiltFactor = 15,
    perspective = 1000,
    borderRadius = 12,
    backgroundColor = "#FFFFFF",
    shadowColor = "rgba(0, 0, 0, 0.2)",
    shadowIntensity = 0.5,
    transitionDuration = 0.2,
    hoverScale = 1.05,
    glareEffect = true,
    glareIntensity = 0.18,
    glarePosition = 50,
    glareSize = 92,
    imageObjectPosition = "center",
    className,
  } = props;

  const [isHovered, setIsHovered] = React.useState(false);
  const [tiltValues, setTiltValues] = React.useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!cardRef.current || !isHovered) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 100;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 100;
      setMousePosition({ x, y });
      const tiltX = -(y / 50) * tiltFactor;
      const tiltY = (x / 50) * tiltFactor;
      setTiltValues({ x: tiltX, y: tiltY });
    },
    [isHovered, tiltFactor],
  );

  const handleMouseEnter = React.useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setIsHovered(false);
    setTiltValues({ x: 0, y: 0 });
  }, []);

  const glareX = React.useMemo(
    () => (isHovered ? 50 + mousePosition.x / 2 : glarePosition),
    [isHovered, mousePosition.x, glarePosition],
  );
  const glareY = React.useMemo(
    () => (isHovered ? 50 + mousePosition.y / 2 : glarePosition),
    [isHovered, mousePosition.y, glarePosition],
  );

  return (
    <motion.div
      ref={cardRef}
      className={cn(className)}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        perspective: `${perspective}px`,
        transformStyle: "preserve-3d",
        cursor: "pointer",
        borderRadius: `${borderRadius}px`,
        overflow: "hidden",
      }}
      animate={{ scale: isHovered ? hoverScale : 1 }}
      transition={{ duration: transitionDuration, ease: "easeOut" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: `${borderRadius}px`,
          overflow: "hidden",
          backgroundColor,
          transformStyle: "preserve-3d",
          boxShadow: `0 10px 30px -10px ${shadowColor}`,
        }}
        animate={{
          rotateX: tiltValues.x,
          rotateY: tiltValues.y,
          boxShadow: isHovered
            ? `0 25px 50px -12px rgba(0, 0, 0, ${shadowIntensity})`
            : `0 10px 30px -10px ${shadowColor}`,
        }}
        transition={{ duration: transitionDuration, ease: "easeOut" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt={image.alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: imageObjectPosition,
            borderRadius: `${borderRadius}px`,
            position: "relative",
            zIndex: 1,
          }}
        />
        {glareEffect && (
          <motion.div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
              borderRadius: `${borderRadius}px`,
              background: `radial-gradient(
                circle at ${glareX}% ${glareY}%,
                rgba(255, 255, 255, ${isHovered ? glareIntensity : 0}) 0%,
                rgba(255, 255, 255, 0) ${glareSize}%
              )`,
              pointerEvents: "none",
            }}
            animate={{ opacity: isHovered ? 0.75 : 0 }}
            transition={{ duration: transitionDuration }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
