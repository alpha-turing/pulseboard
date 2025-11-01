import { NextResponse } from 'next/server';
import { getTrendingTickers } from '@/lib/reddit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subreddits = searchParams.get('subreddits')?.split(',') || ['wallstreetbets', 'stocks', 'options'];

    console.log('[Social API] Fetching trending tickers from:', subreddits);

    const trending = await getTrendingTickers(subreddits);

    return NextResponse.json({
      data: trending,
      source: 'reddit',
      asOf: new Date().toISOString(),
      subreddits,
    });
  } catch (error) {
    console.error('[Social API] Error fetching trending:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending tickers' },
      { status: 500 }
    );
  }
}
