'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import DataTimestamp from '@/components/DataTimestamp';
import WebSocketStatus from '@/components/WebSocketStatus';
import { useRealtimePrice } from '@/hooks/useRealtimePrice';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

function InstrumentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTicker, setSelectedTicker] = useState(searchParams.get('ticker') || 'AAPL');
  const [showExplanation, setShowExplanation] = useState(false);

  // Update selected ticker when URL params change
  useEffect(() => {
    const ticker = searchParams.get('ticker');
    if (ticker) {
      setSelectedTicker(ticker);
      setShowExplanation(false); // Reset explanation when ticker changes
    }
  }, [searchParams]);

  // Get date range for last 30 days (for daily chart)
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  // Fetch ticker aggregates (chart data) - using daily bars since free tier doesn't have minute data
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['aggregates', selectedTicker],
    queryFn: async () => {
      const res = await fetch(
        `/api/polygon/aggregates?ticker=${selectedTicker}&multiplier=1&timespan=day&from=${thirtyDaysAgo}&to=${today}`
      );
      return res.json();
    },
    enabled: !!selectedTicker,
  });

  // Fetch news
  const { data: newsData } = useQuery({
    queryKey: ['news', selectedTicker],
    queryFn: async () => {
      const res = await fetch(`/api/polygon/news?ticker=${selectedTicker}&limit=10`);
      return res.json();
    },
    enabled: !!selectedTicker,
  });

  // Fetch user's watchlist to check if ticker is already added
  const { data: watchlistData } = useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await fetch('/api/watchlist');
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user, // Only fetch if user is logged in
  });

  // Check if current ticker is in watchlist
  const isInWatchlist = watchlistData?.watchlist?.tickers?.includes(selectedTicker) || false;

  // Fetch explanation
  const { data: explanation, isLoading: explainLoading, refetch: refetchExplanation } = useQuery({
    queryKey: ['explanation', selectedTicker],
    queryFn: async () => {
      const res = await fetch(`/api/explain?ticker=${selectedTicker}`);
      return res.json();
    },
    enabled: false, // Only fetch when user clicks
  });

  const handleExplain = () => {
    setShowExplanation(true);
    refetchExplanation();
  };

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add to watchlist');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast(`${selectedTicker} added to watchlist!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('already in watchlist')) {
        showToast(`${selectedTicker} is already in your watchlist`, 'info');
      } else {
        showToast(error.message, 'error');
      }
    },
  });

  const handleAddToWatchlist = () => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push('/auth/login');
      return;
    }
    
    addToWatchlistMutation.mutate(selectedTicker);
  };

  // Process chart data (daily bars)
  const chartPoints: Array<{ time: string; price: number; volume: number; high: number; low: number }> = (chartData?.data?.results || []).map((bar: any) => ({
    time: new Date(bar.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: bar.c,
    volume: bar.v,
    high: bar.h,
    low: bar.l,
  }));

  // Get price data from chart data (last 2 days for day-over-day change)
  const bars = chartData?.data?.results || [];
  const staticCurrentPrice = bars.length > 0 ? bars[bars.length - 1]?.c || 0 : 0;
  const prevDayClose = bars.length > 1 ? bars[bars.length - 2]?.c || staticCurrentPrice : staticCurrentPrice;
  
  // Subscribe to real-time price updates
  const { data: realtimeData, isConnected } = useRealtimePrice(selectedTicker, true);
  
  // Use real-time price if available, otherwise use static price from chart data
  const currentPrice = realtimeData?.price || staticCurrentPrice;
  const change = currentPrice - prevDayClose;
  const changePercent = prevDayClose > 0 ? (change / prevDayClose) * 100 : 0;

  // Get high/low/volume from latest bar (or real-time if available)
  const latestBar = bars.length > 0 ? bars[bars.length - 1] : null;
  const high = realtimeData?.high || latestBar?.h || currentPrice;
  const low = realtimeData?.low || latestBar?.l || currentPrice;
  const volume = realtimeData?.accumulated_volume || latestBar?.v || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Instruments</h1>
          <p className="text-gray-400 mt-1">Search, analyze, and monitor instruments</p>
        </div>
        <WebSocketStatus />
      </div>

      {/* Selected Ticker Display */}
      {selectedTicker && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-4xl font-bold text-white">{selectedTicker}</h2>
                {realtimeData && (
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" title="Live data" />
                )}
              </div>
              <p className="text-gray-400 mt-1">{selectedTicker} Inc.</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">${currentPrice.toFixed(2)}</div>
              <div className={`text-lg font-semibold ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Additional metrics */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-800">
            <div>
              <div className="text-gray-400 text-sm">High</div>
              <div className="text-white font-semibold">${high.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Low</div>
              <div className="text-white font-semibold">${low.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Volume</div>
              <div className="text-white font-semibold">{(volume / 1000000).toFixed(2)}M</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Prev Close</div>
              <div className="text-white font-semibold">${prevDayClose.toFixed(2)}</div>
            </div>
          </div>

          {chartData && (
            <div className="mt-4">
              <DataTimestamp
                timestamp={chartData.asOf}
                source={chartData.source}
                degraded={chartData.degraded}
                latencyMs={chartData.latencyMs}
              />
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-xl font-bold text-white mb-4">30-Day Price Chart</h3>
        {chartLoading ? (
          <div className="h-64 bg-gray-800 rounded skeleton" />
        ) : chartPoints.length > 0 ? (
          <HighchartsReact
            highcharts={Highcharts}
            options={{
              chart: {
                type: 'line',
                backgroundColor: 'transparent',
                height: 300,
              },
              title: {
                text: '',
              },
              xAxis: {
                categories: chartPoints.map((p) => p.time),
                labels: {
                  style: {
                    color: '#9ca3af',
                  },
                },
                gridLineColor: '#374151',
              },
              yAxis: {
                title: {
                  text: 'Price (USD)',
                  style: {
                    color: '#9ca3af',
                  },
                },
                labels: {
                  style: {
                    color: '#9ca3af',
                  },
                },
                gridLineColor: '#374151',
              },
              series: [{
                name: selectedTicker,
                data: chartPoints.map((p) => p.price),
                color: '#3b82f6',
                lineWidth: 2,
                marker: {
                  enabled: false,
                },
              }],
              tooltip: {
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                style: {
                  color: '#fff',
                },
                valuePrefix: '$',
              },
              legend: {
                enabled: false,
              },
              credits: {
                enabled: false,
              },
            }}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No chart data available
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleExplain}
          disabled={explainLoading}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {explainLoading ? 'Analyzing...' : '🔍 Explain this move'}
        </button>
        <button
          onClick={handleAddToWatchlist}
          disabled={isInWatchlist}
          className={`flex-1 font-semibold py-3 px-6 rounded-lg transition-colors ${
            isInWatchlist 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
              : 'bg-success hover:bg-success/90 text-white'
          }`}
        >
          {isInWatchlist ? '✓ In Watchlist' : '⭐ Add to Watchlist'}
        </button>
      </div>

      {/* Explanation */}
      {showExplanation && explanation && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Analysis</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              explanation.confidence === 'high' ? 'bg-success/20 text-success' :
              explanation.confidence === 'medium' ? 'bg-warning/20 text-warning' :
              'bg-gray-700 text-gray-300'
            }`}>
              {explanation.confidence} confidence
            </span>
          </div>
          <p className="text-gray-300 text-lg mb-4">{explanation.explanation}</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Change</div>
              <div className={`text-2xl font-bold ${explanation.change >= 0 ? 'text-success' : 'text-danger'}`}>
                {explanation.change >= 0 ? '+' : ''}{explanation.change.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Change %</div>
              <div className={`text-2xl font-bold ${explanation.changePercent >= 0 ? 'text-success' : 'text-danger'}`}>
                {explanation.changePercent >= 0 ? '+' : ''}{explanation.changePercent.toFixed(2)}%
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Volume Ratio</div>
              <div className={`text-2xl font-bold ${explanation.abnormalVolume ? 'text-warning' : 'text-white'}`}>
                {explanation.volumeRatio.toFixed(1)}x
              </div>
            </div>
          </div>
          {explanation.newsItems.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-2">Related News</h4>
              <ul className="space-y-2">
                {explanation.newsItems.slice(0, 3).map((item: any, idx: number) => (
                  <li key={idx} className="text-sm text-gray-400">
                    • {item.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* News Timeline */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-xl font-bold text-white mb-4">News Timeline</h3>
        {newsData?.data?.results && newsData.data.results.length > 0 ? (
          <div className="space-y-4">
            {newsData.data.results.map((article: any) => (
              <div key={article.id} className="border-l-2 border-primary-500 pl-4 py-2">
                <a
                  href={article.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-primary-400 font-semibold"
                >
                  {article.title}
                </a>
                <div className="text-sm text-gray-400 mt-1">
                  {article.publisher.name} • {new Date(article.published_utc).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">No recent news available</div>
        )}
      </div>

      {/* Options Tab - Placeholder */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-xl font-bold text-white mb-4">
          Options <span className="text-sm text-gray-400 font-normal">Coming soon</span>
        </h3>
        <div className="text-gray-400 text-sm">
          Options chain and IV analytics will be available in the next release.
        </div>
      </div>
    </div>
  );
}

export default function InstrumentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InstrumentsContent />
    </Suspense>
  );
}
