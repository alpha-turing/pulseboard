import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const type = searchParams.get('type') || 'csv';

  // TODO: Implement actual data export based on current view
  // For now, return sample CSV

  const csvData = `Ticker,Price,Change,Change%,Volume
${ticker || 'SAMPLE'},150.00,+5.00,+3.45%,1000000
AAPL,175.50,+2.30,+1.33%,50000000
TSLA,250.00,-10.00,-3.85%,75000000`;

  if (type === 'csv') {
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pulseboard-export-${
          ticker || 'market'
        }-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({
    format: type,
    data: csvData,
  });
}
