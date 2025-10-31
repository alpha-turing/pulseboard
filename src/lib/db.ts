/**
 * Database client - Prisma wrapper
 */

import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Get or create a demo user (for development)
 */
export async function getDemoUser() {
  const email = 'demo@pulseboard.dev';
  
  let user = await db.user.findUnique({ where: { email } });
  
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: 'Demo User',
        password: 'hashed-demo-password-not-used', // Demo user requires password field
      },
    });
  }
  
  return user;
}

/**
 * Dashboard view helpers
 */
export type DashboardView = {
  id: string;
  userId: string;
  name: string;
  layout: any;
  filters: any;
  tickers: string[];
  createdAt: string;
};

export async function getDashboardViews(userId: string): Promise<DashboardView[]> {
  const views = await db.dashboardView.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  return views.map((v: any) => ({
    id: v.id,
    userId: v.userId,
    name: v.name,
    layout: JSON.parse(v.layout),
    filters: JSON.parse(v.filters),
    tickers: JSON.parse(v.tickers),
    createdAt: v.createdAt.toISOString(),
  }));
}

export async function saveDashboardView(
  userId: string,
  view: Omit<DashboardView, 'id' | 'userId' | 'createdAt'>
) {
  return db.dashboardView.create({
    data: {
      userId,
      name: view.name,
      layout: JSON.stringify(view.layout),
      filters: JSON.stringify(view.filters),
      tickers: JSON.stringify(view.tickers),
    },
  });
}
