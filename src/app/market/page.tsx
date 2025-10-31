'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTimestamp from '@/components/DataTimestamp';
import { hasApiKey } from '@/lib/polygon';

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
  const [activeTab, setActiveTab] = useState<'equity' | 'options' | 'crypto'>(
    'equity'
  );

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
    queryKey: ['top-movers', activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/polygon/snapshot`);
      return res.json();
    },
    refetchInterval: isMarketOpen ? 30000 : false, // Only refresh when market is open
  });

  const gainers = (topMovers?.data?.tickers || [])
    .filter((t: MarketMover) => t.todaysChangePerc > 0)
    .sort((a: MarketMover, b: MarketMover) => b.todaysChangePerc - a.todaysChangePerc)
    .slice(0, 5);

  const losers = (topMovers?.data?.tickers || [])
    .filter((t: MarketMover) => t.todaysChangePerc < 0)
    .sort((a: MarketMover, b: MarketMover) => a.todaysChangePerc - b.todaysChangePerc)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Market Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Real-time market data and top movers
        </p>
      </div>

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
              Market is {isMarketOpen ? 'OPEN' : 'CLOSED'}
            </span>
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

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex space-x-8">
          {['equity', 'options', 'crypto'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-4 px-1 font-medium capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-primary-500 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Top Movers Grid */}
      {!isMarketOpen && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <p className="text-blue-400 text-sm">
            📊 Showing top gainers and losers from previous trading day
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gainers */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-success mb-4">
            Top Gainers 📈
          </h2>
          <div className="min-h-[400px]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-800 rounded skeleton" />
                ))}
              </div>
            ) : gainers.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-gray-400">
                <p>No gainers data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gainers.map((mover: MarketMover, idx: number) => (
                  <div
                    key={mover.ticker}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 font-mono text-sm w-6">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-white">
                          {mover.ticker}
                        </div>
                        <div className="text-sm text-gray-400">
                          ${mover.day.c.toFixed(2)}
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Losers */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-danger mb-4">Top Losers 📉</h2>
          <div className="min-h-[400px]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-800 rounded skeleton" />
                ))}
              </div>
            ) : losers.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-gray-400">
                <p>No losers data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {losers.map((mover: MarketMover, idx: number) => (
                  <div
                    key={mover.ticker}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 font-mono text-sm w-6">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-white">
                          {mover.ticker}
                        </div>
                        <div className="text-sm text-gray-400">
                          ${mover.day.c.toFixed(2)}
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Events Stream - Placeholder */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Live Events 🔴 <span className="text-sm text-gray-400 font-normal">Coming soon</span>
        </h2>
        <div className="text-gray-400 text-sm">
          Real-time news and volume spikes will appear here. WebSocket integration in progress.
        </div>
      </div>
    </div>
  );
}
