import { useEffect, useState, useRef } from 'react';
import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import Cluster from 'ol/source/Cluster';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import { easeOut } from 'ol/easing';
import { StyleFunction } from 'ol/style/Style';
import Geometry from 'ol/geom/Geometry';
import { FeatureLike } from 'ol/Feature';
import { useGIS } from '@/contexts/gis-context';
import { cn } from '@/lib/utils';

// Animation duration in milliseconds
const ANIMATION_DURATION = 500;

// Interface for data points
interface DataPoint {
  id: string;
  position: [number, number]; // [longitude, latitude]
  properties: {
    [key: string]: any;
  };
}

interface AnimatedClusterLayerProps {
  className?: string;
  map?: Map;
  data: DataPoint[];
  distance?: number; // Clustering distance in pixels
  minDistance?: number; // Minimum distance between clusters
  maxZoom?: number; // Maximum zoom level for clustering
  initialOpacity?: number;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  strokeColor?: string;
  animationEnabled?: boolean;
  onClusterClick?: (features: Feature[], coordinate: number[]) => void;
}

/**
 * Animated Cluster Layer Component
 * 
 * This component provides animated clustering for geospatial data points:
 * - Automatically groups nearby points into clusters
 * - Animates cluster formation when zooming in/out
 * - Shows count and distribution of points in each cluster
 * - Supports custom styling and interaction
 */
const AnimatedClusterLayer = ({
  className,
  map,
  data = [],
  distance = 40,
  minDistance = 20,
  maxZoom = 19,
  initialOpacity = 0.8,
  primaryColor = '#3C91E6',
  secondaryColor = '#6FB1F4',
  textColor = '#FFFFFF',
  strokeColor = '#FFFFFF',
  animationEnabled = true,
  onClusterClick
}: AnimatedClusterLayerProps) => {
  // GIS context for accessing the map if not provided as prop
  const { map: contextMap } = useGIS();
  const activeMap = map || contextMap;
  
  // References and state
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const clusterSourceRef = useRef<Cluster | null>(null);
  const animatingRef = useRef<boolean>(false);
  const [opacity, setOpacity] = useState<number>(initialOpacity);
  const animationFrameRef = useRef<number | null>(null);

  // Convert data points to features
  const createFeatures = (dataPoints: DataPoint[]): Feature[] => {
    return dataPoints.map(point => {
      const feature = new Feature({
        geometry: new Point(fromLonLat(point.position)),
        ...point.properties,
        id: point.id
      });
      
      // Store original coordinates as property for animation
      feature.set('originalCoordinates', fromLonLat(point.position));
      
      return feature;
    });
  };

  // Create cluster style function
  const createClusterStyleFunction = (): StyleFunction => {
    return (feature: FeatureLike): Style => {
      const size = feature.get('features')?.length || 1;
      
      if (size === 1) {
        // Style for individual points
        return new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({
              color: primaryColor
            }),
            stroke: new Stroke({
              color: strokeColor,
              width: 1.5
            })
          })
        });
      }
      
      // Calculate radius based on cluster size
      const radius = Math.min(Math.max(10, Math.sqrt(size) * 3.5), 30);
      
      // Style for clusters
      return new Style({
        image: new CircleStyle({
          radius: radius,
          fill: new Fill({
            color: size > 10 ? primaryColor : secondaryColor
          }),
          stroke: new Stroke({
            color: strokeColor,
            width: 2
          })
        }),
        text: new Text({
          text: size.toString(),
          fill: new Fill({
            color: textColor
          }),
          font: 'bold 12px Arial'
        })
      });
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
        activeMap.forEachFeatureAtPixel(event.pixel, (feature) => {
          const features = feature.get('features');
          if (features && features.length > 1) {
            const geometry = feature.getGeometry();
            if (geometry) {
              const coordinate = geometry.getCoordinates();
              onClusterClick(features, coordinate);
              return true;
            }
          }
          return false;
        });
      };
      
      activeMap.on('click', clickHandler);
      
      return () => {
        activeMap.un('click', clickHandler);
        
        if (vectorLayerRef.current) {
          activeMap.removeLayer(vectorLayerRef.current);
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
    
    return () => {
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
        const coords = feature.getGeometry()?.getCoordinates();
        if (coords) {
          previousPositions.set(feature, [...coords]);
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
    const animateToNewPositions = (previousPositions: Map<Feature, number[]>) => {
      if (!clusterSourceRef.current) return;
      
      const clusterSource = clusterSourceRef.current;
      const features = clusterSource.getFeatures();
      
      // Setup animation for each feature
      features.forEach(feature => {
        const originalGeometry = feature.getGeometry();
        if (!originalGeometry) return;
        
        const currentCoords = originalGeometry.getCoordinates();
        let prevCoords = previousPositions.get(feature);
        
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
        const animGeom = originalGeometry.clone();
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

export default AnimatedClusterLayer;