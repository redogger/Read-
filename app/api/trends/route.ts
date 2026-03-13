// ============================================================
// READSX — Trends API
// POST /api/trends — Fetch + synthesize trends via Gemini
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { aggregateTrends } from '@/lib/intelligence/trends';
import { synthesizeTrends } from '@/lib/intelligence/gemini';
import type { PersonaTone } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { tone = 'techguru' }: { tone: PersonaTone } = await req.json();

    console.log('[TRENDS API] Starting trend aggregation...');

    // Step 1: Aggregate raw trends
    const { rawItems, sources, fetchedAt } = await aggregateTrends();

    if (rawItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No trends fetched from any source',
        trends: [],
      });
    }

    // Step 2: Synthesize with Gemini
    const trends = await synthesizeTrends(rawItems, tone);

    return NextResponse.json({
      success: true,
      trends,
      meta: {
        total: trends.length,
        sources,
        tone,
        fetchedAt,
      },
    });
  } catch (err) {
    console.error('[TRENDS API] Error:', err);
    return NextResponse.json({ error: String(err), trends: [] }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST with { tone: "witty" | "professional" | "techguru" }',
  });
}
