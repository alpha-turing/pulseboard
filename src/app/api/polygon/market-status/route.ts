import { NextResponse } from 'next/server';
import { getMarketStatus } from '@/lib/polygon';

export async function GET() {
  const response = await getMarketStatus();

  return NextResponse.json({
    data: response.data,
    source: response.source,
    asOf: response.asOf,
    latencyMs: response.latencyMs,
    degraded: response.degraded,
  });
}
