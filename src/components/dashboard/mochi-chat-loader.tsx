"use client";

import dynamic from "next/dynamic";

// The Mochi copilot is a floating widget mounted on every dashboard page but is
// not part of the initial view. Loading it via next/dynamic (ssr:false) keeps
// the AI SDK chat client (`@ai-sdk/react`, transport, chart helpers) out of the
// server-rendered HTML and the main dashboard bundle, so it streams in after
// hydration instead of blocking first paint.
export const MochiChat = dynamic(
  () => import("./mochi-chat").then((m) => m.MochiChat),
  { ssr: false }
);
