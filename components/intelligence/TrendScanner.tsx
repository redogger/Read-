'use client';

import { useState } from 'react';
import { useDashboardStore } from '@/lib/store';
import type { TrendItem } from '@/types';

function TrendCard({
  trend,
  onUseHook,
}: {
  trend: TrendItem;
  onUseHook: (hook: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const sourceColors: Record<string, string> = {
    reddit: '#ff4500',
    github: '#00ff88',
    news: '#00f5ff',
    twitter: '#1da1f2',
  };

  const sourceColor = sourceColors[trend.source] || '#c5d8e4';

  return (
    <div
      className="trend-card"
      onClick={() => setExpanded(!expanded)}
      style={{ borderLeftColor: sourceColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-mono text-xs px-1 uppercase"
              style={{
                background: `${sourceColor}20`,
                border: `1px solid ${sourceColor}40`,
                color: sourceColor,
                fontSize: '9px',
                letterSpacing: '0.1em',
              }}
            >
              {trend.source}
            </span>
            <span
              className="font-mono text-xs"
              style={{ color: 'var(--color-amber)', fontSize: '10px' }}
            >
              ↑{trend.score}
            </span>
          </div>
          <div
            className="text-xs font-medium truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {trend.topic}
          </div>
        </div>

        <button
          className="btn-cyber success flex-shrink-0"
          style={{ padding: '3px 8px', fontSize: '10px' }}
          onClick={(e) => {
            e.stopPropagation();
            onUseHook(trend.suggestedHook);
          }}
        >
          USE
        </button>
      </div>

      {expanded && (
        <div
          className="mt-2 pt-2"
          style={{ borderTop: '1px solid rgba(0,245,255,0.06)' }}
        >
          <div
            className="text-xs mb-2 italic"
            style={{ color: 'var(--color-text-secondary)', lineHeight: '1.5' }}
          >
            &ldquo;{trend.suggestedHook}&rdquo;
          </div>
          <div className="flex flex-wrap gap-1">
            {trend.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-xs"
                style={{
                  background: 'rgba(0,245,255,0.04)',
                  border: '1px solid rgba(0,245,255,0.1)',
                  color: 'var(--color-text-muted)',
                  padding: '1px 4px',
                  fontSize: '10px',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrendScanner({ onHookSelected }: { onHookSelected?: (hook: string) => void }) {
  const { activeTone, trends, setTrends, isScanning, setIsScanning, addLog } = useDashboardStore();

  const handleScan = async () => {
    setIsScanning(true);
    addLog('action', `Starting trend scan with persona: ${activeTone}...`);

    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: activeTone }),
      });

      const data = await res.json();

      if (data.success && data.trends?.length > 0) {
        setTrends(data.trends);
        addLog('success', `Trend scan complete — ${data.trends.length} items from: ${data.meta?.sources?.join(', ')}`);
      } else {
        addLog('block', `Trend scan failed: ${data.error || 'No results'}`);
      }
    } catch (err) {
      addLog('block', `Trend scan error: ${err}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="panel panel-corner h-full flex flex-col">
      <div className="section-header flex-shrink-0 justify-between">
        <div className="flex items-center gap-2">
          <span className="section-title">Trend Scanner</span>
          {isScanning && <span className="status-dot active" />}
        </div>
        <button
          className="btn-cyber primary"
          style={{ padding: '4px 10px', fontSize: '10px' }}
          onClick={handleScan}
          disabled={isScanning}
        >
          {isScanning ? '⟳ SCANNING' : '⚡ SCAN'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isScanning && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--color-cyan)', borderTopColor: 'transparent' }}
            />
            <span className="font-mono text-xs neon-cyan">Scanning global sources...</span>
          </div>
        )}

        {!isScanning && trends.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-8 gap-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span className="text-2xl">📡</span>
            <span className="font-mono text-xs">No trends loaded. Click SCAN to begin.</span>
          </div>
        )}

        {trends.map((trend) => (
          <TrendCard
            key={trend.id}
            trend={trend}
            onUseHook={(hook) => onHookSelected?.(hook)}
          />
        ))}
      </div>
    </div>
  );
}
