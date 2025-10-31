import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/watchlist
 * Get user's watchlist
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create default watchlist
    let watchlist = await db.watchlist.findFirst({
      where: { userId: currentUser.userId },
    });

    if (!watchlist) {
      watchlist = await db.watchlist.create({
        data: {
          name: 'My Watchlist',
          tickers: JSON.stringify([]),
          userId: currentUser.userId,
        },
      });
    }

    return NextResponse.json({
      watchlist: {
        id: watchlist.id,
        name: watchlist.name,
        tickers: JSON.parse(watchlist.tickers),
      },
    });
  } catch (error) {
    console.error('[Watchlist] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/watchlist
 * Add ticker to watchlist
 */
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { ticker } = await request.json();

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker is required' },
        { status: 400 }
      );
    }

    // Get or create watchlist
    let watchlist = await db.watchlist.findFirst({
      where: { userId: currentUser.userId },
    });

    if (!watchlist) {
      watchlist = await db.watchlist.create({
        data: {
          name: 'My Watchlist',
          tickers: JSON.stringify([ticker]),
          userId: currentUser.userId,
        },
      });
    } else {
      const tickers = JSON.parse(watchlist.tickers);
      
      if (tickers.includes(ticker)) {
        return NextResponse.json(
          { error: 'Ticker already in watchlist' },
          { status: 400 }
        );
      }

      tickers.push(ticker);
      
      watchlist = await db.watchlist.update({
        where: { id: watchlist.id },
        data: { tickers: JSON.stringify(tickers) },
      });
    }

    return NextResponse.json({
      watchlist: {
        id: watchlist.id,
        name: watchlist.name,
        tickers: JSON.parse(watchlist.tickers),
      },
    });
  } catch (error) {
    console.error('[Watchlist] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add ticker' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/watchlist
 * Remove ticker from watchlist
 */
export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker is required' },
        { status: 400 }
      );
    }

    const watchlist = await db.watchlist.findFirst({
      where: { userId: currentUser.userId },
    });

    if (!watchlist) {
      return NextResponse.json(
        { error: 'Watchlist not found' },
        { status: 404 }
      );
    }

    const tickers = JSON.parse(watchlist.tickers);
    const updatedTickers = tickers.filter((t: string) => t !== ticker);

    const updatedWatchlist = await db.watchlist.update({
      where: { id: watchlist.id },
      data: { tickers: JSON.stringify(updatedTickers) },
    });

    return NextResponse.json({
      watchlist: {
        id: updatedWatchlist.id,
        name: updatedWatchlist.name,
        tickers: JSON.parse(updatedWatchlist.tickers),
      },
    });
  } catch (error) {
    console.error('[Watchlist] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove ticker' },
      { status: 500 }
    );
  }
}
