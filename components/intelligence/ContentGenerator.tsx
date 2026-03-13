'use client';

import { useState } from 'react';
import { useDashboardStore } from '@/lib/store';
import type { GeneratedContent } from '@/types';

type GenerateMode = 'tweet' | 'thread' | 'reply' | 'hooks';

export function ContentGenerator({ initialTopic = '' }: { initialTopic?: string }) {
  const { activeTone, addGeneratedContent, enqueueTask, addLog } = useDashboardStore();
  const [mode, setMode] = useState<GenerateMode>('tweet');
  const [topic, setTopic] = useState(initialTopic);
  const [tweetText, setTweetText] = useState('');
  const [context, setContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    tweet?: string;
    thread?: string[];
    hooks?: string[];
    reply?: string;
  } | null>(null);
  const [queued, setQueued] = useState(false);

  const handleGenerate = async () => {
    if (!topic && !tweetText) return;
    setGenerating(true);
    setResult(null);
    addLog('action', `Generating ${mode} with ${activeTone} persona...`);

    try {
      const body: Record<string, unknown> = {
        action: mode,
        tone: activeTone,
        topic: mode === 'reply' ? tweetText : topic,
        context,
        tweetText: mode === 'reply' ? tweetText : undefined,
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
        addLog('success', `${mode} generated successfully`);

        // Store to generated content
        if (mode === 'tweet' && data.content) {
          addGeneratedContent(data.content as GeneratedContent);
        }
      } else {
        addLog('block', `Generation failed: ${data.error}`);
      }
    } catch (err) {
      addLog('block', `Generation error: ${err}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleQueueTweet = (text: string) => {
    enqueueTask({ type: 'tweet', payload: { text } });
    setQueued(true);
    addLog('action', `Tweet queued for posting`);
    setTimeout(() => setQueued(false), 2000);
  };

  const modes: GenerateMode[] = ['tweet', 'thread', 'reply', 'hooks'];

  return (
    <div className="panel panel-corner h-full flex flex-col">
      <div className="section-header flex-shrink-0">
        <span className="section-title">Content Generator</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Mode Selector */}
        <div className="flex gap-1">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-1 font-mono uppercase text-xs transition-all"
              style={{
                background: mode === m ? 'rgba(0,245,255,0.12)' : 'transparent',
                border: `1px solid ${mode === m ? 'rgba(0,245,255,0.4)' : 'rgba(0,245,255,0.08)'}`,
                color: mode === m ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Input */}
        {mode === 'reply' ? (
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>
              Tweet to Reply to
            </label>
            <textarea
              className="input-cyber resize-none"
              rows={3}
              placeholder="Paste the tweet text here..."
              value={tweetText}
              onChange={(e) => setTweetText(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>
              {mode === 'hooks' ? 'Content / Article' : 'Topic'}
            </label>
            <textarea
              className="input-cyber resize-none"
              rows={mode === 'hooks' ? 4 : 2}
              placeholder={mode === 'hooks' ? 'Paste content to extract hooks from...' : 'Enter topic or trend...'}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        )}

        {mode === 'tweet' && (
          <div className="space-y-1">
            <label className="font-mono text-xs uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>
              Additional Context (optional)
            </label>
            <input
              className="input-cyber"
              placeholder="Add context or angle..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
        )}

        {/* Generate Button */}
        <button
          className="btn-cyber primary w-full"
          onClick={handleGenerate}
          disabled={generating}
          style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {generating ? (
            <>
              <span
                className="w-3 h-3 border rounded-full animate-spin"
                style={{ borderColor: 'var(--color-cyan)', borderTopColor: 'transparent' }}
              />
              GENERATING...
            </>
          ) : (
            `⚡ GENERATE ${mode.toUpperCase()}`
          )}
        </button>

        {/* Result Display */}
        {result && (
          <div
            className="space-y-2 p-3"
            style={{ background: 'var(--color-abyss)', border: '1px solid rgba(0,245,255,0.12)' }}
          >
            {/* Single Tweet */}
            {result.tweet && (
              <div className="space-y-2">
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {result.tweet}
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-xs"
                    style={{ color: result.tweet.length > 260 ? 'var(--color-red)' : 'var(--color-text-muted)' }}
                  >
                    {result.tweet.length}/280
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="btn-cyber"
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                      onClick={() => navigator.clipboard.writeText(result.tweet!)}
                    >
                      COPY
                    </button>
                    <button
                      className={`btn-cyber ${queued ? '' : 'success'}`}
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                      onClick={() => handleQueueTweet(result.tweet!)}
                    >
                      {queued ? '✓ QUEUED' : 'POST'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Thread */}
            {result.thread && (
              <div className="space-y-2">
                {result.thread.map((tweet, i) => (
                  <div
                    key={i}
                    className="p-2"
                    style={{
                      background: 'rgba(0,245,255,0.03)',
                      borderLeft: '2px solid rgba(0,245,255,0.3)',
                    }}
                  >
                    <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                      {tweet}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {i + 1}/{result.thread!.length}
                      </span>
                      <span className="font-mono text-xs" style={{ color: tweet.length > 260 ? 'var(--color-red)' : 'var(--color-text-muted)' }}>
                        {tweet.length}/280
                      </span>
                    </div>
                  </div>
                ))}
                <button
                  className="btn-cyber success w-full"
                  style={{ padding: '4px', fontSize: '10px' }}
                  onClick={() => {
                    result.thread?.forEach((t) => handleQueueTweet(t));
                  }}
                >
                  QUEUE THREAD ({result.thread.length} tweets)
                </button>
              </div>
            )}

            {/* Hooks */}
            {result.hooks && (
              <div className="space-y-2">
                {result.hooks.map((hook, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 p-2"
                    style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.08)' }}
                  >
                    <span className="text-xs" style={{ color: 'var(--color-text-primary)', lineHeight: '1.5' }}>
                      {hook}
                    </span>
                    <button
                      className="btn-cyber flex-shrink-0"
                      style={{ padding: '2px 6px', fontSize: '9px' }}
                      onClick={() => {
                        setTopic(hook);
                        setMode('tweet');
                      }}
                    >
                      USE
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Reply */}
            {result.reply && (
              <div className="space-y-2">
                <div className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                  {result.reply}
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-cyber"
                    style={{ padding: '3px 8px', fontSize: '10px' }}
                    onClick={() => navigator.clipboard.writeText(result.reply!)}
                  >
                    COPY
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
