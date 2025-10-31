/**
 * Explain module - correlates news with price movements
 */

import { getNews, getPreviousClose } from './polygon';

export interface ExplanationResult {
  ticker: string;
  change: number;
  changePercent: number;
  abnormalVolume: boolean;
  volumeRatio: number;
  newsItems: Array<{
    title: string;
    published: string;
    url: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }>;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  timestamp: string;
}

/**
 * Analyze why a ticker is moving
 */
export async function explainMove(ticker: string): Promise<ExplanationResult> {
  try {
    // Only fetch previous close and news (reduce API calls to avoid rate limit)
    // Don't fetch minute-level data as it requires paid subscription
    const [prevCloseRes, newsRes] = await Promise.all([
      getPreviousClose(ticker),
      getNews({ ticker, limit: 5 }), // Reduce to 5 news items
    ]);

    // Calculate price change from previous day's data
    const prevBars = prevCloseRes.data.results || [];
    
    if (prevBars.length === 0) {
      // Return fallback data if no results
      return {
        ticker,
        change: 0,
        changePercent: 0,
        abnormalVolume: false,
        volumeRatio: 1,
        newsItems: [],
        explanation: `Unable to fetch data for ${ticker}. This might be due to API rate limits or an invalid ticker symbol.`,
        confidence: 'low',
        timestamp: new Date().toISOString(),
      };
    }

    const prevBar = prevBars[0];
    const currentPrice = prevBar.c; // Close price
    const prevClose = prevBar.o; // Open is approx previous close
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // Volume ratio (comparing to average - simplified)
    const currentVolume = prevBar.v;
    const avgVolume = prevBar.v; // Simplified - would need multiple days for real avg
    const volumeRatio = 1.0; // Simplified since we don't have historical data
    const abnormalVolume = false; // Can't determine without historical data

    // Analyze news
    const newsItems = (newsRes.data.results || []).map((article) => ({
      title: article.title,
      published: article.published_utc,
      url: article.article_url,
      sentiment: detectSentiment(article.title) as 'positive' | 'negative' | 'neutral',
    }));

    // Generate explanation
    let explanation = '';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (Math.abs(changePercent) < 1) {
      explanation = `${ticker} had minimal movement in the last trading day (${changePercent.toFixed(
        2
      )}%).`;
      confidence = 'high';
    } else {
      const direction = change > 0 ? 'up' : 'down';
      explanation = `${ticker} moved ${direction} ${Math.abs(changePercent).toFixed(2)}% in the last trading day`;

      if (newsItems.length > 0) {
        const recentNews = newsItems.slice(0, 3);
        explanation += `. Recent news: ${recentNews.map((n) => n.title).join('; ')}`;
        confidence = 'medium';
      } else {
        explanation += '. No significant news found in the past 24 hours.';
      }
    }

    explanation += ` Note: Data shown is from the previous trading day. Free tier API has rate limits and 15-min delay.`;

    return {
      ticker,
      change,
      changePercent,
      abnormalVolume,
      volumeRatio,
      newsItems,
      explanation,
      confidence,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Explain] Error explaining move for', ticker, error);
    
    // Return graceful error
    return {
      ticker,
      change: 0,
      changePercent: 0,
      abnormalVolume: false,
      volumeRatio: 1,
      newsItems: [],
      explanation: `Unable to analyze ${ticker} at this time. This might be due to API rate limits (5 calls/min on free tier) or connectivity issues. Please try again in a minute.`,
      confidence: 'low',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Simple sentiment detection (can be replaced with ML model)
 */
function detectSentiment(text: string): string {
  const positive = ['surge', 'gain', 'rally', 'beat', 'exceeds', 'strong', 'growth', 'up'];
  const negative = ['fall', 'drop', 'decline', 'miss', 'weak', 'loss', 'down', 'concern'];

  const lower = text.toLowerCase();
  const posCount = positive.filter((word) => lower.includes(word)).length;
  const negCount = negative.filter((word) => lower.includes(word)).length;

  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}
