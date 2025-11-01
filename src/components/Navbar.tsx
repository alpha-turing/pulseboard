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
    { 
      name: 'Market', 
      path: '/market', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    { 
      name: 'Instruments', 
      path: '/instruments', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    ...(user ? [{
      name: 'Watchlist', 
      path: '/watchlist', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      )
    }] : []),
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
          <div className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  group relative px-4 py-2.5 rounded-xl text-sm font-semibold 
                  transition-all duration-200 flex items-center gap-2
                  ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-brand-primary-500 to-brand-primary-600 text-white shadow-lg shadow-brand-primary-500/40'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/80'
                  }
                `}
              >
                <span className={`transition-transform duration-200 ${isActive(item.path) ? '' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span>{item.name}</span>          
                {isActive(item.path) && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                )}
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
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary-500 to-brand-secondary-500 flex items-center justify-center shadow-lg shadow-brand-primary-500/20">
                      <span className="text-white font-bold text-sm">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-white hidden xl:inline max-w-[150px] truncate">
                      {user.name || user.email}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-gray-700/50" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => logout()}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
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
        <div className="lg:hidden border-t border-gray-800 bg-gray-900/98 backdrop-blur-xl animate-slide-down shadow-2xl">
          <div className="container-responsive max-w-7xl mx-auto py-4 space-y-2">
            {/* Navigation Links */}
            {navItems.map((item, index) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`
                  group flex items-center gap-4 px-4 py-4 rounded-xl text-base font-semibold 
                  transition-all duration-200 animate-slide-up relative overflow-hidden
                  ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-brand-primary-500 to-brand-primary-600 text-white shadow-lg shadow-brand-primary-500/30'
                      : 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                  }
                `}
              >
                {isActive(item.path) && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r" />
                )}
                <span className={`transition-transform duration-200 ${isActive(item.path) ? '' : 'group-hover:scale-110 group-active:scale-95'}`}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.name}</span>
                {isActive(item.path) && (
                  <svg className="w-5 h-5 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </Link>
            ))}

            {/* User Section */}
            <div className="pt-4 border-t border-gray-800 mt-4">
              {user ? (
                <div className="space-y-2">
                  <div className="px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary-500 to-brand-secondary-500 flex items-center justify-center shadow-lg shadow-brand-primary-500/20">
                        <span className="text-white font-bold">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {user.name || 'User'}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-gray-300 hover:bg-gray-800 active:bg-gray-700 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button variant="ghost" className="w-full justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Login
                    </Button>
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button variant="primary" className="w-full justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
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
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/98 backdrop-blur-xl border-t border-gray-800 z-sticky lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  group relative flex flex-col items-center justify-center gap-1.5 flex-1 h-full 
                  rounded-xl transition-all duration-200 touch-target
                  ${
                    isActive(item.path)
                      ? 'text-brand-primary-400'
                      : 'text-gray-500 active:bg-gray-800/50'
                  }
                `}
              >
                {/* Active indicator */}
                {isActive(item.path) && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-brand-primary-500 to-brand-primary-600 rounded-full" />
                )}
                
                {/* Icon with animated background */}
                <div className={`
                  relative transition-all duration-200
                  ${isActive(item.path) ? 'scale-110' : 'group-active:scale-90'}
                `}>
                  {isActive(item.path) && (
                    <div className="absolute inset-0 bg-brand-primary-500/20 rounded-lg blur-xl" />
                  )}
                  <div className={`
                    relative p-1.5 rounded-lg transition-all
                    ${isActive(item.path) ? 'bg-brand-primary-500/10' : ''}
                  `}>
                    {item.icon}
                  </div>
                </div>
                
                {/* Label */}
                <span className={`
                  text-[10px] font-semibold transition-all
                  ${isActive(item.path) ? 'text-brand-primary-400' : 'text-gray-500 group-active:text-gray-400'}
                `}>
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

