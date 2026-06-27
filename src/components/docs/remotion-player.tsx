"use client";

import { Player } from "@remotion/player";
import React from "react";

interface DocsRemotionPlayerProps {
  component: React.FC<any>;
  compositionWidth?: number;
  compositionHeight?: number;
  durationInFrames?: number;
  fps?: number;
  inputProps?: any;
}

export function DocsRemotionPlayer({ 
  component, 
  compositionWidth = 800, 
  compositionHeight = 400, 
  durationInFrames = 300, 
  fps = 30,
  inputProps = {}
}: DocsRemotionPlayerProps) {
  return (
    <div className="rounded-[var(--radius-card)] overflow-hidden border border-line bg-elevated my-8 shadow-sm relative">
      <Player
        component={component}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        compositionWidth={compositionWidth}
        compositionHeight={compositionHeight}
        fps={fps}
        style={{ width: "100%", height: "auto", aspectRatio: `${compositionWidth} / ${compositionHeight}` }}
        controls
        autoPlay
        loop
      />
    </div>
  );
}
