'use client';

import { useDashboardStore } from '@/lib/store';
import { PERSONAS } from '@/lib/intelligence/gemini';
import type { PersonaTone } from '@/types';

export function PersonaMatrix() {
  const { activeTone, setTone } = useDashboardStore();

  const tones: PersonaTone[] = ['witty', 'professional', 'techguru'];

  return (
    <div className="panel panel-corner h-full flex flex-col">
      <div className="section-header flex-shrink-0">
        <span className="section-title">Persona Matrix</span>
      </div>

      <div className="flex-1 p-3 space-y-2">
        {tones.map((tone) => {
          const persona = PERSONAS[tone];
          const isActive = activeTone === tone;

          return (
            <button
              key={tone}
              onClick={() => setTone(tone)}
              className="w-full text-left p-3 transition-all duration-200"
              style={{
                background: isActive ? 'rgba(0,245,255,0.06)' : 'var(--color-abyss)',
                border: `1px solid ${isActive ? 'rgba(0,245,255,0.3)' : 'rgba(0,245,255,0.06)'}`,
                boxShadow: isActive ? 'var(--glow-cyan)' : 'none',
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: '16px' }}>{persona.icon}</span>
                <span
                  className="font-mono text-xs font-bold uppercase"
                  style={{
                    color: isActive ? 'var(--color-cyan)' : 'var(--color-text-secondary)',
                    letterSpacing: '0.08em',
                  }}
                >
                  {persona.label}
                </span>
                {isActive && (
                  <span
                    className="ml-auto font-mono text-xs neon-green"
                    style={{ fontSize: '10px' }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>
              <div
                className="text-xs"
                style={{ color: 'var(--color-text-muted)', lineHeight: '1.4' }}
              >
                {persona.description}
              </div>
              {isActive && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {persona.hashtagStyle.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-xs px-1"
                      style={{
                        background: 'rgba(0,245,255,0.08)',
                        border: '1px solid rgba(0,245,255,0.15)',
                        color: 'var(--color-cyan)',
                        fontSize: '10px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
