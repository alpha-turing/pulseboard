/**
 * Reddit API Client
 * Scrapes social mentions from Reddit for sentiment analysis
 */

import Snoowrap from 'snoowrap';

// Reddit API credentials
function getRedditClient() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    console.warn('[Reddit] Missing credentials, using mock data');
    return null;
  }

  return new Snoowrap({
    userAgent: 'Pulseboard Stock Sentiment Tracker v1.0',
    clientId,
    clientSecret,
    username,
    password,
  });
}

interface RedditMention {
  id: string;
  ticker: string;
  text: string;
  author: string;
  subreddit: string;
  score: number;
  created_utc: number;
  url: string;
  num_comments: number;
}

interface TrendingTicker {
  ticker: string;
  mentions: number;
  change_pct: number;
  top_post?: {
    title: string;
    score: number;
    url: string;
  };
}

/**
 * Extract stock tickers from text using regex
 */
function extractTickers(text: string): string[] {
  // Match $TICKER or TICKER in all caps (3-5 chars)
  const tickerRegex = /\$([A-Z]{1,5})\b|(?:^|\s)([A-Z]{3,5})(?=\s|$)/g;
  const matches = [...text.matchAll(tickerRegex)];
  const tickers = matches
    .map(m => m[1] || m[2])
    .filter(t => t && !['CEO', 'USA', 'SEC', 'IPO', 'ETF', 'ATH', 'FDA', 'IMO', 'FOMO', 'YOLO'].includes(t));
  
  return [...new Set(tickers)]; // Remove duplicates
}

/**
 * Scrape mentions from a subreddit
 */
export async function scrapSubreddit(
  subredditName: string,
  limit: number = 100
): Promise<RedditMention[]> {
  const reddit = getRedditClient();
  
  if (!reddit) {
    // Return mock data for development
    return generateMockMentions();
  }

  try {
    console.log(`[Reddit] Scraping r/${subredditName}...`);
    
    const subreddit = reddit.getSubreddit(subredditName);
    const posts = await subreddit.getHot({ limit });

    const mentions: RedditMention[] = [];

    for (const post of posts) {
      const text = `${post.title} ${post.selftext || ''}`;
      const tickers = extractTickers(text);

      if (tickers.length > 0) {
        tickers.forEach(ticker => {
          mentions.push({
            id: post.id,
            ticker,
            text: post.title,
            author: post.author.name,
            subreddit: subredditName,
            score: post.score,
            created_utc: post.created_utc,
            url: `https://reddit.com${post.permalink}`,
            num_comments: post.num_comments,
          });
        });
      }
    }

    console.log(`[Reddit] Found ${mentions.length} mentions in r/${subredditName}`);
    return mentions;
  } catch (error) {
    console.error(`[Reddit] Error scraping r/${subredditName}:`, error);
    return [];
  }
}

/**
 * Get trending tickers across multiple subreddits
 */
export async function getTrendingTickers(
  subreddits: string[] = ['wallstreetbets', 'stocks', 'options']
): Promise<TrendingTicker[]> {
  const allMentions: RedditMention[] = [];

  // Scrape all subreddits in parallel
  const results = await Promise.all(
    subreddits.map(sub => scrapSubreddit(sub, 100))
  );

  results.forEach(mentions => allMentions.push(...mentions));

  // Count mentions per ticker
  const tickerCounts = new Map<string, RedditMention[]>();
  
  allMentions.forEach(mention => {
    const existing = tickerCounts.get(mention.ticker) || [];
    existing.push(mention);
    tickerCounts.set(mention.ticker, existing);
  });

  // Sort by mention count
  const trending: TrendingTicker[] = Array.from(tickerCounts.entries())
    .map(([ticker, mentions]) => {
      // Find top post for this ticker
      const topPost = mentions.sort((a, b) => b.score - a.score)[0];
      
      return {
        ticker,
        mentions: mentions.length,
        change_pct: 0, // TODO: Calculate vs 24h ago
        top_post: {
          title: topPost.text,
          score: topPost.score,
          url: topPost.url,
        },
      };
    })
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 20); // Top 20

  return trending;
}

/**
 * Get detailed mentions for a specific ticker
 */
export async function getTickerMentions(
  ticker: string,
  subreddits: string[] = ['wallstreetbets', 'stocks', 'options'],
  limit: number = 50
): Promise<RedditMention[]> {
  const allMentions: RedditMention[] = [];

  const results = await Promise.all(
    subreddits.map(sub => scrapSubreddit(sub, 100))
  );

  results.forEach(mentions => allMentions.push(...mentions));

  return allMentions
    .filter(m => m.ticker === ticker.toUpperCase())
    .sort((a, b) => b.created_utc - a.created_utc)
    .slice(0, limit);
}

/**
 * Mock data for development
 */
function generateMockMentions(): RedditMention[] {
  const mockTickers = ['TSLA', 'AAPL', 'NVDA', 'AMD', 'GME', 'PLTR'];
  const mockSubreddits = ['wallstreetbets', 'stocks', 'options'];
  
  return mockTickers.flatMap(ticker => 
    Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({
      id: `mock_${ticker}_${i}`,
      ticker,
      text: `Discussion about ${ticker} - ${Math.random() > 0.5 ? 'bullish' : 'bearish'} sentiment`,
      author: `user_${Math.floor(Math.random() * 1000)}`,
      subreddit: mockSubreddits[Math.floor(Math.random() * mockSubreddits.length)],
      score: Math.floor(Math.random() * 500),
      created_utc: Date.now() / 1000 - Math.random() * 86400,
      url: `https://reddit.com/r/wallstreetbets/comments/mock_${i}`,
      num_comments: Math.floor(Math.random() * 100),
    }))
  );
}
