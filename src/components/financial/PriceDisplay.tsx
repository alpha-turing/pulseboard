import { HTMLAttributes } from 'react';

export interface PriceDisplayProps extends HTMLAttributes<HTMLDivElement> {
  price: number;
  change?: number;
  changePercent?: number;
  size?: 'sm' | 'md' | 'lg';
  showChange?: boolean;
  currency?: string;
}

export default function PriceDisplay({
  price,
  change,
  changePercent,
  size = 'md',
  showChange = true,
  currency = 'USD',
  className = '',
  ...props
}: PriceDisplayProps) {
  const isPositive = (change ?? changePercent ?? 0) >= 0;
  const hasChange = change !== undefined || changePercent !== undefined;

  const sizes = {
    sm: {
      price: 'text-lg font-bold',
      change: 'text-xs',
    },
    md: {
      price: 'text-2xl font-bold',
      change: 'text-sm',
    },
    lg: {
      price: 'text-4xl font-bold',
      change: 'text-base',
    },
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatChange = (value: number, isPercent: boolean = false) => {
    const sign = value >= 0 ? '+' : '';
    if (isPercent) {
      return `${sign}${value.toFixed(2)}%`;
    }
    return `${sign}${value.toFixed(2)}`;
  };

  return (
    <div className={`flex items-baseline gap-2 ${className}`} {...props}>
      <span className={`${sizes[size].price} text-white font-mono`}>
        {formatPrice(price)}
      </span>
      
      {showChange && hasChange && (
        <span
          className={`
            ${sizes[size].change} font-medium font-mono
            flex items-center gap-1
            ${isPositive ? 'text-gain' : 'text-loss'}
          `}
        >
          {isPositive ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {changePercent !== undefined && formatChange(changePercent, true)}
          {change !== undefined && changePercent === undefined && formatChange(change)}
        </span>
      )}
    </div>
  );
}
