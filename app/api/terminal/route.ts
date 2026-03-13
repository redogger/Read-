// ============================================================
// READSX — Terminal SSE Streaming
// GET /api/terminal — Server-Sent Events for live logs
// ============================================================

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Shared log buffer (in production, use Redis pub/sub)
export const logBuffer: Array<{
  id: string;
  level: string;
  message: string;
  timestamp: number;
}> = [];

export function pushLog(level: string, message: string) {
  const entry = {
    id: Math.random().toString(36).slice(2),
    level,
    message,
    timestamp: Date.now(),
  };
  logBuffer.unshift(entry);
  if (logBuffer.length > 1000) logBuffer.pop();
  return entry;
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMsg = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: Date.now(),
        message: 'Readsx Terminal Connected — Sovereign AI Online',
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      // Send recent logs
      const recent = logBuffer.slice(0, 50).reverse();
      for (const log of recent) {
        const msg = `data: ${JSON.stringify({ type: 'log', ...log })}\n\n`;
        controller.enqueue(encoder.encode(msg));
      }

      // Poll for new logs every 500ms
      let lastIndex = logBuffer.length;

      const interval = setInterval(() => {
        const newLogs = logBuffer.slice(0, logBuffer.length - lastIndex);
        if (newLogs.length > 0) {
          newLogs.reverse().forEach((log) => {
            const msg = `data: ${JSON.stringify({ type: 'log', ...log })}\n\n`;
            try {
              controller.enqueue(encoder.encode(msg));
            } catch {
              clearInterval(interval);
            }
          });
          lastIndex = logBuffer.length;
        }

        // Heartbeat ping
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ping' })}\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 500);

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
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
