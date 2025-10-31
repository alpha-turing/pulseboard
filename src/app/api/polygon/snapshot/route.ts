import { NextResponse } from 'next/server';
import { getTickersSnapshot } from '@/lib/polygon';

export async function GET() {
  const response = await getTickersSnapshot();

  return NextResponse.json({
    data: response.data,
    source: response.source,
    asOf: response.asOf,
    latencyMs: response.latencyMs,
    degraded: response.degraded,
  });
}
