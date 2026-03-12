import asyncio
import os
import logging
import random
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

logger = logging.getLogger(__name__)

TWITTER_USERNAME = os.environ.get("TWITTER_USERNAME", "")
TWITTER_PASSWORD = os.environ.get("TWITTER_PASSWORD", "")

LAUNCH_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
]

bot_state = {
    "logged_in": False,
    "running": False,
    "tweets_liked": 0,
    "tweets_replied": 0,
    "errors": [],
}


def _get_chromium_path():
    path = os.environ.get("REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    if path and os.path.exists(path):
        return path
    candidates = [
        os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux/chrome"),
    ]
    import glob
    for pattern in candidates:
        matches = glob.glob(pattern)
        if matches:
            return matches[0]
    return None


async def human_delay(min_ms=800, max_ms=2200):
    await asyncio.sleep(random.uniform(min_ms / 1000, max_ms / 1000))


async def login_twitter(page):
    logger.info("Navigating to Twitter login page...")
    await page.goto("https://x.com/i/flow/login", wait_until="domcontentloaded", timeout=60000)
    await human_delay(2000, 3500)

    try:
        username_input = page.locator('input[autocomplete="username"]')
        await username_input.wait_for(timeout=15000)
        await username_input.fill(TWITTER_USERNAME)
        await human_delay()
        await page.keyboard.press("Enter")
        await human_delay(1500, 2500)
    except PlaywrightTimeoutError:
        logger.error("Could not find username input.")
        await page.screenshot(path="debug_login.png")
        raise RuntimeError("Login step 1 failed - screenshot saved to debug_login.png")

    try:
        email_or_phone = page.locator('input[data-testid="ocfEnterTextTextInput"]')
        is_visible = await email_or_phone.is_visible()
        if is_visible:
            logger.warning("Twitter is asking for email/phone verification!")
            await page.screenshot(path="debug_login.png")
            raise RuntimeError(
                "Twitter requires email/phone verification. "
                "See debug_login.png. Provide TWITTER_EMAIL env var."
            )
    except PlaywrightTimeoutError:
        pass

    try:
        password_input = page.locator('input[name="password"]')
        await password_input.wait_for(timeout=15000)
        await password_input.fill(TWITTER_PASSWORD)
        await human_delay()
        await page.keyboard.press("Enter")
    except PlaywrightTimeoutError:
        logger.error("Could not find password input.")
        await page.screenshot(path="debug_login.png")
        raise RuntimeError("Login step 2 failed - screenshot saved to debug_login.png")

    try:
        await page.wait_for_url(
            lambda url: "x.com/home" in url or "twitter.com/home" in url,
            timeout=30000,
        )
        logger.info("Successfully logged in to Twitter!")
        bot_state["logged_in"] = True
    except PlaywrightTimeoutError:
        logger.error("Login failed - unexpected page after password.")
        await page.screenshot(path="debug_login.png")
        raise RuntimeError(
            "Login did not reach home. Check debug_login.png for details."
        )


async def get_feed_tweets(page, max_tweets=5):
    tweets = []
    try:
        await page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=30000)
        await human_delay(2000, 3000)

        tweet_articles = await page.locator('article[data-testid="tweet"]').all()
        logger.info(f"Found {len(tweet_articles)} tweets on feed")

        for i, article in enumerate(tweet_articles[:max_tweets]):
            try:
                text_el = article.locator('[data-testid="tweetText"]')
                text = await text_el.inner_text(timeout=3000)

                tweet_link_el = article.locator('a[href*="/status/"]')
                href = await tweet_link_el.first.get_attribute("href", timeout=3000)
                tweet_id = href.split("/status/")[-1].split("?")[0] if href else None

                tweets.append({"id": tweet_id, "text": text, "article": article})
                logger.info(f"Tweet {i+1}: {text[:80]}...")
            except Exception as e:
                logger.warning(f"Could not parse tweet {i+1}: {e}")
    except Exception as e:
        logger.error(f"Error fetching feed: {e}")
        await page.screenshot(path="debug_feed.png")

    return tweets


async def like_tweet(page, tweet):
    try:
        article = tweet["article"]
        like_btn = article.locator('[data-testid="like"]')
        is_visible = await like_btn.is_visible()
        if is_visible:
            await like_btn.click()
            await human_delay(500, 1200)
            bot_state["tweets_liked"] += 1
            logger.info(f"Liked tweet: {tweet['id']}")
            return True
    except Exception as e:
        logger.warning(f"Could not like tweet {tweet.get('id')}: {e}")
    return False


async def reply_to_tweet(page, tweet, reply_text):
    try:
        tweet_url = f"https://x.com/i/web/status/{tweet['id']}"
        await page.goto(tweet_url, wait_until="domcontentloaded", timeout=20000)
        await human_delay(1500, 2500)

        reply_btn = page.locator('[data-testid="reply"]').first
        await reply_btn.click()
        await human_delay(1000, 2000)

        reply_box = page.locator('[data-testid="tweetTextarea_0"]')
        await reply_box.wait_for(timeout=10000)
        await reply_box.click()
        await reply_box.fill(reply_text)
        await human_delay(500, 1000)

        send_btn = page.locator('[data-testid="tweetButton"]').first
        await send_btn.click()
        await human_delay(2000, 3000)

        bot_state["tweets_replied"] += 1
        logger.info(f"Replied to tweet {tweet['id']}: {reply_text[:50]}...")
        return True
    except Exception as e:
        logger.warning(f"Could not reply to tweet {tweet.get('id')}: {e}")
        return False


async def post_thread(browser_context, thread_parts: list):
    page = await browser_context.new_page()
    try:
        await page.goto("https://x.com/compose/tweet", wait_until="domcontentloaded", timeout=20000)
        await human_delay(2000, 3000)

        for i, part in enumerate(thread_parts):
            tweet_box = page.locator('[data-testid="tweetTextarea_0"]')
            await tweet_box.wait_for(timeout=10000)
            await tweet_box.fill(part)
            await human_delay(500, 1000)

            if i < len(thread_parts) - 1:
                add_btn = page.locator('[data-testid="addButton"]')
                if await add_btn.is_visible():
                    await add_btn.click()
                    await human_delay(800, 1500)
            else:
                send_btn = page.locator('[data-testid="tweetButton"]').first
                await send_btn.click()
                await human_delay(2000, 3000)

        logger.info(f"Posted thread with {len(thread_parts)} parts.")
        return True
    except Exception as e:
        logger.error(f"Error posting thread: {e}")
        await page.screenshot(path="debug_thread.png")
        return False
    finally:
        await page.close()


async def run_bot_cycle(ai_handler):
    chrome_path = _get_chromium_path()
    logger.info(f"Using Chromium at: {chrome_path}")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=LAUNCH_ARGS,
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        try:
            bot_state["running"] = True
            await login_twitter(page)

            tweets = await get_feed_tweets(page, max_tweets=3)

            for tweet in tweets:
                if not tweet.get("text"):
                    continue

                await like_tweet(page, tweet)
                await human_delay(3000, 6000)

                reply = await ai_handler.generate_reply(tweet["text"])
                if reply:
                    await reply_to_tweet(page, tweet, reply)

                await human_delay(10000, 20000)

        except Exception as e:
            logger.error(f"Bot cycle error: {e}")
            bot_state["errors"].append(str(e))
        finally:
            bot_state["running"] = False
            await context.close()
            await browser.close()

    logger.info("Bot cycle complete. Sleeping before next cycle...")
    await asyncio.sleep(1800)


async def post_news_thread(thread_parts: list):
    chrome_path = _get_chromium_path()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=LAUNCH_ARGS,
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        try:
            await login_twitter(page)
            success = await post_thread(context, thread_parts)
            return success
        except Exception as e:
            logger.error(f"Error posting news thread: {e}")
            return False
        finally:
            await context.close()
            await browser.close()
