import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ElevationChartProps {
  className?: string;
  data?: number[][];
  color?: string;
  wireframe?: boolean;
  animated?: boolean;
  height?: number;
}

/**
 * 3D Elevation Chart
 * 
 * A stylized 3D visualization of terrain elevation data
 */
export const ElevationChart: React.FC<ElevationChartProps> = ({
  className,
  data = [],
  color = 'rgba(6, 182, 212, 1)',
  wireframe = true,
  animated = true,
  height = 160
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Generate random data if none provided
  const chartData = data.length > 0 ? data : generateRandomElevationData(20, 20);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrame: number;
    let rotationAngle = 0;
    
    // Set canvas dimensions
    canvas.width = canvas.clientWidth * 2;
    canvas.height = canvas.clientHeight * 2;
    
    // Draw the 3D elevation chart
    const drawChart = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 30;
      
      // Calculate 3D rotation
      const cos = Math.cos(rotationAngle);
      const sin = Math.sin(rotationAngle);
      
      // Sort points by depth for proper rendering
      const sortedPoints = [];
      
      for (let i = 0; i < chartData.length; i++) {
        for (let j = 0; j < chartData[i].length; j++) {
          const x = (j - chartData[i].length / 2) * scale;
          const z = (i - chartData.length / 2) * scale;
          const y = -chartData[i][j] * scale * 0.5;
          
          // Apply 3D rotation
          const rotatedX = x * cos - z * sin;
          const rotatedZ = x * sin + z * cos;
          
          // Calculate screen position with isometric projection
          const screenX = centerX + rotatedX - rotatedZ * 0.5;
          const screenY = centerY + y + (rotatedX + rotatedZ) * 0.25;
          
          // Store point with depth info for sorting
          sortedPoints.push({
            x: screenX,
            y: screenY,
            z: rotatedZ,
            value: chartData[i][j],
            i, j
          });
        }
      }
      
      // Sort by Z for proper drawing order
      sortedPoints.sort((a, b) => a.z - b.z);
      
      // Draw the triangles
      for (let idx = 0; idx < sortedPoints.length; idx++) {
        const point = sortedPoints[idx];
        const { i, j } = point;
        
        // Skip edge points
        if (i === 0 || j === 0 || i >= chartData.length - 1 || j >= chartData[i].length - 1) continue;
        
        // Find adjacent points
        const topLeft = sortedPoints.find(p => p.i === i - 1 && p.j === j - 1);
        const top = sortedPoints.find(p => p.i === i - 1 && p.j === j);
        const left = sortedPoints.find(p => p.i === i && p.j === j - 1);
        const topRight = sortedPoints.find(p => p.i === i - 1 && p.j === j + 1);
        const bottomLeft = sortedPoints.find(p => p.i === i + 1 && p.j === j - 1);
        
        if (!topLeft || !top || !left || !topRight || !bottomLeft) continue;
        
        // Draw triangles
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(top.x, top.y);
        ctx.lineTo(left.x, left.y);
        ctx.closePath();
        
        // Calculate color based on value
        const normalizedValue = point.value / 10;
        const alpha = 0.7 + normalizedValue * 0.3;
        
        if (wireframe) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = color.replace('1)', `${alpha})`);
          ctx.fill();
        }
      }
      
      if (animated) {
        rotationAngle += 0.01;
        animationFrame = requestAnimationFrame(drawChart);
      }
    };
    
    drawChart();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [chartData, color, wireframe, animated]);
  
  return (
    <div 
      className={cn(
        "tf-elevation-chart", 
        animated && "relative overflow-hidden", 
        className
      )}
      style={{ height: `${height}px` }}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full" 
      />
    </div>
  );
};

/**
 * Generate random elevation data for demonstration
 */
function generateRandomElevationData(rows: number, cols: number): number[][] {
  const data: number[][] = [];
  
  // Generate base terrain
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      // Create a smoothed terrain with peaks and valleys
      const base = Math.sin(i / 5) * Math.cos(j / 5) * 5 + 5;
      const noise = Math.random() * 2;
      row.push(base + noise);
    }
    data.push(row);
  }
  
  // Smooth the terrain
  const smoothedData: number[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      let count = 0;
      
      // Average with neighboring cells
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const ni = i + di;
          const nj = j + dj;
          
          if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
            sum += data[ni][nj];
            count++;
          }
        }
      }
      
      row.push(sum / count);
    }
    smoothedData.push(row);
  }
  
  return smoothedData;
}