'use client';

import { useState, useCallback } from 'react';
import { LiveTerminal } from '@/components/dashboard/LiveTerminal';
import { HealthMatrix } from '@/components/dashboard/HealthMatrix';
import { ScreenshotViewer } from '@/components/dashboard/ScreenshotViewer';
import { CommandCenter } from '@/components/dashboard/CommandCenter';
import { TrendScanner } from '@/components/intelligence/TrendScanner';
import { ContentGenerator } from '@/components/intelligence/ContentGenerator';
import { PersonaMatrix } from '@/components/intelligence/PersonaMatrix';
import { SessionVault } from '@/components/automation/SessionVault';
import { ManualOverdrive } from '@/components/automation/ManualOverdrive';
import { useDashboardStore } from '@/lib/store';

type ActivePanel = 'command' | 'intelligence' | 'session' | 'overdrive';

export default function Dashboard() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('command');
  const [selectedHook, setSelectedHook] = useState('');
  const { session, health, logs, trends, generatedContent } = useDashboardStore();

  const handleHookSelected = useCallback((hook: string) => {
    setSelectedHook(hook);
    setActivePanel('command');
  }, []);

  const navItems: Array<{ id: ActivePanel; label: string; icon: string }> = [
    { id: 'command', label: 'Command', icon: '⚡' },
    { id: 'intelligence', label: 'Intelligence', icon: '🧠' },
    { id: 'session', label: 'Session', icon: '🍪' },
    { id: 'overdrive', label: 'Overdrive', icon: '🔥' },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ height: '100vh', overflow: 'hidden' }}
    >
      {/* ── TOP NAVIGATION BAR ─────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{
          height: '48px',
          background: 'rgba(6,13,20,0.95)',
          borderBottom: '1px solid rgba(0,245,255,0.08)',
          backdropFilter: 'blur(10px)',
          zIndex: 50,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="logo-readsx">READSX</div>
          <div
            className="h-4 w-px"
            style={{ background: 'rgba(0,245,255,0.2)' }}
          />
          <span
            className="font-mono text-xs"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
          >
            SOVEREIGN AI COMMAND CENTER
          </span>
        </div>

        {/* Global status indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="status-dot"
              style={{
                background: session?.isActive ? 'var(--color-green)' : 'var(--color-red)',
                boxShadow: session?.isActive ? '0 0 6px var(--color-green)' : 'none',
              }}
            />
            <span
              className="font-mono text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              BROWSER
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="status-dot"
              style={{
                background: session?.isAuthenticated ? 'var(--color-cyan)' : 'var(--color-amber)',
                boxShadow: session?.isAuthenticated ? '0 0 6px var(--color-cyan)' : 'none',
              }}
            />
            <span
              className="font-mono text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {session?.isAuthenticated ? 'AUTH' : 'ANON'}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 px-2 py-1"
            style={{ background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.1)' }}
          >
            <span className="font-mono text-xs neon-cyan">
              CPU: {health?.cpu || 0}%
            </span>
            <span
              className="w-px h-3"
              style={{ background: 'rgba(0,245,255,0.2)' }}
            />
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              RAM: {health?.memory.percent || 0}%
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              LOGS:
            </span>
            <span className="font-mono text-xs neon-green">{logs.length}</span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ──────────────────────────────── */}
      <div className="flex-1 flex min-h-0" style={{ overflow: 'hidden' }}>
        {/* ── LEFT COLUMN (fixed sidebar) ─────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col"
          style={{
            width: '240px',
            borderRight: '1px solid rgba(0,245,255,0.07)',
            background: 'rgba(6,13,20,0.8)',
          }}
        >
          {/* Navigation */}
          <nav className="p-2 space-y-0.5 flex-shrink-0">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all"
                style={{
                  background: activePanel === item.id ? 'rgba(0,245,255,0.07)' : 'transparent',
                  borderLeft: `2px solid ${activePanel === item.id ? 'var(--color-cyan)' : 'transparent'}`,
                  color: activePanel === item.id ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <span>{item.icon}</span>
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: '11px', letterSpacing: '0.08em' }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          <div
            className="flex-shrink-0 mx-3 my-1"
            style={{ height: '1px', background: 'rgba(0,245,255,0.06)' }}
          />

          {/* Stats sidebar */}
          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
            <div
              className="font-mono text-xs uppercase mb-2"
              style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
            >
              Metrics
            </div>

            {[
              { label: 'Trends', value: trends.length, color: 'var(--color-cyan)' },
              { label: 'Generated', value: generatedContent.length, color: 'var(--color-green)' },
              { label: 'Events', value: logs.length, color: 'var(--color-amber)' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex justify-between items-center px-2 py-1.5"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(0,245,255,0.05)',
                }}
              >
                <span
                  className="font-mono text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {label}
                </span>
                <span className="font-mono text-sm font-bold" style={{ color }}>
                  {value}
                </span>
              </div>
            ))}

            {/* Recent generated content preview */}
            {generatedContent.length > 0 && (
              <div className="mt-3 space-y-1">
                <div
                  className="font-mono text-xs uppercase mb-1"
                  style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
                >
                  Recent
                </div>
                {generatedContent.slice(0, 2).map((c) => (
                  <div
                    key={c.id}
                    className="p-1.5 text-xs"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(0,245,255,0.05)',
                      color: 'var(--color-text-muted)',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {c.tweet}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER CONTENT ───────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0" style={{ overflow: 'hidden' }}>
          {/* Panel content */}
          <div
            className="flex-1 p-3 grid min-h-0"
            style={{
              overflow: 'hidden',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '8px',
            }}
          >
            {activePanel === 'command' && (
              <>
                <div style={{ gridColumn: '1', gridRow: '1 / 3' }}>
                  <CommandCenter />
                </div>
                <div style={{ gridColumn: '2', gridRow: '1' }}>
                  <PersonaMatrix />
                </div>
                <div style={{ gridColumn: '2', gridRow: '2' }}>
                  <HealthMatrix />
                </div>
              </>
            )}

            {activePanel === 'intelligence' && (
              <>
                <div style={{ gridColumn: '1', gridRow: '1 / 3' }}>
                  <TrendScanner onHookSelected={handleHookSelected} />
                </div>
                <div style={{ gridColumn: '2', gridRow: '1 / 3' }}>
                  <ContentGenerator initialTopic={selectedHook} />
                </div>
              </>
            )}

            {activePanel === 'session' && (
              <>
                <div style={{ gridColumn: '1', gridRow: '1' }}>
                  <SessionVault />
                </div>
                <div style={{ gridColumn: '2', gridRow: '1' }}>
                  <HealthMatrix />
                </div>
                <div style={{ gridColumn: '1 / 3', gridRow: '2' }}>
                  <ScreenshotViewer />
                </div>
              </>
            )}

            {activePanel === 'overdrive' && (
              <>
                <div style={{ gridColumn: '1', gridRow: '1 / 3' }}>
                  <ManualOverdrive />
                </div>
                <div style={{ gridColumn: '2', gridRow: '1 / 3' }}>
                  <ScreenshotViewer />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (Terminal) ──────────────────────── */}
        <div
          className="flex-shrink-0"
          style={{
            width: '380px',
            borderLeft: '1px solid rgba(0,245,255,0.07)',
          }}
        >
          <LiveTerminal />
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ──────────────────────────────── */}
      <footer
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{
          height: '28px',
          background: 'rgba(0,0,0,0.5)',
          borderTop: '1px solid rgba(0,245,255,0.06)',
        }}
      >
        <span className="font-mono text-xs neon-cyan">READSX v1.0.0</span>
        <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
          ZERO-FAILURE ABSOLUTE AUTONOMY
        </span>
        <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {new Date().toLocaleDateString()} {new Date().toTimeString().slice(0, 8)}
        </span>
      </footer>
    </div>
  );
}
