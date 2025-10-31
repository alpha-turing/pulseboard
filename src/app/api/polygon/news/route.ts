import { NextResponse } from 'next/server';
import { getNews } from '@/lib/polygon';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker') || undefined;
  const limit = parseInt(searchParams.get('limit') || '10');
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

  const response = await getNews({ ticker, limit, order });

  return NextResponse.json({
    data: response.data,
    source: response.source,
    asOf: response.asOf,
    latencyMs: response.latencyMs,
    degraded: response.degraded,
  });
}
