import { ReactNode } from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';

type AlertVariant = 'warning' | 'info' | 'error' | 'success';

interface AlertBoxProps {
  /** Visual variant of the alert */
  variant: AlertVariant;
  /** Title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional custom icon (overrides default) */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Optional children for custom content */
  children?: ReactNode;
}

const variantStyles: Record<AlertVariant, {
  container: string;
  icon: string;
  title: string;
  description: string;
}> = {
  warning: {
    container: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-800 dark:text-amber-200',
    description: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-800 dark:text-blue-200',
    description: 'text-blue-700 dark:text-blue-300',
  },
  error: {
    container: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-800 dark:text-red-200',
    description: 'text-red-700 dark:text-red-300',
  },
  success: {
    container: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-800 dark:text-green-200',
    description: 'text-green-700 dark:text-green-300',
  },
};

const defaultIcons: Record<AlertVariant, ReactNode> = {
  warning: <ExclamationTriangleIcon className="h-5 w-5" />,
  info: <InformationCircleIcon className="h-5 w-5" />,
  error: <XCircleIcon className="h-5 w-5" />,
  success: <CheckCircleIcon className="h-5 w-5" />,
};

/**
 * Consistent alert box component for warnings, info, errors, and success messages.
 * Used for black triangle warning, frailty indicator, etc.
 */
export function AlertBox({
  variant,
  title,
  description,
  icon,
  className,
  children,
}: AlertBoxProps) {
  const styles = variantStyles[variant];
  const displayIcon = icon || defaultIcons[variant];

  return (
    <div className={cn('rounded-lg p-4', styles.container, className)}>
      <div className="flex gap-3">
        <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
          {displayIcon}
        </div>
        <div className="flex-1">
          <h3 className={cn('font-medium', styles.title)}>{title}</h3>
          {description && (
            <p className={cn('text-sm mt-1', styles.description)}>{description}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
