#!/bin/bash

echo "🚀 Migrating Pulseboard to Neon PostgreSQL"
echo "=========================================="
echo ""

# Step 1: Update .env file
echo "📝 Step 1: Updating .env file..."
echo ""
echo "Please add this line to your .env file:"
echo ""
echo 'DATABASE_URL="postgresql://neondb_owner:npg_7OUTKSJDW2VC@ep-delicate-frog-a4q8q568-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"'
echo ""
read -p "Press Enter once you've updated .env..."

# Step 2: Clean old Prisma artifacts
echo ""
echo "🧹 Step 2: Cleaning old Prisma client..."
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
echo "✅ Cleaned"

# Step 3: Generate new Prisma client
echo ""
echo "🔨 Step 3: Generating new Prisma client for PostgreSQL..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ Error generating Prisma client"
    exit 1
fi

# Step 4: Push schema to Neon
echo ""
echo "📤 Step 4: Pushing schema to Neon database..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "✅ Schema pushed to Neon successfully"
else
    echo "❌ Error pushing schema to Neon"
    exit 1
fi

# Step 5: Verify connection
echo ""
echo "🔍 Step 5: Verifying database connection..."
npx prisma db execute --stdin <<EOF
SELECT 'Connection successful!' as message;
EOF

echo ""
echo "✅ Migration Complete!"
echo ""
echo "Next steps:"
echo "1. Start your dev server: npm run dev"
echo "2. Test registration/login"
echo "3. Verify watchlist functionality"
echo "4. Check health endpoint: http://localhost:3000/api/health"
echo ""
echo "📊 To view your Neon database:"
echo "   npx prisma studio"
echo ""
