# 🚀 QUICK START GUIDE

## ⚠️ Important: Node.js Version Required

**Current Node.js version detected: v12.22.12**  
**Required: Node.js 18.17.0 or higher**

### Upgrade Node.js First

**Option 1: Using nvm (recommended)**
```bash
# Install nvm if you haven't
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 18 or 20 (LTS)
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
```

**Option 2: Download from nodejs.org**
Visit https://nodejs.org and download the LTS version (20.x)

---

## Setup Steps

Once you have Node.js 18+:

### 1. Install Dependencies
```bash
cd /Users/knandula/massive/pulseboard
npm install
```

### 2. Configure Environment
```bash
# The .env.local file is already created
# Edit it to add your polygon.io API key

# Option A: Use a text editor
nano .env.local

# Option B: Set it via command line
echo "POLYGON_API_KEY=your_actual_key_here" >> .env.local
```

Get your free API key from: https://polygon.io/dashboard/signup

### 3. Initialize Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

---

## Running Without API Key

If you don't have a polygon.io API key yet, **that's okay!**

The app will run with sample data and show this banner:
```
⚠️ Running with sample data
Set POLYGON_API_KEY in .env.local to see live data
```

You can explore all features with mock data.

---

## Verify Setup

After starting the dev server, you should see:

```bash
▲ Next.js 14.0.4
- Local:        http://localhost:3000
- Ready in 2.3s
```

Navigate to:
- **http://localhost:3000** → Redirects to Market
- **http://localhost:3000/market** → Market Dashboard
- **http://localhost:3000/instruments?ticker=AAPL** → Instrument Details
- **http://localhost:3000/alerts** → Alerts Page

---

## Troubleshooting

### Issue: "Cannot find module 'next'"
**Fix:** Run `npm install` again

### Issue: "Prisma Client not generated"
**Fix:** Run `npx prisma generate`

### Issue: "Port 3000 already in use"
**Fix:** Kill the process or use a different port
```bash
# Kill existing process on port 3000
lsof -ti:3000 | xargs kill -9

# Or run on different port
PORT=3001 npm run dev
```

### Issue: TypeScript errors in IDE
**Fix:** Restart your IDE after installation

---

## Production Build

To build for production:

```bash
npm run build
npm start
```

---

## Next Steps

1. ✅ Upgrade Node.js to 18+
2. ✅ Run `npm install`
3. ✅ Get polygon.io API key (or use sample data)
4. ✅ Run `npx prisma db push`
5. ✅ Run `npm run dev`
6. ✅ Open http://localhost:3000

**See README.md for full documentation.**

---

## Alternative: Automated Setup

Once Node.js 18+ is installed:

```bash
./setup.sh
```

This will automatically install dependencies and set up the database.
