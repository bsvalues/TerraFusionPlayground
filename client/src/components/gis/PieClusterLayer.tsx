import { useEffect, useRef, useState } from 'react';
import { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Cluster } from 'ol/source';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Fill, Stroke, Text, Icon } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import type { StyleFunction } from 'ol/style/Style';
import type { FeatureLike } from 'ol/Feature';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register required Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Animation constants
const ANIMATION_DURATION = 500;

// Easing function for animations
const easeOut = (t: number): number => {
  return t * (2 - t);
};

// Interface for property data
interface DataPoint {
  id: string;
  position: [number, number]; // [longitude, latitude]
  properties: {
    [key: string]: any;
    type?: string; // Property type for categorization
    status?: string; // Property status
    value?: number; // Property value
  };
}

// Interface for cluster style options
interface ClusterStyleOptions {
  showPieCharts: boolean;
  pieChartAttribute: 'type' | 'status' | 'value';
  minSizeForPieChart: number;
  maxPieChartSize: number;
  valueRanges?: number[];
  colorScheme: Record<string, string>;
  defaultColors: string[];
  textColor: string;
  strokeColor: string;
  strokeWidth: number;
}

// Props for the component
interface PieClusterLayerProps {
  className?: string;
  map?: Map;
  data: DataPoint[];
  distance?: number; // Clustering distance in pixels
  minDistance?: number; // Minimum distance between clusters
  maxZoom?: number; // Maximum zoom level for clustering
  initialOpacity?: number;
  clusterStyleOptions?: Partial<ClusterStyleOptions>;
  animationEnabled?: boolean;
  onClusterClick?: (features: Feature[], coordinate: number[], metadata: any) => void;
  onClusterHover?: (features: Feature[] | null, coordinate: number[] | null, metadata: any) => void;
}

/**
 * Pie Chart Cluster Layer Component
 * 
 * Enhanced version of AnimatedClusterLayer that shows pie charts for cluster contents
 * - Shows distribution of property types or status within each cluster
 * - Animates cluster formation and splitting when zooming in/out
 * - Provides hover information and click interaction
 * - Highly customizable styling options
 */
const PieClusterLayer = ({
  map: externalMap,
  data = [],
  distance = 40,
  minDistance = 20,
  maxZoom = 19,
  initialOpacity = 1,
  clusterStyleOptions = {},
  animationEnabled = true,
  onClusterClick,
  onClusterHover,
}: PieClusterLayerProps) => {
  // Default style options
  const defaultStyleOptions: ClusterStyleOptions = {
    showPieCharts: true,
    pieChartAttribute: 'type',
    minSizeForPieChart: 3,
    maxPieChartSize: 35,
    colorScheme: {
      // Property type colors
      'residential': '#4285F4',
      'commercial': '#34A853',
      'industrial': '#FBBC05',
      'agricultural': '#EA4335',
      'vacant': '#673AB7',
      'mixed-use': '#3F51B5',
      // Property status colors
      'active': '#4CAF50',
      'pending': '#FFC107',
      'sold': '#F44336',
      'foreclosure': '#9C27B0',
      'off-market': '#607D8B',
    },
    defaultColors: [
      '#4285F4', '#34A853', '#FBBC05', '#EA4335', 
      '#673AB7', '#3F51B5', '#2196F3', '#009688', 
      '#FF5722', '#795548', '#9E9E9E'
    ],
    textColor: '#ffffff',
    strokeColor: '#ffffff',
    strokeWidth: 2
  };

  // Merge default options with provided options
  const styleOptions: ClusterStyleOptions = {
    ...defaultStyleOptions,
    ...clusterStyleOptions
  };

  // State and refs
  const [opacity, setOpacity] = useState(initialOpacity);
  const vectorLayerRef = useRef<VectorLayer<VectorSource>>();
  const clusterSourceRef = useRef<Cluster>();
  const animatingRef = useRef(false);
  const animationFrameRef = useRef<number>();
  // Using a simple JS Map object for canvas caching
  const pieChartCanvasCache = useRef<Record<string, HTMLCanvasElement>>({});
  
  // Use externally provided map instance
  const activeMap = externalMap;

  // Function to generate a Canvas element with a pie chart
  const generatePieChartCanvas = (categories: Record<string, number>, size: number): HTMLCanvasElement => {
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.width = size * 2; // Double size for better resolution
    canvas.height = size * 2;
    
    // Prepare data for chart.js
    const labels = Object.keys(categories);
    const data = Object.values(categories);
    
    // Generate colors for each category
    const colors = labels.map(label => 
      styleOptions.colorScheme[label] || 
      styleOptions.defaultColors[Math.abs(label.hashCode()) % styleOptions.defaultColors.length]
    );
    
    // Create chart
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    
    new ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: styleOptions.strokeColor,
          borderWidth: 1,
          hoverOffset: 0
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        },
        animation: false,
        elements: {
          arc: {
            borderWidth: 1
          }
        },
        layout: {
          padding: 0
        }
      }
    });
    
    return canvas;
  };
  
  // Convert data points to features
  const createFeatures = (dataPoints: DataPoint[]) => {
    return dataPoints.map(point => {
      const { id, position, properties } = point;
      
      // Create feature with Point geometry
      const feature = new Feature({
        geometry: new Point(fromLonLat(position)),
        originalCoordinates: position,
        properties: properties
      });
      
      // Set feature ID
      feature.setId(id);
      
      return feature;
    });
  };

  // Create cluster style function
  const createClusterStyleFunction = (): StyleFunction => {
    return (feature: FeatureLike): Style => {
      const features = feature.get('features') as Feature[];
      const size = features?.length || 1;
      
      if (size === 1) {
        // Style for individual points - simple circle
        return new Style({
          image: new Icon({
            src: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5" fill="${styleOptions.colorScheme[features[0].get('properties')?.type] || styleOptions.defaultColors[0]}" stroke="${styleOptions.strokeColor}" stroke-width="1" />
              </svg>
            `),
            scale: 1,
            anchor: [0.5, 0.5],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction'
          })
        });
      }
      
      // For clusters, decide whether to use pie chart or simple circle
      if (size >= styleOptions.minSizeForPieChart && styleOptions.showPieCharts) {
        // Count categories within cluster
        const categoryCount: Record<string, number> = {};
        features.forEach(f => {
          const props = f.get('properties') || {};
          const category = props[styleOptions.pieChartAttribute] || 'unknown';
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
        
        // Generate a unique key for this distribution
        const cacheKey = Object.entries(categoryCount)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([k, v]) => `${k}:${v}`)
          .join('|') + `|${size}`;
        
        // Calculate radius based on cluster size (min 15, max from options)
        const radius = Math.min(
          Math.max(15, Math.sqrt(size) * 3),
          styleOptions.maxPieChartSize
        );
        
        // Check if we have this chart cached
        let canvas = pieChartCanvasCache.current[cacheKey];
        if (!canvas) {
          canvas = generatePieChartCanvas(categoryCount, radius * 2);
          pieChartCanvasCache.current[cacheKey] = canvas;
        }
        
        // Store metadata for hover/click events only for actual Feature instances (not RenderFeature)
        if (feature instanceof Feature) {
          feature.set('pieChartData', {
            categoryCount,
            totalItems: size
          });
        }
        
        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create style with the pie chart as icon
        return new Style({
          image: new Icon({
            src: dataUrl,
            scale: 1,
            anchor: [0.5, 0.5],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction'
          }),
          text: new Text({
            text: size.toString(),
            fill: new Fill({
              color: styleOptions.textColor
            }),
            font: 'bold 12px Arial',
            offsetY: 1
          })
        });
      } else {
        // For smaller clusters, use a simple circle
        // Calculate radius based on cluster size
        const radius = Math.min(Math.max(10, Math.sqrt(size) * 3.5), 30);
        
        // Get dominant category if available
        let dominantCategory = 'unknown';
        if (features.length > 0) {
          const categoryCounts: Record<string, number> = {};
          features.forEach(f => {
            const props = f.get('properties') || {};
            const category = props[styleOptions.pieChartAttribute] || 'unknown';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          });
          
          let maxCount = 0;
          Object.entries(categoryCounts).forEach(([category, count]) => {
            if (count > maxCount) {
              maxCount = count;
              dominantCategory = category;
            }
          });
          
          feature.set('pieChartData', {
            categoryCounts,
            dominantCategory,
            totalItems: size
          });
        }
        
        // Use color of dominant category or default
        const fillColor = styleOptions.colorScheme[dominantCategory] || styleOptions.defaultColors[0];
        
        // Store metadata for hover/click events only for actual Feature instances (not RenderFeature)
        if (feature instanceof Feature) {
          feature.set('pieChartData', {
            categoryCounts: categoryCounts,
            dominantCategory,
            totalItems: size
          });
        }
        
        // Create style with circle and text
        return new Style({
          image: new Icon({
            src: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${radius * 2} ${radius * 2}">
                <circle cx="${radius}" cy="${radius}" r="${radius - 1}" fill="${fillColor}" stroke="${styleOptions.strokeColor}" stroke-width="${styleOptions.strokeWidth}" />
              </svg>
            `),
            scale: 1,
            anchor: [0.5, 0.5],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction'
          }),
          text: new Text({
            text: size.toString(),
            fill: new Fill({
              color: styleOptions.textColor
            }),
            font: 'bold 12px Arial',
            offsetY: 1
          })
        });
      }
    };
  };

  // Initialize vector layer with clustering
  useEffect(() => {
    if (!activeMap) return;
    
    // Convert data to features
    const features = createFeatures(data);
    
    // Create vector source
    const source = new VectorSource({
      features: features
    });
    
    // Create cluster source
    const clusterSource = new Cluster({
      distance: distance,
      minDistance: minDistance,
      source: source
    });
    
    clusterSourceRef.current = clusterSource;
    
    // Create vector layer with clustering
    const vectorLayer = new VectorLayer({
      source: clusterSource,
      style: createClusterStyleFunction(),
      opacity: opacity,
      zIndex: 10
    });
    
    // Set layer reference
    vectorLayerRef.current = vectorLayer;
    
    // Add layer to map
    activeMap.addLayer(vectorLayer);
    
    // Handle click events on clusters
    if (onClusterClick) {
      const clickHandler = (event: any) => {
        activeMap.forEachFeatureAtPixel(event.pixel, (clickedFeature: FeatureLike) => {
          // We need to handle both Feature and RenderFeature types
          const features = clickedFeature.get('features');
          if (features && features.length > 0) {
            const geometry = clickedFeature.getGeometry();
            if (geometry) {
              // Type assertion for Point geometry which has getCoordinates
              const coordinate = (geometry as Point).getCoordinates();
              const metadata = clickedFeature.get('pieChartData') || {};
              onClusterClick(features, coordinate, metadata);
              return true;
            }
          }
          return false;
        });
      };
      
      activeMap.on('click', clickHandler);
    }
    
    // Handle hover events on clusters
    if (onClusterHover) {
      const moveHandler = (event: any) => {
        let foundFeature = false;
        
        activeMap.forEachFeatureAtPixel(event.pixel, (hoveredFeature: FeatureLike) => {
          // Only process if we haven't found a feature yet
          if (!foundFeature) {
            const features = hoveredFeature.get('features');
            if (features && features.length > 0) {
              const geometry = hoveredFeature.getGeometry();
              if (geometry) {
                const coordinate = (geometry as Point).getCoordinates();
                const metadata = hoveredFeature.get('pieChartData') || {};
                onClusterHover(features, coordinate, metadata);
                foundFeature = true;
                return true;
              }
            }
          }
          return false;
        });
        
        // If no feature found, call with null to clear hover state
        if (!foundFeature) {
          onClusterHover(null, null, null);
        }
      };
      
      activeMap.on('pointermove', moveHandler);
    }
    
    // Store handlers for cleanup
    const activeClickHandler = onClusterClick ? clickHandler : null;
    
    // Cleanup function
    return () => {
      if (activeClickHandler) {
        activeMap.un('click', activeClickHandler);
      }
      
      if (onClusterHover) {
        activeMap.un('pointermove', moveHandler);
      }
      
      if (vectorLayerRef.current) {
        activeMap.removeLayer(vectorLayerRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeMap, data, distance, minDistance]);

  // Update opacity when prop changes
  useEffect(() => {
    if (vectorLayerRef.current) {
      vectorLayerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  // Setup animation for clusters when map view changes
  useEffect(() => {
    if (!activeMap || !animationEnabled) return;
    
    const handleMoveEnd = () => {
      if (animatingRef.current || !clusterSourceRef.current) return;
      
      const clusterSource = clusterSourceRef.current;
      
      // Get current features in the cluster
      const features = clusterSource.getFeatures();
      
      // Record current positions
      const previousPositions = new Map();
      features.forEach(feature => {
        const geometry = feature.getGeometry();
        if (geometry) {
          // Type assertion to Point which has getCoordinates
          const coords = (geometry as Point).getCoordinates();
          if (coords) {
            // Use an alternative key approach
            previousPositions.set(String(feature.getId()), [...coords]);
          }
        }
      });
      
      // Force the cluster source to refresh
      const distance = clusterSource.getDistance();
      clusterSource.setDistance(0);
      
      // Now set it back to trigger reorganization
      setTimeout(() => {
        if (clusterSourceRef.current) {
          clusterSourceRef.current.setDistance(distance);
          
          // After clusters reorganize, animate to new positions
          setTimeout(() => {
            animateToNewPositions(previousPositions);
          }, 0);
        }
      }, 0);
    };
    
    // Animate clusters to their new positions
    const animateToNewPositions = (previousPositions: Map) => {
      if (!clusterSourceRef.current) return;
      
      const clusterSource = clusterSourceRef.current;
      const features = clusterSource.getFeatures();
      
      // Setup animation for each feature
      features.forEach(feature => {
        const originalGeometry = feature.getGeometry();
        if (!originalGeometry) return;
        
        // Type assertion to Point which has getCoordinates
        const currentCoords = (originalGeometry as Point).getCoordinates();
        let prevCoords = previousPositions.get(String(feature.getId()));
        
        // If we don't have previous coordinates for this feature, check if it's a new cluster
        if (!prevCoords) {
          // For new clusters, get the center of the contained features
          const clusterFeatures = feature.get('features');
          if (clusterFeatures && clusterFeatures.length > 0) {
            // Use the first feature's position as starting point
            const firstFeature = clusterFeatures[0];
            prevCoords = firstFeature.get('originalCoordinates') || currentCoords;
          } else {
            prevCoords = currentCoords;
          }
        }
        
        // Skip animation if positions are the same
        if (
          prevCoords[0] === currentCoords[0] &&
          prevCoords[1] === currentCoords[1]
        ) {
          return;
        }
        
        // Clone the geometry for animation
        const animGeom = originalGeometry.clone() as Point;
        animGeom.setCoordinates(prevCoords);
        feature.setGeometry(animGeom);
        
        // Start animation
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
          const easeProgress = easeOut(progress);
          
          // Calculate intermediate position
          const x = prevCoords[0] + (currentCoords[0] - prevCoords[0]) * easeProgress;
          const y = prevCoords[1] + (currentCoords[1] - prevCoords[1]) * easeProgress;
          
          // Update geometry position
          animGeom.setCoordinates([x, y]);
          
          // Continue animation until complete
          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate);
          } else {
            animGeom.setCoordinates(currentCoords);
            animatingRef.current = false;
          }
        };
        
        animatingRef.current = true;
        animate();
      });
    };
    
    // Add event listener for map movement
    activeMap.on('moveend', handleMoveEnd);
    
    return () => {
      activeMap.un('moveend', handleMoveEnd);
    };
  }, [activeMap, animationEnabled]);

  return null; // This component doesn't render any DOM elements
};

// Helper method to create a simple hash code for strings
// Used for consistent color selection based on category names
String.prototype.hashCode = function() {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};

export default PieClusterLayer;