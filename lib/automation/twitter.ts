// ============================================================
// READSX — Twitter / X Automation Engine
// All major actions with stealth human-emulation protocols
// ============================================================

import { Page, BrowserContext } from 'playwright';
import {
  nativeClick,
  humanType,
  humanDelay,
  microDelay,
  humanScroll,
  robustSelector,
} from './stealth';
import { sessionHeartbeat, softRecovery, saveSession } from './session';
import type { AutomationTask } from '@/types';

// ── Broadcast log helper (SSE) ────────────────────────────────

type LogCallback = (level: string, msg: string) => void;

// ── Tweet Composer ────────────────────────────────────────────

export async function composeTweet(
  page: Page,
  text: string,
  log: LogCallback
): Promise<boolean> {
  try {
    log('action', `Composing tweet (${text.length} chars)...`);

    // Navigate to home if not there
    const url = page.url();
    if (!url.includes('x.com/home') && !url.includes('twitter.com/home')) {
      await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
      await humanDelay(2000, 3500);
    }

    // Find compose box
    const composeSelectors = [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="tweetButton"]',
      '[placeholder="What is happening?!"]',
      'div[role="textbox"][aria-label="Tweet text"]',
    ];

    const composeSelector = await robustSelector(page, composeSelectors, 8000);
    if (!composeSelector) {
      log('block', 'Could not find compose area');
      return false;
    }

    await nativeClick(page, composeSelector);
    await microDelay(300, 600);

    // Type the tweet with human simulation
    await humanType(page, composeSelector, text);
    log('debounce', 'Tweet typed, waiting before post...');
    await humanDelay(2000, 4000);

    // Click post button
    const postSelectors = [
      '[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      'button[data-testid="tweetButtonInline"]',
    ];

    const postSelector = await robustSelector(page, postSelectors, 5000);
    if (!postSelector) {
      log('block', 'Could not find post button');
      return false;
    }

    await nativeClick(page, postSelector);
    await humanDelay(1500, 2500);

    log('success', `Tweet posted successfully`);
    return true;
  } catch (err) {
    log('block', `Tweet failed: ${err}`);
    return false;
  }
}

// ── Reply to Tweet ────────────────────────────────────────────

export async function replyToTweet(
  page: Page,
  tweetUrl: string,
  replyText: string,
  log: LogCallback
): Promise<boolean> {
  try {
    log('action', `Navigating to tweet: ${tweetUrl}`);
    await page.goto(tweetUrl, { waitUntil: 'domcontentloaded' });
    await humanDelay(2500, 4000);

    // Scroll a bit to simulate reading
    await humanScroll(page, 'down');
    await humanDelay(1500, 3000);

    // Find reply button
    const replyButtonSelectors = [
      '[data-testid="reply"]',
      'button[aria-label*="Reply"]',
      '[aria-label*="Reply to"]',
    ];

    const replyBtn = await robustSelector(page, replyButtonSelectors, 8000);
    if (!replyBtn) {
      log('block', 'Reply button not found');
      return false;
    }

    log('action', 'Opening reply composer...');
    await nativeClick(page, replyBtn);
    await humanDelay(1000, 2000);

    // Find reply text area
    const replyTextareaSelectors = [
      '[data-testid="tweetTextarea_0"]',
      'div[role="textbox"][data-testid*="tweetTextarea"]',
    ];

    const textArea = await robustSelector(page, replyTextareaSelectors, 5000);
    if (!textArea) {
      log('block', 'Reply textarea not found');
      return false;
    }

    await humanType(page, textArea, replyText);
    log('debounce', 'Reply typed, pausing before submission...');
    await humanDelay(2500, 4500);

    // Submit reply
    const submitSelectors = [
      '[data-testid="tweetButton"]',
      'button[data-testid="tweetButtonInline"]',
    ];

    const submitBtn = await robustSelector(page, submitSelectors, 5000);
    if (!submitBtn) {
      log('block', 'Submit button not found');
      return false;
    }

    await nativeClick(page, submitBtn);
    await humanDelay(1500, 2500);

    log('success', 'Reply posted successfully');
    return true;
  } catch (err) {
    log('block', `Reply failed: ${err}`);
    return false;
  }
}

// ── Like Tweet ────────────────────────────────────────────────

export async function likeTweet(
  page: Page,
  tweetUrl: string,
  log: LogCallback
): Promise<boolean> {
  try {
    log('action', `Liking tweet: ${tweetUrl}`);
    await page.goto(tweetUrl, { waitUntil: 'domcontentloaded' });
    await humanDelay(2000, 4000);
    await humanScroll(page, 'down');
    await humanDelay(1000, 2500);

    const likeSelectors = [
      '[data-testid="like"]',
      'button[aria-label*="Like"]',
    ];

    const likeBtn = await robustSelector(page, likeSelectors, 5000);
    if (!likeBtn) {
      log('block', 'Like button not found');
      return false;
    }

    await nativeClick(page, likeBtn);
    await humanDelay(800, 1500);

    log('success', 'Tweet liked');
    return true;
  } catch (err) {
    log('block', `Like failed: ${err}`);
    return false;
  }
}

// ── Retweet ───────────────────────────────────────────────────

export async function retweetPost(
  page: Page,
  tweetUrl: string,
  log: LogCallback
): Promise<boolean> {
  try {
    log('action', `Retweeting: ${tweetUrl}`);
    await page.goto(tweetUrl, { waitUntil: 'domcontentloaded' });
    await humanDelay(2000, 3500);

    const rtSelectors = [
      '[data-testid="retweet"]',
      'button[aria-label*="Repost"]',
      'button[aria-label*="Retweet"]',
    ];

    const rtBtn = await robustSelector(page, rtSelectors, 5000);
    if (!rtBtn) {
      log('block', 'Retweet button not found');
      return false;
    }

    await nativeClick(page, rtBtn);
    await humanDelay(500, 1000);

    // Confirm retweet menu
    const confirmSelectors = [
      '[data-testid="retweetConfirm"]',
      'div[role="menuitem"]:has-text("Repost")',
      'span:has-text("Repost")',
    ];

    const confirmBtn = await robustSelector(page, confirmSelectors, 3000);
    if (confirmBtn) {
      await nativeClick(page, confirmBtn);
      await humanDelay(800, 1500);
    }

    log('success', 'Retweeted successfully');
    return true;
  } catch (err) {
    log('block', `Retweet failed: ${err}`);
    return false;
  }
}

// ── Follow User ───────────────────────────────────────────────

export async function followUser(
  page: Page,
  username: string,
  log: LogCallback
): Promise<boolean> {
  try {
    log('action', `Navigating to @${username}...`);
    await page.goto(`https://x.com/${username}`, { waitUntil: 'domcontentloaded' });
    await humanDelay(2000, 4000);
    await humanScroll(page, 'down');
    await humanDelay(1000, 2000);

    const followSelectors = [
      `[data-testid="followButton"]`,
      `button[aria-label*="Follow @${username}"]`,
      `div[data-testid*="UserCell"] button`,
    ];

    const followBtn = await robustSelector(page, followSelectors, 5000);
    if (!followBtn) {
      log('block', `Follow button not found for @${username}`);
      return false;
    }

    await nativeClick(page, followBtn);
    await humanDelay(1000, 2000);

    log('success', `Now following @${username}`);
    return true;
  } catch (err) {
    log('block', `Follow failed: ${err}`);
    return false;
  }
}

// ── Scan Timeline ─────────────────────────────────────────────

export interface TimelineTweet {
  text: string;
  author: string;
  url: string;
  likes: string;
  retweets: string;
  imageUrls: string[];
}

export async function scanTimeline(
  page: Page,
  maxTweets = 10,
  log: LogCallback
): Promise<TimelineTweet[]> {
  const tweets: TimelineTweet[] = [];

  try {
    log('action', `Scanning timeline for ${maxTweets} tweets...`);
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
    await humanDelay(2000, 3500);

    // Scroll and collect
    for (let i = 0; i < Math.ceil(maxTweets / 3); i++) {
      await humanScroll(page, 'down');
      await humanDelay(1500, 3000);
    }

    const tweetData = await page.evaluate(() => {
      const tweetEls = document.querySelectorAll('[data-testid="tweet"]');
      const results: TimelineTweet[] = [];

      tweetEls.forEach((el) => {
        const textEl = el.querySelector('[data-testid="tweetText"]');
        const authorEl = el.querySelector('[data-testid="User-Name"]');
        const linkEl = el.querySelector('a[href*="/status/"]');
        const likeEl = el.querySelector('[data-testid="like"] span');
        const rtEl = el.querySelector('[data-testid="retweet"] span');
        const imgs = Array.from(el.querySelectorAll('img[src*="twimg.com"]'));

        results.push({
          text: textEl?.textContent || '',
          author: authorEl?.textContent || '',
          url: linkEl ? `https://x.com${linkEl.getAttribute('href')}` : '',
          likes: likeEl?.textContent || '0',
          retweets: rtEl?.textContent || '0',
          imageUrls: imgs.map((img) => (img as HTMLImageElement).src),
        });
      });

      return results;
    });

    tweets.push(...tweetData.slice(0, maxTweets));
    log('success', `Scanned ${tweets.length} tweets from timeline`);
  } catch (err) {
    log('block', `Timeline scan failed: ${err}`);
  }

  return tweets;
}

// ── 2FA Challenge Detection ───────────────────────────────────

export async function detect2FAChallenge(page: Page): Promise<string | null> {
  const challengeSelectors = [
    'input[data-testid="ocfEnterTextTextInput"]',
    '[data-testid="LoginForm"] input[type="text"]',
    'input[autocomplete="one-time-code"]',
    'h1:has-text("Check your")',
    'span:has-text("verification code")',
  ];

  for (const sel of challengeSelectors) {
    try {
      const el = await page.$(sel);
      if (el) return sel;
    } catch {
      continue;
    }
  }
  return null;
}

// ── Task Executor ─────────────────────────────────────────────

export async function executeTask(
  context: BrowserContext,
  task: AutomationTask,
  log: LogCallback
): Promise<{ success: boolean; error?: string }> {
  const page = await context.newPage();

  try {
    // Heartbeat check
    const heartStatus = await sessionHeartbeat(page);
    if (heartStatus === 'needs_recovery') {
      log('debounce', 'Session needs recovery, attempting soft recovery...');
      const recovered = await softRecovery(page);
      if (!recovered) {
        log('block', 'Recovery failed — manual intervention required');
        return { success: false, error: 'Session recovery failed' };
      }
    }

    switch (task.type) {
      case 'tweet':
        const tweeted = await composeTweet(
          page,
          task.payload.text as string,
          log
        );
        if (tweeted) await saveSession(context);
        return { success: tweeted };

      case 'reply':
        const replied = await replyToTweet(
          page,
          task.payload.tweetUrl as string,
          task.payload.text as string,
          log
        );
        return { success: replied };

      case 'like':
        const liked = await likeTweet(page, task.payload.tweetUrl as string, log);
        return { success: liked };

      case 'retweet':
        const retweeted = await retweetPost(page, task.payload.tweetUrl as string, log);
        return { success: retweeted };

      case 'follow':
        const followed = await followUser(page, task.payload.username as string, log);
        return { success: followed };

      case 'scan':
        const tweets = await scanTimeline(page, task.payload.limit as number || 10, log);
        (task.payload as Record<string, unknown>).result = tweets;
        return { success: tweets.length > 0 };

      default:
        return { success: false, error: `Unknown task type: ${task.type}` };
    }
  } catch (err) {
    const error = String(err);
    log('block', `Task execution error: ${error}`);

    // Check for 2FA
    const challenge = await detect2FAChallenge(page);
    if (challenge) {
      const screenshot = await page.screenshot({ encoding: 'base64' });
      log('block', `2FA CHALLENGE DETECTED — screenshot captured, awaiting manual code`);
      // In production: emit via SSE to dashboard
      return { success: false, error: '2FA_CHALLENGE:' + (screenshot as string) };
    }

    return { success: false, error };
  } finally {
    await page.close();
  }
}
