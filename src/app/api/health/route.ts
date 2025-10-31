import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Health check endpoint for monitoring
 * GET /api/health
 */
export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Check database connection
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'healthy';
  } catch (error) {
    checks.database = 'unhealthy';
    healthy = false;
  }

  // Check environment variables
  checks.polygonApiKey = process.env.POLYGON_API_KEY ? 'configured' : 'missing';
  checks.jwtSecret = process.env.JWT_SECRET ? 'configured' : 'using-default';
  checks.nodeEnv = process.env.NODE_ENV || 'development';

  // Warn if using defaults in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) {
      checks.jwtSecret = 'CRITICAL: using insecure default';
      healthy = false;
    }
    if (!process.env.POLYGON_API_KEY) {
      checks.polygonApiKey = 'WARNING: not configured';
    }
  }

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
