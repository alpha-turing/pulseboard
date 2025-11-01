import { HTMLAttributes, ReactNode } from 'react';
import Card from '../ui/Card';

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  loading = false,
  className = '',
  ...props
}: StatCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-gain';
    if (trend === 'down') return 'text-loss';
    return 'text-neutral';
  };

  const getTrendIcon = () => {
    if (trend === 'up') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    if (trend === 'down') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className={className} {...props}>
        <div className="space-y-3">
          <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-800 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-800 rounded animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} {...props}>
      <div className="space-y-2">
        {/* Title with icon */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          {icon && <div className="text-gray-500">{icon}</div>}
        </div>

        {/* Value */}
        <p className="text-3xl font-bold text-white font-mono">{value}</p>

        {/* Change indicator */}
        {(change !== undefined || changeLabel) && (
          <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>
              {change !== undefined && (
                <>
                  {change >= 0 ? '+' : ''}
                  {change.toFixed(2)}%
                </>
              )}
              {changeLabel && <span className="ml-1 text-gray-500">{changeLabel}</span>}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
