// ============================================================
// READSX — Session Vault
// Encrypted browser context persistence (Cookies + LocalStorage)
// ============================================================

import { BrowserContext } from 'playwright';
import CryptoJS from 'crypto-js';
import fs from 'fs';
import path from 'path';
import type { SessionState } from '@/types';
import { FINGERPRINTS } from './stealth';

const SESSION_FILE = path.join(process.cwd(), '.readsx', 'session.vault');
const ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || 'readsx-sovereign-key-2024';

// ── Encryption Helpers ────────────────────────────────────────

function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

function decrypt(data: string): string {
  const bytes = CryptoJS.AES.decrypt(data, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// ── Ensure vault directory ────────────────────────────────────

function ensureVaultDir() {
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Save Session ──────────────────────────────────────────────

export async function saveSession(context: BrowserContext): Promise<void> {
  ensureVaultDir();

  const storageState = await context.storageState();
  const serialized = JSON.stringify(storageState);
  const encrypted = encrypt(serialized);

  const session: SessionState = {
    isActive: true,
    isAuthenticated: true,
    cookiesEncrypted: encrypted,
    userAgent: FINGERPRINTS.macbookProM3.userAgent,
    fingerprint: FINGERPRINTS.macbookProM3,
    lastHeartbeat: Date.now(),
    recoveryAttempts: 0,
  };

  fs.writeFileSync(SESSION_FILE, JSON.stringify(session), 'utf8');
  console.log('[VAULT] Session saved and encrypted successfully');
}

// ── Load Session ──────────────────────────────────────────────

export function loadSession(): SessionState | null {
  ensureVaultDir();
  if (!fs.existsSync(SESSION_FILE)) return null;

  try {
    const raw = fs.readFileSync(SESSION_FILE, 'utf8');
    const session: SessionState = JSON.parse(raw);
    return session;
  } catch (err) {
    console.error('[VAULT] Failed to load session:', err);
    return null;
  }
}

// ── Apply Saved State to Context ─────────────────────────────

export async function applySavedSession(
  context: BrowserContext,
  session: SessionState
): Promise<boolean> {
  if (!session.cookiesEncrypted) return false;

  try {
    const decrypted = decrypt(session.cookiesEncrypted);
    const storageState = JSON.parse(decrypted);

    // Add cookies to context
    if (storageState.cookies?.length > 0) {
      await context.addCookies(storageState.cookies);
    }

    // Apply localStorage via page evaluate
    const page = await context.newPage();
    try {
      await page.goto('https://x.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (storageState.origins?.length > 0) {
        for (const origin of storageState.origins) {
          for (const { name, value } of origin.localStorage || []) {
            await page.evaluate(
              ([k, v]) => localStorage.setItem(k, v),
              [name, value]
            );
          }
        }
      }
    } finally {
      await page.close();
    }

    console.log('[VAULT] Session restored from vault');
    return true;
  } catch (err) {
    console.error('[VAULT] Failed to apply session:', err);
    return false;
  }
}

// ── Heartbeat Check ───────────────────────────────────────────

export async function sessionHeartbeat(page: import('playwright').Page): Promise<'alive' | 'needs_recovery' | 'dead'> {
  try {
    // Check for home feed indicator
    const homeIndicators = [
      '[data-testid="primaryColumn"]',
      '[aria-label="Home timeline"]',
      '[data-testid="AppTabBar_Home_Link"]',
    ];

    for (const selector of homeIndicators) {
      const el = await page.$(selector);
      if (el) {
        // Update heartbeat
        const session = loadSession();
        if (session) {
          session.lastHeartbeat = Date.now();
          ensureVaultDir();
          fs.writeFileSync(SESSION_FILE, JSON.stringify(session), 'utf8');
        }
        return 'alive';
      }
    }

    // Check if we're on a login page
    const loginIndicators = [
      '[data-testid="LoginForm"]',
      'input[name="text"][autocomplete="username"]',
    ];
    for (const selector of loginIndicators) {
      const el = await page.$(selector);
      if (el) return 'dead';
    }

    return 'needs_recovery';
  } catch {
    return 'dead';
  }
}

// ── Soft Recovery ─────────────────────────────────────────────

export async function softRecovery(page: import('playwright').Page): Promise<boolean> {
  try {
    console.log('[VAULT] Attempting soft recovery...');

    // Navigate to explore as fallback
    await page.goto('https://x.com/explore', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    await new Promise((r) => setTimeout(r, 2000));

    // Try home
    await page.goto('https://x.com/home', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    const status = await sessionHeartbeat(page);
    if (status === 'alive') {
      console.log('[VAULT] Soft recovery successful');
      return true;
    }

    return false;
  } catch (err) {
    console.error('[VAULT] Soft recovery failed:', err);
    return false;
  }
}

// ── Clear Session ─────────────────────────────────────────────

export function clearSession(): void {
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
    console.log('[VAULT] Session cleared');
  }
}

// ── Session Status ────────────────────────────────────────────

export function getSessionAge(): number | null {
  const session = loadSession();
  if (!session?.lastHeartbeat) return null;
  return Date.now() - session.lastHeartbeat;
}
