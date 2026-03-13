import asyncio
import os
import json
import logging
import random
import glob
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

# ملف حفظ الجلسة
SESSION_FILE = "session.json"

TWITTER_USERNAME = os.environ.get("TWITTER_USERNAME", "")
TWITTER_PASSWORD = os.environ.get("TWITTER_PASSWORD", "")
TWITTER_EMAIL = os.environ.get("TWITTER_EMAIL", "")

LAUNCH_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security",
    "--disable-blink-features=AutomationControlled",
]

bot_state = {
    "logged_in": False, 
    "running": False, 
    "tweets_liked": 0, 
    "tweets_replied": 0, 
    "errors": []
}

def _get_chromium_path():
    candidates = [
        os.environ.get("REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE"),
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux/chrome"),
    ]
    for path in candidates:
        if path and os.path.exists(path): return path
    return None

async def take_screenshot(page, name):
    try:
        await page.screenshot(path=name)
        await page.screenshot(path="debug_login.png")
    except: pass

async def login_twitter(page, context):
    """محاولة الدخول بالـ Cookies أو تسجيل دخول جديد"""
    logger.info("📡 Checking session status...")
    await page.goto("https://x.com/home", wait_until="networkidle", timeout=60000)
    await asyncio.sleep(5)
    
    # إذا ظهر شريط البحث، يعني نحن مسجلون دخول بالفعل
    if await page.locator('[data-testid="SearchBox_Search_Input"]').is_visible(timeout=10000):
        logger.info("✅ Session restored! Skipping login flow.")
        bot_state["logged_in"] = True
        return True

    logger.info("🔑 No active session. Starting login attack...")
    await page.goto("https://x.com/i/flow/login", wait_until="networkidle")
    await asyncio.sleep(5)

    try:
        # 1. اليوزرنيم
        user_input = page.locator('input[autocomplete="username"]')
        await user_input.wait_for(state="visible")
        await user_input.type(TWITTER_USERNAME, delay=200)
        await take_screenshot(page, "2_typed.png")
        
        await asyncio.sleep(4)
        next_btn = page.locator('button:has-text("Next"), button:has-text("التالي")').last
        await next_btn.evaluate("node => node.click()")
        await asyncio.sleep(6)

        # 2. الباسورد
        pass_input = page.locator('input[name="password"]')
        await pass_input.wait_for(state="visible")
        await pass_input.type(TWITTER_PASSWORD, delay=200)
        
        login_btn = page.locator('button:has-text("Log in"), button:has-text("تسجيل الدخول")').last
        await login_btn.evaluate("node => node.click()")
        await asyncio.sleep(12)

        if await page.locator('[data-testid="SearchBox_Search_Input"]').is_visible(timeout=20000):
            logger.info("✅ Login Success! Saving session...")
            await context.storage_state(path=SESSION_FILE)
            bot_state["logged_in"] = True
            return True
        else:
            raise RuntimeError("Login failed to reach home.")
    except Exception as e:
        await take_screenshot(page, "error_login.png")
        raise e

# --- الدوال المطلوبة لـ main.py [إصلاح الـ ImportError] ---

async def get_feed_tweets(page, max_tweets=3):
    tweets = []
    try:
        await page.goto("https://x.com/home", wait_until="networkidle")
        articles = await page.locator('article[data-testid="tweet"]').all()
        for art in articles[:max_tweets]:
            try:
                text = await art.locator('[data-testid="tweetText"]').inner_text(timeout=3000)
                href = await art.locator('a[href*="/status/"]').first.get_attribute("href")
                t_id = href.split("/status/")[-1].split("?")[0]
                tweets.append({"id": t_id, "text": text, "article": art})
            except: continue
    except: pass
    return tweets

async def like_tweet(page, tweet):
    try:
        btn = tweet["article"].locator('[data-testid="like"]')
        await btn.click(force=True)
        bot_state["tweets_liked"] += 1
    except: pass

async def reply_to_tweet(page, tweet, reply_text):
    try:
        await page.goto(f"https://x.com/i/web/status/{tweet['id']}")
        await page.locator('[data-testid="tweetTextarea_0"]').fill(reply_text)
        await page.locator('[data-testid="tweetButton"]').first.click(force=True)
        bot_state["tweets_replied"] += 1
    except: pass

async def post_thread(context, thread_parts):
    page = await context.new_page()
    try:
        await page.goto("https://x.com/compose/tweet")
        for i, part in enumerate(thread_parts):
            await page.locator('[data-testid="tweetTextarea_0"]').fill(part)
            btn = '[data-testid="addButton"]' if i < len(thread_parts) - 1 else '[data-testid="tweetButton"]'
            await page.locator(btn).first.click()
            await asyncio.sleep(2)
        return True
    except: return False
    finally: await page.close()

async def run_bot_cycle(ai_handler):
    chrome_path = _get_chromium_path()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome_path, headless=True, args=LAUNCH_ARGS)
        storage = SESSION_FILE if os.path.exists(SESSION_FILE) else None
        context = await browser.new_context(storage_state=storage, user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)", viewport={"width": 393, "height": 852}, is_mobile=True)
        page = await context.new_page()
        try:
            bot_state["running"] = True
            await login_twitter(page, context)
            if bot_state["logged_in"]:
                tweets = await get_feed_tweets(page)
                for t in tweets:
                    await like_tweet(page, t)
                    reply = await ai_handler.generate_reply(t["text"])
                    if reply: await reply_to_tweet(page, t, reply)
                    await asyncio.sleep(10)
        finally:
            bot_state["running"] = False
            await browser.close()

async def post_news_thread(thread_parts):
    chrome_path = _get_chromium_path()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome_path, headless=True, args=LAUNCH_ARGS)
        storage = SESSION_FILE if os.path.exists(SESSION_FILE) else None
        context = await browser.new_context(storage_state=storage, user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)", is_mobile=True)
        page = await context.new_page()
        try:
            await login_twitter(page, context)
            return await post_thread(context, thread_parts)
        except: return False
        finally: await browser.close()
