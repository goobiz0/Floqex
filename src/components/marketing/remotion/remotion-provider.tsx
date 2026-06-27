"use client";

import { type ComponentType, useRef } from "react";
import dynamic from "next/dynamic";
import type { PlayerProps } from "@remotion/player";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";

// Dynamically import Player to avoid SSR
const Player = dynamic(
  () => import("@remotion/player").then((mod) => mod.Player),
  { ssr: false }
) as ComponentType<PlayerProps<any, any>>;

export function RemotionPlayer({
  className,
  loop = true,
  autoPlay = true,
  controls = false,
  ...props
}: PlayerProps<any, any> & { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "600px" });

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-visible rounded-[var(--radius-lg)] border border-line",
        className
      )}
      style={{
        aspectRatio: `${props.compositionWidth} / ${props.compositionHeight}`,
        // For Remotion iframe scaling clipping issues, often adding a tiny padding or overflow visible helps.
        // We removed overflow-hidden and replaced with overflow-visible.
      }}
    >
      {isInView && (
        <Player
          {...props}
          loop={loop}
          autoPlay={autoPlay}
          controls={controls}
          clickToPlay={false}
          acknowledgeRemotionLicense={true}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            backgroundColor: "transparent",
            ...props.style,
          }}
        />
      )}
    </div>
  );
}
