import asyncio
import os
import logging
import random
import glob
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

logger = logging.getLogger(__name__)

# جلب البيانات من الـ Secrets
TWITTER_USERNAME = os.environ.get("TWITTER_USERNAME", "")
TWITTER_PASSWORD = os.environ.get("TWITTER_PASSWORD", "")
TWITTER_EMAIL = os.environ.get("TWITTER_EMAIL", "") # تأكد من إضافة هذا في الهانجينج فيس

LAUNCH_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security",
]

bot_state = {
    "logged_in": False,
    "running": False,
    "tweets_liked": 0,
    "tweets_replied": 0,
    "errors": [],
}

def _get_chromium_path():
    # البحث عن الكروم في مسارات Hugging Face القياسية
    candidates = [
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux/chrome"),
    ]
    for pattern in candidates:
        matches = glob.glob(pattern)
        if matches:
            return matches[0]
    return None

async def human_delay(min_ms=1000, max_ms=3000):
    await asyncio.sleep(random.uniform(min_ms / 1000, max_ms / 1000))

async def login_twitter(page):
    logger.info("Navigating to Twitter login page...")
    await page.goto("https://x.com/i/flow/login", wait_until="networkidle", timeout=60000)
    await human_delay(2000, 4000)

    try:
        # الخطوة 1: اسم المستخدم
        username_input = page.locator('input[autocomplete="username"]')
        await username_input.wait_for(timeout=20000)
        await username_input.fill(TWITTER_USERNAME)
        await page.keyboard.press("Enter")
        await human_delay(2000, 3000)
    except Exception as e:
        await page.screenshot(path="debug_login.png")
        raise RuntimeError("Failed at Step 1: Username input not found.")

    # --- الحل الحقيقي: تخطي فخ تأكيد الهوية ---
    try:
        verify_field = page.locator('input[data-testid="ocfEnterTextTextInput"]')
        if await verify_field.is_visible(timeout=5000):
            logger.warning("⚠️ Twitter security challenge detected! Entering email...")
            # يستخدم الإيميل لو موجود، وإلا يستخدم اليوزرنيم كخيار بديل
            await verify_field.fill(TWITTER_EMAIL if TWITTER_EMAIL else TWITTER_USERNAME)
            await page.keyboard.press("Enter")
            await human_delay(2000, 3000)
    except:
        pass # لم يظهر التحدي، نكمل بشكل عادي

    try:
        # الخطوة 2: كلمة المرور
        password_input = page.locator('input[name="password"]')
        await password_input.wait_for(timeout=15000)
        await password_input.fill(TWITTER_PASSWORD)
        await page.keyboard.press("Enter")
        await human_delay(4000, 6000)
    except Exception as e:
        await page.screenshot(path="debug_login.png")
        raise RuntimeError("Failed at Step 2: Password input not found.")

    # التأكد من الوصول للرئيسية
    try:
        await page.wait_for_url(lambda url: "home" in url, timeout=30000)
        logger.info("✅ Successfully logged in to Twitter!")
        bot_state["logged_in"] = True
    except:
        await page.screenshot(path="debug_login.png")
        raise RuntimeError("Login failed - Home page not reached.")

async def get_feed_tweets(page, max_tweets=5):
    tweets = []
    try:
        await page.goto("https://x.com/home", wait_until="networkidle", timeout=30000)
        await human_delay(2000, 4000)
        tweet_articles = await page.locator('article[data-testid="tweet"]').all()
        for i, article in enumerate(tweet_articles[:max_tweets]):
            try:
                text = await article.locator('[data-testid="tweetText"]').inner_text(timeout=3000)
                tweet_link = await article.locator('a[href*="/status/"]').first.get_attribute("href")
                tweet_id = tweet_link.split("/status/")[-1].split("?")[0]
                tweets.append({"id": tweet_id, "text": text, "article": article})
            except: continue
    except Exception as e:
        logger.error(f"Error fetching feed: {e}")
    return tweets

async def like_tweet(page, tweet):
    try:
        like_btn = tweet["article"].locator('[data-testid="like"]')
        if await like_btn.is_visible():
            await like_btn.click()
            bot_state["tweets_liked"] += 1
            return True
    except: return False

async def reply_to_tweet(page, tweet, reply_text):
    try:
        await page.goto(f"https://x.com/i/web/status/{tweet['id']}")
        await human_delay(2000, 4000)
        reply_box = page.locator('[data-testid="tweetTextarea_0"]')
        await reply_box.fill(reply_text)
        await page.locator('[data-testid="tweetButton"]').click()
        bot_state["tweets_replied"] += 1
        return True
    except: return False

async def post_thread(browser_context, thread_parts: list):
    page = await browser_context.new_page()
    try:
        await page.goto("https://x.com/compose/tweet")
        for i, part in enumerate(thread_parts):
            await page.locator('[data-testid="tweetTextarea_0"]').fill(part)
            if i < len(thread_parts) - 1:
                await page.locator('[data-testid="addButton"]').click()
            else:
                await page.locator('[data-testid="tweetButton"]').click()
            await human_delay(1000, 2000)
        return True
    except: return False
    finally: await page.close()

async def run_bot_cycle(ai_handler):
    chrome_path = _get_chromium_path()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome_path, headless=True, args=LAUNCH_ARGS)
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await context.new_page()
        try:
            bot_state["running"] = True
            await login_twitter(page)
            tweets = await get_feed_tweets(page, max_tweets=3)
            for tweet in tweets:
                await like_tweet(page, tweet)
                reply = await ai_handler.generate_reply(tweet["text"])
                if reply: await reply_to_tweet(page, tweet, reply)
                await human_delay(5000, 10000)
        except Exception as e:
            bot_state["errors"].append(str(e))
        finally:
            bot_state["running"] = False
            await browser.close()

async def post_news_thread(thread_parts: list):
    chrome_path = _get_chromium_path()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome_path, headless=True, args=LAUNCH_ARGS)
        context = await browser.new_context()
        page = await context.new_page()
        try:
            await login_twitter(page)
            return await post_thread(context, thread_parts)
        except: return False
        finally: await browser.close()
