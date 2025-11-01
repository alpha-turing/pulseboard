'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import WebSocketStatus from '@/components/WebSocketStatus';
import { useRealtimePrices } from '@/hooks/useRealtimePrice';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import { Card, Button, Badge } from '@/components/ui';
import { PriceDisplay, TickerBadge } from '@/components/financial';

interface TickerData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobile, isTablet } = useBreakpoint();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Fetch watchlist
  const { data: watchlistData, isLoading: watchlistLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await fetch('/api/watchlist');
      if (!res.ok) throw new Error('Failed to fetch watchlist');
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch price data for all tickers
  const { data: priceData } = useQuery({
    queryKey: ['watchlist-prices', watchlistData?.watchlist?.tickers],
    queryFn: async () => {
      const tickers = watchlistData?.watchlist?.tickers || [];
      if (tickers.length === 0) return [];

      const promises = tickers.map(async (ticker: string) => {
        try {
          // Get last 2 days of data to calculate proper day-over-day change
          const today = new Date();
          const twoDaysAgo = new Date(today);
          twoDaysAgo.setDate(today.getDate() - 5); // Get 5 days back to ensure we have 2 trading days
          
          const fromDate = twoDaysAgo.toISOString().split('T')[0];
          const toDate = today.toISOString().split('T')[0];
          
          const res = await fetch(
            `/api/polygon/aggregates?ticker=${ticker}&multiplier=1&timespan=day&from=${fromDate}&to=${toDate}`
          );
          const data = await res.json();
          const bars = data.data?.results || [];
          
          if (bars.length < 2) {
            // Fallback: use prev-close endpoint
            const prevRes = await fetch(`/api/polygon/prev-close?ticker=${ticker}`);
            const prevData = await prevRes.json();
            const bar = prevData.data?.results?.[0];
            
            if (!bar) return null;
            
            // For single bar, compare close to open as approximation
            const price = bar.c;
            const prevClose = bar.o;
            const change = price - prevClose;
            const changePercent = (change / prevClose) * 100;
            
            return { ticker, price, change, changePercent };
          }

          // Use last 2 bars to calculate day-over-day change
          const currentBar = bars[bars.length - 1]; // Most recent day
          const previousBar = bars[bars.length - 2]; // Previous day
          
          const price = currentBar.c; // Current close
          const prevClose = previousBar.c; // Previous day's close
          const change = price - prevClose;
          const changePercent = (change / prevClose) * 100;

          return { ticker, price, change, changePercent };
        } catch {
          return null;
        }
      });

      const results = await Promise.all(promises);
      return results.filter((r): r is TickerData => r !== null);
    },
    enabled: !!(watchlistData?.watchlist?.tickers?.length > 0),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Remove ticker mutation
  const removeMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch(`/api/watchlist?ticker=${ticker}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove ticker');
      return { ticker };
    },
    onSuccess: (data) => {
      showToast(`${data.ticker} removed from watchlist`, 'success');
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const tickers = watchlistData?.watchlist?.tickers || [];

  // Subscribe to real-time prices for all watchlist tickers
  // IMPORTANT: Call hooks before any conditional returns!
  const realtimePrices = useRealtimePrices(tickers, !!user && tickers.length > 0);

  // Helper to get current price (real-time if available, otherwise static)
  const getCurrentPrice = (ticker: string) => {
    const staticData = priceData?.find((d: TickerData) => d.ticker === ticker);
    return realtimePrices[ticker]?.price || staticData?.price || 0;
  };

  const getCurrentChange = (ticker: string) => {
    const staticData = priceData?.find((d: TickerData) => d.ticker === ticker);
    return staticData?.change || 0;
  };

  const getCurrentChangePercent = (ticker: string) => {
    const staticData = priceData?.find((d: TickerData) => d.ticker === ticker);
    return staticData?.changePercent || 0;
  };

  if (authLoading || watchlistLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-primary-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-gray-400 text-sm md:text-base">Loading watchlist...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-brand-primary-400 to-brand-secondary-400 bg-clip-text text-transparent">
            My Watchlist
          </h1>
          <p className="text-gray-400 text-sm md:text-base mt-1">Track your favorite tickers</p>
        </div>
        <WebSocketStatus />
      </div>

      {tickers.length === 0 ? (
        <Card variant="elevated" className="p-8 md:p-12 text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-gradient-to-r from-brand-primary-500/20 to-brand-secondary-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-brand-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-4 md:mb-6 text-sm md:text-base">Your watchlist is empty</p>
          <Link href="/instruments">
            <Button variant="primary" size={isMobile ? 'md' : 'lg'}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Instruments
            </Button>
          </Link>
        </Card>
      ) : isMobile ? (
        // Mobile card view
        <div className="space-y-3">
          {tickers.map((ticker: string) => {
            const currentPrice = getCurrentPrice(ticker);
            const change = getCurrentChange(ticker);
            const changePercent = getCurrentChangePercent(ticker);
            const isRealtime = realtimePrices[ticker] !== undefined;
            
            return (
              <Card key={ticker} variant="elevated" className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/instruments?ticker=${ticker}`}>
                    <div className="flex items-center gap-2">
                      <TickerBadge ticker={ticker} size="md" variant="gradient" />
                      {isRealtime && (
                        <Badge variant="success" size="sm">
                          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                          Live
                        </Badge>
                      )}
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMutation.mutate(ticker)}
                    disabled={removeMutation.isPending}
                    className="text-danger hover:text-danger/80"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
                <div className="flex items-end justify-between">
                  <PriceDisplay
                    price={currentPrice}
                    change={change}
                    changePercent={changePercent}
                    size="md"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        // Desktop table view
        <Card variant="elevated" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr>
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-gray-300 font-semibold text-sm md:text-base">Ticker</th>
                  <th className="text-right py-3 md:py-4 px-4 md:px-6 text-gray-300 font-semibold text-sm md:text-base">Price</th>
                  <th className="text-right py-3 md:py-4 px-4 md:px-6 text-gray-300 font-semibold text-sm md:text-base">Change</th>
                  <th className="text-right py-3 md:py-4 px-4 md:px-6 text-gray-300 font-semibold text-sm md:text-base">Change %</th>
                  <th className="text-right py-3 md:py-4 px-4 md:px-6 text-gray-300 font-semibold text-sm md:text-base">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickers.map((ticker: string) => {
                  const currentPrice = getCurrentPrice(ticker);
                  const change = getCurrentChange(ticker);
                  const changePercent = getCurrentChangePercent(ticker);
                  const isRealtime = realtimePrices[ticker] !== undefined;
                  
                  return (
                    <tr key={ticker} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 md:py-4 px-4 md:px-6">
                        <Link href={`/instruments?ticker=${ticker}`}>
                          <div className="flex items-center gap-2">
                            <TickerBadge ticker={ticker} size={isTablet ? 'sm' : 'md'} variant="gradient" />
                            {isRealtime && (
                              <Badge variant="success" size="sm">
                                <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                                Live
                              </Badge>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 md:py-4 px-4 md:px-6 text-right text-white font-mono text-sm md:text-base">
                        {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className={`py-3 md:py-4 px-4 md:px-6 text-right font-semibold font-mono text-sm md:text-base ${
                        change >= 0 ? 'text-gain' : 'text-loss'
                      }`}>
                        {currentPrice > 0 ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}` : '-'}
                      </td>
                      <td className={`py-3 md:py-4 px-4 md:px-6 text-right font-semibold font-mono text-sm md:text-base ${
                        changePercent >= 0 ? 'text-gain' : 'text-loss'
                      }`}>
                        {currentPrice > 0 ? `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%` : '-'}
                      </td>
                      <td className="py-3 md:py-4 px-4 md:px-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMutation.mutate(ticker)}
                          disabled={removeMutation.isPending}
                          className="text-danger hover:text-danger/80"
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
