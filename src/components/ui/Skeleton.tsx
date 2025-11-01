import { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export default function Skeleton({
  width,
  height,
  variant = 'rectangular',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const baseStyles = 'skeleton bg-gray-800 animate-pulse';

  const variants = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const defaultSizes: Record<string, { width?: string; height: string }> = {
    text: { height: '1rem' },
    circular: { width: '2.5rem', height: '2.5rem' },
    rectangular: { height: '4rem' },
  };

  const computedStyle = {
    width: width || (variant === 'text' ? '100%' : defaultSizes[variant].width || undefined),
    height: height || defaultSizes[variant].height,
    ...style,
  };

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={computedStyle}
      {...props}
    />
  );
}
