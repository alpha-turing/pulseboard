# Production-Ready Local Testing Checklist

## 🔧 Setup

- [ ] **Update .env file**
  ```bash
  # Generate strong JWT secret
  openssl rand -base64 32
  
  # Add to .env:
  JWT_SECRET="<generated-secret>"
  POLYGON_API_KEY="<your-api-key>"
  DATABASE_URL="file:./dev.db"
  NODE_ENV="development"
  ```

- [ ] **Install dependencies** (if not already done)
  ```bash
  npm install
  ```

- [ ] **Run database migrations**
  ```bash
  npx prisma db push
  ```

## 🚀 Start Server

```bash
npm run dev
```

Server should start at: http://localhost:3000

## ✅ Automated Tests

Run the automated test script:

```bash
./test-production.sh
```

This will test:
- Health check endpoint
- Password validation
- Rate limiting

## 🧪 Manual Browser Tests

### 1. Health Check
- [ ] Visit: http://localhost:3000/api/health
- [ ] Should see:
  ```json
  {
    "status": "healthy",
    "checks": {
      "database": "healthy",
      "polygonApiKey": "configured",
      "jwtSecret": "configured"
    }
  }
  ```

### 2. Password Validation

#### Test Weak Password (Should Fail)
- [ ] Go to: http://localhost:3000/auth/register
- [ ] Enter email: `test@example.com`
- [ ] Enter password: `weak`
- [ ] **Expected**: Error message about password requirements

#### Test Strong Password (Should Succeed)
- [ ] Go to: http://localhost:3000/auth/register
- [ ] Enter email: `newuser@example.com`
- [ ] Enter password: `Test@123456`
- [ ] **Expected**: Successfully registered and redirected

### 3. Rate Limiting

#### Test Auth Rate Limiting (5 requests / 15 min)
- [ ] Go to: http://localhost:3000/auth/login
- [ ] Try to login 6 times rapidly with wrong credentials
- [ ] **Expected**: After 5th attempt, should see error about rate limiting

### 4. Watchlist Functionality

- [ ] Login with your account
- [ ] Search for a ticker (e.g., AAPL)
- [ ] Click "Add to Watchlist"
- [ ] **Expected**: Toast notification appears
- [ ] **Expected**: Button changes to "✓ In Watchlist" and is disabled
- [ ] Go to Watchlist page
- [ ] **Expected**: See AAPL with correct price data
- [ ] Click remove button
- [ ] **Expected**: Toast notification, ticker removed

### 5. Market Page

- [ ] Go to: http://localhost:3000/market
- [ ] **Expected**: See market status (open/closed)
- [ ] **Expected**: If market closed, see blue banner "Showing top gainers and losers from previous trading day"
- [ ] **Expected**: Top gainers and losers displayed
- [ ] **Expected**: No layout shifts when data loads

### 6. Security Checks

#### Console Logs
- [ ] Open browser DevTools Console
- [ ] Refresh the page
- [ ] **Expected**: NO API keys visible in console
- [ ] **Expected**: Only see "[Polygon] POLYGON_API_KEY not configured" if key is missing

#### Network Tab
- [ ] Open DevTools Network tab
- [ ] Perform a search
- [ ] Click on polygon API request
- [ ] **Expected**: API key is sent to server, not exposed in client

## 🔍 Code Verification

### Check No API Key Logging
```bash
# Search for any console.log with API key
grep -r "POLYGON_API_KEY" src/lib/polygon.ts
```
**Expected**: Should only see error logging if not configured

### Verify Rate Limiting Active
```bash
# Check middleware exists
cat src/middleware.ts
```
**Expected**: Should see rate limiting configuration

### Verify Password Validation
```bash
# Check auth lib
grep -A 20 "validatePassword" src/lib/auth.ts
```
**Expected**: Should see password strength requirements

## 📊 Performance Testing

### Cache Effectiveness
- [ ] Visit a ticker page (e.g., /instruments?ticker=AAPL)
- [ ] Refresh the page quickly 3 times
- [ ] Check DevTools Network tab
- [ ] **Expected**: Subsequent requests should be faster (cached)

### Request Deduplication
- [ ] Open 3 browser tabs
- [ ] Navigate all to same ticker simultaneously
- [ ] Check server logs
- [ ] **Expected**: Only one actual API call to polygon.io

## 🐛 Known Issues to Watch For

- [ ] Toast notifications appear and disappear correctly
- [ ] No React hydration warnings in console
- [ ] Watchlist button state updates immediately
- [ ] Market page doesn't shift layout
- [ ] All charts render with Highcharts (no Recharts errors)

## ✅ Final Checklist Before Merging

- [ ] All automated tests pass
- [ ] All manual browser tests pass
- [ ] No sensitive data in console logs
- [ ] Rate limiting works as expected
- [ ] Password validation works correctly
- [ ] Health check endpoint returns healthy
- [ ] User flow works end-to-end
- [ ] No breaking changes from main branch

## 🚦 Test Results

**Date Tested**: ___________
**Tested By**: ___________
**Branch**: production-ready
**All Tests Passed**: ☐ Yes ☐ No

**Notes**:
```
(Add any issues or observations here)
```

---

Once all tests pass, you're ready to:
1. Merge to main: `git checkout main && git merge production-ready`
2. Push to GitHub: `git push origin main`
3. Deploy to production following PRODUCTION.md
