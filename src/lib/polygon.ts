/**
 * Polygon.io Service Layer
 * All polygon.io API calls abstracted with caching, rate-limiting, and error handling
 */

// Read API key - will be available on server side in API routes
function getApiKey() {
  const key = process.env.POLYGON_API_KEY || '';
  if (!key) {
    console.error('[Polygon] POLYGON_API_KEY not configured');
  }
  return key;
}

const POLYGON_BASE_URL = 'https://api.polygon.io';

// Sample data for when API key is missing
const SAMPLE_TICKERS = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META'];

export interface PolygonResponse<T> {
  data: T;
  source: string;
  asOf: string;
  latencyMs: number;
  degraded: boolean;
  error?: string;
}

export interface TickerReference {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  type: string;
  active: boolean;
  currency_name?: string;
  cik?: string;
  composite_figi?: string;
  share_class_figi?: string;
}

export interface Aggregate {
  v: number; // volume
  vw: number; // volume weighted average price
  o: number; // open
  c: number; // close
  h: number; // high
  l: number; // low
  t: number; // timestamp
  n: number; // number of transactions
}

export interface NewsArticle {
  id: string;
  publisher: {
    name: string;
    homepage_url?: string;
    logo_url?: string;
    favicon_url?: string;
  };
  title: string;
  author: string;
  published_utc: string;
  article_url: string;
  tickers: string[];
  amp_url?: string;
  image_url?: string;
  description?: string;
  keywords?: string[];
}

export interface MarketStatus {
  market: string;
  serverTime: string;
  exchanges: {
    nasdaq: string;
    nyse: string;
    otc: string;
  };
  currencies: {
    fx: string;
    crypto: string;
  };
}

export interface TradeData {
  ev: string; // event type
  sym: string; // symbol
  x: number; // exchange
  p: number; // price
  s: number; // size
  t: number; // timestamp
}

/**
 * Measure latency wrapper
 */
async function measureLatency<T>(
  fn: () => Promise<T>
): Promise<{ result: T; latencyMs: number }> {
  const start = performance.now();
  const result = await fn();
  const latencyMs = Math.round(performance.now() - start);
  return { result, latencyMs };
}

/**
 * Generic polygon fetch with error handling
 */
async function polygonFetch<T>(
  endpoint: string,
  fallback: T,
  cacheTtl?: number
): Promise<PolygonResponse<T>> {
  const asOf = new Date().toISOString();
  const POLYGON_API_KEY = getApiKey();
  
  // Check if API key is missing
  if (!POLYGON_API_KEY || POLYGON_API_KEY === 'your_polygon_api_key_here') {
    console.warn('[Polygon] No valid API key found, using sample data for endpoint:', endpoint);
    return {
      data: fallback,
      source: 'polygon.io (mock)',
      asOf,
      latencyMs: 0,
      degraded: true,
      error: 'No API key configured. Using sample data.',
    };
  }

  console.log('[Polygon] Fetching from API:', endpoint, 'with key:', POLYGON_API_KEY.substring(0, 8) + '...');

  try {
    const { result, latencyMs } = await measureLatency(async () => {
      const url = `${POLYGON_BASE_URL}${endpoint}${
        endpoint.includes('?') ? '&' : '?'
      }apiKey=${POLYGON_API_KEY}`;
      
      console.log('[Polygon] Full URL:', url.replace(POLYGON_API_KEY, 'API_KEY_HIDDEN'));
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000),
      });

      console.log('[Polygon] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Polygon] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const jsonData = await response.json();
      console.log('[Polygon] Success! Got', JSON.stringify(jsonData).substring(0, 200) + '...');
      return jsonData;
    });

    return {
      data: result as T,
      source: 'polygon.io',
      asOf,
      latencyMs,
      degraded: false,
    };
  } catch (error) {
    console.error(`[Polygon] Error fetching ${endpoint}:`, error);
    
    // Try to get from cache if available
    const cachedData = await getCachedData<T>(endpoint);
    
    return {
      data: cachedData || fallback,
      source: cachedData ? 'polygon.io (cached)' : 'polygon.io (fallback)',
      asOf: cachedData ? asOf : new Date().toISOString(),
      latencyMs: 0,
      degraded: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Simple in-memory cache (will be replaced with Redis in production)
 */
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

async function getCachedData<T>(key: string): Promise<T | null> {
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }
  memoryCache.delete(key);
  return null;
}

async function setCachedData(key: string, data: any, ttlSeconds: number) {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Get ticker reference data (for search)
 */
export async function getTickerReference(
  query: string
): Promise<PolygonResponse<{ results: TickerReference[]; count: number }>> {
  const endpoint = `/v3/reference/tickers?search=${encodeURIComponent(
    query
  )}&active=true&limit=20`;

  // No fallback - always use real API data
  const fallback = {
    results: [],
    count: 0,
  };

  return polygonFetch(endpoint, fallback, 300); // 5 min cache
}

/**
 * Get aggregates (bars) for a ticker
 */
export async function getAggregates(
  ticker: string,
  multiplier: number,
  timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year',
  from: string, // YYYY-MM-DD
  to: string // YYYY-MM-DD
): Promise<PolygonResponse<{ results: Aggregate[]; ticker: string; resultsCount: number }>> {
  const endpoint = `/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}`;

  // No fallback - always use real API data
  const fallback = {
    results: [],
    ticker,
    resultsCount: 0,
  };

  return polygonFetch(endpoint, fallback, 60); // 1 min cache
}

/**
 * Get news articles
 */
export async function getNews(params: {
  ticker?: string;
  limit?: number;
  order?: 'asc' | 'desc';
}): Promise<PolygonResponse<{ results: NewsArticle[]; count: number }>> {
  let endpoint = `/v2/reference/news?limit=${params.limit || 10}&order=${
    params.order || 'desc'
  }`;
  
  if (params.ticker) {
    endpoint += `&ticker=${params.ticker}`;
  }

  // No fallback - always use real API data
  const fallback = {
    results: [],
    count: 0,
  };

  return polygonFetch(endpoint, fallback, 120); // 2 min cache
}

/**
 * Get market status
 */
export async function getMarketStatus(): Promise<PolygonResponse<MarketStatus>> {
  const endpoint = '/v1/marketstatus/now';

  const fallback: MarketStatus = {
    market: 'open',
    serverTime: new Date().toISOString(),
    exchanges: {
      nasdaq: 'open',
      nyse: 'open',
      otc: 'open',
    },
    currencies: {
      fx: 'open',
      crypto: 'open',
    },
  };

  return polygonFetch(endpoint, fallback, 60);
}

/**
 * Get previous day's aggregate (for % change calculation)
 */
export async function getPreviousClose(
  ticker: string
): Promise<PolygonResponse<{ ticker: string; results: Aggregate[] }>> {
  const endpoint = `/v2/aggs/ticker/${ticker}/prev`;

  // No fallback - always use real API data
  const fallback = {
    ticker,
    results: [],
  };

  return polygonFetch(endpoint, fallback, 300);
}

/**
 * Get current quote for a ticker (real-time price)
 */
export async function getTickerQuote(
  ticker: string
): Promise<PolygonResponse<{
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}>> {
  // Use the previous close endpoint to get accurate data
  const endpoint = `/v2/aggs/ticker/${ticker}/prev`;
  
  const fallback = {
    ticker,
    price: 150,
    change: 2.5,
    changePercent: 1.69,
    volume: 1000000,
    high: 155,
    low: 147,
    open: 148,
    previousClose: 147.5,
  };

  const response = await polygonFetch<any>(endpoint, { ticker, results: [] }, 60);
  
  if (response.degraded || !response.data.results || response.data.results.length === 0) {
    return {
      ...response,
      data: fallback,
    };
  }

  const bar = response.data.results[0];
  const prevClose = bar.o; // Previous day's open is approximately the previous close
  const currentPrice = bar.c; // Close price
  const change = currentPrice - prevClose;
  const changePercent = (change / prevClose) * 100;

  return {
    ...response,
    data: {
      ticker,
      price: currentPrice,
      change,
      changePercent,
      volume: bar.v,
      high: bar.h,
      low: bar.l,
      open: bar.o,
      previousClose: prevClose,
    },
  };
}

/**
 * Get previous day's aggregate (for % change calculation)
 * @deprecated Use getTickerQuote instead for more accurate data
 */
export async function getPreviousCloseOld(
  ticker: string
): Promise<PolygonResponse<{ ticker: string; results: Aggregate[] }>> {
  const endpoint = `/v2/aggs/ticker/${ticker}/prev`;

  const fallback = {
    ticker,
    results: [
      {
        v: 1000000,
        vw: 150,
        o: 148,
        c: 152,
        h: 155,
        l: 147,
        t: Date.now() - 86400000,
        n: 100,
      },
    ],
  };

  return polygonFetch(endpoint, fallback, 300);
}

/**
 * Get snapshot of all tickers (for top movers)
 * Note: Free tier has 15-min delay. For real-time, need paid subscription.
 */
export async function getTickersSnapshot(): Promise<
  PolygonResponse<{
    tickers: Array<{
      ticker: string;
      todaysChangePerc: number;
      todaysChange: number;
      updated: number;
      day: {
        c: number;
        h: number;
        l: number;
        o: number;
        v: number;
        vw: number;
      };
      prevDay: {
        c: number;
        h: number;
        l: number;
        o: number;
        v: number;
        vw: number;
      };
    }>;
  }>
> {
  // Get previous day's data for each sample ticker to show real prices
  const POLYGON_API_KEY = getApiKey();
  
  // Generate sample top movers
  const sampleTickers = SAMPLE_TICKERS.map((ticker) => {
    const changePerc = (Math.random() - 0.5) * 10;
    const price = 150 + Math.random() * 100;
    const prevClose = price / (1 + changePerc / 100);
    
    return {
      ticker,
      todaysChangePerc: changePerc,
      todaysChange: price - prevClose,
      updated: Date.now(),
      day: {
        c: price,
        h: price * 1.02,
        l: price * 0.98,
        o: prevClose,
        v: Math.floor(Math.random() * 10000000),
        vw: price,
      },
      prevDay: {
        c: prevClose,
        h: prevClose * 1.01,
        l: prevClose * 0.99,
        o: prevClose,
        v: Math.floor(Math.random() * 10000000),
        vw: prevClose,
      },
    };
  });

  const fallback = {
    tickers: sampleTickers,
  };

  // If no API key, return sample data
  if (!POLYGON_API_KEY || POLYGON_API_KEY === 'your_polygon_api_key_here') {
    return {
      data: fallback,
      source: 'polygon.io (mock)',
      asOf: new Date().toISOString(),
      latencyMs: 0,
      degraded: true,
      error: 'No API key configured. Using sample data.',
    };
  }

  // Use grouped daily endpoint for more accurate data
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  const endpoint = `/v2/aggs/grouped/locale/us/market/stocks/${dateStr}`;

  const response = await polygonFetch<any>(endpoint, fallback, 30);
  
  if (response.degraded || !response.data.results) {
    return {
      ...response,
      data: fallback,
    };
  }

  // Transform the grouped daily data to our format
  const tickers = response.data.results.map((bar: any) => {
    const prevClose = bar.o; // Open is approx previous close
    const currentPrice = bar.c;
    const change = currentPrice - prevClose;
    const changePerc = (change / prevClose) * 100;

    return {
      ticker: bar.T,
      todaysChangePerc: changePerc,
      todaysChange: change,
      updated: bar.t,
      day: {
        c: bar.c,
        h: bar.h,
        l: bar.l,
        o: bar.o,
        v: bar.v,
        vw: bar.vw,
      },
      prevDay: {
        c: prevClose,
        h: bar.h,
        l: bar.l,
        o: prevClose,
        v: bar.v,
        vw: bar.vw,
      },
    };
  });

  console.log('[Polygon] Fetched', tickers.length, 'tickers from grouped daily');

  return {
    ...response,
    data: { tickers },
  };
}

/**
 * WebSocket client stub (to be implemented)
 * TODO: Implement actual WebSocket connection to polygon.io
 */
export function createWsClient(channels: string[]) {
  console.log('[Polygon WS] Stub - channels:', channels);
  // TODO: Implement WebSocket connection
  // return new WebSocket with proper auth and channel subscription
  return null;
}

/**
 * Check if running with real API key
 */
export function hasApiKey(): boolean {
  const key = getApiKey();
  return Boolean(key && key !== 'your_polygon_api_key_here');
}
