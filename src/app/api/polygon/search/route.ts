import { NextResponse } from 'next/server';
import { getTickerReference } from '@/lib/polygon';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ results: [], count: 0 });
  }

  const response = await getTickerReference(query);

  return NextResponse.json({
    results: response.data.results,
    count: response.data.count,
    source: response.source,
    asOf: response.asOf,
    degraded: response.degraded,
  });
}
