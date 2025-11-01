import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import Navbar from '@/components/Navbar';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Pulseboard - Market Intelligence powered by polygon.io',
  description: 'One screen to see, explain, and export the market. Real-time financial data, news, and analytics.',
  keywords: ['stocks', 'finance', 'market data', 'trading', 'analytics'],
  authors: [{ name: 'Pulseboard' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  themeColor: '#1890ff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark smooth-scroll">
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-1 container-responsive max-w-7xl mx-auto py-4 md:py-6 lg:py-8 pb-20 lg:pb-8">
              {children}
            </main>
            
            {/* Footer */}
            <footer className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm mt-auto hidden lg:block">
              <div className="container-responsive max-w-7xl mx-auto py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-brand-primary-500 to-brand-secondary-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">P</span>
                    </div>
                    <span>© 2025 Pulseboard. All rights reserved.</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-xs">
                      Powered by{' '}
                      <a
                        href="https://polygon.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary-400 hover:text-brand-primary-300 transition-colors"
                      >
                        Polygon.io
                      </a>
                    </span>
                    <span className="text-xs text-gray-600">
                      Real-time market data & analytics
                    </span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

