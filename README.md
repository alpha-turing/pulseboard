# 📊 Pulseboard

> **One screen to see, explain, and export the market — powered by polygon.io**

Pulseboard is a modern financial web application that provides real-time market data, intelligent analysis, and customizable alerts. Built with Next.js 14, TypeScript, and polygon.io data.

![Dark Mode First](https://img.shields.io/badge/dark%20mode-first-black)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

---

## ✨ Features

### V1 (Implemented)

- **📈 Market Dashboard**
  - Real-time market status (open/closed)
  - Top gainers and losers with live updates
  - Multi-asset support (Equity, Options, Crypto tabs)
  - Auto-refresh every 30 seconds

- **🔍 Instruments Page**
  - Global smart search across all tickers
  - Intraday price charts with 5-minute bars
  - Live news timeline with sentiment detection
  - "Explain this move" - AI-powered price movement analysis
  - CSV export for any instrument view

- **🔔 Alerts System**
  - Create price, volume, and options alerts
  - Multiple trigger types (above/below/change)
  - In-app notification system
  - Alert persistence with SQLite/Prisma

- **🎨 UX & Design**
  - Dark mode first (default theme)
  - Keyboard shortcuts (`/` for search, `g+m/i/a` for navigation)
  - Responsive layout (mobile/tablet/desktop)
  - Progressive disclosure (expand for details)
  - Data timestamps with degraded mode indicators

- **⚡ Performance**
  - In-memory + database caching
  - Rate-limit awareness
  - Degraded mode fallbacks
  - Latency measurements on all API calls

### V2 (Scaffolded, TODOs present)

- Alert trigger engine with webhooks
- Market heatmap visualization
- Team workspaces
- Embeddable widgets
- WebSocket real-time streaming

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **polygon.io API key** (free tier works) - [Get one here](https://polygon.io/dashboard/signup)

### Installation

```bash
# 1. Clone or navigate to the project
cd pulseboard

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your POLYGON_API_KEY

# 4. Initialize the database
npx prisma db push

# 5. Run the development server
npm run dev
```

The app will be available at **http://localhost:3000**

---

## 📁 Project Structure

```
pulseboard/
├── .env.local              # Environment variables (API keys)
├── package.json            # Dependencies
├── next.config.mjs         # Next.js configuration
├── tailwind.config.ts      # TailwindCSS config
├── tsconfig.json           # TypeScript config
├── prisma/
│   └── schema.prisma       # Database schema (SQLite)
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with navbar
│   │   ├── page.tsx        # Redirects to /market
│   │   ├── providers.tsx   # React Query provider
│   │   ├── market/
│   │   │   └── page.tsx    # Market dashboard
│   │   ├── instruments/
│   │   │   └── page.tsx    # Instrument search & analysis
│   │   ├── alerts/
│   │   │   └── page.tsx    # Alerts management
│   │   └── api/
│   │       ├── polygon/    # Polygon.io proxy routes
│   │       │   ├── search/route.ts
│   │       │   ├── aggregates/route.ts
│   │       │   ├── news/route.ts
│   │       │   ├── market-status/route.ts
│   │       │   └── snapshot/route.ts
│   │       ├── explain/route.ts    # Price movement analysis
│   │       └── export/route.ts     # CSV export
│   ├── components/
│   │   ├── Navbar.tsx              # Top navigation
│   │   ├── TickerSearch.tsx        # Global search
│   │   └── DataTimestamp.tsx       # Data freshness indicator
│   ├── lib/
│   │   ├── polygon.ts      # ALL polygon.io API calls
│   │   ├── cache.ts        # In-memory + DB caching
│   │   ├── db.ts           # Prisma client
│   │   └── explain.ts      # Movement explanation logic
│   └── styles/
│       └── globals.css     # Global styles + Tailwind
└── README.md
```

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Polygon.io API Key (required for live data)
POLYGON_API_KEY=your_polygon_api_key_here

# Database (SQLite for local dev)
DATABASE_URL="file:./dev.db"

# App Config
NEXT_PUBLIC_APP_NAME="Pulseboard"
NEXT_PUBLIC_TIMEZONE="Asia/Kolkata"
```

### Getting a polygon.io API Key

1. Sign up at [polygon.io](https://polygon.io/dashboard/signup)
2. Free tier includes:
   - 5 API calls/minute
   - Delayed market data (15 min)
   - Full REST API access
3. Copy your API key to `.env.local`

**Note:** If no API key is provided, Pulseboard runs with **sample data** and displays a warning banner.

---

## 🛠️ Development

### Available Scripts

```bash
# Start dev server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Database commands
npx prisma db push      # Apply schema changes
npx prisma studio       # Open database GUI
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | TailwindCSS, Dark mode default |
| **State** | TanStack Query (React Query) |
| **Charts** | Recharts |
| **Database** | Prisma + SQLite (dev) → PostgreSQL (prod) |
| **API** | Next.js API routes |
| **Data Source** | polygon.io REST API + WebSocket (planned) |

---

## 📊 Data & API Architecture

### Polygon.io Abstraction Layer

All polygon.io access is centralized in `src/lib/polygon.ts`. Every function returns:

```typescript
interface PolygonResponse<T> {
  data: T;              // The actual data
  source: string;       // "polygon.io" or "polygon.io (cached)"
  asOf: string;         // ISO timestamp
  latencyMs: number;    // Round-trip time
  degraded: boolean;    // True if fallback/cached data
  error?: string;       // Error message if degraded
}
```

### Caching Strategy

- **In-memory cache** (Map) for sub-second lookups
- **Database cache** (Prisma) for persistence across restarts
- **TTL-based expiration** (configurable per endpoint)
- **Automatic cleanup** every 5 minutes

### Degraded Mode

When polygon.io is unavailable or rate-limited:
1. Returns last good data from cache
2. Sets `degraded: true`
3. UI shows warning banner
4. Sample data if no cache available

---

## 🎨 UI/UX Guidelines

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search bar |
| `g` + `m` | Navigate to Market |
| `g` + `i` | Navigate to Instruments |
| `g` + `a` | Navigate to Alerts |

### Design Principles

1. **Dark Mode First** - All designs optimized for dark theme
2. **Data Transparency** - Every view shows timestamp + source
3. **Progressive Disclosure** - Start simple, expand for details
4. **Zero Empty States** - Always show sample data if API unavailable
5. **Performance Indicators** - Latency displayed for all API calls

---

## 🔐 Database Schema

### Key Models

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  watchlists     Watchlist[]
  dashboardViews DashboardView[]
  alerts         Alert[]
}

model Alert {
  id           String   @id
  ticker       String
  alertType    String   // 'price' | 'percent_move' | 'volume_spike'
  condition    String   // 'above' | 'below' | 'change'
  threshold    Float
  isActive     Boolean
  deliveryTarget String // 'in-app' | 'webhook' | 'email'
}

model DashboardView {
  id        String   @id
  userId    String
  name      String
  layout    String   // JSON
  filters   String   // JSON
  tickers   String   // JSON array
}

model PolygonCache {
  cacheKey   String   @unique
  data       String   // JSON
  expiresAt  DateTime
}
```

---

## 📤 Export Functionality

### CSV Export

Click "Export to CSV" on any view to download:

```csv
Ticker,Price,Change,Change%,Volume
AAPL,175.50,+2.30,+1.33%,50000000
TSLA,250.00,-10.00,-3.85%,75000000
```

### API Export (Coming in V2)

```bash
GET /api/export?ticker=AAPL&format=json
```

---

## 🚨 Error Handling

### Graceful Degradation

1. **API Timeout** (10s) → Return cached data
2. **Rate Limit** → Use cached data + show banner
3. **Invalid API Key** → Use sample data + warning
4. **Network Error** → Retry with exponential backoff

### Error States

- ⚠️ Yellow banner = Degraded mode (using cache)
- 🔴 Red banner = No data available
- ⏱️ Latency shown on all successful calls

---

## 🧪 Testing Strategy (V2)

```bash
# Unit tests (coming soon)
npm run test

# E2E tests (coming soon)
npm run test:e2e
```

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Docker (Alternative)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## 📝 API Endpoints Reference

### Polygon Proxy Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/polygon/search?q={query}` | GET | Search tickers |
| `/api/polygon/aggregates?ticker={ticker}&from={date}&to={date}` | GET | Get price bars |
| `/api/polygon/news?ticker={ticker}` | GET | Get news articles |
| `/api/polygon/market-status` | GET | Get market status |
| `/api/polygon/snapshot` | GET | Get all tickers snapshot |

### Custom Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/explain?ticker={ticker}` | GET | Explain price movement |
| `/api/export?ticker={ticker}&type=csv` | GET | Export to CSV |

---

## 🐛 Known Issues & Limitations

### V1 Limitations

- **No WebSocket** - Real-time data uses polling (30s refresh)
- **Alert Engine** - Alerts are stored but not triggered (V2 feature)
- **Single User** - No authentication (demo user only)
- **Rate Limits** - Free tier limited to 5 calls/min

### TODOs for V2

```typescript
// src/lib/polygon.ts
export function createWsClient(channels: string[]) {
  // TODO: Implement WebSocket connection
}

// src/app/alerts/page.tsx
// TODO: Implement alert trigger engine
// TODO: Add webhook delivery
```

---

## 🤝 Contributing

This project follows the **autonomous agent development** model:

1. All code is self-contained and runnable
2. Missing features have explicit TODOs
3. Sample data used when APIs unavailable
4. Documentation updated with code changes

---

## 📜 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **polygon.io** for market data API
- **Next.js** team for the incredible framework
- **TailwindCSS** for styling utilities
- **Recharts** for charting library

---

## 📞 Support

For issues or questions:
1. Check the [Known Issues](#-known-issues--limitations) section
2. Review API key setup in `.env.local`
3. Ensure database is initialized: `npx prisma db push`
4. Check logs in terminal for errors

---

**Built with ❤️ by an autonomous AI agent following the product spec exactly.**

**Tagline:** *One screen to see, explain, and export the market — powered by polygon.io*
