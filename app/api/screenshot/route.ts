// ============================================================
// READSX — Screenshot Stream API
// GET /api/screenshot — Real-time browser screenshots via SSE
// ============================================================

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Shared screenshot buffer
let latestScreenshot: {
  data: string;
  timestamp: number;
  url: string;
} | null = null;

export function updateScreenshot(data: string, url: string) {
  latestScreenshot = { data, timestamp: Date.now(), url };
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send latest screenshot immediately if available
      if (latestScreenshot) {
        const msg = `data: ${JSON.stringify({
          type: 'screenshot',
          ...latestScreenshot,
        })}\n\n`;
        controller.enqueue(encoder.encode(msg));
      } else {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'waiting', message: 'Awaiting browser session...' })}\n\n`
          )
        );
      }

      // Poll for new screenshots every 1.5 seconds
      let lastTimestamp = latestScreenshot?.timestamp || 0;

      const interval = setInterval(() => {
        try {
          if (latestScreenshot && latestScreenshot.timestamp > lastTimestamp) {
            const msg = `data: ${JSON.stringify({
              type: 'screenshot',
              ...latestScreenshot,
            })}\n\n`;
            controller.enqueue(encoder.encode(msg));
            lastTimestamp = latestScreenshot.timestamp;
          }

          // Heartbeat
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'ping', ts: Date.now() })}\n\n`)
          );
        } catch {
          clearInterval(interval);
        }
      }, 1500);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
