'use client';

import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/lib/store';
import type { HealthMetrics } from '@/types';

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const width = 60;
  const height = 24;

  const points = values
    .slice(-20)
    .map((v, i, arr) => {
      const x = (i / (arr.length - 1)) * width;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.8"
      />
      <polyline
        points={`0,${height} ${points} ${width},${height}`}
        fill={color}
        stroke="none"
        opacity="0.1"
      />
    </svg>
  );
}

function MetricBar({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const isHigh = pct > 80;
  const isMid = pct > 60;

  const barColor = isHigh
    ? 'var(--color-red)'
    : isMid
    ? 'var(--color-amber)'
    : color;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </span>
        <span className="font-mono text-xs font-bold" style={{ color: barColor }}>
          {value}
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>{unit}</span>
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
          }}
        />
      </div>
    </div>
  );
}

export function HealthMatrix() {
  const { health, setHealth } = useDashboardStore();
  const [cpuHistory, setCpuHistory] = useState<number[]>([0, 0, 0, 0, 0]);
  const [memHistory, setMemHistory] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data: HealthMetrics = await res.json();
          setHealth(data);
          setCpuHistory((prev) => [...prev.slice(-19), data.cpu]);
          setMemHistory((prev) => [...prev.slice(-19), data.memory.percent]);
        }
      } catch {}
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 3000);
    return () => clearInterval(interval);
  }, [setHealth]);

  function formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="panel panel-corner h-full flex flex-col">
      <div className="section-header flex-shrink-0 justify-between">
        <div className="flex items-center gap-2">
          <span className="section-title">Health Matrix</span>
        </div>
        <span className="font-mono text-xs neon-green">
          {health ? '● NOMINAL' : '○ POLLING'}
        </span>
      </div>

      <div className="flex-1 p-3 space-y-4 overflow-y-auto">
        {/* Uptime + Browser Status */}
        <div className="grid grid-cols-2 gap-2">
          <div className="metric-card">
            <div className="metric-value" style={{ fontSize: '16px' }}>
              {health ? formatUptime(health.uptime) : '--:--:--'}
            </div>
            <div className="metric-label">Uptime</div>
          </div>
          <div className="metric-card">
            <div
              className="metric-value"
              style={{
                fontSize: '13px',
                color: health?.browserConnected ? 'var(--color-green)' : 'var(--color-red)',
              }}
            >
              {health?.browserConnected ? '● ACTIVE' : '○ IDLE'}
            </div>
            <div className="metric-label">Browser</div>
          </div>
        </div>

        {/* CPU */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <MetricBar
              label="CPU"
              value={health?.cpu || 0}
              max={100}
              unit="%"
              color="var(--color-cyan)"
            />
          </div>
          <div className="flex justify-end">
            <MiniSparkline values={cpuHistory} color="var(--color-cyan)" />
          </div>
        </div>

        {/* Memory */}
        <div className="space-y-2">
          <MetricBar
            label="RAM"
            value={health?.memory.used || 0}
            max={health?.memory.total || 16384}
            unit="MB"
            color="var(--color-blue)"
          />
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {health?.memory.percent || 0}% of {health ? Math.round(health.memory.total / 1024) : 0}GB
            </span>
            <MiniSparkline values={memHistory} color="var(--color-blue)" />
          </div>
        </div>

        {/* Network */}
        <div className="space-y-1">
          <span
            className="font-mono text-xs uppercase"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
          >
            Network I/O
          </span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div
              className="flex items-center gap-2 p-2"
              style={{ background: 'var(--color-abyss)', border: '1px solid rgba(0,245,255,0.06)' }}
            >
              <span className="font-mono text-xs neon-green">↓</span>
              <span className="font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>
                {health?.network.rx || 0} KB/s
              </span>
            </div>
            <div
              className="flex items-center gap-2 p-2"
              style={{ background: 'var(--color-abyss)', border: '1px solid rgba(0,245,255,0.06)' }}
            >
              <span className="font-mono text-xs neon-amber">↑</span>
              <span className="font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>
                {health?.network.tx || 0} KB/s
              </span>
            </div>
          </div>
        </div>

        {/* Task Stats */}
        <div
          className="p-2 space-y-1"
          style={{
            background: 'var(--color-abyss)',
            border: '1px solid rgba(0,245,255,0.06)',
          }}
        >
          <span
            className="font-mono text-xs uppercase"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
          >
            Task Queue
          </span>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { label: 'QUEUED', value: health?.tasksQueued || 0, color: 'var(--color-cyan)' },
              { label: 'DONE', value: health?.tasksCompleted || 0, color: 'var(--color-green)' },
              { label: 'FAIL', value: health?.tasksFailed || 0, color: 'var(--color-red)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className="font-mono text-lg font-bold" style={{ color }}>
                  {value}
                </div>
                <div className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
