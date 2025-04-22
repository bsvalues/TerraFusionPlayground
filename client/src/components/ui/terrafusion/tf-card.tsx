import React from 'react';
import { cn } from '@/lib/utils';

interface TFCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient' | 'glass' | 'elevation' | 'ai';
  glowEffect?: boolean;
}

/**
 * TerraFusion Card Component
 * 
 * A stylized card component that matches the TerraFusion design system.
 * 
 * @param variant - The style variant of the card 
 *   - default: Standard card with subtle gradient
 *   - gradient: Card with more pronounced gradient background
 *   - glass: Glassmorphic card with backdrop blur
 *   - elevation: 3D elevation chart style card
 *   - ai: Special styling for AI-related content
 * @param glowEffect - Whether to apply a subtle glow effect to the card
 */
export const TFCard = ({
  children,
  className,
  variant = 'default',
  glowEffect = false,
  ...props
}: TFCardProps) => {
  const baseClasses = "rounded-xl overflow-hidden";
  
  // Determine variant-specific classes
  const variantClasses = {
    default: "tf-card",
    gradient: "tf-card-gradient",
    glass: "tf-card-glass",
    elevation: "tf-elevation-chart",
    ai: "tf-ai-card"
  };

  return (
    <div 
      className={cn(
        baseClasses,
        variantClasses[variant],
        glowEffect && "tf-glow-effect",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * TerraFusion Card Header
 */
export const TFCardHeader = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div 
      className={cn("p-4 border-b border-border/20", className)}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * TerraFusion Card Title
 */
export const TFCardTitle = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <h3 
      className={cn("text-lg font-semibold tf-heading", className)}
      {...props}
    >
      {children}
    </h3>
  );
};

/**
 * TerraFusion Card Content
 */
export const TFCardContent = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div 
      className={cn("p-4", className)}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * TerraFusion Card Footer
 */
export const TFCardFooter = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div 
      className={cn("p-4 border-t border-border/20 bg-foreground/5", className)}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * TerraFusion Stat Card
 */
export const TFStatCard = ({
  label,
  value,
  icon,
  trend,
  className,
  ...props
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'label'>) => {
  return (
    <div 
      className={cn("tf-stat-card", className)}
      {...props}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="tf-stat-label">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-baseline">
        <span className="tf-stat-value">{value}</span>
        {trend && (
          <span className={cn(
            "ml-2 text-xs flex items-center",
            trend.direction === 'up' ? "text-green-500" : 
            trend.direction === 'down' ? "text-red-500" : 
            "text-muted-foreground"
          )}>
            {trend.direction === 'up' ? (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
              </svg>
            ) : trend.direction === 'down' ? (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            ) : (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14"></path>
              </svg>
            )}
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
};