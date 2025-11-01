import { NextResponse } from 'next/server';
import { getTickerMentions } from '@/lib/reddit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const subreddits = searchParams.get('subreddits')?.split(',') || ['wallstreetbets', 'stocks', 'options'];
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Social API] Fetching mentions for ${ticker} from:`, subreddits);

    const mentions = await getTickerMentions(ticker.toUpperCase(), subreddits, limit);

    return NextResponse.json({
      data: {
        ticker: ticker.toUpperCase(),
        mentions,
        total: mentions.length,
      },
      source: 'reddit',
      asOf: new Date().toISOString(),
      subreddits,
    });
  } catch (error) {
    console.error('[Social API] Error fetching mentions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticker mentions' },
      { status: 500 }
    );
  }
}
