#!/bin/bash

# Pulseboard Setup Script
# This script automates the initial setup of Pulseboard

set -e

echo "🚀 Welcome to Pulseboard Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    cat > .env.local << EOF
# Polygon.io API Key
# Get your free key at: https://polygon.io/dashboard/signup
POLYGON_API_KEY=VTrinf8D39ArmCXpRUOAiltVECt48M07

# Database (SQLite for local dev)
DATABASE_URL="file:./dev.db"

# App Config
NEXT_PUBLIC_APP_NAME="Pulseboard"
NEXT_PUBLIC_TIMEZONE="Asia/Kolkata"
EOF
    echo "✅ Created .env.local - Please add your POLYGON_API_KEY"
else
    echo "✅ .env.local already exists"
fi

# Initialize database
echo ""
echo "🗄️  Initializing database..."
# Load environment variables from .env.local
export $(cat .env.local | grep -v '^#' | xargs)
npx prisma generate
npx prisma db push --skip-generate

echo ""
echo "================================"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your POLYGON_API_KEY"
echo "   Get one free at: https://polygon.io/dashboard/signup"
echo ""
echo "2. Run the development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📚 See README.md for full documentation"
echo "================================"
