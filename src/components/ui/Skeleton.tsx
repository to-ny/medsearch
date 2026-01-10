import type { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const defaultHeight = variant === 'text' ? '1em' : undefined;

  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${variants[variant]} ${className}`}
      style={{
        width,
        height: height || defaultHeight,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
      <Skeleton variant="text" className="mb-2 h-6 w-3/4" />
      <Skeleton variant="text" className="mb-4 h-4 w-1/2" />
      <Skeleton variant="rectangular" className="mb-4 h-24" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="h-8 w-20" />
        <Skeleton variant="rectangular" className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex-1">
        <Skeleton variant="text" className="mb-2 h-5 w-3/4" />
        <Skeleton variant="text" className="mb-2 h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton variant="rectangular" className="h-5 w-16" />
        </div>
      </div>
      <div className="ml-4">
        <Skeleton variant="text" className="h-6 w-16" />
      </div>
    </div>
  );
}

export function ProductCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" role="list" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
