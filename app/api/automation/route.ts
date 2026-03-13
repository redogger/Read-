// ============================================================
// READSX — Automation API Route
// POST /api/automation
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createStealthBrowser } from '@/lib/automation/stealth';
import { loadSession, applySavedSession } from '@/lib/automation/session';
import { executeTask } from '@/lib/automation/twitter';
import type { AutomationTask } from '@/types';
import { v4 as uuid } from 'uuid';

// In-memory browser instance (singleton for dev)
let browserInstance: Awaited<ReturnType<typeof createStealthBrowser>> | null = null;

async function getBrowserInstance() {
  if (!browserInstance) {
    browserInstance = await createStealthBrowser('macbookProM3');

    // Try to restore session
    const session = loadSession();
    if (session) {
      await applySavedSession(browserInstance.context, session);
    }
  }
  return browserInstance;
}

const logs: Array<{ level: string; message: string; timestamp: number }> = [];

function createLogCallback(taskId: string) {
  return (level: string, message: string) => {
    const entry = { level, message, timestamp: Date.now(), taskId };
    logs.unshift(entry);
    if (logs.length > 500) logs.pop();
    console.log(`[${level.toUpperCase()}] ${message}`);
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    if (!type) {
      return NextResponse.json({ error: 'Missing task type' }, { status: 400 });
    }

    const task: AutomationTask = {
      id: uuid(),
      type,
      status: 'running',
      payload: payload || {},
      startedAt: Date.now(),
      retries: 0,
    };

    const { context } = await getBrowserInstance();
    const log = createLogCallback(task.id);

    log('action', `Task started: ${type}`);
    const result = await executeTask(context, task, log);

    task.status = result.success ? 'success' : 'failed';
    task.completedAt = Date.now();
    task.error = result.error;

    return NextResponse.json({
      taskId: task.id,
      success: result.success,
      error: result.error,
      duration: task.completedAt - (task.startedAt || task.completedAt),
    });
  } catch (err) {
    console.error('[API/automation] Error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = parseInt(searchParams.get('since') || '0');

  const filtered = logs.filter((l) => l.timestamp > since);
  return NextResponse.json({ logs: filtered });
}
