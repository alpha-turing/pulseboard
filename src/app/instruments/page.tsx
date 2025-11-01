'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import DataTimestamp from '@/components/DataTimestamp';
import WebSocketStatus from '@/components/WebSocketStatus';
import { useRealtimePrice } from '@/hooks/useRealtimePrice';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import PriceDisplay from '@/components/financial/PriceDisplay';
import TickerBadge from '@/components/financial/TickerBadge';
import StatCard from '@/components/financial/StatCard';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

function InstrumentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { isMobile } = useBreakpoint();
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

  // Add pulse animation to news event markers
  useEffect(() => {
    const styleId = 'news-pulse-animation';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.innerHTML = `
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .highcharts-scatter-series .highcharts-point {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    return () => {
      const el = document.getElementById(styleId);
      if (el) {
        el.remove();
      }
    };
  }, []);

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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-brand-primary-400 to-brand-secondary-400 bg-clip-text text-transparent">
            Instruments
          </h1>
          <p className="text-gray-400 text-sm md:text-base mt-1">Search, analyze, and monitor instruments</p>
        </div>
        <WebSocketStatus />
      </div>

      {/* Selected Ticker Display */}
      {selectedTicker && (
        <Card variant="elevated" className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <TickerBadge ticker={selectedTicker} size={isMobile ? 'md' : 'lg'} variant="gradient" />
                {realtimeData && (
                  <Badge variant="success" size="sm">
                    <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                    Live
                  </Badge>
                )}
              </div>
              <p className="text-gray-400 text-sm md:text-base">{selectedTicker} Inc.</p>
            </div>
            <div className="w-full sm:w-auto">
              <PriceDisplay 
                price={currentPrice} 
                changePercent={changePercent}
                size={isMobile ? 'md' : 'lg'}
              />
            </div>
          </div>

          {/* Additional metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-800">
            <div className="bg-gray-800/50 p-3 md:p-4 rounded-lg">
              <div className="text-gray-400 text-xs md:text-sm mb-1">High</div>
              <div className="text-white font-bold text-base md:text-lg font-mono">${high.toFixed(2)}</div>
            </div>
            <div className="bg-gray-800/50 p-3 md:p-4 rounded-lg">
              <div className="text-gray-400 text-xs md:text-sm mb-1">Low</div>
              <div className="text-white font-bold text-base md:text-lg font-mono">${low.toFixed(2)}</div>
            </div>
            <div className="bg-gray-800/50 p-3 md:p-4 rounded-lg">
              <div className="text-gray-400 text-xs md:text-sm mb-1">Volume</div>
              <div className="text-white font-bold text-base md:text-lg font-mono">{(volume / 1000000).toFixed(2)}M</div>
            </div>
            <div className="bg-gray-800/50 p-3 md:p-4 rounded-lg">
              <div className="text-gray-400 text-xs md:text-sm mb-1">Prev Close</div>
              <div className="text-white font-bold text-base md:text-lg font-mono">${prevDayClose.toFixed(2)}</div>
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
        </Card>
      )}

      {/* Chart */}
      <Card variant="elevated" className="p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold text-white mb-4">30-Day Price Chart</h3>
        {chartLoading ? (
          <Skeleton className="h-64 md:h-[300px] rounded-lg" />
        ) : chartPoints.length > 0 ? (
          <>
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
                series: [
                  {
                    id: 'dataseries',
                    name: selectedTicker,
                    data: chartPoints.map((p) => p.price),
                    color: '#3b82f6',
                    lineWidth: 2,
                    marker: {
                      enabled: false,
                    },
                  },
                  ...(newsData?.data?.results ? [{
                    type: 'scatter',
                    name: 'News Events',
                    cursor: 'pointer',
                    allowPointSelect: true,
                    point: {
                      events: {
                        click: function(this: any) {
                          window.open(this.url, '_blank');
                        }
                      }
                    },
                    data: (() => {
                      const newsPoints = newsData.data.results
                        .map((article: any) => {
                          const articleDate = new Date(article.published_utc);
                          const articleTimestamp = articleDate.getTime();
                          
                          // Find the closest chart point by date
                          let closestIndex = -1;
                          let minDiff = Infinity;
                          
                          chartPoints.forEach((point, idx) => {
                            const pointDate = new Date(chartData.data.results[idx].t);
                            const diff = Math.abs(pointDate.getTime() - articleTimestamp);
                            
                            // Only match if within the same day or very close (within 24 hours)
                            if (diff < 86400000 && diff < minDiff) {
                              minDiff = diff;
                              closestIndex = idx;
                            }
                          });
                          
                          if (closestIndex === -1) return null;
                          
                          return {
                            x: closestIndex,
                            y: chartPoints[closestIndex].price,
                            title: article.title,
                            description: article.description || '',
                            url: article.article_url,
                            publishedDate: articleDate.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            }),
                          };
                        })
                        .filter((point: any) => point !== null);
                      
                      return newsPoints;
                    })(),
                    color: '#10b981',
                    marker: {
                      enabled: true,
                      radius: 4,
                      symbol: 'circle',
                      fillColor: '#10b981',
                      lineWidth: 0,
                      lineColor: 'transparent',
                    },
                    className: 'news-pulse',
                    zIndex: 10,
                    showInLegend: true,
                    states: {
                      hover: {
                        marker: {
                          radius: 6,
                        },
                      },
                    },
                    tooltip: {
                      useHTML: true,
                      headerFormat: '',
                      pointFormatter: function(this: any) {
                        const titleWords = this.title.split(' ');
                        const truncatedTitle = titleWords.length > 3 
                          ? titleWords.slice(0, 3).join(' ') + '...' 
                          : this.title;
                        return `<div style="max-width: 200px;">
                          <div style="font-size: 9px; color: #9ca3af; margin-bottom: 4px;">${this.publishedDate}</div>
                          <a href="${this.url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #3b82f6; display: block;">
                            <div style="font-weight: 500; font-size: 12px; line-height: 1.3; margin-bottom: 4px;">${truncatedTitle}</div>
                            <div style="font-size: 9px; color: #9ca3af;">Click to read →</div>
                          </a>
                        </div>`;
                      },
                    },
                  }] : []),
                ],
              tooltip: {
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                style: {
                  color: '#fff',
                },
                valuePrefix: '$',
                useHTML: true,
              },
              legend: {
                enabled: false,
              },
              credits: {
                enabled: false,
              },
            }}
          />
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No chart data available
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <Button
          onClick={handleExplain}
          disabled={explainLoading}
          variant="primary"
          size={isMobile ? 'md' : 'lg'}
          className="flex-1"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {explainLoading ? 'Analyzing...' : 'Explain this move'}
        </Button>
        <Button
          onClick={handleAddToWatchlist}
          disabled={isInWatchlist}
          variant={isInWatchlist ? 'secondary' : 'success'}
          size={isMobile ? 'md' : 'lg'}
          className="flex-1"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </Button>
      </div>

      {/* Explanation */}
      {showExplanation && explanation && (
        <Card variant="elevated" className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-r from-brand-primary-500 to-brand-secondary-500 flex items-center justify-center">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white">Analysis</h3>
            </div>
            <Badge 
              variant={
                explanation.confidence === 'high' ? 'success' :
                explanation.confidence === 'medium' ? 'warning' :
                'neutral'
              }
              size={isMobile ? 'sm' : 'md'}
            >
              {explanation.confidence} confidence
            </Badge>
          </div>
          <p className="text-gray-300 text-base md:text-lg mb-4 md:mb-6">{explanation.explanation}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
            <StatCard
              title="Change"
              value={`${explanation.change >= 0 ? '+' : ''}${explanation.change.toFixed(2)}`}
              trend={explanation.change >= 0 ? 'up' : 'down'}
            />
            <StatCard
              title="Change %"
              value={`${explanation.changePercent >= 0 ? '+' : ''}${explanation.changePercent.toFixed(2)}%`}
              trend={explanation.changePercent >= 0 ? 'up' : 'down'}
            />
            <div className="bg-gray-800/50 p-3 md:p-4 rounded-lg">
              <div className="text-gray-400 text-xs md:text-sm mb-1">Volume Ratio</div>
              <div className={`text-xl md:text-2xl font-bold ${explanation.abnormalVolume ? 'text-warning' : 'text-white'}`}>
                {explanation.volumeRatio.toFixed(1)}x
              </div>
            </div>
          </div>
          {explanation.newsItems.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-2 md:mb-3">Related News</h4>
              <ul className="space-y-2">
                {explanation.newsItems.slice(0, 3).map((item: any, idx: number) => (
                  <li key={idx} className="text-xs md:text-sm text-gray-400 flex items-start">
                    <span className="text-brand-primary-400 mr-2">•</span>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* News Timeline */}
      <Card variant="elevated" className="p-4 md:p-6">
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-r from-brand-primary-500/20 to-brand-secondary-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-brand-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white">News Timeline</h3>
        </div>
        {newsData?.data?.results && newsData.data.results.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
            {newsData.data.results.map((article: any) => (
              <div key={article.id} className="border-l-2 border-brand-primary-500 pl-3 md:pl-4 py-2 hover:border-brand-primary-400 transition-colors">
                <a
                  href={article.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-brand-primary-400 font-semibold text-sm md:text-base transition-colors line-clamp-2"
                >
                  {article.title}
                </a>
                <div className="text-xs md:text-sm text-gray-400 mt-1 flex items-center gap-2">
                  <span>{article.publisher.name}</span>
                  <span className="text-gray-600">•</span>
                  <span>{new Date(article.published_utc).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm md:text-base">No recent news available</div>
        )}
      </Card>
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
