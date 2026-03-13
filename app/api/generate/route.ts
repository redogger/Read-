// ============================================================
// READSX — Content Generation API
// POST /api/generate
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  generateTweet,
  generateThread,
  generateSmartReply,
  extractViralHooks,
  analyzeTweetImage,
} from '@/lib/intelligence/gemini';
import type { PersonaTone } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, tone = 'techguru', topic, context, tweetText, imageBase64, replyStrategy, threadLength } = body;

    switch (action) {
      case 'tweet': {
        if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });
        const content = await generateTweet(topic, tone as PersonaTone, context);
        return NextResponse.json({ success: !!content, content });
      }

      case 'thread': {
        if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });
        const thread = await generateThread(topic, tone as PersonaTone, threadLength || 5);
        return NextResponse.json({ success: thread.length > 0, thread });
      }

      case 'reply': {
        if (!tweetText) return NextResponse.json({ error: 'tweetText required' }, { status: 400 });
        const imageAnalysis = imageBase64 ? await analyzeTweetImage(imageBase64) : null;
        const reply = await generateSmartReply(tweetText, imageAnalysis, tone as PersonaTone, replyStrategy);
        return NextResponse.json({ success: !!reply, reply, imageAnalysis });
      }

      case 'hooks': {
        if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });
        const hooks = await extractViralHooks(topic, 3);
        return NextResponse.json({ success: hooks.length > 0, hooks });
      }

      case 'analyze_image': {
        if (!imageBase64) return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 });
        const analysis = await analyzeTweetImage(imageBase64, body.mimeType || 'image/jpeg');
        return NextResponse.json({ success: true, analysis });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('[GENERATE API] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
