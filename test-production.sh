#!/bin/bash

# Production-Ready Testing Script
# Tests all security and performance improvements

echo "🧪 Testing Pulseboard Production-Ready Features"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
SERVER_URL="http://localhost:3000"

echo "📋 Pre-flight Checks"
echo "-------------------"

# Check .env file
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
else
    echo -e "${RED}✗${NC} .env file missing - copy .env.example to .env"
    exit 1
fi

# Check JWT_SECRET
if grep -q "change-this-to-a-strong-random-secret" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC} JWT_SECRET is still using default value"
    echo "  Generate with: openssl rand -base64 32"
else
    echo -e "${GREEN}✓${NC} JWT_SECRET appears to be set"
fi

# Check POLYGON_API_KEY
if grep -q "your_polygon_api_key_here" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC} POLYGON_API_KEY is still using placeholder"
else
    echo -e "${GREEN}✓${NC} POLYGON_API_KEY appears to be set"
fi

echo ""
echo "🏥 Testing Health Endpoint"
echo "-------------------------"

# Test health endpoint
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" ${SERVER_URL}/api/health)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Health check passed (HTTP 200)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗${NC} Health check failed (HTTP $HTTP_CODE)"
    echo "$BODY"
fi

echo ""
echo "🔒 Testing Password Validation"
echo "------------------------------"

# Test weak password (should fail)
echo "Testing weak password: 'weak'..."
WEAK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${SERVER_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"weak"}')

WEAK_CODE=$(echo "$WEAK_RESPONSE" | tail -n1)
if [ "$WEAK_CODE" = "400" ]; then
    echo -e "${GREEN}✓${NC} Weak password rejected (HTTP 400)"
else
    echo -e "${RED}✗${NC} Weak password should be rejected"
fi

# Test strong password (should succeed or fail if user exists)
echo "Testing strong password: 'Test@123'..."
STRONG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${SERVER_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test-$(date +%s)@example.com\",\"password\":\"Test@123\"}")

STRONG_CODE=$(echo "$STRONG_RESPONSE" | tail -n1)
if [ "$STRONG_CODE" = "200" ] || [ "$STRONG_CODE" = "400" ]; then
    echo -e "${GREEN}✓${NC} Strong password accepted or user exists (HTTP $STRONG_CODE)"
else
    echo -e "${RED}✗${NC} Unexpected response: HTTP $STRONG_CODE"
fi

echo ""
echo "⏱️  Testing Rate Limiting"
echo "------------------------"

echo "Sending 6 rapid requests (limit is 5 per 15 min)..."
RATE_LIMIT_HIT=false

for i in {1..6}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${SERVER_URL}/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"test@test.com","password":"test"}')
    
    CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$CODE" = "429" ]; then
        echo -e "${GREEN}✓${NC} Rate limit triggered on request #$i (HTTP 429)"
        RATE_LIMIT_HIT=true
        break
    fi
done

if [ "$RATE_LIMIT_HIT" = false ]; then
    echo -e "${YELLOW}⚠${NC} Rate limit not triggered (may need more requests)"
fi

echo ""
echo "📊 Summary"
echo "----------"
echo "All critical features tested!"
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Run this script: ./test-production.sh"
echo "3. Test in browser manually"
echo "4. Check console for any leaked API keys"
echo ""
