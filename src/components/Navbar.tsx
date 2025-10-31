'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TickerSearch from './TickerSearch';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Market', path: '/market', key: 'm' },
    { name: 'Instruments', path: '/instruments', key: 'i' },
    ...(user ? [{ name: 'Watchlist', path: '/watchlist', key: 'w' }] : []),
    { name: 'Alerts', path: '/alerts', key: 'a' },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/market" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <span className="text-xl font-bold text-white">Pulseboard</span>
            </Link>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.name}
                <span className="ml-2 text-xs text-gray-500">g+{item.key}</span>
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-4">
            <TickerSearch />
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-300 hidden sm:inline">
                  {user.name || user.email}
                </span>
                <button
                  onClick={() => logout()}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/auth/login"
                  className="text-sm text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-gray-800">
        <div className="flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 text-center py-3 text-sm font-medium ${
                isActive(item.path)
                  ? 'text-primary-500 border-b-2 border-primary-500'
                  : 'text-gray-400'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
