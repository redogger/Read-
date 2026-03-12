import os
import logging
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

REPLY_SYSTEM_PROMPT = """You are a witty, sarcastic yet friendly Twitter/X user.
Your replies should be:
- Short (under 280 characters)
- Engaging and conversational
- Sometimes sarcastic but always friendly
- Never offensive or harmful
- Relevant to the tweet content
- Natural, like a real person would write

Return ONLY the reply text, nothing else."""

NEWS_THREAD_PROMPT = """You are a tech-savvy Twitter journalist creating a news thread.
Format the news as a Twitter thread where:
- Each tweet is under 260 characters (leave room for thread numbering)
- First tweet is a hook that grabs attention
- Include 4-6 tweets maximum
- End with a thought-provoking question or call to action
- Use relevant hashtags (2-3 max per tweet)
- Write like a human journalist, not a robot

Return ONLY the tweets, one per line, separated by '---TWEET---'"""


class AIHandler:
    def __init__(self):
        if not GEMINI_API_KEY:
            logger.warning(
                "GEMINI_API_KEY not set. AI features will be disabled."
            )
            self._enabled = False
            return

        self._client = genai.Client(api_key=GEMINI_API_KEY)
        self._model = "gemini-2.0-flash"
        self._enabled = True
        logger.info("Gemini AI (google-genai) initialized successfully.")

    def _generate(self, prompt: str) -> str:
        response = self._client.models.generate_content(
            model=self._model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.9,
                max_output_tokens=512,
            ),
        )
        return response.text.strip()

    async def generate_reply(self, tweet_text: str) -> str | None:
        if not self._enabled:
            logger.warning("AI disabled - no GEMINI_API_KEY")
            return None

        try:
            prompt = f"{REPLY_SYSTEM_PROMPT}\n\nTweet to reply to:\n{tweet_text}"
            reply = self._generate(prompt)

            if len(reply) > 280:
                reply = reply[:277] + "..."

            logger.info(f"Generated reply: {reply[:80]}...")
            return reply
        except Exception as e:
            logger.error(f"Error generating reply: {e}")
            return None

    async def generate_news_thread(self, news_topic: str) -> list[str]:
        if not self._enabled:
            logger.warning("AI disabled - no GEMINI_API_KEY")
            return [f"Breaking: {news_topic} #news"]

        try:
            prompt = f"{NEWS_THREAD_PROMPT}\n\nNews topic:\n{news_topic}"
            raw = self._generate(prompt)

            parts = [p.strip() for p in raw.split("---TWEET---") if p.strip()]

            numbered = []
            for i, part in enumerate(parts, 1):
                prefix = f"{i}/{len(parts)} "
                tweet = prefix + part if not part.startswith(prefix) else part
                if len(tweet) > 280:
                    tweet = tweet[:277] + "..."
                numbered.append(tweet)

            logger.info(f"Generated thread with {len(numbered)} tweets.")
            return numbered
        except Exception as e:
            logger.error(f"Error generating news thread: {e}")
            return [f"Breaking news: {news_topic[:200]} #news"]

    async def summarize_text(self, text: str, max_chars: int = 200) -> str:
        if not self._enabled:
            return text[:max_chars]

        try:
            prompt = f"Summarize this in under {max_chars} characters:\n{text}"
            return self._generate(prompt)[:max_chars]
        except Exception as e:
            logger.error(f"Error summarizing: {e}")
            return text[:max_chars]
