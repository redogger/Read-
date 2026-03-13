import asyncio
import os
import json
import logging
import random
import glob
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

# المسار الذي سيتم حفظ الجلسة فيه داخل السيرفر
SESSION_FILE = "session.json"

TWITTER_USERNAME = os.environ.get("TWITTER_USERNAME", "")
TWITTER_PASSWORD = os.environ.get("TWITTER_PASSWORD", "")
TWITTER_EMAIL = os.environ.get("TWITTER_EMAIL", "")

LAUNCH_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-blink-features=AutomationControlled",
]

bot_state = {"logged_in": False, "running": False, "tweets_liked": 0, "tweets_replied": 0, "errors": []}

def _get_chromium_path():
    candidates = [os.environ.get("REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE"), "/usr/bin/google-chrome", "/usr/bin/chromium"]
    for path in candidates:
        if path and os.path.exists(path): return path
    return None

async def take_screenshot(page, name):
    try: await page.screenshot(path=name); await page.screenshot(path="debug_login.png")
    except: pass

async def login_twitter(page, context):
    """دالة الدخول الذكية: تحاول تحميل الجلسة أولاً"""
    
    # 1. محاولة فتح تويتر والتحقق إذا كنا مسجلين دخول بالفعل
    await page.goto("https://x.com/home", wait_until="networkidle")
    await asyncio.sleep(5)
    
    if await page.locator('[data-testid="SearchBox_Search_Input"]').is_visible(timeout=10000):
        logger.info("✅ تم استعادة الجلسة بنجاح! لا حاجة لتسجيل الدخول.")
        bot_state["logged_in"] = True
        return True

    logger.info("🔑 الجلسة غير موجودة.. البدء في عملية تسجيل الدخول...")
    await page.goto("https://x.com/i/flow/login", wait_until="networkidle")
    await asyncio.sleep(5)

    try:
        # إدخال اليوزرنيم
        user_input = page.locator('input[autocomplete="username"]')
        await user_input.wait_for(state="visible")
        await user_input.type(TWITTER_USERNAME, delay=250)
        
        # الضغط النووي عبر JS
        next_btn = page.locator('button:has-text("Next"), button:has-text("التالي")').last
        await next_btn.evaluate("node => node.click()")
        await asyncio.sleep(6)

        # خطوة الباسورد
        pass_input = page.locator('input[name="password"]')
        await pass_input.wait_for(state="visible")
        await pass_input.type(TWITTER_PASSWORD, delay=250)
        
        login_btn = page.locator('button:has-text("Log in"), button:has-text("تسجيل الدخول")').last
        await login_btn.evaluate("node => node.click()")
        await asyncio.sleep(10)

        # التحقق النهائي وحفظ الـ Cookies
        if await page.locator('[data-testid="SearchBox_Search_Input"]').is_visible(timeout=20000):
            logger.info("✅ دخول ناجح! جاري حفظ الجلسة للأبد...")
            storage = await context.storage_state(path=SESSION_FILE)
            bot_state["logged_in"] = True
            return True
        else:
            raise RuntimeError("فشل الدخول.. راجع الصور.")
    except Exception as e:
        await take_screenshot(page, "login_error.png")
        raise e

async def run_bot_cycle(ai_handler):
    chrome_path = _get_chromium_path()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome_path, headless=True, args=LAUNCH_ARGS)
        
        # تحميل الجلسة إذا كانت موجودة
        storage_state = SESSION_FILE if os.path.exists(SESSION_FILE) else None
        
        context = await browser.new_context(
            storage_state=storage_state,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
            viewport={"width": 393, "height": 852},
            is_mobile=True
        )
        
        page = await context.new_page()
        try:
            bot_state["running"] = True
            await login_twitter(page, context)
            # ... (بقية كود الـ Feed والـ Like والـ Reply كما هي)
        finally:
            await browser.close()
