'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/lib/store';

export function ScreenshotViewer() {
  const { screenshot, setScreenshot, twoFAChallenge } = useDashboardStore();
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/screenshot');
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'screenshot') {
          setScreenshot({ data: data.data, timestamp: data.timestamp, url: data.url });
        }
      } catch {}
    };

    return () => {
      es.close();
    };
  }, [setScreenshot]);

  return (
    <div className="panel panel-corner h-full flex flex-col">
      <div className="section-header flex-shrink-0 justify-between">
        <div className="flex items-center gap-2">
          <span className="status-dot" style={{ background: screenshot ? '#00ff88' : '#3a5568' }} />
          <span className="section-title">Browser Viewport</span>
        </div>
        {screenshot && (
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {screenshot.url?.replace('https://', '').slice(0, 30)}
          </span>
        )}
      </div>

      <div
        className="flex-1 relative overflow-hidden"
        style={{ background: 'var(--color-abyss)', minHeight: 0 }}
      >
        {twoFAChallenge && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center danger-pulse"
            style={{ background: 'rgba(255,51,102,0.12)', backdropFilter: 'blur(4px)' }}
          >
            <div
              className="p-4 text-center"
              style={{
                border: '1px solid var(--color-red)',
                background: 'var(--color-panel)',
                maxWidth: '280px',
              }}
            >
              <div className="neon-red font-mono font-bold text-sm mb-2">⚠ 2FA CHALLENGE</div>
              <div
                className="font-mono text-xs mb-3"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Enter verification code via dashboard input
              </div>
              <input
                className="input-cyber w-full text-center"
                placeholder="Enter code..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Submit code
                  }
                }}
              />
            </div>
          </div>
        )}

        {screenshot?.data ? (
          <div className="relative w-full h-full scanline-overlay">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${screenshot.data}`}
              alt="Browser viewport"
              className="w-full h-full object-contain"
              style={{ display: 'block' }}
            />
            {/* Overlay grid */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,245,255,0.015) 2px, rgba(0,245,255,0.015) 4px)',
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              className="font-mono text-xs"
              style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
            >
              AWAITING BROWSER SESSION
            </div>
            <div
              className="w-px h-8 animate-pulse"
              style={{ background: 'var(--color-cyan)' }}
            />
            <div
              className="font-mono text-xs"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Start automation to see live feed
            </div>
          </div>
        )}
      </div>

      {screenshot && (
        <div
          className="flex-shrink-0 flex items-center justify-between px-3 py-1"
          style={{
            borderTop: '1px solid rgba(0,245,255,0.06)',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <span className="font-mono text-xs neon-green">● STREAMING</span>
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(screenshot.timestamp).toTimeString().slice(0, 8)}
          </span>
        </div>
      )}
    </div>
  );
}
