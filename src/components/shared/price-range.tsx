import { cn } from '@/lib/utils/cn';
import { PriceDisplay } from './price-display';

interface PriceRangeProps {
  /** Minimum price */
  min: number | null;
  /** Maximum price */
  max: number | null;
  /** Optional label to show before the range */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show when values are null */
  showNull?: boolean;
  /** Text to show when null */
  nullText?: string;
}

/**
 * Displays a price range (e.g., "€5.20 - €12.50").
 * If min === max, shows single price.
 * Uses existing PriceDisplay internally for formatting.
 */
export function PriceRange({
  min,
  max,
  label,
  className,
  size = 'md',
  showNull = false,
  nullText = '-',
}: PriceRangeProps) {
  // If both are null, show nothing or fallback
  if (min === null && max === null) {
    if (!showNull) return null;
    return (
      <span className={cn('text-gray-400 dark:text-gray-500 italic', className)}>
        {nullText}
      </span>
    );
  }

  // If only one is available, show that one
  if (min === null) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {label && <span className="text-gray-500 dark:text-gray-400">{label}</span>}
        <PriceDisplay amount={max} size={size} />
      </span>
    );
  }

  if (max === null) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {label && <span className="text-gray-500 dark:text-gray-400">{label}</span>}
        <PriceDisplay amount={min} size={size} />
      </span>
    );
  }

  // If min === max, show single price
  if (min === max) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {label && <span className="text-gray-500 dark:text-gray-400">{label}</span>}
        <PriceDisplay amount={min} size={size} />
      </span>
    );
  }

  // Show range
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {label && <span className="text-gray-500 dark:text-gray-400">{label}</span>}
      <PriceDisplay amount={min} size={size} />
      <span className="text-gray-400 dark:text-gray-500">-</span>
      <PriceDisplay amount={max} size={size} />
    </span>
  );
}
