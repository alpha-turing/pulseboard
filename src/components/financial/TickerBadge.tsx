import { HTMLAttributes } from 'react';

export interface TickerBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  ticker: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'outlined';
  clickable?: boolean;
}

export default function TickerBadge({
  ticker,
  size = 'md',
  variant = 'default',
  clickable = false,
  className = '',
  ...props
}: TickerBadgeProps) {
  const baseStyles = 'inline-flex items-center font-mono font-bold whitespace-nowrap transition-all duration-200';

  const sizes = {
    sm: 'px-2 py-1 text-xs rounded',
    md: 'px-2.5 py-1 text-sm rounded-md',
    lg: 'px-3 py-1.5 text-base rounded-lg',
  };

  const variants = {
    default: 'bg-brand-primary-500/10 text-brand-primary-400 border border-brand-primary-500/20',
    gradient: 'bg-gradient-to-r from-brand-primary-500/20 to-brand-secondary-500/20 text-cyan-400 border border-brand-primary-500/30',
    outlined: 'bg-transparent text-brand-primary-400 border-2 border-brand-primary-500/40',
  };

  const clickableStyles = clickable
    ? 'cursor-pointer hover:brightness-125 hover:scale-105 active:scale-95'
    : '';

  return (
    <span
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${clickableStyles} ${className}`}
      {...props}
    >
      {ticker.toUpperCase()}
    </span>
  );
}
