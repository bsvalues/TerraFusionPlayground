/**
 * TerraFusion GIS Module
 * 
 * A comprehensive GIS module for the TerraFusion platform with features including:
 * - Advanced 3D terrain visualization
 * - Enhanced property clustering
 * - QGIS integration
 * - Viewshed analysis
 * - AI-powered geospatial analysis
 */

// Export core components
export { default as GISHub } from './pages/GISHub';
export { default as TerrainVisualization3D } from './components/TerrainVisualization3D';
export { default as AdvancedClustering } from './pages/AdvancedClusteringDemo';
export { default as ClusteringDemo } from './pages/ClusteringDemo';
export { default as Terrain3DDemo } from './pages/Terrain3DDemo';

// Export utilities
export * from './utils/ol-ext-utils';

// Export contexts
export * from './contexts/GISContext';

// Export services
export * from './services/MapProviderService';