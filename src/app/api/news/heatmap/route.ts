import { NextRequest, NextResponse } from 'next/server';

interface PolygonNewsItem {
  id: string;
  publisher: {
    name: string;
    homepage_url: string;
    logo_url?: string;
  };
  title: string;
  author: string;
  published_utc: string;
  article_url: string;
  tickers: string[];
  image_url?: string;
  description: string;
  keywords?: string[];
}

interface PolygonNewsResponse {
  results: PolygonNewsItem[];
  status: string;
  count: number;
}

interface NewsHeatmapData {
  ticker: string;
  articleCount: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -1.0 to 1.0
  priceChange: number;
  topHeadlines: string[];
  breakingNews: boolean;
}

// Simple sentiment analysis based on keywords
function analyzeSentiment(title: string, description: string): { sentiment: 'bullish' | 'bearish' | 'neutral'; score: number } {
  const text = `${title} ${description}`.toLowerCase();
  
  const bullishKeywords = [
    'surge', 'soar', 'jump', 'rally', 'gain', 'climb', 'rise', 'up', 'profit', 'growth',
    'beat', 'exceed', 'strong', 'positive', 'upgrade', 'bullish', 'buy', 'boom', 'record'
  ];
  
  const bearishKeywords = [
    'plunge', 'crash', 'fall', 'drop', 'decline', 'down', 'loss', 'weak', 'negative',
    'downgrade', 'bearish', 'sell', 'warning', 'concern', 'miss', 'fail', 'slump'
  ];
  
  let score = 0;
  bullishKeywords.forEach(word => {
    if (text.includes(word)) score += 0.1;
  });
  bearishKeywords.forEach(word => {
    if (text.includes(word)) score -= 0.1;
  });
  
  // Clamp between -1 and 1
  score = Math.max(-1, Math.min(1, score));
  
  const sentiment = score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral';
  
  return { sentiment, score };
}

// Check if news is breaking (published in last 2 hours)
function isBreakingNews(publishedUtc: string): boolean {
  const publishedTime = new Date(publishedUtc).getTime();
  const now = Date.now();
  const twoHoursAgo = now - (2 * 60 * 60 * 1000);
  return publishedTime > twoHoursAgo;
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '100';

    // Fetch news from Polygon
    const newsUrl = `https://api.polygon.io/v2/reference/news?limit=${limit}&apiKey=${apiKey}`;
    const newsResponse = await fetch(newsUrl, { next: { revalidate: 300 } }); // Cache for 5 minutes
    
    if (!newsResponse.ok) {
      throw new Error(`Polygon API error: ${newsResponse.statusText}`);
    }

    const newsData: PolygonNewsResponse = await newsResponse.json();

    // Group news by ticker and aggregate
    const tickerMap = new Map<string, {
      articles: PolygonNewsItem[];
      sentimentScores: number[];
      breakingCount: number;
    }>();

    newsData.results.forEach(article => {
      // Each article can have multiple tickers
      article.tickers.forEach(ticker => {
        if (!tickerMap.has(ticker)) {
          tickerMap.set(ticker, { articles: [], sentimentScores: [], breakingCount: 0 });
        }
        
        const tickerData = tickerMap.get(ticker)!;
        tickerData.articles.push(article);
        
        const { score } = analyzeSentiment(article.title, article.description);
        tickerData.sentimentScores.push(score);
        
        if (isBreakingNews(article.published_utc)) {
          tickerData.breakingCount++;
        }
      });
    });

    // Fetch current prices for each ticker (for price change calculation)
    const tickers = Array.from(tickerMap.keys());
    const pricePromises = tickers.map(async (ticker) => {
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Use snapshot endpoint for real-time data
        const priceUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${apiKey}`;
        
        // Add AbortController with 3 second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const priceResponse = await fetch(priceUrl, { 
          next: { revalidate: 60 },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!priceResponse.ok) {
          console.warn(`Price API error for ${ticker}: ${priceResponse.status}`);
          return { ticker, priceChange: null };
        }
        
        const priceData = await priceResponse.json();
        if (priceData.ticker && priceData.ticker.todaysChangePerc !== undefined) {
          // Use today's actual percentage change from snapshot
          return { ticker, priceChange: priceData.ticker.todaysChangePerc };
        }
        
        console.warn(`No price data available for ${ticker}`);
        return { ticker, priceChange: null };
      } catch (error) {
        // Only log non-abort errors
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn(`Price fetch failed for ${ticker}:`, error.message);
        }
        return { ticker, priceChange: null };
      }
    });

    const priceResults = await Promise.all(pricePromises);
    const priceMap = new Map(priceResults.map(r => [r.ticker, r.priceChange]));

    // Build heatmap data
    const heatmapData: NewsHeatmapData[] = Array.from(tickerMap.entries())
      .map(([ticker, data]) => {
        const priceChange = priceMap.get(ticker);
        const avgSentiment = data.sentimentScores.reduce((a, b) => a + b, 0) / data.sentimentScores.length;
        
        // Only include tickers with valid price data
        if (priceChange === null || priceChange === undefined) {
          return null;
        }
        
        // Use price change as primary signal
        let sentiment: 'bullish' | 'bearish' | 'neutral';
        let sentimentScore: number;
        
        if (priceChange > 1.0) {
          sentiment = 'bullish';
          sentimentScore = Math.min(1.0, priceChange / 10); // Strong green for big gains
        } else if (priceChange < -1.0) {
          sentiment = 'bearish';
          sentimentScore = Math.max(-1.0, priceChange / 10); // Strong red for big losses
        } else if (priceChange > 0.2) {
          sentiment = 'bullish';
          sentimentScore = priceChange / 10;
        } else if (priceChange < -0.2) {
          sentiment = 'bearish';
          sentimentScore = priceChange / 10;
        } else {
          // For very small price changes, use article sentiment
          sentiment = avgSentiment > 0.2 ? 'bullish' : avgSentiment < -0.2 ? 'bearish' : 'neutral';
          sentimentScore = avgSentiment;
        }
        
        return {
          ticker,
          articleCount: data.articles.length,
          sentiment,
          sentimentScore,
          priceChange,
          topHeadlines: data.articles.slice(0, 3).map(a => a.title),
          breakingNews: data.breakingCount > 0,
        };
      })
      // Filter out null entries (no price data) and tickers with very few articles
      .filter((d): d is NewsHeatmapData => d !== null && d.articleCount >= 2);

    // Get balanced mix: top bullish, bearish, and neutral
    const bullish = heatmapData
      .filter(d => d.sentiment === 'bullish')
      .sort((a, b) => b.articleCount - a.articleCount)
      .slice(0, 10);
    
    const bearish = heatmapData
      .filter(d => d.sentiment === 'bearish')
      .sort((a, b) => b.articleCount - a.articleCount)
      .slice(0, 10);
    
    const neutral = heatmapData
      .filter(d => d.sentiment === 'neutral')
      .sort((a, b) => b.articleCount - a.articleCount)
      .slice(0, 10);

    // Combine and sort by article count
    const balancedData = [...bullish, ...bearish, ...neutral]
      .sort((a, b) => b.articleCount - a.articleCount);

    return NextResponse.json(balancedData);
  } catch (error) {
    console.error('Error fetching news heatmap data:', error);
    return NextResponse.json({ error: 'Failed to fetch news heatmap data' }, { status: 500 });
  }
}
