'use client';

import { cn } from '@/lib/utils';
import { TrendUpIcon, TrendDownIcon } from '@/components/ui/icons';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function MetricsCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  className,
  variant = 'default',
}: MetricsCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-error',
  };

  return (
    <div className={cn('glass-card p-5', className)}>
      <p className="text-sm text-muted-foreground font-medium">{title}</p>
      <div className="flex items-end gap-2 mt-2">
        <p className={cn('text-3xl font-bold', variantStyles[variant])}>
          {value}
        </p>
        {trend && trendValue && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium pb-1',
              trend === 'up' && 'text-success',
              trend === 'down' && 'text-error',
              trend === 'stable' && 'text-muted-foreground'
            )}
          >
            {trend === 'up' && <TrendUpIcon />}
            {trend === 'down' && <TrendDownIcon />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
