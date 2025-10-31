'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  if (authLoading || watchlistLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tickers = watchlistData?.watchlist?.tickers || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">My Watchlist</h1>
        <p className="text-gray-400 mt-1">Track your favorite tickers</p>
      </div>

      {tickers.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
          <p className="text-gray-400 mb-4">Your watchlist is empty</p>
          <Link
            href="/instruments"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Browse Instruments
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="text-left py-3 px-6 text-gray-300 font-semibold">Ticker</th>
                <th className="text-right py-3 px-6 text-gray-300 font-semibold">Price</th>
                <th className="text-right py-3 px-6 text-gray-300 font-semibold">Change</th>
                <th className="text-right py-3 px-6 text-gray-300 font-semibold">Change %</th>
                <th className="text-right py-3 px-6 text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickers.map((ticker: string) => {
                const data = priceData?.find((d) => d.ticker === ticker);
                
                return (
                  <tr key={ticker} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-4 px-6">
                      <Link
                        href={`/instruments?ticker=${ticker}`}
                        className="text-primary-400 hover:text-primary-300 font-semibold"
                      >
                        {ticker}
                      </Link>
                    </td>
                    <td className="py-4 px-6 text-right text-white">
                      {data ? `$${data.price.toFixed(2)}` : '-'}
                    </td>
                    <td className={`py-4 px-6 text-right font-semibold ${
                      data && data.change >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {data ? `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}` : '-'}
                    </td>
                    <td className={`py-4 px-6 text-right font-semibold ${
                      data && data.changePercent >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {data ? `${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%` : '-'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => removeMutation.mutate(ticker)}
                        disabled={removeMutation.isPending}
                        className="text-danger hover:text-danger/80 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
