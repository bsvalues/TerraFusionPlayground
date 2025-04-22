import React from 'react';
import { TFCard, TFCardHeader, TFCardTitle, TFCardContent } from '@/components/ui/terrafusion/tf-card';
import { cn } from '@/lib/utils';

interface DashboardChartCardProps {
  title: string;
  description?: string;
  chart: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'glass' | 'elevation' | 'ai';
  actions?: React.ReactNode;
}

/**
 * Dashboard Chart Card
 * 
 * A specialized card for displaying charts in the dashboard
 */
export const DashboardChartCard: React.FC<DashboardChartCardProps> = ({
  title,
  description,
  chart,
  className,
  variant = 'default',
  actions
}) => {
  return (
    <TFCard 
      variant={variant} 
      className={cn("h-full flex flex-col", className)}
    >
      <TFCardHeader className="flex items-center justify-between">
        <div>
          <TFCardTitle>{title}</TFCardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex space-x-2">
            {actions}
          </div>
        )}
      </TFCardHeader>
      <TFCardContent className="flex-1 flex items-center justify-center">
        {chart}
      </TFCardContent>
    </TFCard>
  );
};

/**
 * 3D Terrain Visualization Card
 * 
 * A specialized card for displaying 3D terrain visualizations
 */
export const TerrainVisualizationCard: React.FC<Omit<DashboardChartCardProps, 'variant'>> = ({
  title,
  description,
  chart,
  className,
  actions
}) => {
  return (
    <div className={cn("h-full", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tf-heading">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex space-x-2">
            {actions}
          </div>
        )}
      </div>
      <div className="terrain-3d-effect h-[calc(100%-3rem)]">
        {chart}
      </div>
    </div>
  );
};

/**
 * AI Analysis Card
 * 
 * A specialized card for displaying AI-powered analysis with a unique visual style
 */
export const AIAnalysisCard: React.FC<Omit<DashboardChartCardProps, 'variant'>> = ({
  title,
  description,
  chart,
  className,
  actions
}) => {
  return (
    <TFCard 
      variant="ai" 
      glowEffect
      className={cn("h-full flex flex-col", className)}
    >
      <TFCardHeader className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="tf-ai-icon mr-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 12L16 8M12 12L8 8M12 12L16 16M12 12L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <TFCardTitle>{title}</TFCardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex space-x-2">
            {actions}
          </div>
        )}
      </TFCardHeader>
      <TFCardContent className="flex-1 flex items-center">
        {chart}
      </TFCardContent>
    </TFCard>
  );
};