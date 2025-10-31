/**
 * React hook for real-time stock price updates via WebSocket
 */

import { useEffect, useState, useCallback } from 'react';
import { getWebSocketClient } from '@/lib/websocket';

interface RealtimePriceData {
  ticker: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  vwap: number;
  timestamp: number;
  accumulated_volume: number;
}

interface UseRealtimePriceReturn {
  data: RealtimePriceData | null;
  isConnected: boolean;
  error: Error | null;
}

/**
 * Hook to subscribe to real-time price updates for a ticker
 */
export function useRealtimePrice(ticker: string | null, enabled: boolean = true): UseRealtimePriceReturn {
  const [data, setData] = useState<RealtimePriceData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ticker || !enabled) {
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY;
    if (!apiKey) {
      setError(new Error('API key not configured'));
      return;
    }

    const wsClient = getWebSocketClient(apiKey, true); // true = real-time

    const unsubscribe = wsClient.subscribe(ticker, {
      onMessage: (priceData) => {
        setData(priceData);
        setError(null);
      },
      onError: (err) => {
        setError(err);
        setIsConnected(false);
      },
      onConnect: () => {
        setIsConnected(true);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [ticker, enabled]);

  return { data, isConnected, error };
}

/**
 * Hook to subscribe to multiple tickers at once
 */
export function useRealtimePrices(
  tickers: string[],
  enabled: boolean = true
): Record<string, RealtimePriceData> {
  const [prices, setPrices] = useState<Record<string, RealtimePriceData>>({});

  useEffect(() => {
    if (!enabled || tickers.length === 0) {
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY;
    if (!apiKey) {
      console.error('[useRealtimePrices] API key not configured');
      return;
    }

    const wsClient = getWebSocketClient(apiKey, true);
    const unsubscribers: (() => void)[] = [];

    tickers.forEach(ticker => {
      const unsubscribe = wsClient.subscribe(ticker, {
        onMessage: (priceData) => {
          setPrices(prev => ({
            ...prev,
            [ticker]: priceData
          }));
        },
        onError: (err) => {
          console.error(`[useRealtimePrices] Error for ${ticker}:`, err);
        }
      });
      
      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [tickers.join(','), enabled]);

  return prices;
}

/**
 * Hook to get WebSocket connection status
 */
export function useWebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY;
    if (!apiKey) {
      return;
    }

    const wsClient = getWebSocketClient(apiKey, true);
    
    // Poll connection status
    const interval = setInterval(() => {
      setIsConnected(wsClient.isConnected());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return isConnected;
}
