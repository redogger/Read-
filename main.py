import asyncio
import logging
import os
import telebot
import glob
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

_loop: asyncio.AbstractEventLoop | None = None

def is_admin(message):
    if not ADMIN_CHAT_ID: return True
    return str(message.chat.id) == str(ADMIN_CHAT_ID)

# --- نظام التنبيه الفوري (Zero Ping Notifications) ---
def notify_admin(msg):
    """إرسال تنبيه فوري للأدمن بأي معلومة هامة"""
    try:
        bot.send_message(ADMIN_CHAT_ID, f"🔔 **تنبيه فوري:**\n{msg}", parse_mode="Markdown")
    except: pass

# --- وضع المراقبة النفاث (Turbo Screenshot Monitor) ---
async def turbo_monitor(chat_id):
    """يرسل الصور فور تولدها بتردد يصل لثانية واحدة"""
    logger.info("🚀 Turbo Monitor Active: Streaming screenshots every 1s...")
    
    # قائمة بأنماط الصور التي قد يولدها البوت
    patterns = ["debug_login.png", "*_typed.png", "error_*.png", "success_*.png"]
    
    while bot_state["running"] and not bot_state["logged_in"]:
        found_image = False
        for pattern in patterns:
            for img_path in glob.glob(pattern):
                try:
                    with open(img_path, "rb") as photo:
                        bot.send_photo(chat_id, photo, caption=f"⚡️ بث حي: {img_path}")
                    os.remove(img_path) # حذف فوري لتوفير المساحة وتجنب التكرار
                    found_image = True
                except: continue
        
        # إذا لم يجد صورة، ينتظر ثانية واحدة فقط
        if not found_image:
            await asyncio.sleep(1)
        else:
            # انتظار قصير جداً بعد الإرسال لمنع حظر تليجرام (Flood)
            await asyncio.sleep(0.5)

# --- أوامر التحكم ---

@bot.message_handler(commands=["start"])
def handle_start(message):
    if not is_admin(message): return
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add("/status", "/get_debug", "/start_bot", "/stop_bot")
    bot.reply_to(
        message,
        "🚀 **نظام التحكم الخارق جاهز**\n\n"
        "عند الضغط على /start_bot، سيتحول البوت لوضع البث الحي (صورة كل ثانية).\n\n"
        "💡 سيصلك تنبيه فوري عند طلب كود التحقق أو الدخول الناجح.",
        reply_markup=markup,
        parse_mode="Markdown"
    )

@bot.message_handler(commands=["status"])
def handle_status(message):
    if not is_admin(message): return
    status_text = (
        f"📊 **حالة النظام الآن:**\n"
        f"🔄 يعمل: {bot_state['running']}\n"
        f"🔑 مسجل دخول: {bot_state['logged_in']}\n"
        f"❤️ إعجابات: {bot_state['tweets_liked']}\n"
        f"💬 ردود: {bot_state['tweets_replied']}\n"
    )
    bot.reply_to(message, status_text, parse_mode="Markdown")

@bot.message_handler(commands=["get_debug"])
def handle_get_debug(message):
    if not is_admin(message): return
    # محاولة جلب أي صورة موجودة حالياً
    images = glob.glob("*.png")
    if images:
        for img in images:
            with open(img, "rb") as f: bot.send_photo(message.chat.id, f)
    else:
        bot.reply_to(message, "لا توجد لقطات في الذاكرة حالياً.")

@bot.message_handler(commands=["start_bot"])
def handle_start_bot(message):
    if not is_admin(message): return
    if bot_state["running"]:
        bot.reply_to(message, "النظام يعمل بالفعل! 🚀")
        return
    
    bot.reply_to(message, "🔄 تم تفعيل وضع المراقبة النفاثة وبدء الدورة...")
    
    async def _run_loop():
        while True:
            try:
                # إبلاغ الأدمن ببدء المحاولة
                notify_admin("بدء محاولة تسجيل دخول جديدة إلى X.com...")
                await run_bot_cycle(ai)
            except Exception as e:
                logger.error(f"Bot cycle error: {e}")
                notify_admin(f"حدث خطأ في الدورة: {str(e)[:100]}")
                await asyncio.sleep(60)

    if _loop:
        # تشغيل الدورة والمراقب النفاث بالتوازي
        asyncio.run_coroutine_threadsafe(_run_loop(), _loop)
        asyncio.run_coroutine_threadsafe(turbo_monitor(message.chat.id), _loop)

@bot.message_handler(commands=["stop_bot"])
def handle_stop_bot(message):
    if not is_admin(message): return
    bot_state["running"] = False
    bot.reply_to(message, "🛑 تم إيقاف النظام والمراقب فورا.")

async def start_telegram_bot():
    global _loop
    _loop = asyncio.get_event_loop()
    bot.delete_webhook(drop_pending_updates=True)
    logger.info("✅ Telegram Zero-Ping Controller Connected!")
    
    await _loop.run_in_executor(
        None,
        lambda: bot.infinity_polling(timeout=60, long_polling_timeout=60),
    )

async def main():
    logger.info("🚀 Launching Twitter AI Agent...")
    await start_telegram_bot()

if __name__ == "__main__":
    asyncio.run(main())
