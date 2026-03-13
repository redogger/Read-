// ============================================================
// READSX — Stealth Browser Engine
// Anti-detection fingerprint injection + human emulation
// ============================================================

import { BrowserContext, Page, chromium } from 'playwright';
import type { BrowserFingerprint } from '@/types';

// ── Hardware Fingerprint Presets ──────────────────────────────

export const FINGERPRINTS: Record<string, BrowserFingerprint> = {
  iphone15ProMax: {
    platform: 'iPhone',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    screenWidth: 430,
    screenHeight: 932,
    colorDepth: 32,
    pixelRatio: 3,
    timezone: 'America/New_York',
    language: 'en-US',
    languages: ['en-US', 'en'],
    webglVendor: 'Apple Inc.',
    webglRenderer: 'Apple GPU',
    audioContextFingerprint: '35.73833402246427',
    canvasNoise: 0.000012,
    hardwareConcurrency: 6,
    deviceMemory: 6,
    touchPoints: 5,
  },
  macbookProM3: {
    platform: 'MacIntel',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    screenWidth: 1512,
    screenHeight: 982,
    colorDepth: 30,
    pixelRatio: 2,
    timezone: 'America/New_York',
    language: 'en-US',
    languages: ['en-US', 'en'],
    webglVendor: 'Google Inc. (Apple)',
    webglRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)',
    audioContextFingerprint: '124.04345808873768',
    canvasNoise: 0.000009,
    hardwareConcurrency: 12,
    deviceMemory: 8,
    touchPoints: 0,
  },
};

// ── Human Timing Utilities ────────────────────────────────────

export const humanDelay = (min = 1500, max = 4500): Promise<void> =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

export const typingDelay = (min = 150, max = 400): Promise<void> =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

export const microDelay = (min = 80, max = 250): Promise<void> =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

// ── Bezier Curve Mouse Path ───────────────────────────────────

interface Point { x: number; y: number }

function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

export async function humanMouseMove(page: Page, from: Point, to: Point, steps = 25) {
  const ctrl1: Point = {
    x: from.x + (Math.random() - 0.5) * 100,
    y: from.y + (Math.random() - 0.5) * 100,
  };
  const ctrl2: Point = {
    x: to.x + (Math.random() - 0.5) * 100,
    y: to.y + (Math.random() - 0.5) * 100,
  };

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = cubicBezier(from, ctrl1, ctrl2, to, t);
    await page.mouse.move(point.x, point.y);
    await new Promise((r) => setTimeout(r, 8 + Math.random() * 12));
  }
}

// ── Native Click (anti-detection) ────────────────────────────

export async function nativeClick(page: Page, selector: string) {
  await page.waitForSelector(selector, { timeout: 8000 });
  const element = await page.$(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);

  const box = await element.boundingBox();
  if (!box) throw new Error(`No bounding box for: ${selector}`);

  // Move mouse naturally first
  const center: Point = {
    x: box.x + box.width / 2 + (Math.random() - 0.5) * 4,
    y: box.y + box.height / 2 + (Math.random() - 0.5) * 4,
  };

  const currentPos = { x: Math.random() * 400, y: Math.random() * 300 };
  await humanMouseMove(page, currentPos, center);
  await microDelay();

  // Use dispatchEvent for stealth click
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
  }, selector);
}

// ── Human Typing ─────────────────────────────────────────────

export async function humanType(page: Page, selector: string, text: string) {
  await nativeClick(page, selector);
  await microDelay(200, 400);

  // Simulate occasional typos + backspace correction
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // 3% chance of typo
    if (Math.random() < 0.03 && i > 0) {
      const typoChar = String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
      await page.keyboard.press(typoChar);
      await typingDelay(200, 500);
      await page.keyboard.press('Backspace');
      await typingDelay(150, 300);
    }

    await page.keyboard.type(char);
    await typingDelay();
  }
}

// ── Fingerprint Injection Script ─────────────────────────────

export function buildFingerprintScript(fp: BrowserFingerprint): string {
  return `
    (() => {
      // Override Navigator properties
      Object.defineProperties(navigator, {
        platform: { get: () => '${fp.platform}', enumerable: true },
        hardwareConcurrency: { get: () => ${fp.hardwareConcurrency}, enumerable: true },
        deviceMemory: { get: () => ${fp.deviceMemory}, enumerable: true },
        maxTouchPoints: { get: () => ${fp.touchPoints}, enumerable: true },
        language: { get: () => '${fp.language}', enumerable: true },
        languages: { get: () => ${JSON.stringify(fp.languages)}, enumerable: true },
      });

      // Override Screen
      Object.defineProperties(screen, {
        width: { get: () => ${fp.screenWidth}, enumerable: true },
        height: { get: () => ${fp.screenHeight}, enumerable: true },
        colorDepth: { get: () => ${fp.colorDepth}, enumerable: true },
      });

      // Override devicePixelRatio
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => ${fp.pixelRatio},
        enumerable: true,
      });

      // WebGL Fingerprint Spoofing
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return '${fp.webglVendor}';
        if (parameter === 37446) return '${fp.webglRenderer}';
        return getParameter.call(this, parameter);
      };

      // Canvas Noise Injection
      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        const result = origToDataURL.call(this, type);
        const noise = ${fp.canvasNoise};
        const noiseStr = (Math.random() * noise).toString(36).slice(2, 8);
        return result.slice(0, -4) + noiseStr + result.slice(-4);
      };

      // AudioContext Fingerprint Noise
      const origGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function() {
        const arr = origGetChannelData.apply(this, arguments);
        for (let i = 0; i < arr.length; i += 100) {
          arr[i] += (Math.random() - 0.5) * 0.0001;
        }
        return arr;
      };

      // Timezone spoof
      const origDateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(locale, options = {}) {
        if (!options.timeZone) options.timeZone = '${fp.timezone}';
        return new origDateTimeFormat(locale, options);
      };
      Intl.DateTimeFormat.prototype = origDateTimeFormat.prototype;

      // Remove webdriver traces
      delete navigator.__proto__.webdriver;
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

      // Permissions API spoof
      if (navigator.permissions) {
        const origQuery = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (params) => {
          if (params.name === 'notifications') {
            return Promise.resolve({ state: 'prompt', onchange: null });
          }
          return origQuery(params);
        };
      }

      // Plugin spoof (mimic real browser)
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 1 },
            { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: '', length: 1 },
          ];
        }
      });
    })();
  `;
}

// ── Browser Factory ───────────────────────────────────────────

export async function createStealthBrowser(
  fingerprintKey: keyof typeof FINGERPRINTS = 'macbookProM3'
): Promise<{ browser: import('playwright').Browser; context: BrowserContext }> {
  const fp = FINGERPRINTS[fingerprintKey];

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--disable-site-isolation-trials',
      '--no-first-run',
      '--no-default-browser-check',
      `--window-size=${fp.screenWidth},${fp.screenHeight}`,
    ],
  });

  const context = await browser.newContext({
    userAgent: fp.userAgent,
    locale: fp.language,
    timezoneId: fp.timezone,
    viewport: { width: fp.screenWidth, height: fp.screenHeight },
    deviceScaleFactor: fp.pixelRatio,
    hasTouch: fp.touchPoints > 0,
    permissions: ['geolocation', 'notifications'],
    extraHTTPHeaders: {
      'Accept-Language': `${fp.language},en;q=0.9`,
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': fp.touchPoints > 0 ? '?1' : '?0',
      'sec-ch-ua-platform': `"${fp.platform === 'iPhone' ? 'iOS' : 'macOS'}"`,
    },
  });

  // Inject fingerprint script on every new page
  await context.addInitScript(buildFingerprintScript(fp));

  return { browser, context };
}

// ── Random Scroll Behavior ────────────────────────────────────

export async function humanScroll(page: Page, direction: 'down' | 'up' = 'down') {
  const scrollAmount = (Math.random() * 400 + 100) * (direction === 'up' ? -1 : 1);
  await page.evaluate((amount) => {
    window.scrollBy({ top: amount, behavior: 'smooth' });
  }, scrollAmount);
  await humanDelay(800, 2000);
}

// ── Smart Selector Retry ──────────────────────────────────────

export async function robustSelector(
  page: Page,
  selectors: string[],
  timeout = 5000
): Promise<string | null> {
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout });
      const el = await page.$(selector);
      if (el) return selector;
    } catch {
      continue;
    }
  }
  return null;
}
