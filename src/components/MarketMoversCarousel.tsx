'use client';

import { useState } from 'react';

interface MarketMover {
  ticker: string;
  todaysChangePerc: number;
  todaysChange: number;
  day: {
    c: number;
    v: number;
  };
}

interface MarketMoversCarouselProps {
  gainers: MarketMover[];
  losers: MarketMover[];
  mostActive: MarketMover[];
  isLoading: boolean;
  realtimePrices: Record<string, { price: number }>;
  getCurrentPrice: (ticker: string, staticPrice: number) => number;
  onTickerClick: (ticker: string) => void;
}

export default function MarketMoversCarousel({
  gainers,
  losers,
  mostActive,
  isLoading,
  realtimePrices,
  getCurrentPrice,
  onTickerClick,
}: MarketMoversCarouselProps) {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'active'>('gainers');

  const tabs = [
    { id: 'gainers' as const, label: 'Top Gainers', color: 'text-success', data: gainers },
    { id: 'losers' as const, label: 'Top Losers', color: 'text-danger', data: losers },
    { id: 'active' as const, label: 'Most Active', color: 'text-primary-400', data: mostActive },
  ];

  const currentTab = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? `${tab.color} bg-gray-800 border-b-2 border-current`
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-800 rounded skeleton" />
            ))}
          </div>
        ) : currentTab.data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentTab.data.map((mover: MarketMover, idx: number) => {
              const currentPrice = getCurrentPrice(mover.ticker, mover.day.c);
              const isRealtime = realtimePrices[mover.ticker] !== undefined;

              return (
                <div
                  key={mover.ticker}
                  onClick={() => onTickerClick(mover.ticker)}
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
                    <div
                      className={`font-semibold ${
                        mover.todaysChangePerc >= 0 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {mover.todaysChangePerc >= 0 ? '+' : ''}
                      {mover.todaysChangePerc.toFixed(2)}%
                    </div>
                    <div className={`text-sm ${activeTab === 'active' ? 'text-primary-400' : 'text-gray-400'}`}>
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
  );
}
