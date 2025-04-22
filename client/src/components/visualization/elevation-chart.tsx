import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * ElevationChartProps interface
 */
export interface ElevationChartProps {
  /** Data points for elevation chart */
  data: Array<{ x: number; y: number; elevation: number; color?: string }>;
  /** Width of the chart in pixels */
  width?: number;
  /** Height of the chart in pixels */
  height?: number;
  /** Optional class name for additional styling */
  className?: string;
  /** Optional title for the chart */
  title?: string;
  /** Whether to animate the chart on mount */
  animate?: boolean;
  /** The color gradient to use (primary, secondary, etc.) */
  colorGradient?: 'primary' | 'secondary' | 'terrain' | 'rainbow' | 'heatmap';
  /** Whether to render in 3D mode */
  mode3D?: boolean;
  /** Optional on click handler */
  onClick?: (data: { x: number; y: number; elevation: number }) => void;
}

/**
 * Elevation Chart Component
 * 
 * A 3D visualization component for displaying elevation data
 */
export const ElevationChart: React.FC<ElevationChartProps> = ({
  data,
  width = 500,
  height = 300,
  className,
  title,
  animate = true,
  colorGradient = 'terrain',
  mode3D = true,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRotating, setIsRotating] = useState(animate);
  const [rotation, setRotation] = useState(0);
  const [rotationSpeed, setRotationSpeed] = useState(0.005);

  // Effect to set up and render the chart
  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Map data to visualization coordinates
    const maxElevation = Math.max(...data.map(point => point.elevation));
    const minElevation = Math.min(...data.map(point => point.elevation));
    const range = maxElevation - minElevation;

    // Animation frame handler
    let animationFrameId: number;
    let currentRotation = rotation;

    // Render function
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render background or grid if needed
      renderBackground(ctx, canvas.width, canvas.height);

      if (mode3D) {
        // Render 3D view with rotation
        render3D(ctx, canvas.width, canvas.height, currentRotation);
      } else {
        // Render 2D view
        render2D(ctx, canvas.width, canvas.height);
      }

      // Update rotation angle for animation if rotating
      if (isRotating) {
        currentRotation += rotationSpeed;
        setRotation(currentRotation);
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // Render background grid and axes
    const renderBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.save();
      
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);
      
      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 0.5;
      
      // Horizontal grid lines
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Vertical grid lines
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Draw title if provided
      if (title) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 25);
      }
      
      ctx.restore();
    };

    // Render 3D elevation map
    const render3D = (ctx: CanvasRenderingContext2D, width: number, height: number, rotation: number) => {
      ctx.save();
      
      // Setup 3D projection
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) / 4;
      
      // Sort data points by depth for proper rendering
      const sortedData = [...data].sort((a, b) => {
        // Calculate z coordinates for depth sorting based on rotation
        const za = a.x * Math.sin(rotation) - a.y * Math.cos(rotation);
        const zb = b.x * Math.sin(rotation) - b.y * Math.cos(rotation);
        return zb - za;
      });
      
      // Render points with 3D projection
      sortedData.forEach(point => {
        // Calculate 3D projection coordinates
        const xNorm = (point.x - 0.5) * 2; // Normalize to -1 to 1
        const yNorm = (point.y - 0.5) * 2;
        
        // Rotate points around y-axis
        const rotatedX = xNorm * Math.cos(rotation) - yNorm * Math.sin(rotation);
        const rotatedY = yNorm;
        const rotatedZ = xNorm * Math.sin(rotation) + yNorm * Math.cos(rotation);
        
        // Scale elevation for visual effect
        const elevationRatio = (point.elevation - minElevation) / (range || 1);
        const heightFactor = 0.5 + elevationRatio * 0.5; // Scale height between 0.5 and 1
        
        // Project 3D coordinates to 2D screen
        const projectedX = centerX + rotatedX * scale;
        const projectedY = centerY + rotatedY * scale - elevationRatio * scale * 0.5;
        
        // Determine color based on elevation and gradient choice
        const color = getColorFromGradient(elevationRatio, colorGradient);
        
        // Calculate shadow and highlight for 3D effect
        const lightIntensity = 0.5 + Math.sin(rotation) * 0.25 + rotatedZ * 0.25;
        const adjustedColor = adjustColorForLighting(color, lightIntensity);
        
        // Draw 3D point
        ctx.fillStyle = adjustedColor;
        const pointSize = 6 + elevationRatio * 4; // Larger points for higher elevations
        
        // Draw point with shadow for 3D effect
        ctx.beginPath();
        ctx.arc(projectedX, projectedY, pointSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight if it's a high point
        if (elevationRatio > 0.8) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(projectedX - 1, projectedY - 1, pointSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      ctx.restore();
    };

    // Render 2D elevation map
    const render2D = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.save();
      
      // Map data points to canvas coordinates
      data.forEach(point => {
        const x = point.x * width;
        const y = point.y * height;
        const elevationRatio = (point.elevation - minElevation) / (range || 1);
        const color = getColorFromGradient(elevationRatio, colorGradient);
        
        // Draw point
        ctx.fillStyle = color;
        const pointSize = 4 + elevationRatio * 3;
        
        ctx.beginPath();
        ctx.arc(x, y, pointSize, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.restore();
    };

    // Get color from gradient based on elevation
    const getColorFromGradient = (ratio: number, gradientType: string): string => {
      // Create color based on gradient type
      switch (gradientType) {
        case 'primary':
          return `rgba(0, ${Math.floor(100 + ratio * 155)}, ${Math.floor(150 + ratio * 105)}, 0.8)`;
        case 'secondary':
          return `rgba(${Math.floor(100 + ratio * 155)}, 0, ${Math.floor(150 + ratio * 105)}, 0.8)`;
        case 'terrain':
          // From blue (water) to green (low) to brown to white (high)
          if (ratio < 0.2) {
            return `rgba(0, 50, ${Math.floor(150 + ratio * 105)}, 0.8)`; // Blue - water
          } else if (ratio < 0.5) {
            return `rgba(${Math.floor(ratio * 100)}, ${Math.floor(100 + ratio * 155)}, 0, 0.8)`; // Green - low land
          } else if (ratio < 0.8) {
            return `rgba(${Math.floor(100 + ratio * 155)}, ${Math.floor(100 + ratio * 55)}, 0, 0.8)`; // Brown - hills
          } else {
            return `rgba(${Math.floor(200 + ratio * 55)}, ${Math.floor(200 + ratio * 55)}, ${Math.floor(200 + ratio * 55)}, 0.8)`; // White - mountains
          }
        case 'rainbow':
          // Full rainbow spectrum
          const hue = ratio * 270; // 0-270 degrees in HSL color space
          return `hsla(${hue}, 100%, 50%, 0.8)`;
        case 'heatmap':
          // From blue (cold) to red (hot)
          return `rgba(${Math.floor(ratio * 255)}, ${Math.floor((1 - ratio) * 100)}, ${Math.floor((1 - ratio) * 255)}, 0.8)`;
        default:
          return `rgba(0, ${Math.floor(100 + ratio * 155)}, ${Math.floor(150 + ratio * 105)}, 0.8)`;
      }
    };

    // Adjust color for lighting effect
    const adjustColorForLighting = (color: string, intensity: number): string => {
      // Parse rgba color
      const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([.\d]+)\)/);
      if (!rgbaMatch) return color;
      
      const r = parseInt(rgbaMatch[1], 10);
      const g = parseInt(rgbaMatch[2], 10);
      const b = parseInt(rgbaMatch[3], 10);
      const a = parseFloat(rgbaMatch[4]);
      
      // Adjust RGB values based on light intensity
      const adjustedR = Math.min(255, Math.floor(r * intensity));
      const adjustedG = Math.min(255, Math.floor(g * intensity));
      const adjustedB = Math.min(255, Math.floor(b * intensity));
      
      return `rgba(${adjustedR}, ${adjustedG}, ${adjustedB}, ${a})`;
    };

    // Handle clicks on the canvas
    const handleCanvasClick = (event: MouseEvent) => {
      if (!onClick) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      
      // Find closest data point
      let closestPoint = data[0];
      let minDistance = Number.MAX_VALUE;
      
      data.forEach(point => {
        const dx = point.x - x;
        const dy = point.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      });
      
      onClick(closestPoint);
    };

    // Add click event listener
    if (onClick) {
      canvas.addEventListener('click', handleCanvasClick);
    }

    // Initial render
    render();

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (onClick) {
        canvas.removeEventListener('click', handleCanvasClick);
      }
    };
  }, [data, width, height, rotation, isRotating, rotationSpeed, colorGradient, mode3D, title, onClick, animate]);

  // Toggle rotation on click
  const toggleRotation = () => {
    setIsRotating(prev => !prev);
  };

  return (
    <div className={cn('relative', className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-md"
        onClick={toggleRotation}
      />
      {mode3D && (
        <div className="absolute bottom-2 right-2 flex gap-2">
          <button
            className="bg-primary/20 hover:bg-primary/30 text-white rounded-full p-1"
            onClick={(e) => {
              e.stopPropagation();
              toggleRotation();
            }}
            title={isRotating ? 'Pause rotation' : 'Start rotation'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isRotating ? (
                <>
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </>
              ) : (
                <polygon points="5 3 19 12 5 21 5 3" />
              )}
            </svg>
          </button>
          <button
            className="bg-primary/20 hover:bg-primary/30 text-white rounded-full p-1"
            onClick={(e) => {
              e.stopPropagation();
              setRotationSpeed(prev => (prev === 0.005 ? 0.02 : 0.005));
            }}
            title={rotationSpeed > 0.01 ? 'Slow down' : 'Speed up'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {rotationSpeed > 0.01 ? (
                <path d="M13 20v-6m0 0V8m0 6h6m-6 0H7" />
              ) : (
                <path d="M13 20v-6m0 0V8m0 0L7 14m6-6l6 6" />
              )}
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ElevationChart;