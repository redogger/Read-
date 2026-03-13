import asyncio
import logging
import os
import telebot
from telebot import types
from ai_handler import AIHandler
from twitter_bot import run_bot_cycle, post_news_thread, bot_state

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ADMIN_CHAT_ID = os.environ.get("ADMIN_CHAT_ID", "")

if not TELEGRAM_BOT_TOKEN:
    raise RuntimeError(
        "TELEGRAM_BOT_TOKEN environment variable is not set. "
        "Please add it in the Secrets tab."
    )

bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)
ai = AIHandler()

_bot_task: asyncio.Task | None = None
_loop: asyncio.AbstractEventLoop | None = None


def is_admin(message):
    if not ADMIN_CHAT_ID:
        return True
    return str(message.chat.id) == str(ADMIN_CHAT_ID)


@bot.message_handler(commands=["start"])
def handle_start(message):
    if not is_admin(message):
        bot.reply_to(message, "Unauthorized.")
        return

    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add("/status", "/trigger_news", "/start_bot", "/stop_bot")

    bot.reply_to(
        message,
        "Twitter AI Bot Control Panel\n\n"
        "Commands:\n"
        "/status - Check bot status\n"
        "/trigger_news <topic> - Post a news thread\n"
        "/start_bot - Start the automated bot cycle\n"
        "/stop_bot - Stop the bot cycle\n",
        reply_markup=markup,
    )


@bot.message_handler(commands=["status"])
def handle_status(message):
    if not is_admin(message):
        bot.reply_to(message, "Unauthorized.")
        return

    status_text = (
        f"Bot Status\n"
        f"Running: {bot_state['running']}\n"
        f"Logged in: {bot_state['logged_in']}\n"
        f"Tweets liked: {bot_state['tweets_liked']}\n"
        f"Tweets replied: {bot_state['tweets_replied']}\n"
    )

    if bot_state["errors"]:
        last_err = bot_state["errors"][-1][:200]
        status_text += f"\nLast error: {last_err}"

    bot.reply_to(message, status_text)


@bot.message_handler(commands=["trigger_news"])
def handle_trigger_news(message):
    if not is_admin(message):
        bot.reply_to(message, "Unauthorized.")
        return

    parts = message.text.split(maxsplit=1)
    if len(parts) < 2:
        bot.reply_to(message, "Usage: /trigger_news <news topic or URL>")
        return

    topic = parts[1].strip()
    bot.reply_to(message, f"Generating and posting news thread about: {topic}\nPlease wait...")

    async def _post():
        thread_parts = await ai.generate_news_thread(topic)
        if not thread_parts:
            bot.send_message(message.chat.id, "Failed to generate thread content.")
            return

        preview = "\n\n".join(thread_parts)
        bot.send_message(message.chat.id, f"Thread preview:\n\n{preview[:1000]}")

        success = await post_news_thread(thread_parts)
        if success:
            bot.send_message(message.chat.id, "Thread posted successfully!")
        else:
            bot.send_message(
                message.chat.id,
                "Failed to post thread. Check debug screenshots."
            )

    if _loop and _loop.is_running():
        asyncio.run_coroutine_threadsafe(_post(), _loop)
    else:
        asyncio.run(_post())


@bot.message_handler(commands=["start_bot"])
def handle_start_bot(message):
    if not is_admin(message):
        bot.reply_to(message, "Unauthorized.")
        return

    global _bot_task

    if bot_state["running"]:
        bot.reply_to(message, "Bot is already running!")
        return

    bot.reply_to(message, "Starting Twitter bot cycle...")

    async def _run_loop():
        while True:
            try:
                await run_bot_cycle(ai)
            except Exception as e:
                logger.error(f"Bot cycle error: {e}")
                await asyncio.sleep(300)

    if _loop and _loop.is_running():
        _bot_task = asyncio.run_coroutine_threadsafe(_run_loop(), _loop)
    else:
        logger.warning("Event loop not running yet.")


@bot.message_handler(commands=["stop_bot"])
def handle_stop_bot(message):
    if not is_admin(message):
        bot.reply_to(message, "Unauthorized.")
        return

    global _bot_task
    if _bot_task:
        _bot_task.cancel()
        _bot_task = None
        bot_state["running"] = False
        bot.reply_to(message, "Bot stopped.")
    else:
        bot.reply_to(message, "Bot is not running.")


async def start_telegram_bot():
    global _loop
    _loop = asyncio.get_event_loop()

    logger.info("Clearing webhook and pending updates...")
    bot.delete_webhook(drop_pending_updates=True)

    logger.info("Starting Telegram bot polling...")

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: bot.infinity_polling(timeout=30, long_polling_timeout=30),
    )


async def main():
    logger.info("Twitter AI Agent starting up...")
    logger.info("Waiting for Telegram commands...")

    await start_telegram_bot()


if __name__ == "__main__":
    asyncio.run(main())
