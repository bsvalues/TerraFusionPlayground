import React from 'react';
import { cn } from '@/lib/utils';
import TFCard from './tf-card';
import { ArrowDownIcon, ArrowUpIcon, ArrowRightIcon } from 'lucide-react';

/**
 * TerraFusion Stat Card Types
 */
export type TFStatTrend = 'up' | 'down' | 'neutral';
export type TFStatVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

/**
 * TerraFusion Stat Card Props
 */
export interface TFStatCardProps {
  /** The title or label for the stat */
  title: string;
  /** The main value to display */
  value: string | number;
  /** Optional trend direction */
  trend?: TFStatTrend;
  /** Optional percentage or change value */
  change?: string | number;
  /** Optional description or helper text */
  description?: string;
  /** Optional visual variant */
  variant?: TFStatVariant;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Optional className for styling */
  className?: string;
  /** Whether the card should have a hover effect */
  hoverable?: boolean;
  /** Whether the stat is in a loading state */
  loading?: boolean;
  /** Label for the time period if applicable */
  period?: string;
  /** Format to use for values (e.g., 'currency', 'percentage') */
  format?: 'currency' | 'percentage' | 'number' | 'integer';
  /** Click handler for the card */
  onClick?: () => void;
}

/**
 * TerraFusion Stat Card Component
 * 
 * A card component for displaying statistics and metrics
 */
export const TFStatCard: React.FC<TFStatCardProps> = ({
  title,
  value,
  trend = 'neutral',
  change,
  description,
  variant = 'primary',
  icon,
  className,
  hoverable = true,
  loading = false,
  period,
  format,
  onClick,
}) => {
  // Format the value based on format prop
  const formattedValue = React.useMemo(() => {
    if (format === 'currency' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    
    if (format === 'percentage' && typeof value === 'number') {
      return `${value.toFixed(1)}%`;
    }
    
    if (format === 'integer' && typeof value === 'number') {
      return Math.round(value).toLocaleString();
    }
    
    if (format === 'number' && typeof value === 'number') {
      return value.toLocaleString();
    }
    
    return value;
  }, [value, format]);

  // Format the change value
  const formattedChange = React.useMemo(() => {
    if (typeof change === 'number') {
      return change > 0 ? `+${change}%` : `${change}%`;
    }
    return change;
  }, [change]);

  // Get trend icon
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUpIcon className="h-4 w-4" />;
      case 'down':
        return <ArrowDownIcon className="h-4 w-4" />;
      default:
        return <ArrowRightIcon className="h-4 w-4" />;
    }
  };

  // Get color classes based on trend and variant
  const getTrendColorClasses = () => {
    if (trend === 'up') {
      return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';
    }
    if (trend === 'down') {
      return 'text-rose-500 bg-rose-50 dark:bg-rose-950/30';
    }
    return 'text-gray-500 bg-gray-50 dark:bg-gray-800/30';
  };

  // Get variant-specific classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'border-primary/20 bg-gradient-to-b from-primary/5 to-primary/10';
      case 'secondary':
        return 'border-secondary/20 bg-gradient-to-b from-secondary/5 to-secondary/10';
      case 'success':
        return 'border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-emerald-500/10';
      case 'warning':
        return 'border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-amber-500/10';
      case 'danger':
        return 'border-rose-500/20 bg-gradient-to-b from-rose-500/5 to-rose-500/10';
      case 'info':
        return 'border-sky-500/20 bg-gradient-to-b from-sky-500/5 to-sky-500/10';
      case 'muted':
        return 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50';
      default:
        return 'border-primary/20 bg-gradient-to-b from-primary/5 to-primary/10';
    }
  };

  return (
    <TFCard
      className={cn(
        'overflow-hidden',
        getVariantClasses(),
        hoverable && 'transition-all hover:-translate-y-1 hover:shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      loading={loading}
      shadow={true}
      size="auto"
      onClick={onClick}
    >
      <div className="p-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {icon && (
            <div className="rounded-full bg-primary/10 p-1 text-primary">
              {icon}
            </div>
          )}
        </div>
        
        <div className="mt-2 flex items-baseline">
          <div className="text-2xl font-semibold">{formattedValue}</div>
          
          {change && (
            <div className={cn('ml-2 flex items-center rounded-full px-2 py-0.5 text-xs', getTrendColorClasses())}>
              {getTrendIcon()}
              <span className="ml-1">{formattedChange}</span>
            </div>
          )}
        </div>
        
        {description && (
          <div className="mt-2 text-xs text-muted-foreground">{description}</div>
        )}
        
        {period && (
          <div className="mt-2 text-xs text-muted-foreground/70">{period}</div>
        )}
      </div>
    </TFCard>
  );
};

/**
 * Specialized Percentage Change Stat Card
 */
export const TFPercentageCard: React.FC<Omit<TFStatCardProps, 'format'>> = (props) => {
  return <TFStatCard {...props} format="percentage" />;
};

/**
 * Specialized Currency Stat Card
 */
export const TFCurrencyCard: React.FC<Omit<TFStatCardProps, 'format'>> = (props) => {
  return <TFStatCard {...props} format="currency" />;
};

/**
 * Specialized Count Stat Card
 */
export const TFCountCard: React.FC<Omit<TFStatCardProps, 'format'>> = (props) => {
  return <TFStatCard {...props} format="integer" />;
};

export default TFStatCard;