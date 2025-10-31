import { NextResponse } from 'next/server';
import { explainMove } from '@/lib/explain';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json(
      { error: 'Ticker parameter is required' },
      { status: 400 }
    );
  }

  const explanation = await explainMove(ticker);

  return NextResponse.json(explanation);
}
