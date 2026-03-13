// ============================================================
// READSX — Session Management API
// POST /api/session
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createStealthBrowser } from '@/lib/automation/stealth';
import {
  saveSession,
  loadSession,
  applySavedSession,
  sessionHeartbeat,
  softRecovery,
  clearSession,
} from '@/lib/automation/session';

// Browser singleton
let browserInstance: Awaited<ReturnType<typeof createStealthBrowser>> | null = null;

async function getOrCreateBrowser(fingerprint = 'macbookProM3') {
  if (!browserInstance) {
    browserInstance = await createStealthBrowser(
      fingerprint as 'macbookProM3' | 'iphone15ProMax'
    );
  }
  return browserInstance;
}

export async function POST(req: NextRequest) {
  try {
    const { action, fingerprint = 'macbookProM3' } = await req.json();

    switch (action) {
      case 'init': {
        const { context } = await getOrCreateBrowser(fingerprint);

        // Try to restore saved session
        const savedSession = loadSession();
        let authenticated = false;

        if (savedSession) {
          authenticated = await applySavedSession(context, savedSession);
        }

        if (!authenticated) {
          // Open login page
          const page = await context.newPage();
          await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded' });
          await page.close();
        }

        return NextResponse.json({ success: true, authenticated });
      }

      case 'save': {
        if (!browserInstance) {
          return NextResponse.json({ success: false, error: 'No active browser session' });
        }
        await saveSession(browserInstance.context);
        return NextResponse.json({ success: true });
      }

      case 'load': {
        const session = loadSession();
        if (!session) {
          return NextResponse.json({ success: false, error: 'No saved session found' });
        }

        const { context } = await getOrCreateBrowser(fingerprint);
        const applied = await applySavedSession(context, session);

        return NextResponse.json({ success: applied });
      }

      case 'heartbeat': {
        if (!browserInstance) {
          return NextResponse.json({ status: 'dead', message: 'No browser instance' });
        }

        const pages = browserInstance.context.pages();
        const page = pages[0] || (await browserInstance.context.newPage());

        if (pages.length === 0) {
          await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
        }

        const status = await sessionHeartbeat(page);

        if (status === 'needs_recovery') {
          const recovered = await softRecovery(page);
          return NextResponse.json({
            status: recovered ? 'alive' : 'dead',
            message: recovered ? 'Soft recovery successful' : 'Recovery failed',
          });
        }

        return NextResponse.json({ status, message: '' });
      }

      case 'clear': {
        clearSession();
        if (browserInstance) {
          try {
            await browserInstance.browser.close();
          } catch {}
          browserInstance = null;
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('[SESSION API] Error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
