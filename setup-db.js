#!/usr/bin/env node

/**
 * Setup script for Pulseboard database
 * Loads .env.local and runs Prisma commands
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
  console.log('✅ Loaded .env.local');
} else {
  console.log('⚠️  .env.local not found, using defaults');
}

// Set default DATABASE_URL if not present
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
  console.log('ℹ️  Using default DATABASE_URL: file:./dev.db');
}

console.log('\n🗄️  Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
  console.log('✅ Prisma Client generated\n');
} catch (error) {
  console.error('❌ Failed to generate Prisma Client');
  process.exit(1);
}

console.log('🗄️  Pushing database schema...');
try {
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env: process.env });
  console.log('✅ Database schema pushed\n');
} catch (error) {
  console.error('❌ Failed to push database schema');
  process.exit(1);
}

console.log('🎉 Database setup complete!');
