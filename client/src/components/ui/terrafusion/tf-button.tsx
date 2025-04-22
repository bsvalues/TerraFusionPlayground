import React from 'react';
import { cn } from '@/lib/utils';

interface TFButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

/**
 * TerraFusion Button Component
 * 
 * A stylized button component that matches the TerraFusion design system.
 */
export const TFButton = React.forwardRef<HTMLButtonElement, TFButtonProps>(
  ({ 
    children, 
    className, 
    variant = 'primary', 
    size = 'md', 
    disabled = false,
    isLoading = false,
    iconLeft,
    iconRight,
    ...props 
  }, ref) => {
    // Define base classes
    const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none";
    
    // Define variant classes
    const variantClasses = {
      primary: "tf-button-primary",
      secondary: "tf-button-secondary",
      outline: "tf-button-outline",
      ghost: "bg-transparent hover:bg-foreground/5 text-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
      ai: "bg-gradient-to-r from-primary/80 via-purple-500/80 to-pink-500/80 text-white hover:opacity-90"
    };
    
    // Define size classes
    const sizeClasses = {
      sm: "text-xs px-2.5 py-1.5",
      md: "text-sm px-4 py-2",
      lg: "text-base px-6 py-3"
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        
        {!isLoading && iconLeft && <span className="mr-2">{iconLeft}</span>}
        {children}
        {!isLoading && iconRight && <span className="ml-2">{iconRight}</span>}
      </button>
    );
  }
);

TFButton.displayName = 'TFButton';

/**
 * TerraFusion Icon Button
 * 
 * A circular icon button component
 */
export const TFIconButton = React.forwardRef<HTMLButtonElement, Omit<TFButtonProps, 'iconLeft' | 'iconRight'> & { icon: React.ReactNode }>( 
  ({
    className,
    variant = 'primary',
    size = 'md',
    disabled = false,
    isLoading = false,
    icon,
    ...props
  }, ref) => {
    // Define base classes
    const baseClasses = "flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none";
    
    // Define variant classes - same as button but without padding
    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-border/50 shadow-sm",
      outline: "bg-transparent border border-primary text-primary hover:bg-primary/10",
      ghost: "bg-transparent hover:bg-foreground/5 text-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
      ai: "bg-gradient-to-r from-primary/80 via-purple-500/80 to-pink-500/80 text-white hover:opacity-90"
    };
    
    // Define size classes for icon buttons
    const sizeClasses = {
      sm: "h-8 w-8 text-sm",
      md: "h-10 w-10 text-base",
      lg: "h-12 w-12 text-lg"
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg 
            className="animate-spin h-5 w-5" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          icon
        )}
      </button>
    );
  }
);

TFIconButton.displayName = 'TFIconButton';

/**
 * TerraFusion Button Group
 * 
 * A container for grouping multiple buttons
 */
export const TFButtonGroup = ({
  children,
  className,
  orientation = 'horizontal',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical';
}) => {
  return (
    <div 
      className={cn(
        "inline-flex",
        orientation === 'horizontal' ? "flex-row" : "flex-col",
        orientation === 'horizontal' ? "space-x-2" : "space-y-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};