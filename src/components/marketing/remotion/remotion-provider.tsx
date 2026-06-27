"use client";

import { type ComponentType } from "react";
import dynamic from "next/dynamic";
import type { PlayerProps } from "@remotion/player";
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
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] border border-line",
        className
      )}
      style={{
        aspectRatio: `${props.compositionWidth} / ${props.compositionHeight}`,
      }}
    >
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
    </div>
  );
}
