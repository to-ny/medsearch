import { cn } from '@/lib/utils/cn';
import { formatPrice } from '@/lib/utils/format';

interface PriceDisplayProps {
  amount: number | null;
  showNull?: boolean;
  nullText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PriceDisplay({
  amount,
  showNull = false,
  nullText = 'Price not available',
  size = 'md',
  className,
}: PriceDisplayProps) {
  if (amount === null) {
    if (!showNull) return null;
    return (
      <span className={cn('text-gray-400 dark:text-gray-500 italic', className)}>
        {nullText}
      </span>
    );
  }

  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  return (
    <span className={cn('font-medium text-gray-900 dark:text-gray-100', sizeStyles[size], className)}>
      {formatPrice(amount)}
    </span>
  );
}
