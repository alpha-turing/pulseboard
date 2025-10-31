import { NextResponse } from 'next/server';
import { getAggregates } from '@/lib/polygon';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const multiplier = parseInt(searchParams.get('multiplier') || '5');
  const timespan = (searchParams.get('timespan') || 'minute') as any;
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  if (!ticker || !from || !to) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  const response = await getAggregates(ticker, multiplier, timespan, from, to);

  return NextResponse.json({
    data: response.data,
    source: response.source,
    asOf: response.asOf,
    latencyMs: response.latencyMs,
    degraded: response.degraded,
  });
}
