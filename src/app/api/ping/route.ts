

export const dynamic = "force-dynamic";
export const runtime = "edge";

// Minimal, uncached endpoint used by the dashboard latency widget to measure a
// real client to Floqex round trip. Intentionally tiny so the timing reflects
// network + edge latency rather than payload size.
export async function GET() {
  return new Response(JSON.stringify({ t: Date.now() }), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
