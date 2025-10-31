'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import DataTimestamp from '@/components/DataTimestamp';
import WebSocketStatus from '@/components/WebSocketStatus';
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

  const gainers = (topMovers?.data?.tickers || [])
    .filter((t: MarketMover) => t.todaysChangePerc > 0)
    .sort((a: MarketMover, b: MarketMover) => b.todaysChangePerc - a.todaysChangePerc)
    .slice(0, 10);

  const losers = (topMovers?.data?.tickers || [])
    .filter((t: MarketMover) => t.todaysChangePerc < 0)
    .sort((a: MarketMover, b: MarketMover) => a.todaysChangePerc - b.todaysChangePerc)
    .slice(0, 10);

  const mostActive = (topMovers?.data?.tickers || [])
    .sort((a: MarketMover, b: MarketMover) => b.day.v - a.day.v)
    .slice(0, 10);

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

      {/* Market Status Banner */}
      <div
        className={`rounded-lg p-4 ${
          isMarketOpen
            ? 'bg-success/10 border border-success'
            : 'bg-gray-800 border border-gray-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isMarketOpen ? 'bg-success animate-pulse' : 'bg-gray-500'
              }`}
            />
            <span className="text-white font-semibold">
              US Market is {isMarketOpen ? 'OPEN' : 'CLOSED'}
            </span>
               <div className="flex items-start justify-between">     
                 <WebSocketStatus />
              </div>
          </div>
          {marketStatus && (
            <DataTimestamp
              timestamp={marketStatus.asOf}
              source={marketStatus.source}
              degraded={marketStatus.degraded}
              latencyMs={marketStatus.latencyMs}
            />
          )}
        </div>
      </div>
      
      {/* Top Movers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gainers */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-success mb-4">
            Top Gainers 📈
          </h2>
          <div className="min-h-[500px]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div key={i} className="h-16 bg-gray-800 rounded skeleton" />
                ))}
              </div>
            ) : gainers.length === 0 ? (
              <div className="flex items-center justify-center h-[500px] text-gray-400">
                <p>No gainers data available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {gainers.map((mover: MarketMover, idx: number) => {
                  const currentPrice = getCurrentPrice(mover.ticker, mover.day.c);
                  const isRealtime = realtimePrices[mover.ticker] !== undefined;
                  
                  return (
                    <div
                      key={mover.ticker}
                      onClick={() => handleTickerClick(mover.ticker)}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-mono text-sm w-6">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {mover.ticker}
                            </span>
                            {isRealtime && (
                              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" title="Live" />
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            ${currentPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-success font-semibold">
                          +{mover.todaysChangePerc.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-400">
                          Vol: {(mover.day.v / 1000000).toFixed(1)}M
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Losers */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-danger mb-4">Top Losers 📉</h2>
          <div className="min-h-[500px]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div key={i} className="h-16 bg-gray-800 rounded skeleton" />
                ))}
              </div>
            ) : losers.length === 0 ? (
              <div className="flex items-center justify-center h-[500px] text-gray-400">
                <p>No losers data available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {losers.map((mover: MarketMover, idx: number) => {
                  const currentPrice = getCurrentPrice(mover.ticker, mover.day.c);
                  const isRealtime = realtimePrices[mover.ticker] !== undefined;
                  
                  return (
                    <div
                      key={mover.ticker}
                      onClick={() => handleTickerClick(mover.ticker)}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-mono text-sm w-6">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {mover.ticker}
                            </span>
                            {isRealtime && (
                              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" title="Live" />
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            ${currentPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-danger font-semibold">
                          {mover.todaysChangePerc.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-400">
                          Vol: {(mover.day.v / 1000000).toFixed(1)}M
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Most Active */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-primary-400 mb-4">Most Active 🔥</h2>
          <div className="min-h-[500px]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div key={i} className="h-16 bg-gray-800 rounded skeleton" />
                ))}
              </div>
            ) : mostActive.length === 0 ? (
              <div className="flex items-center justify-center h-[500px] text-gray-400">
                <p>No active stocks data available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mostActive.map((mover: MarketMover, idx: number) => {
                  const currentPrice = getCurrentPrice(mover.ticker, mover.day.c);
                  const isRealtime = realtimePrices[mover.ticker] !== undefined;
                  
                  return (
                    <div
                      key={mover.ticker}
                      onClick={() => handleTickerClick(mover.ticker)}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-mono text-sm w-6">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {mover.ticker}
                            </span>
                            {isRealtime && (
                              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" title="Live" />
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            ${currentPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${mover.todaysChangePerc >= 0 ? 'text-success' : 'text-danger'}`}>
                          {mover.todaysChangePerc >= 0 ? '+' : ''}{mover.todaysChangePerc.toFixed(2)}%
                        </div>
                        <div className="text-sm text-primary-400">
                          Vol: {(mover.day.v / 1000000).toFixed(1)}M
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
