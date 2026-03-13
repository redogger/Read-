'use client';

import { useState } from 'react';
import { useDashboardStore } from '@/lib/store';

export function SessionVault() {
  const { session, setSessionActive, setSessionAuthenticated, addLog } = useDashboardStore();
  const [loading, setLoading] = useState(false);
  const [fingerprintKey, setFingerprintKey] = useState<'macbookProM3' | 'iphone15ProMax'>('macbookProM3');

  const handleInitSession = async () => {
    setLoading(true);
    addLog('action', `Initializing browser session with fingerprint: ${fingerprintKey}`);

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init', fingerprint: fingerprintKey }),
      });

      const data = await res.json();

      if (data.success) {
        setSessionActive(true);
        setSessionAuthenticated(data.authenticated || false);
        addLog('success', 'Browser session initialized successfully');
      } else {
        addLog('block', `Session init failed: ${data.error}`);
      }
    } catch (err) {
      addLog('block', `Session init error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSession = async () => {
    setLoading(true);
    addLog('action', 'Saving session to encrypted vault...');

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save' }),
      });

      const data = await res.json();

      if (data.success) {
        addLog('success', 'Session saved and encrypted to vault');
      } else {
        addLog('block', `Vault save failed: ${data.error}`);
      }
    } catch (err) {
      addLog('block', `Vault error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSession = async () => {
    setLoading(true);
    addLog('action', 'Loading session from vault...');

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load' }),
      });

      const data = await res.json();

      if (data.success) {
        setSessionActive(true);
        setSessionAuthenticated(true);
        addLog('success', 'Session restored from encrypted vault — bypassing login');
      } else {
        addLog('debounce', `No saved session found: ${data.error || 'vault empty'}`);
      }
    } catch (err) {
      addLog('block', `Load error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleHeartbeat = async () => {
    addLog('action', 'Running session heartbeat check...');

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'heartbeat' }),
      });

      const data = await res.json();
      const statusColors: Record<string, string> = {
        alive: 'success',
        needs_recovery: 'debounce',
        dead: 'block',
      };

      addLog(
        (statusColors[data.status] as 'success' | 'debounce' | 'block') || 'info',
        `Heartbeat: ${data.status?.toUpperCase()} ${data.message || ''}`
      );
    } catch (err) {
      addLog('block', `Heartbeat error: ${err}`);
    }
  };

  const handleClearSession = async () => {
    if (!confirm('Clear saved session vault? You will need to log in again.')) return;
    setLoading(true);
    addLog('action', 'Clearing session vault...');

    try {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });

      setSessionActive(false);
      setSessionAuthenticated(false);
      addLog('debounce', 'Session vault cleared');
    } catch (err) {
      addLog('block', `Clear error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = session?.isAuthenticated
    ? 'var(--color-green)'
    : session?.isActive
    ? 'var(--color-amber)'
    : 'var(--color-red)';

  const statusLabel = session?.isAuthenticated
    ? 'AUTHENTICATED'
    : session?.isActive
    ? 'ACTIVE'
    : 'OFFLINE';

  return (
    <div className="panel panel-corner h-full flex flex-col">
      <div className="section-header flex-shrink-0 justify-between">
        <span className="section-title">Session Vault</span>
        <span className="font-mono text-xs font-bold" style={{ color: statusColor }}>
          ● {statusLabel}
        </span>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* Fingerprint selector */}
        <div className="space-y-1">
          <div
            className="font-mono text-xs uppercase"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
          >
            Hardware Fingerprint
          </div>
          <div className="grid grid-cols-2 gap-1">
            {(['macbookProM3', 'iphone15ProMax'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFingerprintKey(key)}
                className="py-1.5 px-2 text-xs font-mono transition-all"
                style={{
                  background: fingerprintKey === key ? 'rgba(0,245,255,0.08)' : 'var(--color-abyss)',
                  border: `1px solid ${fingerprintKey === key ? 'rgba(0,245,255,0.35)' : 'rgba(0,245,255,0.07)'}`,
                  color: fingerprintKey === key ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                {key === 'macbookProM3' ? '💻 MacBook M3' : '📱 iPhone 15 Pro'}
              </button>
            ))}
          </div>
        </div>

        {/* Session info */}
        <div
          className="p-2 space-y-1"
          style={{ background: 'var(--color-abyss)', border: '1px solid rgba(0,245,255,0.06)' }}
        >
          <div className="flex justify-between">
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>Status</span>
            <span className="font-mono text-xs font-bold" style={{ color: statusColor }}>{statusLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>Fingerprint</span>
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {fingerprintKey === 'macbookProM3' ? 'MacBook Pro M3' : 'iPhone 15 Pro Max'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>Vault</span>
            <span className="font-mono text-xs neon-green">AES-256 ENC</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-1.5">
          <button className="btn-cyber primary w-full" onClick={handleInitSession} disabled={loading}>
            ⚡ INIT BROWSER
          </button>
          <div className="grid grid-cols-2 gap-1">
            <button className="btn-cyber success" onClick={handleSaveSession} disabled={loading}>
              💾 SAVE VAULT
            </button>
            <button className="btn-cyber" onClick={handleLoadSession} disabled={loading}>
              📂 LOAD VAULT
            </button>
          </div>
          <button className="btn-cyber w-full" onClick={handleHeartbeat} disabled={loading}
            style={{ borderColor: 'rgba(0,245,255,0.3)', color: 'var(--color-cyan)' }}>
            💓 HEARTBEAT CHECK
          </button>
          <button className="btn-cyber danger w-full" onClick={handleClearSession} disabled={loading}>
            🗑 CLEAR SESSION
          </button>
        </div>
      </div>
    </div>
  );
}
