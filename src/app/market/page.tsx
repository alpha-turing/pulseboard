'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import DataTimestamp from '@/components/DataTimestamp';
import WebSocketStatus from '@/components/WebSocketStatus';
import NewsHeatmap from '@/components/NewsHeatmap';
import MarketMoversCarousel from '@/components/MarketMoversCarousel';
import { useRealtimePrices } from '@/hooks/useRealtimePrice';

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
    <div className="space-y-6">
      {/* Header */}     

      {/* Heatmap + Movers Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Heatmap - Takes 2 columns */}
        <div className="lg:col-span-2 bg-gray-900 rounded-lg border border-gray-800 p-6">       
          {heatmapData && Array.isArray(heatmapData) && heatmapData.length > 0 ? (
            <NewsHeatmap 
              data={heatmapData}
              onTickerClick={handleTickerClick}
            />
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-400">
              Loading news heatmap...
            </div>
          )}
        </div>

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
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              LIVE NEWS FEED
            </h2>
            <div className="text-xs text-white/80 font-mono">
              {newsData?.data?.results?.length || 0} stories
            </div>
          </div>
        </div>
        {newsData?.data?.results && newsData.data.results.length > 0 ? (
          <div className="max-h-[600px] overflow-y-auto">
            {newsData.data.results.slice(0, 20).map((article: any, index: number) => {
              const publishedDate = new Date(article.published_utc);
              const isRecent = Date.now() - publishedDate.getTime() < 3600000; // Last hour
              
              return (
                <a
                  key={article.id}
                  href={article.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex gap-4 p-5 border-b border-gray-800/50 hover:bg-gradient-to-r hover:from-gray-800/50 hover:to-transparent transition-all"
                >
                  {/* Left accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isRecent ? 'bg-gradient-to-b from-cyan-500 to-blue-500' : 'bg-gray-700'
                  }`} />

                  {/* Index number with gradient */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border border-purple-500/30 flex items-center justify-center">
                    <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: Tickers + Time */}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {article.tickers && article.tickers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {article.tickers.slice(0, 5).map((ticker: string) => (
                            <span 
                              key={ticker}
                              className="px-2 py-1 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/20 rounded hover:border-cyan-400/50 transition-colors"
                            >
                              {ticker}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs ml-auto">
                        {isRecent && (
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full font-semibold animate-pulse">
                            NEW
                          </span>
                        )}
                        <span className="text-gray-500 font-mono">
                          {publishedDate.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Headline with gradient on hover */}
                    <h3 className="text-white font-semibold text-base leading-tight mb-2 group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 group-hover:bg-clip-text group-hover:text-transparent transition-all line-clamp-2">
                      {article.title}
                    </h3>

                    {/* Description */}
                    {article.description && (
                      <p className="text-gray-400 text-sm leading-relaxed mb-2 line-clamp-2">
                        {article.description}
                      </p>
                    )}

                    {/* Bottom row: Publisher info */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center border border-purple-500/30">
                        <span className="text-xs font-bold text-purple-400">
                          {article.publisher.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-400">{article.publisher.name}</span>
                      {article.author && (
                        <>
                          <span className="text-gray-700">•</span>
                          <span className="truncate max-w-[200px]">{article.author}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail with gradient border */}
                  {article.image_url && (
                    <div className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-purple-500/50 transition-colors">
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
          <div className="text-gray-400 text-center py-12">No recent news available</div>
        )}
      </div>
    </div>
  );
}
