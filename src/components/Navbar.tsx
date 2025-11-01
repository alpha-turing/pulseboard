'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import TickerSearch from './TickerSearch';
import Button from './ui/Button';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Market', path: '/market', key: 'm', icon: '📈' },
    { name: 'Instruments', path: '/instruments', key: 'i', icon: '📊' },
    ...(user ? [{ name: 'Watchlist', path: '/watchlist', key: 'w', icon: '⭐' }] : []),
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-md sticky top-0 z-sticky">
      <div className="container-responsive max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link href="/market" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-brand-primary-500 to-brand-secondary-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary-500/30 transition-transform hover:scale-105">
              <span className="text-white font-bold text-xl md:text-2xl">P</span>
            </div>
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-brand-primary-400 to-brand-secondary-400 bg-clip-text text-transparent hidden sm:inline">
              Pulseboard
            </span>
          </Link>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    isActive(item.path)
                      ? 'bg-brand-primary-500 text-white shadow-lg shadow-brand-primary-500/30'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <span className="hidden xl:inline">{item.icon} </span>
                {item.name}
                <span className="ml-2 text-xs text-gray-500">g+{item.key}</span>
              </Link>
            ))}
          </div>

          {/* Search - Hidden on small mobile, shows on tablet+ */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <TickerSearch />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors touch-target"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* User Menu - Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-300 hidden xl:inline max-w-[150px] truncate">
                  {user.name || user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={() => logout()}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Search - Shows below navbar on mobile */}
        <div className="md:hidden py-3 border-t border-gray-800">
          <TickerSearch />
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-800 bg-gray-900/95 backdrop-blur-lg animate-slide-down">
          <div className="container-responsive max-w-7xl mx-auto py-4 space-y-1">
            {/* Navigation Links */}
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all
                  ${
                    isActive(item.path)
                      ? 'bg-brand-primary-500 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800'
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                {item.name}
              </Link>
            ))}

            {/* User Section */}
            <div className="pt-4 border-t border-gray-800 mt-4">
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-gray-400">
                    {user.name || user.email}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:bg-gray-800 transition-all"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button variant="ghost" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button variant="primary" className="w-full">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation for Mobile (Alternative) */}
      {isMobile && !isMobileMenuOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 z-sticky lg:hidden">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all
                  ${
                    isActive(item.path)
                      ? 'text-brand-primary-400 bg-brand-primary-500/10'
                      : 'text-gray-400'
                  }
                `}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

