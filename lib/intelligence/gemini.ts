// ============================================================
// READSX — Gemini AI Intelligence Layer
// Trend synthesis, content generation, visual analysis
// ============================================================

import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import type { PersonaTone, PersonaConfig, TrendItem, GeneratedContent } from '@/types';
import { v4 as uuid } from 'uuid';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ── Persona Configurations ────────────────────────────────────

export const PERSONAS: Record<PersonaTone, PersonaConfig> = {
  witty: {
    id: 'witty',
    label: 'Witty / Sarcastic',
    description: 'High engagement, memes, viral hooks, cutting humor',
    icon: '🎭',
    systemPrompt: `You are a witty, sharp, slightly sarcastic social media strategist. 
Your tweets are punchy, surprising, and often end with an unexpected twist or relatable observation.
You use irony effectively. You avoid cringe. You write like someone who is genuinely online and clever.
Keep tweets under 280 characters. Never explain the joke.`,
    hashtagStyle: ['#viral', '#relatable', '#facts'],
    engagementStyle: 'high-engagement viral content',
  },
  professional: {
    id: 'professional',
    label: 'Professional / Analytic',
    description: 'B2B authority, thought leadership, data-driven insights',
    icon: '📊',
    systemPrompt: `You are a professional analyst and thought leader in technology and business.
Your tweets deliver clear, actionable insights backed by data and logic.
You write with authority but accessibility. No jargon for its own sake.
Format: Lead with the insight, support with evidence, end with implication or CTA.
Keep tweets under 280 characters. Sound like someone worth following for their brain.`,
    hashtagStyle: ['#tech', '#business', '#innovation'],
    engagementStyle: 'thought leadership B2B content',
  },
  techguru: {
    id: 'techguru',
    label: 'Tech Guru',
    description: 'Deep-dive AI, coding, system design, developer culture',
    icon: '⚡',
    systemPrompt: `You are a senior software engineer and AI researcher who tweets with depth and precision.
You explain complex technical concepts in ways that make developers go "oh wow, I never thought of it that way."
You share genuine insights about coding, AI, system design, and developer tooling.
Sometimes you share hot takes. Always technically accurate.
Keep tweets under 280 characters. Sound like someone in the trenches, not a content farm.`,
    hashtagStyle: ['#coding', '#AI', '#devtools', '#systemdesign'],
    engagementStyle: 'technical deep-dive developer content',
  },
};

// ── Model Instances ───────────────────────────────────────────

function getFlashModel() {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

function getVisionModel() {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

// ── Trend Synthesis ───────────────────────────────────────────

export async function synthesizeTrends(
  rawItems: Array<{ title: string; source: string; summary: string; url?: string }>,
  tone: PersonaTone
): Promise<TrendItem[]> {
  const model = getFlashModel();
  const persona = PERSONAS[tone];

  const prompt = `You are a viral content strategist. Analyze these trending topics and generate compelling tweet hooks.

PERSONA: ${persona.label} — ${persona.description}

TRENDING TOPICS:
${rawItems.map((item, i) => `${i + 1}. [${item.source}] ${item.title}\n   ${item.summary}`).join('\n\n')}

For each topic, generate a viral hook optimized for ${persona.engagementStyle}.

Respond ONLY with valid JSON array:
[
  {
    "topic": "brief topic title",
    "suggestedHook": "the actual tweet hook (under 240 chars, no hashtags)",
    "score": 85,
    "tags": ["tag1", "tag2"],
    "source": "source_name"
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');

    const parsed: Array<{
      topic: string;
      suggestedHook: string;
      score: number;
      tags: string[];
      source: string;
    }> = JSON.parse(jsonMatch[0]);

    return parsed.map((item, i) => ({
      id: uuid(),
      topic: item.topic,
      source: (item.source || rawItems[i]?.source || 'news') as TrendItem['source'],
      score: item.score || 70,
      summary: rawItems[i]?.summary || '',
      suggestedHook: item.suggestedHook,
      generatedAt: Date.now(),
      tags: item.tags || [],
      url: rawItems[i]?.url,
    }));
  } catch (err) {
    console.error('[GEMINI] Trend synthesis error:', err);
    return [];
  }
}

// ── Content Generation ────────────────────────────────────────

export async function generateTweet(
  topic: string,
  tone: PersonaTone,
  context?: string
): Promise<GeneratedContent | null> {
  const model = getFlashModel();
  const persona = PERSONAS[tone];

  const prompt = `${persona.systemPrompt}

TOPIC: ${topic}
${context ? `CONTEXT: ${context}` : ''}

Generate a high-quality tweet for this topic.

Respond ONLY with valid JSON:
{
  "tweet": "the main tweet text (under 280 chars, NO hashtags in the main tweet)",
  "hashtags": ["tag1", "tag2", "tag3"],
  "estimatedEngagement": 75
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed: {
      tweet: string;
      hashtags: string[];
      estimatedEngagement: number;
    } = JSON.parse(jsonMatch[0]);

    return {
      id: uuid(),
      tweet: parsed.tweet,
      hashtags: parsed.hashtags,
      estimatedEngagement: parsed.estimatedEngagement,
      tone,
      topic,
      generatedAt: Date.now(),
    };
  } catch (err) {
    console.error('[GEMINI] Content generation error:', err);
    return null;
  }
}

// ── Thread Generation ─────────────────────────────────────────

export async function generateThread(
  topic: string,
  tone: PersonaTone,
  threadLength = 5
): Promise<string[]> {
  const model = getFlashModel();
  const persona = PERSONAS[tone];

  const prompt = `${persona.systemPrompt}

Generate a ${threadLength}-tweet thread about: ${topic}

Rules:
- Tweet 1: Hook that makes people NEED to read on
- Tweets 2-${threadLength - 1}: Substance, insights, or story beats
- Tweet ${threadLength}: Strong conclusion or CTA
- Each tweet under 280 chars
- Numbered (1/ 2/ etc.)

Respond ONLY with a JSON array of strings:
["tweet1 text", "tweet2 text", ...]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[GEMINI] Thread generation error:', err);
    return [];
  }
}

// ── Visual Analysis (Vision) ──────────────────────────────────

export async function analyzeTweetImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const model = getVisionModel();

  const imagePart: Part = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  const prompt = `Analyze this image from a tweet. Describe:
1. What's shown (objects, text, scene, data, memes, etc.)
2. The emotional tone or message
3. Any notable context (brands, events, cultural references)
4. Suggested reply angle (agree/disagree/add insight/humor)

Be concise. 3-4 sentences max.`;

  try {
    const result = await model.generateContent([prompt, imagePart]);
    return result.response.text();
  } catch (err) {
    console.error('[GEMINI] Vision analysis error:', err);
    return 'Unable to analyze image';
  }
}

// ── Smart Reply Generator ─────────────────────────────────────

export async function generateSmartReply(
  tweetText: string,
  imageAnalysis: string | null,
  tone: PersonaTone,
  replyStrategy: 'agree' | 'challenge' | 'add' | 'humor' = 'add'
): Promise<string> {
  const model = getFlashModel();
  const persona = PERSONAS[tone];

  const strategies = {
    agree: 'Agree with the tweet and add a complementary insight that deepens the point',
    challenge: 'Respectfully challenge or complicate the tweet with a thought-provoking counterpoint',
    add: 'Add genuinely valuable information or perspective that the original tweet missed',
    humor: 'Reply with a clever, on-brand witty response that adds levity without being dismissive',
  };

  const prompt = `${persona.systemPrompt}

ORIGINAL TWEET: "${tweetText}"
${imageAnalysis ? `IMAGE CONTEXT: ${imageAnalysis}` : ''}

REPLY STRATEGY: ${strategies[replyStrategy]}

Write a single reply tweet (under 240 chars). 
Make it feel authentic — like a real person replying, not a bot.
No emojis unless they really add value.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/^["']|["']$/g, '');
  } catch (err) {
    console.error('[GEMINI] Smart reply error:', err);
    return '';
  }
}

// ── Viral Hook Extractor ──────────────────────────────────────

export async function extractViralHooks(content: string, count = 3): Promise<string[]> {
  const model = getFlashModel();

  const prompt = `Extract ${count} viral tweet hooks from this content.

CONTENT: ${content}

Rules for each hook:
- Under 240 chars
- Creates curiosity gap OR delivers instant value OR challenges assumption
- First 10 words must stop the scroll

Respond ONLY with JSON array:
["hook1", "hook2", "hook3"]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[GEMINI] Hook extraction error:', err);
    return [];
  }
}
