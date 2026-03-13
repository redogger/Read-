import asyncio
import logging
import os
import time
import telebot
from telebot import types
from ai_handler import AIHandler
from twitter_bot import run_bot_cycle, post_news_thread, bot_state

# إعدادات التسجيل (Logging)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# جلب الإعدادات من Secrets
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ADMIN_CHAT_ID = os.environ.get("ADMIN_CHAT_ID", "")

if not TELEGRAM_BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is not set in Secrets!")

bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)
ai = AIHandler()

_bot_task: asyncio.Task | None = None
_loop: asyncio.AbstractEventLoop | None = None

def is_admin(message):
    if not ADMIN_CHAT_ID: return True
    return str(message.chat.id) == str(ADMIN_CHAT_ID)

# --- أوامر التحكم الجديدة والمحدثة ---

@bot.message_handler(commands=["start"])
def handle_start(message):
    if not is_admin(message): return
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add("/status", "/get_debug", "/trigger_news", "/start_bot", "/stop_bot")
    bot.reply_to(
        message,
        "🤖 Twitter AI Bot Control Panel\n\n"
        "/status - Check bot status\n"
        "/get_debug - Get login screenshot if failed\n"
        "/trigger_news <topic> - Post a news thread\n"
        "/start_bot - Start auto cycle\n"
        "/stop_bot - Stop auto cycle",
        reply_markup=markup,
    )

@bot.message_handler(commands=["status"])
def handle_status(message):
    if not is_admin(message): return
    status_text = (
        f"📊 Bot Status\n"
        f"Running: {bot_state['running']}\n"
        f"Logged in: {bot_state['logged_in']}\n"
        f"Tweets liked: {bot_state['tweets_liked']}\n"
        f"Tweets replied: {bot_state['tweets_replied']}\n"
    )
    if bot_state["errors"]:
        status_text += f"\n❌ Last error: {bot_state['errors'][-1][:200]}"
    bot.reply_to(message, status_text)

@bot.message_handler(commands=["get_debug"])
def handle_get_debug(message):
    if not is_admin(message): return
    # محاولة إرسال صورة تشخيص الأعطال إذا وجدت
    image_path = "debug_login.png"
    if os.path.exists(image_path):
        with open(image_path, "rb") as photo:
            bot.send_photo(message.chat.id, photo, caption="Latest Twitter interaction screenshot.")
    else:
        bot.reply_to(message, "No debug screenshot found. Bot might not have attempted login yet.")

@bot.message_handler(commands=["trigger_news"])
def handle_trigger_news(message):
    if not is_admin(message): return
    parts = message.text.split(maxsplit=1)
    if len(parts) < 2:
        bot.reply_to(message, "Usage: /trigger_news <topic>")
        return

    topic = parts[1].strip()
    bot.reply_to(message, f"⏳ Generating and posting thread about: {topic}...")

    async def _post():
        thread_parts = await ai.generate_news_thread(topic)
        if not thread_parts:
            bot.send_message(message.chat.id, "❌ Failed to generate thread content.")
            return
        success = await post_news_thread(thread_parts)
        bot.send_message(message.chat.id, "✅ Thread posted successfully!" if success else "❌ Failed to post thread.")

    asyncio.run_coroutine_threadsafe(_post(), _loop)

@bot.message_handler(commands=["start_bot"])
def handle_start_bot(message):
    if not is_admin(message): return
    global _bot_task
    if bot_state["running"]:
        bot.reply_to(message, "Bot is already running! 🚀")
        return
    bot.reply_to(message, "Starting automated bot cycle... 🔄")
    async def _run_loop():
        while True:
            try:
                await run_bot_cycle(ai)
            except Exception as e:
                logger.error(f"Bot cycle error: {e}")
                await asyncio.sleep(300)
    _bot_task = asyncio.run_coroutine_threadsafe(_run_loop(), _loop)

@bot.message_handler(commands=["stop_bot"])
def handle_stop_bot(message):
    if not is_admin(message): return
    global _bot_task
    if _bot_task:
        _bot_task.cancel()
        _bot_task = None
        bot_state["running"] = False
        bot.reply_to(message, "Bot stopped. 🛑")
    else:
        bot.reply_to(message, "Bot is not running.")

# --- نظام تشغيل البوت مع معالجة أخطاء الاتصال ---

async def start_telegram_bot():
    global _loop
    _loop = asyncio.get_event_loop()
    
    max_retries = 15
    for i in range(max_retries):
        try:
            logger.info(f"Connecting to Telegram... (Attempt {i+1}/{max_retries})")
            bot.delete_webhook(drop_pending_updates=True)
            logger.info("✅ SUCCESS: Connected to Telegram!")
            break
        except Exception as e:
            logger.error(f"Telegram connection failed: {e}")
            if i < max_retries - 1:
                time.sleep(15) # الانتظار قبل إعادة المحاولة
            else:
                raise e

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: bot.infinity_polling(timeout=60, long_polling_timeout=60),
    )

async def main():
    logger.info("🚀 Twitter AI Agent starting up...")
    await start_telegram_bot()

if __name__ == "__main__":
    asyncio.run(main())
