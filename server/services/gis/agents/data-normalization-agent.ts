/**
 * Data Normalization Agent
 *
 * This agent is responsible for normalizing and cleaning GIS data.
 * It can detect and fix common data quality issues in spatial datasets.
 */

import { v4 as uuidv4 } from 'uuid';
import { IStorage } from '../../../storage';
import { GISAgentType, GISTaskType, TaskStatus, IGISAgent } from '../agent-orchestration-service';
import { GISAgentTask, InsertAgentMessage } from '@shared/gis-schema';

export class DataNormalizationAgent implements IGISAgent {
  public id: string;
  public type: GISAgentType;
  public name: string;
  public description: string;
  public capabilities: string[];
  public status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';

  private storage: IStorage;
  private isInitialized: boolean = false;

  constructor(storage: IStorage, id?: string) {
    this.id = id || `data-normalization-agent-${uuidv4()}`;
    this.type = GISAgentType.DATA_NORMALIZATION;
    this.name = 'Data Normalization Agent';
    this.description = 'Normalizes and cleans GIS data to ensure quality and consistency';
    this.capabilities = [
      'detect-data-anomalies',
      'fix-coordinate-issues',
      'normalize-attribute-names',
      'standardize-data-types',
      'remove-duplicates',
      'fill-missing-values',
    ];
    this.status = 'OFFLINE';
    this.storage = storage;
  }

  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log(`Initializing ${this.name} (${this.id})...`);

      // Log agent initialization - let database generate the ID
      await this.storage.createAgentMessage({
        agentId: this.id,
        type: 'INFO',
        content: `Agent ${this.name} (${this.id}) initialized`,
        timestamp: new Date(),
      });

      this.status = 'AVAILABLE';
      this.isInitialized = true;
      console.log(`${this.name} (${this.id}) initialized successfully`);
    } catch (error) {
      console.error(`Failed to initialize ${this.name} (${this.id}):`, error);
      this.status = 'OFFLINE';
      throw error;
    }
  }

  /**
   * Process a task
   * @param task The task to process
   * @returns The result of the task
   */
  public async processTask(task: GISAgentTask): Promise<any> {
    console.log(`${this.name} (${this.id}) processing task ${task.id}...`);

    try {
      // Log task start
      await this.logMessage('INFO', `Processing task ${task.id}: ${task.taskType}`);

      // Validate the task
      if (!task.data) {
        throw new Error('Task data is required');
      }

      let result;

      // Process the task based on its type
      switch (task.taskType) {
        case GISTaskType.DATA_CLEANING:
          result = await this.cleanData(task.data);
          break;
        default:
          throw new Error(`Unsupported task type: ${task.taskType}`);
      }

      // Log task completion
      await this.logMessage('INFO', `Task ${task.id} completed successfully`);

      return result;
    } catch (error) {
      // Log task failure
      await this.logMessage('ERROR', `Task ${task.id} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean and normalize GIS data
   * @param data The data to clean and normalize
   * @returns The data cleaning result
   */
  private async cleanData(data: any): Promise<any> {
    const { dataset, options } = data;

    if (!dataset) {
      throw new Error('Dataset is required for data cleaning');
    }

    // Set default options if not provided
    const cleaningOptions = {
      normalizeAttributeNames: true,
      standardizeDataTypes: true,
      removeDuplicates: true,
      fillMissingValues: false,
      fixCoordinateIssues: true,
      ...options,
    };

    await this.logMessage(
      'INFO',
      `Cleaning GIS data with options: ${JSON.stringify(cleaningOptions)}`
    );

    try {
      // Create a copy of the dataset to avoid modifying the original
      const cleanedDataset = JSON.parse(JSON.stringify(dataset));

      // Track changes made to the dataset
      const changes = {
        attributesNormalized: [],
        dataTypesStandardized: [],
        duplicatesRemoved: 0,
        missingValuesFilled: 0,
        coordinatesFixed: 0,
        totalFeaturesProcessed: 0,
        totalAttributesProcessed: 0,
      };

      // Process features in dataset
      if (cleanedDataset.features && Array.isArray(cleanedDataset.features)) {
        // Count total features
        const initialFeatureCount = cleanedDataset.features.length;
        changes.totalFeaturesProcessed = initialFeatureCount;

        // Normalize attribute names if enabled
        if (cleaningOptions.normalizeAttributeNames) {
          changes.attributesNormalized = this.normalizeAttributeNames(cleanedDataset);
        }

        // Standardize data types if enabled
        if (cleaningOptions.standardizeDataTypes) {
          changes.dataTypesStandardized = this.standardizeDataTypes(cleanedDataset);
        }

        // Fix coordinate issues if enabled
        if (cleaningOptions.fixCoordinateIssues) {
          changes.coordinatesFixed = this.fixCoordinateIssues(cleanedDataset);
        }

        // Fill missing values if enabled
        if (cleaningOptions.fillMissingValues) {
          changes.missingValuesFilled = this.fillMissingValues(cleanedDataset);
        }

        // Remove duplicates if enabled
        if (cleaningOptions.removeDuplicates) {
          const initialFeatures = cleanedDataset.features.length;
          this.removeDuplicates(cleanedDataset);
          changes.duplicatesRemoved = initialFeatures - cleanedDataset.features.length;
        }
      }

      // Create cleaning result
      const cleaningResult = {
        cleanedDataset,
        changes,
        cleanedAt: new Date().toISOString(),
        summary: {
          featuresProcessed: changes.totalFeaturesProcessed,
          attributesProcessed: changes.totalAttributesProcessed,
          issuesFixed:
            changes.attributesNormalized.length +
            changes.dataTypesStandardized.length +
            changes.duplicatesRemoved +
            changes.missingValuesFilled +
            changes.coordinatesFixed,
        },
      };

      await this.logMessage(
        'INFO',
        `Data cleaning completed with ${cleaningResult.summary.issuesFixed} issues fixed`
      );

      return cleaningResult;
    } catch (error) {
      await this.logMessage('ERROR', `Data cleaning error: ${error.message}`);
      throw new Error(`Data cleaning failed: ${error.message}`);
    }
  }

  /**
   * Normalize attribute names in the dataset
   * @param dataset The dataset to normalize
   * @returns The list of attribute names that were normalized
   */
  private normalizeAttributeNames(dataset: any): string[] {
    const normalizedAttributes: string[] = [];

    // Example implementation - normalize attribute names
    if (dataset.features && dataset.features.length > 0) {
      // Get a sample feature to extract properties
      const sampleFeature = dataset.features[0];

      if (sampleFeature.properties) {
        const properties = sampleFeature.properties;
        const oldKeys = Object.keys(properties);

        // Create a mapping of old keys to normalized keys
        const keyMap: Record<string, string> = {};

        for (const oldKey of oldKeys) {
          // Convert to camelCase
          const newKey = this.toCamelCase(oldKey);

          if (oldKey !== newKey) {
            keyMap[oldKey] = newKey;
            normalizedAttributes.push(`${oldKey} -> ${newKey}`);
          }
        }

        // Apply the key mapping to all features
        for (const feature of dataset.features) {
          if (feature.properties) {
            const newProperties: Record<string, any> = {};

            for (const [oldKey, value] of Object.entries(feature.properties)) {
              const newKey = keyMap[oldKey] || oldKey;
              newProperties[newKey] = value;
            }

            feature.properties = newProperties;
          }
        }
      }
    }

    return normalizedAttributes;
  }

  /**
   * Convert a string to camelCase
   * @param str The string to convert
   * @returns The camelCase string
   */
  private toCamelCase(str: string): string {
    // Replace non-alphanumeric characters with spaces
    const cleanedStr = str.replace(/[^a-zA-Z0-9]/g, ' ');

    // Split on spaces
    const words = cleanedStr.split(/\s+/);

    // Convert to camelCase
    return words
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  /**
   * Standardize data types in the dataset
   * @param dataset The dataset to standardize
   * @returns The list of attributes that were standardized
   */
  private standardizeDataTypes(dataset: any): string[] {
    const standardizedAttributes: string[] = [];

    // Example implementation - standardize data types
    if (dataset.features && dataset.features.length > 0) {
      // Get all attribute names
      const attributeNames = new Set<string>();

      // Collect all possible attribute names
      for (const feature of dataset.features) {
        if (feature.properties) {
          for (const key of Object.keys(feature.properties)) {
            attributeNames.add(key);
          }
        }
      }

      // For each attribute, determine the best data type
      const attributeTypes: Record<string, string> = {};

      for (const attributeName of attributeNames) {
        // Collect non-null values for the attribute
        const values = dataset.features
          .map(f => f.properties?.[attributeName])
          .filter(v => v !== null && v !== undefined);

        if (values.length === 0) {
          continue;
        }

        // Determine the best type for the attribute
        const bestType = this.determineBestType(values);
        attributeTypes[attributeName] = bestType;

        // Convert all values to the best type
        let convertedCount = 0;

        for (const feature of dataset.features) {
          if (feature.properties && feature.properties[attributeName] !== undefined) {
            const oldValue = feature.properties[attributeName];
            const newValue = this.convertToType(oldValue, bestType);

            if (oldValue !== newValue) {
              feature.properties[attributeName] = newValue;
              convertedCount++;
            }
          }
        }

        if (convertedCount > 0) {
          standardizedAttributes.push(`${attributeName} -> ${bestType} (${convertedCount} values)`);
        }
      }
    }

    return standardizedAttributes;
  }

  /**
   * Determine the best data type for a list of values
   * @param values The values to analyze
   * @returns The best data type for the values
   */
  private determineBestType(values: any[]): string {
    // Count the number of values of each type
    let intCount = 0;
    let floatCount = 0;
    let boolCount = 0;
    let dateCount = 0;
    let stringCount = 0;

    for (const value of values) {
      if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          intCount++;
        } else {
          floatCount++;
        }
      } else if (typeof value === 'boolean') {
        boolCount++;
      } else if (typeof value === 'string') {
        // Check if it's a date
        if (!isNaN(Date.parse(value))) {
          dateCount++;
        } else {
          stringCount++;
        }
      }
    }

    const total = values.length;

    // Determine the best type based on the distribution
    if (boolCount / total > 0.8) {
      return 'boolean';
    } else if ((intCount + floatCount) / total > 0.8) {
      if (floatCount > 0) {
        return 'float';
      } else {
        return 'integer';
      }
    } else if (dateCount / total > 0.8) {
      return 'date';
    } else {
      return 'string';
    }
  }

  /**
   * Convert a value to a specific type
   * @param value The value to convert
   * @param type The type to convert to
   * @returns The converted value
   */
  private convertToType(value: any, type: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (type) {
      case 'integer':
        if (typeof value === 'string') {
          return parseInt(value, 10);
        } else if (typeof value === 'number') {
          return Math.round(value);
        } else if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }
        break;
      case 'float':
        if (typeof value === 'string') {
          return parseFloat(value);
        } else if (typeof value === 'boolean') {
          return value ? 1.0 : 0.0;
        } else if (typeof value === 'number') {
          return value;
        }
        break;
      case 'boolean':
        if (typeof value === 'string') {
          const lowercase = value.toLowerCase();
          if (['true', 'yes', '1', 'y'].includes(lowercase)) {
            return true;
          } else if (['false', 'no', '0', 'n'].includes(lowercase)) {
            return false;
          }
        } else if (typeof value === 'number') {
          return value !== 0;
        }
        break;
      case 'date':
        if (typeof value === 'string') {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch {
            // Ignore if conversion fails
          }
        }
        break;
      case 'string':
        return String(value);
    }

    // Return the original value if conversion fails
    return value;
  }

  /**
   * Fix coordinate issues in the dataset
   * @param dataset The dataset to fix
   * @returns The number of coordinates that were fixed
   */
  private fixCoordinateIssues(dataset: any): number {
    let fixedCount = 0;

    // Example implementation - fix coordinate issues
    if (dataset.features && dataset.features.length > 0) {
      for (const feature of dataset.features) {
        if (feature.geometry && feature.geometry.coordinates) {
          const coordinates = feature.geometry.coordinates;

          // Handle different geometry types
          switch (feature.geometry.type) {
            case 'Point':
              if (this.fixPointCoordinates(coordinates)) {
                fixedCount++;
              }
              break;
            case 'LineString':
              for (let i = 0; i < coordinates.length; i++) {
                if (this.fixPointCoordinates(coordinates[i])) {
                  fixedCount++;
                }
              }
              break;
            case 'Polygon':
              for (const ring of coordinates) {
                for (let i = 0; i < ring.length; i++) {
                  if (this.fixPointCoordinates(ring[i])) {
                    fixedCount++;
                  }
                }
              }
              break;
            case 'MultiPoint':
              for (let i = 0; i < coordinates.length; i++) {
                if (this.fixPointCoordinates(coordinates[i])) {
                  fixedCount++;
                }
              }
              break;
            case 'MultiLineString':
              for (const line of coordinates) {
                for (let i = 0; i < line.length; i++) {
                  if (this.fixPointCoordinates(line[i])) {
                    fixedCount++;
                  }
                }
              }
              break;
            case 'MultiPolygon':
              for (const polygon of coordinates) {
                for (const ring of polygon) {
                  for (let i = 0; i < ring.length; i++) {
                    if (this.fixPointCoordinates(ring[i])) {
                      fixedCount++;
                    }
                  }
                }
              }
              break;
          }
        }
      }
    }

    return fixedCount;
  }

  /**
   * Fix issues in point coordinates
   * @param point The point coordinates to fix
   * @returns True if the point was fixed, false otherwise
   */
  private fixPointCoordinates(point: number[]): boolean {
    if (!point || point.length < 2) {
      return false;
    }

    let fixed = false;

    // Fix invalid longitude values (beyond -180 to 180)
    if (point[0] < -180 || point[0] > 180) {
      point[0] = ((((point[0] + 180) % 360) + 360) % 360) - 180;
      fixed = true;
    }

    // Fix invalid latitude values (beyond -90 to 90)
    if (point[1] < -90 || point[1] > 90) {
      point[1] = Math.max(-90, Math.min(90, point[1]));
      fixed = true;
    }

    return fixed;
  }

  /**
   * Fill missing values in the dataset
   * @param dataset The dataset to fill
   * @returns The number of missing values that were filled
   */
  private fillMissingValues(dataset: any): number {
    let filledCount = 0;

    // Example implementation - fill missing values
    if (dataset.features && dataset.features.length > 0) {
      // Get all attribute names
      const attributeNames = new Set<string>();

      // Collect all possible attribute names
      for (const feature of dataset.features) {
        if (feature.properties) {
          for (const key of Object.keys(feature.properties)) {
            attributeNames.add(key);
          }
        }
      }

      // For each attribute, compute default values
      const defaultValues: Record<string, any> = {};

      for (const attributeName of attributeNames) {
        // Collect non-null values for the attribute
        const values = dataset.features
          .map(f => f.properties?.[attributeName])
          .filter(v => v !== null && v !== undefined);

        if (values.length === 0) {
          continue;
        }

        // Compute a default value based on the data type
        const type = this.determineBestType(values);

        switch (type) {
          case 'integer':
          case 'float':
            // Use the mean for numeric values
            const sum = values.reduce((a, b) => a + b, 0);
            defaultValues[attributeName] = sum / values.length;
            break;
          case 'boolean':
            // Use the mode for boolean values
            const trueCount = values.filter(v => v === true).length;
            defaultValues[attributeName] = trueCount > values.length / 2;
            break;
          case 'string':
            // Use a special value for strings
            defaultValues[attributeName] = '[Unknown]';
            break;
          case 'date':
            // Use the current date for date values
            defaultValues[attributeName] = new Date().toISOString().split('T')[0];
            break;
        }
      }

      // Fill missing values in all features
      for (const feature of dataset.features) {
        if (!feature.properties) {
          feature.properties = {};
        }

        for (const [attributeName, defaultValue] of Object.entries(defaultValues)) {
          if (
            feature.properties[attributeName] === null ||
            feature.properties[attributeName] === undefined
          ) {
            feature.properties[attributeName] = defaultValue;
            filledCount++;
          }
        }
      }
    }

    return filledCount;
  }

  /**
   * Remove duplicate features from the dataset
   * @param dataset The dataset to deduplicate
   */
  private removeDuplicates(dataset: any): void {
    if (!dataset.features || !Array.isArray(dataset.features)) {
      return;
    }

    // Example implementation - remove duplicates

    // Create a map to track unique features
    const uniqueFeatures = new Map<string, any>();

    for (const feature of dataset.features) {
      // Create a key that uniquely identifies the feature
      const key = this.createFeatureKey(feature);

      // Only keep the first occurrence of each feature
      if (!uniqueFeatures.has(key)) {
        uniqueFeatures.set(key, feature);
      }
    }

    // Replace the features array with the unique features
    dataset.features = Array.from(uniqueFeatures.values());
  }

  /**
   * Create a key that uniquely identifies a feature
   * @param feature The feature to create a key for
   * @returns A key that uniquely identifies the feature
   */
  private createFeatureKey(feature: any): string {
    // Create a key based on the feature's geometry and properties
    const geometryKey = feature.geometry ? JSON.stringify(feature.geometry) : 'null';
    const propertiesKey = feature.properties ? JSON.stringify(feature.properties) : 'null';

    return `${geometryKey}|${propertiesKey}`;
  }

  /**
   * Log a message from the agent
   * @param type The message type
   * @param content The message content
   */
  private async logMessage(type: 'INFO' | 'WARNING' | 'ERROR', content: string): Promise<void> {
    try {
      const message: InsertAgentMessage = {
        agentId: this.id,
        type,
        content,
        timestamp: new Date(),
      };

      await this.storage.createAgentMessage(message);
    } catch (error) {
      console.error(`Failed to log message from agent ${this.id}:`, error);
      // Don't throw here, as this is a non-critical operation
    }
  }

  /**
   * Shutdown the agent
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log(`Shutting down ${this.name} (${this.id})...`);

      // Log agent shutdown
      await this.logMessage('INFO', `Agent ${this.name} (${this.id}) shutting down`);

      this.status = 'OFFLINE';
      this.isInitialized = false;
      console.log(`${this.name} (${this.id}) shut down successfully`);
    } catch (error) {
      console.error(`Failed to shut down ${this.name} (${this.id}):`, error);
      throw error;
    }
  }
}

/**
 * Create a new Data Normalization Agent
 * @param storage The storage implementation
 * @returns A new Data Normalization Agent
 */
export function createDataNormalizationAgent(storage: IStorage): DataNormalizationAgent {
  return new DataNormalizationAgent(storage);
}
