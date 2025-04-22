import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { TFButtonVariant, TFButtonSize } from './tf-button';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * TerraFusion Icon Button Props Interface
 */
export interface TFIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: TFButtonVariant;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Is the button loading */
  loading?: boolean;
  /** Icon to display in the button */
  icon: React.ReactNode;
  /** Optional tooltip text */
  tooltip?: string;
  /** Optional className for additional styling */
  className?: string;
  /** Creates a glass-like effect */
  glassmorphic?: boolean;
  /** Animates on hover */
  animated?: boolean;
  /** Should the button be rounded */
  rounded?: boolean;
  /** Should the button have a border */
  bordered?: boolean;
}

/**
 * TerraFusion Icon Button Component
 * 
 * A button component specifically designed for icons
 */
export const TFIconButton = forwardRef<HTMLButtonElement, TFIconButtonProps>(
  ({
    variant = 'default',
    size = 'md',
    loading = false,
    icon,
    tooltip,
    className = '',
    glassmorphic = false,
    animated = false,
    rounded = true,
    bordered = false,
    ...props
  }, ref) => {
    // Map TerraFusion variant names to Shadcn/UI variant
    const variantMap: Record<TFButtonVariant, string> = {
      default: 'default',
      primary: 'default',
      secondary: 'secondary',
      accent: 'accent',
      ghost: 'ghost',
      link: 'link',
      outline: 'outline',
      destructive: 'destructive',
      success: 'success',
    };

    // Map TerraFusion sizes to tailwind classes
    const sizeClasses: Record<string, string> = {
      sm: 'h-8 w-8 p-1',
      md: 'h-10 w-10 p-2',
      lg: 'h-12 w-12 p-2',
    };

    const buttonClasses = cn(
      sizeClasses[size],
      rounded ? 'rounded-full' : '',
      bordered ? 'border border-border' : '',
      glassmorphic ? 'backdrop-blur-sm bg-opacity-80 shadow-md' : '',
      animated ? 'transition-all duration-200 hover:shadow-md hover:-translate-y-1' : '',
      variant === 'accent' ? 'bg-teal-600 text-white hover:bg-teal-700' : '',
      variant === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : '',
      className
    );

    return (
      <Button
        ref={ref}
        type="button"
        variant={variantMap[variant] as any}
        className={buttonClasses}
        disabled={loading || props.disabled}
        title={tooltip}
        aria-label={tooltip}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </Button>
    );
  }
);

TFIconButton.displayName = 'TFIconButton';

export default TFIconButton;