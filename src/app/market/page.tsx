'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import DataTimestamp from '@/components/DataTimestamp';
import WebSocketStatus from '@/components/WebSocketStatus';
import NewsHeatmap from '@/components/NewsHeatmap';
import MarketMoversCarousel from '@/components/MarketMoversCarousel';
import { useRealtimePrices } from '@/hooks/useRealtimePrice';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import TickerBadge from '@/components/financial/TickerBadge';
import { useBreakpoint } from '@/hooks/useMediaQuery';

interface MarketMover {
  ticker: string;
  todaysChangePerc: number;
  todaysChange: number;
  day: {
    c: number;
    v: number;
  };
}

interface MarketStatusData {
  market: string;
  serverTime: string;
  exchanges: {
    nasdaq: string;
    nyse: string;
    otc: string;
  };
}

export default function MarketPage() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();

  // Fetch market status
  const { data: marketStatus } = useQuery({
    queryKey: ['market-status'],
    queryFn: async () => {
      const res = await fetch('/api/polygon/market-status');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const isMarketOpen = marketStatus?.data?.market === 'open';

  // Fetch top movers - always fetch, but use previous day data when market is closed
  const { data: topMovers, isLoading } = useQuery({
    queryKey: ['top-movers'],
    queryFn: async () => {
      const res = await fetch(`/api/polygon/snapshot`);
      return res.json();
    },
    refetchInterval: isMarketOpen ? 30000 : false, // Only refresh when market is open
  });

  // Fetch market news
  const { data: newsData } = useQuery({
    queryKey: ['market-news'],
    queryFn: async () => {
      const res = await fetch(`/api/polygon/news?limit=20`);
      return res.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Fetch news heatmap data
  const { data: heatmapData } = useQuery({
    queryKey: ['news-heatmap'],
    queryFn: async () => {
      const res = await fetch('/api/news/heatmap?limit=100');
      return res.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const gainers = (topMovers?.data?.tickers || [])
    .filter((t: MarketMover) => t.todaysChangePerc > 0)
    .sort((a: MarketMover, b: MarketMover) => b.todaysChangePerc - a.todaysChangePerc)
    .slice(0, 5);

  const losers = (topMovers?.data?.tickers || [])
    .filter((t: MarketMover) => t.todaysChangePerc < 0)
    .sort((a: MarketMover, b: MarketMover) => a.todaysChangePerc - b.todaysChangePerc)
    .slice(0, 5);

  const mostActive = (topMovers?.data?.tickers || [])
    .sort((a: MarketMover, b: MarketMover) => b.day.v - a.day.v)
    .slice(0, 5);

  // Subscribe to real-time prices for all visible tickers
  // Use useMemo to prevent array from changing on every render (hook rules)
  const allTickers = useMemo(
    () => [...gainers, ...losers, ...mostActive].map(m => m.ticker),
    [gainers.length, losers.length, mostActive.length]
  );
  
  const realtimePrices = useRealtimePrices(allTickers, isMarketOpen);

  // Helper to get current price (real-time if available, otherwise static)
  const getCurrentPrice = (ticker: string, staticPrice: number) => {
    return realtimePrices[ticker]?.price || staticPrice;
  };

  const handleTickerClick = (ticker: string) => {
    router.push(`/instruments?ticker=${ticker}`);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Market Status Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-brand-primary-400 to-brand-secondary-400 bg-clip-text text-transparent mb-2">
            Market Overview
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge 
              variant={isMarketOpen ? 'success' : 'neutral'}
              size="md"
            >
              <span className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-success animate-pulse' : 'bg-gray-500'}`} />
              {isMarketOpen ? 'Market Open' : 'Market Closed'}
            </Badge>
            <span className="text-xs text-gray-500 font-mono">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
        <WebSocketStatus />
      </div>

      {/* Heatmap + Movers Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* News Heatmap - Takes 2 columns */}
        <Card className="lg:col-span-2 p-4 md:p-6" variant="elevated">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-brand-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              News Heatmap
            </h2>
            {heatmapData && Array.isArray(heatmapData) && (
              <Badge variant="primary" size="sm">
                {heatmapData.length} tickers
              </Badge>
            )}
          </div>
          {heatmapData && Array.isArray(heatmapData) && heatmapData.length > 0 ? (
            <NewsHeatmap 
              data={heatmapData}
              onTickerClick={handleTickerClick}
            />
          ) : (
            <div className="h-64 md:h-96 flex flex-col items-center justify-center text-gray-400">
              <div className="w-12 h-12 border-4 border-brand-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm">Loading news heatmap...</p>
            </div>
          )}
        </Card>

        {/* Market Movers Carousel - Takes 1 column */}
        <div className="lg:col-span-1">
          <MarketMoversCarousel
            gainers={gainers}
            losers={losers}
            mostActive={mostActive}
            isLoading={isLoading}
            realtimePrices={realtimePrices}
            getCurrentPrice={getCurrentPrice}
            onTickerClick={handleTickerClick}
          />
        </div>
      </div>

      {/* Market News Timeline - Innovative Design */}
      <Card className="overflow-hidden p-0" variant="elevated">
        <div className="bg-gradient-to-r from-brand-secondary-600 via-brand-primary-600 to-cyan-600 px-4 md:px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 md:gap-3">
              <span className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-white"></span>
              </span>
              <span className="hidden sm:inline">LIVE NEWS FEED</span>
              <span className="sm:hidden">NEWS</span>
            </h2>
            <Badge variant="neutral" size="sm">
              {newsData?.data?.results?.length || 0} stories
            </Badge>
          </div>
        </div>
        {newsData?.data?.results && newsData.data.results.length > 0 ? (
          <div className="max-h-[500px] md:max-h-[600px] overflow-y-auto">
            {newsData.data.results.slice(0, 20).map((article: any, index: number) => {
              const publishedDate = new Date(article.published_utc);
              const isRecent = Date.now() - publishedDate.getTime() < 3600000; // Last hour
              
              return (
                <a
                  key={article.id}
                  href={article.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex gap-3 md:gap-4 p-4 md:p-5 border-b border-gray-800/50 hover:bg-gradient-to-r hover:from-gray-800/50 hover:to-transparent transition-all"
                >
                  {/* Left accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isRecent ? 'bg-gradient-to-b from-cyan-500 to-blue-500' : 'bg-gray-700'
                  }`} />

                  {/* Index number with gradient - Hidden on mobile */}
                  <div className="hidden sm:flex flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-brand-secondary-600/20 to-cyan-600/20 border border-brand-secondary-500/30 items-center justify-center">
                    <span className="text-xs md:text-sm font-bold bg-gradient-to-r from-brand-secondary-400 to-cyan-400 bg-clip-text text-transparent">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: Tickers + Time */}
                    <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                      {article.tickers && article.tickers.length > 0 && (
                        <div className="flex flex-wrap gap-1 md:gap-1.5">
                          {article.tickers.slice(0, isMobile ? 3 : 5).map((ticker: string) => (
                            <TickerBadge
                              key={ticker}
                              ticker={ticker}
                              size="sm"
                              variant="gradient"
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5 md:gap-2 text-xs ml-auto">
                        {isRecent && (
                          <Badge variant="info" size="sm">
                            NEW
                          </Badge>
                        )}
                        <span className="text-gray-500 font-mono text-[10px] md:text-xs">
                          {publishedDate.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Headline with gradient on hover */}
                    <h3 className="text-white font-semibold text-sm md:text-base leading-tight mb-1.5 md:mb-2 group-hover:bg-gradient-to-r group-hover:from-brand-secondary-400 group-hover:to-cyan-400 group-hover:bg-clip-text group-hover:text-transparent transition-all line-clamp-2">
                      {article.title}
                    </h3>

                    {/* Description - Hidden on mobile */}
                    {article.description && (
                      <p className="hidden sm:block text-gray-400 text-xs md:text-sm leading-relaxed mb-2 line-clamp-2">
                        {article.description}
                      </p>
                    )}

                    {/* Bottom row: Publisher info */}
                    <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-gray-500">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-brand-secondary-600/30 to-cyan-600/30 flex items-center justify-center border border-brand-secondary-500/30">
                        <span className="text-[10px] md:text-xs font-bold text-brand-secondary-400">
                          {article.publisher.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-400 truncate max-w-[120px] md:max-w-none">{article.publisher.name}</span>
                      {article.author && !isMobile && (
                        <>
                          <span className="text-gray-700">•</span>
                          <span className="truncate max-w-[150px] md:max-w-[200px]">{article.author}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail with gradient border */}
                  {article.image_url && (
                    <div className="flex-shrink-0 w-20 h-16 md:w-32 md:h-24 rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-brand-secondary-500/50 transition-colors">
                      <img 
                        src={article.image_url} 
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-sm">No recent news available</p>
          </div>
        )}
      </Card>
    </div>
  );
}
