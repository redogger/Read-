import asyncio
import os
import logging
import random
import glob
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

logger = logging.getLogger(__name__)

# إعدادات الحساب من الـ Secrets
TWITTER_USERNAME = os.environ.get("TWITTER_USERNAME", "")
TWITTER_PASSWORD = os.environ.get("TWITTER_PASSWORD", "")
TWITTER_EMAIL = os.environ.get("TWITTER_EMAIL", "") 

# إعدادات متقدمة لتخطي كشف البوتات
LAUNCH_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security",
    "--disable-blink-features=AutomationControlled", # إخفاء بصمة الأتمتة
]

bot_state = {
    "logged_in": False,
    "running": False,
    "tweets_liked": 0,
    "tweets_replied": 0,
    "errors": [],
}

def _get_chromium_path():
    # البحث عن الكروم في مسارات Hugging Face
    candidates = [
        os.environ.get("REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE"),
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux/chrome"),
    ]
    for path in candidates:
        if path and os.path.exists(path):
            return path
    for pattern in ["~/.cache/ms-playwright/chromium-*/chrome-linux/chrome"]:
        matches = glob.glob(os.path.expanduser(pattern))
        if matches: return matches[0]
    return None

async def human_delay(min_ms=2000, max_ms=5000):
    """تأخير زمني لمحاكاة هدوء البشر"""
    await asyncio.sleep(random.uniform(min_ms / 1000, max_ms / 1000))

async def take_screenshot(page, name="debug_login.png"):
    """تحديث صورة المعاينة للمراقب الدوري"""
    try:
        await page.screenshot(path=name)
        logger.info(f"📸 Screenshot saved: {name}")
    except: pass

async def login_twitter(page):
    logger.info("Direct Login Attack...")
    await page.goto("https://x.com/i/flow/login", wait_until="networkidle", timeout=90000)
    await take_screenshot(page)
    await human_delay(4000, 6000)

    try:
        # الخطوة 1: إدخال اسم المستخدم
        logger.info("Step 1: Forcing Username entry...")
        user_input = page.locator('input[autocomplete="username"]')
        await user_input.wait_for(state="visible", timeout=30000)
        
        # التركيز المادي والضغط لإجبار الموقع على التفاعل
        await user_input.focus()
        await user_input.click(force=True)
        await page.keyboard.type(TWITTER_USERNAME, delay=random.randint(100, 250))
        await take_screenshot(page)
        
        # الحل الجذري: الضغط على Enter من الكيبورد بدلاً من البحث عن زر "Next"
        await page.keyboard.press("Enter")
        await human_delay(4000, 6000)
    except Exception as e:
        await take_screenshot(page)
        raise RuntimeError(f"Step 1 failed: Username field error.")

    # فحص تحدي الأمان (طلب الإيميل أو الهاتف)
    try:
        verify_field = page.locator('input[data-testid="ocfEnterTextTextInput"]')
        if await verify_field.is_visible(timeout=5000):
            logger.warning("Twitter security challenge detected!")
            await verify_field.focus()
            await page.keyboard.type(TWITTER_EMAIL if TWITTER_EMAIL else TWITTER_USERNAME, delay=150)
            await take_screenshot(page)
            await page.keyboard.press("Enter")
            await human_delay(4000, 6000)
    except: pass

    try:
        # الخطوة 2: كلمة المرور
        logger.info("Step 2: Entering Password...")
        pass_input = page.locator('input[name="password"]')
        await pass_input.wait_for(state="visible", timeout=20000)
        await pass_input.focus()
        await pass_input.click(force=True)
        await page.keyboard.type(TWITTER_PASSWORD, delay=random.randint(100, 250))
        await take_screenshot(page)
        
        # الضغط النهائي على Enter للدخول
        await page.keyboard.press("Enter")
        await human_delay(8000, 12000)
    except Exception as e:
        await take_screenshot(page)
        raise RuntimeError(f"Step 2 failed: Password field error.")

    # التحقق النهائي من الوصول للصفحة الرئيسية
    try:
        await page.wait_for_selector('[data-testid="SearchBox_Search_Input"]', timeout=30000)
        logger.info("✅ SUCCESS: Logged in and reached Home!")
        bot_state["logged_in"] = True
        await take_screenshot(page, "success_home.png")
    except:
        await take_screenshot(page)
        raise RuntimeError("Login confirmation failed: Home not detected.")

async def get_feed_tweets(page, max_tweets=5):
    tweets = []
    try:
        await page.goto("https://x.com/home", wait_until="networkidle", timeout=30000)
        await human_delay(3000, 5000)
        tweet_articles = await page.locator('article[data-testid="tweet"]').all()
        for i, article in enumerate(tweet_articles[:max_tweets]):
            try:
                text = await article.locator('[data-testid="tweetText"]').inner_text(timeout=3000)
                href = await article.locator('a[href*="/status/"]').first.get_attribute("href")
                tweet_id = href.split("/status/")[-1].split("?")[0]
                tweets.append({"id": tweet_id, "text": text, "article": article})
            except: continue
    except Exception as e:
        logger.error(f"Error fetching feed: {e}")
    return tweets

async def like_tweet(page, tweet):
    try:
        btn = tweet["article"].locator('[data-testid="like"]')
        if await btn.is_visible():
            await btn.click(force=True)
            await human_delay(1000, 2000)
            bot_state["tweets_liked"] += 1
            return True
    except: return False

async def reply_to_tweet(page, tweet, reply_text):
    try:
        await page.goto(f"https://x.com/i/web/status/{tweet['id']}")
        await human_delay(2000, 4000)
        box = page.locator('[data-testid="tweetTextarea_0"]')
        await box.fill(reply_text)
        await page.locator('[data-testid="tweetButton"]').first.click(force=True)
        bot_state["tweets_replied"] += 1
        return True
    except: return False

async def post_thread(browser_context, thread_parts: list):
    page = await browser_context.new_page()
    try:
        await page.goto("https://x.com/compose/tweet", wait_until="networkidle")
        for i, part in enumerate(thread_parts):
            await page.locator('[data-testid="tweetTextarea_0"]').fill(part)
            if i < len(thread_parts) - 1:
                await page.locator('[data-testid="addButton"]').click(force=True)
            else:
                await page.locator('[data-testid="tweetButton"]').first.click(force=True)
            await asyncio.sleep(2)
        return True
    except: return False
    finally: await page.close()

async def run_bot_cycle(ai_handler):
    chrome_path = _get_chromium_path()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome_path, headless=True, args=LAUNCH_ARGS)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
            viewport={"width": 393, "height": 852},
            is_mobile=True, has_touch=True
        )
        page = await context.new_page()
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        try:
            bot_state["running"] = True
            await login_twitter(page)
            if bot_state["logged_in"]:
                tweets = await get_feed_tweets(page)
                for tweet in tweets:
                    await like_tweet(page, tweet)
                    reply = await ai_handler.generate_reply(tweet["text"])
                    if reply: await reply_to_tweet(page, tweet, reply)
                    await human_delay(10000, 20000)
        except Exception as e:
            bot_state["errors"].append(str(e))
        finally:
            bot_state["running"] = False
            await browser.close()

async def post_news_thread(thread_parts: list):
    chrome_path = _get_chromium_path()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome_path, headless=True, args=LAUNCH_ARGS)
        context = await browser.new_context(is_mobile=True, user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)")
        page = await context.new_page()
        try:
            await login_twitter(page)
            return await post_thread(context, thread_parts)
        except: return False
        finally: await browser.close()
