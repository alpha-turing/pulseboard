import { NextResponse } from 'next/server';
import { getPreviousClose } from '@/lib/polygon';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json(
      { error: 'Ticker parameter is required' },
      { status: 400 }
    );
  }

  const response = await getPreviousClose(ticker);

  return NextResponse.json({
    data: response.data,
    source: response.source,
    asOf: response.asOf,
    latencyMs: response.latencyMs,
    degraded: response.degraded,
  });
}
