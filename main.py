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

# --- وظيفة المراقبة المكثفة (كل 3 ثوانٍ) ---
async def rapid_screenshot_monitor(chat_id):
    """ترسل لقطة شاشة كل 3 ثوانٍ طالما البوت يحاول الدخول"""
    logger.info("Rapid Monitor Started: Sending screenshots every 3s... 📸")
    while bot_state["running"] and not bot_state["logged_in"]:
        await asyncio.sleep(3)  # فاصل زمني سريع للمراقبة اللصيقة
        image_path = "debug_login.png"
        if os.path.exists(image_path):
            try:
                with open(image_path, "rb") as photo:
                    bot.send_photo(
                        chat_id, 
                        photo, 
                        caption="📸 لقطة حية (كل 3 ثوانٍ)"
                    )
                # حذف الصورة للسماح باستلام اللقطة التالية فوراً
                os.remove(image_path)
            except Exception as e:
                logger.error(f"Rapid screenshot failed: {e}")
    logger.info("Rapid Monitor Stopped.")

# --- أوامر التحكم ---

@bot.message_handler(commands=["start"])
def handle_start(message):
    if not is_admin(message): return
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add("/status", "/get_debug", "/trigger_news", "/start_bot", "/stop_bot")
    bot.reply_to(
        message,
        "🤖 Twitter AI Bot Control Panel\n\n"
        "عند البدء، سيرسل النظام صوراً متتابعة كل 3 ثوانٍ لمراقبة عملية التسجيل.\n\n"
        "/status - فحص حالة البوت\n"
        "/get_debug - لقطة شاشة يدوية\n"
        "/start_bot - بدء البوت والمراقبة اللصيقة",
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
    image_path = "debug_login.png"
    if os.path.exists(image_path):
        with open(image_path, "rb") as photo:
            bot.send_photo(message.chat.id, photo, caption="Manual Debug Screenshot")
    else:
        bot.reply_to(message, "لا توجد لقطة حالية.")

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
            bot.send_message(message.chat.id, "❌ Failed content generation.")
            return
        success = await post_news_thread(thread_parts)
        bot.send_message(message.chat.id, "✅ Done!" if success else "❌ Failed posting.")

    if _loop:
        asyncio.run_coroutine_threadsafe(_post(), _loop)

@bot.message_handler(commands=["start_bot"])
def handle_start_bot(message):
    if not is_admin(message): return
    global _bot_task
    if bot_state["running"]:
        bot.reply_to(message, "Bot is already running!")
        return
    
    bot.reply_to(message, "🔄 Starting Twitter bot & Rapid Monitor (3s)...")
    
    async def _run_loop():
        while True:
            try:
                await run_bot_cycle(ai)
            except Exception as e:
                logger.error(f"Bot cycle error: {e}")
                await asyncio.sleep(300)

    if _loop:
        # تشغيل الدورة والمراقب معاً لضمان تدفق الصور
        asyncio.run_coroutine_threadsafe(_run_loop(), _loop)
        asyncio.run_coroutine_threadsafe(rapid_screenshot_monitor(message.chat.id), _loop)

@bot.message_handler(commands=["stop_bot"])
def handle_stop_bot(message):
    if not is_admin(message): return
    bot_state["running"] = False
    bot.reply_to(message, "Stopping bot and monitor... 🛑")

async def start_telegram_bot():
    global _loop
    _loop = asyncio.get_event_loop()
    bot.delete_webhook(drop_pending_updates=True)
    logger.info("✅ SUCCESS: Connected to Telegram!")
    
    await _loop.run_in_executor(
        None,
        lambda: bot.infinity_polling(timeout=60, long_polling_timeout=60),
    )

async def main():
    logger.info("🚀 Twitter AI Agent starting up...")
    await start_telegram_bot()

if __name__ == "__main__":
    asyncio.run(main())
