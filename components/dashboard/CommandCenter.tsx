'use client';

import { useState } from 'react';
import { useDashboardStore } from '@/lib/store';

type ActionType = 'tweet' | 'reply' | 'like' | 'retweet' | 'follow' | 'scan';

const ACTION_CONFIGS: Record<
  ActionType,
  { label: string; icon: string; fields: Array<{ key: string; placeholder: string; type: 'text' | 'textarea' }> }
> = {
  tweet: {
    label: 'Post Tweet',
    icon: '✍️',
    fields: [{ key: 'text', placeholder: 'Tweet content (max 280 chars)...', type: 'textarea' }],
  },
  reply: {
    label: 'Reply to Tweet',
    icon: '↩️',
    fields: [
      { key: 'tweetUrl', placeholder: 'https://x.com/user/status/...', type: 'text' },
      { key: 'text', placeholder: 'Reply text...', type: 'textarea' },
    ],
  },
  like: {
    label: 'Like Tweet',
    icon: '❤️',
    fields: [{ key: 'tweetUrl', placeholder: 'https://x.com/user/status/...', type: 'text' }],
  },
  retweet: {
    label: 'Retweet',
    icon: '🔁',
    fields: [{ key: 'tweetUrl', placeholder: 'https://x.com/user/status/...', type: 'text' }],
  },
  follow: {
    label: 'Follow User',
    icon: '👤',
    fields: [{ key: 'username', placeholder: '@username (without @)', type: 'text' }],
  },
  scan: {
    label: 'Scan Timeline',
    icon: '🔍',
    fields: [{ key: 'limit', placeholder: 'Number of tweets (default: 10)', type: 'text' }],
  },
};

export function CommandCenter() {
  const { addLog, enqueueTask } = useDashboardStore();
  const [selectedAction, setSelectedAction] = useState<ActionType>('tweet');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const config = ACTION_CONFIGS[selectedAction];

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleExecute = async () => {
    setExecuting(true);
    setLastResult(null);

    const payload: Record<string, unknown> = {};
    for (const field of config.fields) {
      payload[field.key] = fieldValues[field.key] || '';
    }

    addLog('action', `Executing: ${config.label}`);

    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedAction, payload }),
      });

      const data = await res.json();

      if (data.success) {
        addLog('success', `${config.label} completed successfully`);
        setLastResult({ success: true, message: 'Operation completed successfully' });
      } else {
        addLog('block', `${config.label} failed: ${data.error}`);
        setLastResult({ success: false, message: data.error || 'Unknown error' });
      }
    } catch (err) {
      addLog('block', `${config.label} error: ${err}`);
      setLastResult({ success: false, message: String(err) });
    } finally {
      setExecuting(false);
    }
  };

  const handleQueue = () => {
    const payload: Record<string, unknown> = {};
    for (const field of config.fields) {
      payload[field.key] = fieldValues[field.key] || '';
    }
    enqueueTask({ type: selectedAction, payload });
    addLog('debounce', `${config.label} queued for execution`);
  };

  return (
    <div className="panel panel-corner h-full flex flex-col">
      <div className="section-header flex-shrink-0">
        <span className="section-title">Command Center</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Action Selector */}
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(ACTION_CONFIGS) as ActionType[]).map((action) => {
            const conf = ACTION_CONFIGS[action];
            const isSelected = selectedAction === action;
            return (
              <button
                key={action}
                onClick={() => { setSelectedAction(action); setLastResult(null); }}
                className="flex flex-col items-center gap-1 py-2 px-1 transition-all"
                style={{
                  background: isSelected ? 'rgba(0,245,255,0.08)' : 'var(--color-abyss)',
                  border: `1px solid ${isSelected ? 'rgba(0,245,255,0.35)' : 'rgba(0,245,255,0.07)'}`,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '16px' }}>{conf.icon}</span>
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.08em',
                    color: isSelected ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  }}
                >
                  {action}
                </span>
              </button>
            );
          })}
        </div>

        {/* Form Fields */}
        <div className="space-y-2">
          <div
            className="font-mono text-xs uppercase"
            style={{ color: 'var(--color-cyan)', letterSpacing: '0.1em' }}
          >
            {config.icon} {config.label}
          </div>

          {config.fields.map((field) => (
            <div key={field.key}>
              {field.type === 'textarea' ? (
                <textarea
                  className="input-cyber resize-none"
                  rows={3}
                  placeholder={field.placeholder}
                  value={fieldValues[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
              ) : (
                <input
                  className="input-cyber"
                  type="text"
                  placeholder={field.placeholder}
                  value={fieldValues[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-cyber"
            onClick={handleQueue}
            disabled={executing}
          >
            + QUEUE
          </button>
          <button
            className="btn-cyber primary"
            onClick={handleExecute}
            disabled={executing}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            {executing ? (
              <>
                <span className="w-3 h-3 border rounded-full animate-spin" style={{ borderColor: 'var(--color-cyan)', borderTopColor: 'transparent' }} />
                RUNNING
              </>
            ) : (
              '▶ EXECUTE NOW'
            )}
          </button>
        </div>

        {/* Result */}
        {lastResult && (
          <div
            className="p-2 font-mono text-xs"
            style={{
              background: 'var(--color-abyss)',
              border: `1px solid ${lastResult.success ? 'rgba(0,255,136,0.2)' : 'rgba(255,51,102,0.2)'}`,
              color: lastResult.success ? 'var(--color-green)' : 'var(--color-red)',
            }}
          >
            {lastResult.success ? '✓' : '✗'} {lastResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
