import React from 'react';
import { DashboardChartCard } from './dashboard-chart-card';
import { ElevationChart } from '@/components/visualization/elevation-chart';
import { cn } from '@/lib/utils';

/**
 * TerrainVisualizationCard Props
 */
export interface TerrainVisualizationCardProps {
  /** Card title */
  title: string;
  /** Card description */
  description?: string;
  /** Data for the elevation chart */
  elevationData: Array<{ x: number; y: number; elevation: number; color?: string }>;
  /** Height for the chart */
  height?: number;
  /** Color gradient for the chart */
  colorGradient?: 'primary' | 'secondary' | 'terrain' | 'rainbow' | 'heatmap';
  /** Whether the chart should animate */
  animate?: boolean;
  /** Whether to render in 3D mode */
  mode3D?: boolean;
  /** Optional className for additional styling */
  className?: string;
  /** Optional click handler for the card */
  onClick?: () => void;
  /** Optional click handler for data points in the chart */
  onDataPointClick?: (data: { x: number; y: number; elevation: number }) => void;
}

/**
 * TerrainVisualizationCard Component
 * 
 * A specialized card for displaying terrain elevation data
 */
export const TerrainVisualizationCard: React.FC<TerrainVisualizationCardProps> = ({
  title,
  description,
  elevationData,
  height = 300,
  colorGradient = 'terrain',
  animate = true,
  mode3D = true,
  className,
  onClick,
  onDataPointClick,
}) => {
  return (
    <DashboardChartCard
      title={title}
      description={description}
      variant="elevation"
      className={cn('cursor-default', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      <div className="h-full w-full p-1">
        <ElevationChart
          data={elevationData}
          height={height}
          animate={animate}
          colorGradient={colorGradient}
          mode3D={mode3D}
          onClick={onDataPointClick}
          className="h-full w-full"
        />
      </div>
    </DashboardChartCard>
  );
};

export default TerrainVisualizationCard;