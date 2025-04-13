/**
 * Property Comparison Extension
 * 
 * This extension provides tools for comparing properties based on
 * various criteria like value, location, features, etc.
 */

import { BaseExtension } from '../base-extension';
import { ExtensionMetadata } from '../extension-interface';

/**
 * Property Comparison Extension
 */
export class PropertyComparisonExtension extends BaseExtension {
  constructor() {
    // Define extension metadata
    const metadata: ExtensionMetadata = {
      id: 'property-comparison',
      name: 'Property Comparison',
      version: '1.0.0',
      description: 'Compare properties based on various criteria.',
      author: 'SpatialEst Team',
      authorUrl: 'https://spatialest.example.com',
      homepage: 'https://spatialest.example.com/extensions/property-comparison',
      category: 'analysis',
      requiredPermissions: ['read:properties'],
      settings: [
        {
          id: 'defaultRadius',
          label: 'Default Search Radius (miles)',
          description: 'The default radius for finding properties to compare.',
          type: 'number',
          default: 5
        },
        {
          id: 'maxResults',
          label: 'Maximum Results',
          description: 'The maximum number of properties to include in comparisons.',
          type: 'number',
          default: 10
        },
        {
          id: 'weightFactors',
          label: 'Weighting Factors',
          description: 'How to weight different property attributes in comparisons.',
          type: 'select',
          default: 'balanced',
          options: [
            { label: 'Balanced', value: 'balanced' },
            { label: 'Value Focused', value: 'value' },
            { label: 'Location Focused', value: 'location' },
            { label: 'Features Focused', value: 'features' }
          ]
        }
      ]
    };
    
    super(metadata);
  }
  
  /**
   * Extension activation logic
   */
  protected async onActivate(): Promise<void> {
    this.log('Property Comparison Extension activating...');
    
    // Register commands
    this.registerCommand('compareProperties', this.compareProperties.bind(this));
    this.registerCommand('generateComparisonReport', this.generateComparisonReport.bind(this));
    this.registerCommand('findSimilarProperties', this.findSimilarProperties.bind(this));
    
    // Register menu items
    this.registerMenuItem({
      id: 'property-comparison-menu',
      label: 'Property Comparison',
      icon: 'bar-chart',
      position: 5
    });
    
    this.registerMenuItem({
      id: 'compare-properties',
      label: 'Compare Properties',
      parent: 'property-comparison-menu',
      command: 'property-comparison.compareProperties',
      position: 1
    });
    
    this.registerMenuItem({
      id: 'find-similar-properties',
      label: 'Find Similar Properties',
      parent: 'property-comparison-menu',
      command: 'property-comparison.findSimilarProperties',
      position: 2
    });
    
    this.registerMenuItem({
      id: 'generate-comparison-report',
      label: 'Generate Comparison Report',
      parent: 'property-comparison-menu',
      command: 'property-comparison.generateComparisonReport',
      position: 3
    });
    
    // Register a sample webview
    this.registerWebviewPanel(
      'property-comparison-view',
      'Property Comparison',
      `
      <div class="comparison-container">
        <h2>Property Comparison Tool</h2>
        <p>Compare properties based on various criteria like value, location, and features.</p>
        <div class="form-container">
          <div class="form-group">
            <label for="property1">Property 1:</label>
            <select id="property1" class="form-control"></select>
          </div>
          <div class="form-group">
            <label for="property2">Property 2:</label>
            <select id="property2" class="form-control"></select>
          </div>
          <div class="form-group">
            <label for="comparisonType">Comparison Type:</label>
            <select id="comparisonType" class="form-control">
              <option value="value">Assessed Value</option>
              <option value="size">Property Size</option>
              <option value="features">Property Features</option>
              <option value="location">Location Details</option>
              <option value="comprehensive">Comprehensive Comparison</option>
            </select>
          </div>
          <button id="compareBtn" class="btn btn-primary">Compare Properties</button>
        </div>
        <div id="comparisonResults" class="results-container"></div>
      </div>
      <script>
        // This is a placeholder for client-side JS that would be injected
        document.getElementById('compareBtn').addEventListener('click', function() {
          // In a real implementation, this would call the extension's API
          document.getElementById('comparisonResults').innerHTML = '<p>Loading comparison results...</p>';
        });
      </script>
      <style>
        .comparison-container {
          font-family: system-ui, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .form-container {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .btn {
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-primary {
          background: #3498db;
          color: white;
        }
        .results-container {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          min-height: 200px;
        }
      </style>
      `
    );
    
    this.log('Property Comparison Extension activated successfully');
  }
  
  /**
   * Extension deactivation logic
   */
  protected async onDeactivate(): Promise<void> {
    this.log('Property Comparison Extension deactivating...');
    // Cleanup any resources or background tasks
    this.log('Property Comparison Extension deactivated successfully');
  }
  
  /**
   * Compare properties command
   */
  private async compareProperties(propertyIds: string[]): Promise<any> {
    this.log(`Comparing properties: ${propertyIds.join(', ')}`);
    
    if (!this.context || !propertyIds || propertyIds.length < 2) {
      throw new Error('At least two property IDs are required for comparison');
    }
    
    // In a real implementation, we would fetch the properties from storage
    // and compare them based on various criteria
    
    // This is a mock implementation for demonstration purposes
    const mockComparisonResult = {
      timestamp: new Date().toISOString(),
      properties: propertyIds.map(id => ({ id, valueScore: Math.random() * 100 })),
      similarityScore: Math.random() * 100,
      factors: {
        location: Math.random() * 100,
        size: Math.random() * 100,
        value: Math.random() * 100,
        features: Math.random() * 100
      }
    };
    
    this.log(`Comparison completed with similarity score: ${mockComparisonResult.similarityScore.toFixed(2)}%`);
    
    return mockComparisonResult;
  }
  
  /**
   * Generate comparison report command
   */
  private async generateComparisonReport(propertyIds: string[], format: 'pdf' | 'csv' | 'json' = 'pdf'): Promise<any> {
    this.log(`Generating comparison report for properties: ${propertyIds.join(', ')} in ${format} format`);
    
    if (!this.context || !propertyIds || propertyIds.length < 1) {
      throw new Error('At least one property ID is required for report generation');
    }
    
    // In a real implementation, we would generate a report based on property data
    
    // This is a mock implementation for demonstration purposes
    const mockReport = {
      timestamp: new Date().toISOString(),
      format,
      propertyCount: propertyIds.length,
      reportUrl: `https://example.com/reports/comparison-${Date.now()}.${format}`,
      generationTime: Math.random() * 5 + 0.5 // Random time between 0.5 and 5.5 seconds
    };
    
    this.log(`Report generated in ${mockReport.generationTime.toFixed(2)} seconds`);
    
    return mockReport;
  }
  
  /**
   * Find similar properties command
   */
  private async findSimilarProperties(propertyId: string, options: { 
    maxResults?: number;
    radius?: number;
    weightingFactor?: 'balanced' | 'value' | 'location' | 'features';
  } = {}): Promise<any> {
    if (!this.context) {
      throw new Error('Extension context is not available');
    }
    
    const settings = this.context.settings;
    const maxResults = options.maxResults || settings.maxResults || 10;
    const radius = options.radius || settings.defaultRadius || 5;
    const weightingFactor = options.weightingFactor || settings.weightFactors || 'balanced';
    
    this.log(`Finding similar properties for property ${propertyId} with radius=${radius}, maxResults=${maxResults}, weighting=${weightingFactor}`);
    
    // In a real implementation, we would find similar properties based on the specified criteria
    
    // This is a mock implementation for demonstration purposes
    const mockSimilarProperties = Array.from({ length: Math.floor(Math.random() * maxResults) + 1 })
      .map((_, index) => ({
        id: `PROP${Math.floor(Math.random() * 10000)}`,
        similarityScore: 100 - (index * (100 / maxResults)),
        matchingFactors: ['size', 'value', 'location', 'age'].slice(0, Math.floor(Math.random() * 4) + 1)
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore);
    
    this.log(`Found ${mockSimilarProperties.length} similar properties`);
    
    return {
      originProperty: propertyId,
      searchRadius: radius,
      weightingFactor,
      similarProperties: mockSimilarProperties
    };
  }
}