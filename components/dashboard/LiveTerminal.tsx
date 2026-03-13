'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

// Color map for log levels
const LEVEL_COLORS = {
  action: '\x1b[38;2;77;184;255m',   // Blue
  success: '\x1b[38;2;0;255;136m',   // Green
  debounce: '\x1b[38;2;255;179;0m',  // Amber
  block: '\x1b[38;2;255;51;102m',    // Red
  info: '\x1b[38;2;197;216;228m',    // Ghost
  warn: '\x1b[38;2;255;179;0m',      // Amber
};

const LEVEL_LABELS = {
  action: ' ACT',
  success: ' SUC',
  debounce: ' DBN',
  block: ' BLK',
  info: ' INF',
  warn: ' WRN',
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

export function LiveTerminal() {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { logs, addLog, clearLogs } = useDashboardStore();
  const lastLogCount = useRef(0);
  const sseRef = useRef<EventSource | null>(null);

  // Initialize xterm
  useEffect(() => {
    if (!termRef.current || xtermRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#060d14',
        foreground: '#c5d8e4',
        cursor: '#00f5ff',
        cursorAccent: '#020408',
        selectionBackground: 'rgba(0,245,255,0.2)',
        black: '#020408',
        brightBlack: '#3a5568',
        white: '#c5d8e4',
        brightWhite: '#e8f4f8',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 12,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(termRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Boot sequence
    term.write(`\r\n${BOLD}\x1b[38;2;0;245;255m`);
    term.write(` ██████╗ ███████╗ █████╗ ██████╗ ███████╗██╗  ██╗\r\n`);
    term.write(` ██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝╚██╗██╔╝\r\n`);
    term.write(` ██████╔╝█████╗  ███████║██║  ██║███████╗ ╚███╔╝ \r\n`);
    term.write(` ██╔══██╗██╔══╝  ██╔══██║██║  ██║╚════██║ ██╔██╗ \r\n`);
    term.write(` ██║  ██║███████╗██║  ██║██████╔╝███████║██╔╝ ██╗\r\n`);
    term.write(` ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝\r\n`);
    term.write(`${RESET}\r\n`);
    term.write(`${DIM} SOVEREIGN AI COMMAND CENTER  //  v1.0.0${RESET}\r\n`);
    term.write(`${DIM} ─────────────────────────────────────────────${RESET}\r\n\r\n`);
    term.write(`\x1b[38;2;0;255;136m[SYSTEM]${RESET} Terminal initialized. Awaiting operations...\r\n`);

    // Resize observer
    const ro = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {}
    });
    ro.observe(termRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  // Connect SSE
  useEffect(() => {
    const es = new EventSource('/api/terminal');
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log') {
          addLog(data.level, data.message);
        }
      } catch {}
    };

    es.onerror = () => {
      // Reconnects automatically
    };

    return () => {
      es.close();
    };
  }, [addLog]);

  // Write new logs to terminal
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    const newLogs = logs.slice(0, logs.length - lastLogCount.current);
    if (newLogs.length === 0) return;

    newLogs.reverse().forEach((log) => {
      const color = LEVEL_COLORS[log.level] || LEVEL_COLORS.info;
      const label = LEVEL_LABELS[log.level] || ' INF';
      const ts = formatTimestamp(log.timestamp);

      term.write(
        `${DIM}${ts}${RESET} ${color}${BOLD}${label}${RESET} ${color}›${RESET} ${log.message}\r\n`
      );
    });

    lastLogCount.current = logs.length;
  }, [logs]);

  const handleClear = useCallback(() => {
    clearLogs();
    lastLogCount.current = 0;
    xtermRef.current?.clear();
  }, [clearLogs]);

  return (
    <div className="panel panel-corner h-full flex flex-col" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="section-header flex-shrink-0 justify-between">
        <div className="flex items-center gap-2">
          <span className="status-dot active" />
          <span className="section-title">Live Terminal</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-mono cursor-pointer"
            style={{ color: 'var(--color-text-muted)' }}
            onClick={handleClear}
          >
            [CLR]
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {logs.length} entries
          </span>
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={termRef}
        className="terminal-container flex-1 scanline-overlay"
        style={{
          background: 'var(--color-abyss)',
          minHeight: 0,
          overflow: 'hidden',
        }}
      />

      {/* Footer bar */}
      <div
        className="flex-shrink-0 px-3 py-1 flex items-center gap-4"
        style={{
          borderTop: '1px solid rgba(0,245,255,0.06)',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        <span className="font-mono text-xs neon-cyan">READSX://TERMINAL</span>
        <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
          SSE:{' '}
          <span className="neon-green">LIVE</span>
        </span>
      </div>
    </div>
  );
}
