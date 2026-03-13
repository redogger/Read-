'use client';

import { useState, useRef } from 'react';
import { useDashboardStore } from '@/lib/store';

const PRESET_COMMANDS = [
  { label: 'Reload Page', code: 'window.location.reload()' },
  { label: 'Go Home', code: "window.location.href = 'https://x.com/home'" },
  { label: 'Go Explore', code: "window.location.href = 'https://x.com/explore'" },
  { label: 'Get URL', code: 'window.location.href' },
  { label: 'Scroll Top', code: 'window.scrollTo({top: 0, behavior: "smooth"})' },
  { label: 'Get Title', code: 'document.title' },
  { label: 'Count Tweets', code: 'document.querySelectorAll(\'[data-testid="tweet"]\').length' },
  { label: 'Clear Notifs', code: 'document.querySelectorAll(\'[aria-label*="notification"]\').forEach(el => el.click())' },
];

export function ManualOverdrive() {
  const { addLog } = useDashboardStore();
  const [code, setCode] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const handleExecute = async () => {
    if (!code.trim()) return;
    setExecuting(true);
    setOutput(null);
    addLog('action', `Manual overdrive: ${code.slice(0, 60)}...`);

    // Save to history
    historyRef.current.unshift(code);
    historyIndexRef.current = -1;

    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'eval',
          payload: { code },
        }),
      });

      const data = await res.json();
      const result = data.result !== undefined ? JSON.stringify(data.result, null, 2) : data.error || 'null';
      setOutput(result);
      addLog(data.success ? 'success' : 'block', `Overdrive result: ${result.slice(0, 100)}`);
    } catch (err) {
      setOutput(`Error: ${err}`);
      addLog('block', `Overdrive error: ${err}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleExecute();
    }

    // History navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.min(historyIndexRef.current + 1, historyRef.current.length - 1);
      historyIndexRef.current = newIndex;
      if (historyRef.current[newIndex]) setCode(historyRef.current[newIndex]);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.max(historyIndexRef.current - 1, -1);
      historyIndexRef.current = newIndex;
      setCode(newIndex === -1 ? '' : historyRef.current[newIndex] || '');
    }
  };

  return (
    <div className="panel panel-corner h-full flex flex-col">
      <div className="section-header flex-shrink-0 justify-between">
        <div className="flex items-center gap-2">
          <span className="section-title">Manual Overdrive</span>
        </div>
        <span className="font-mono text-xs neon-red">⚠ DIRECT INJECTION</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Presets */}
        <div>
          <div
            className="font-mono text-xs uppercase mb-2"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
          >
            Quick Commands
          </div>
          <div className="grid grid-cols-2 gap-1">
            {PRESET_COMMANDS.map((cmd) => (
              <button
                key={cmd.label}
                className="text-left px-2 py-1.5 text-xs transition-all"
                style={{
                  background: 'var(--color-abyss)',
                  border: '1px solid rgba(0,245,255,0.08)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontFamily: '"DM Sans", sans-serif',
                }}
                onClick={() => setCode(cmd.code)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,245,255,0.25)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,245,255,0.03)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,245,255,0.08)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-abyss)';
                }}
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code Input */}
        <div className="space-y-1">
          <div
            className="font-mono text-xs uppercase"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
          >
            JS Console <span style={{ color: 'var(--color-text-dim)' }}>(Ctrl+Enter to execute)</span>
          </div>
          <textarea
            className="input-cyber resize-none font-mono"
            rows={4}
            style={{ fontSize: '12px' }}
            placeholder="// Enter JavaScript to execute in browser context..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
          />
        </div>

        <button
          className="btn-cyber danger w-full"
          onClick={handleExecute}
          disabled={executing}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          {executing ? (
            <>
              <span className="w-3 h-3 border rounded-full animate-spin" style={{ borderColor: 'var(--color-red)', borderTopColor: 'transparent' }} />
              EXECUTING...
            </>
          ) : (
            '⚡ EXECUTE IN BROWSER'
          )}
        </button>

        {/* Output */}
        {output && (
          <div
            className="p-2"
            style={{
              background: 'var(--color-abyss)',
              border: '1px solid rgba(0,245,255,0.1)',
              borderLeft: '2px solid var(--color-cyan)',
            }}
          >
            <div
              className="font-mono text-xs uppercase mb-1"
              style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
            >
              Output
            </div>
            <pre
              className="text-xs overflow-x-auto whitespace-pre-wrap"
              style={{ color: 'var(--color-green)', fontFamily: '"JetBrains Mono", monospace', maxHeight: '100px' }}
            >
              {output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
