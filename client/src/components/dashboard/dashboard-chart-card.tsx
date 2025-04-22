import React from 'react';
import TFCard from '@/components/ui/terrafusion/tf-card';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Dashboard Chart Card Types
 */
export type ChartCardVariant = 'default' | 'glass' | 'gradient' | 'elevation' | 'ai';

/**
 * Dashboard Chart Card Props
 */
export interface DashboardChartCardProps {
  /** Chart title */
  title?: string;
  /** Chart description or subtitle */
  description?: string;
  /** Card content */
  children: React.ReactNode;
  /** Card variant style */
  variant?: ChartCardVariant;
  /** Optional className for additional styling */
  className?: string;
  /** Header actions */
  headerActions?: React.ReactNode;
  /** Special glow effect for AI cards */
  glowEffect?: boolean;
}

/**
 * Dashboard Chart Card
 * 
 * Specialized card for displaying charts in the dashboard
 */
export const DashboardChartCard: React.FC<DashboardChartCardProps> = ({
  title,
  description,
  children,
  variant = 'default',
  className,
  headerActions,
  glowEffect = false,
}) => {
  // Determine card props based on variant
  const getCardProps = () => {
    switch (variant) {
      case 'glass':
        return {
          level: 'glass' as const,
          gradient: false,
          shadow: true,
          highlight: true,
        };
      case 'gradient':
        return {
          gradient: true,
          shadow: true,
        };
      case 'elevation':
        return {
          level: 'secondary' as const,
          shadow: true,
          highlight: true,
        };
      case 'ai':
        return {
          gradient: true,
          shadow: true,
          highlight: true,
        };
      default:
        return {
          shadow: true,
        };
    }
  };

  const cardStyles = cn(
    'h-full w-full overflow-hidden',
    glowEffect && 'relative after:absolute after:inset-0 after:rounded-lg after:shadow-[0_0_15px_rgba(0,200,150,0.3)] after:opacity-70',
    className
  );

  return (
    <TFCard
      {...getCardProps()}
      title={title}
      description={description}
      headerActions={headerActions}
      className={cardStyles}
      size="auto"
    >
      {children}
    </TFCard>
  );
};

/**
 * AI-powered Dashboard Chart Card
 * 
 * Specialized variant for AI-powered charts with glow effect
 */
export const AIDashboardChartCard: React.FC<Omit<DashboardChartCardProps, 'variant' | 'glowEffect'>> = (props) => {
  return (
    <DashboardChartCard
      {...props}
      variant="ai"
      glowEffect={true}
      className={cn('border-teal-400/30 bg-gradient-to-br from-gray-900/90 to-gray-950/90', props.className)}
    />
  );
};

export default DashboardChartCard;