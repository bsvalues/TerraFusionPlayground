/**
 * Data Partitioning Service
 *
 * Manages data partitioning strategies for improved query performance:
 * - Horizontal partitioning (sharding) based on configurable keys
 * - Temporal partitioning for time-series data
 * - Partition pruning for efficient query execution
 * - Dynamic partition management and rebalancing
 * - Transparent query routing across partitions
 */

import { IStorage } from '../../storage';
import { Pool } from '@neondatabase/serverless';
import { logger } from '../../utils/logger';

// Partition strategy types
export enum PartitionStrategy {
  RANGE = 'range',
  HASH = 'hash',
  LIST = 'list',
  COMPOSITE = 'composite',
  TEMPORAL = 'temporal',
}

// Partition configuration
export interface PartitionConfig {
  name: string;
  entityType: string; // Type of entity being partitioned
  strategy: PartitionStrategy;
  partitionKey: string; // Field used for partitioning
  secondaryKeys?: string[]; // Additional fields for composite partitioning
  partitionCount?: number; // Number of partitions for hash partitioning
  ranges?: {
    // Ranges for range partitioning
    min: any;
    max: any;
    partitionName: string;
  }[];
  values?: {
    // Values for list partitioning
    values: any[];
    partitionName: string;
  }[];
  temporalUnit?: 'day' | 'week' | 'month' | 'quarter' | 'year'; // For temporal partitioning
  retentionPolicy?: {
    // For automatic partition management
    maxPartitions?: number; // Maximum number of partitions to keep
    maxAge?: number; // Maximum age in days
  };
}

// Partition metadata
export interface PartitionMetadata {
  name: string;
  entityType: string;
  partitionKey: string;
  strategy: PartitionStrategy;
  created: Date;
  lastModified: Date;
  rowCount: number;
  sizeBytes: number;
  boundaries: any; // Strategy-specific boundaries
  active: boolean;
}

// Partition query result
export interface PartitionQueryResult<T> {
  results: T[];
  partitionsQueried: string[];
  partitionsSkipped: string[];
  totalPartitions: number;
  executionTimeMs: number;
}

/**
 * Data Partitioning Service implementation
 */
export class PartitioningService {
  private partitionConfigs: Map<string, PartitionConfig> = new Map();
  private partitionMetadata: Map<string, PartitionMetadata[]> = new Map();

  /**
   * Create a new Data Partitioning Service
   * @param storage Storage service
   * @param pool Database pool for direct queries
   */
  constructor(
    private storage: IStorage,
    private pool?: Pool
  ) {}

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    // Load partition configurations and metadata
    // In a real implementation, this would load from database
    logger.info('Data Partitioning Service initialized', {
      component: 'PartitioningService',
    });
  }

  /**
   * Register a partition configuration
   * @param config Partition configuration
   */
  registerPartitionConfig(config: PartitionConfig): void {
    // Validate the configuration
    this.validatePartitionConfig(config);

    // Store the configuration
    this.partitionConfigs.set(config.name, config);

    // Initialize partition metadata
    if (!this.partitionMetadata.has(config.name)) {
      this.partitionMetadata.set(config.name, []);
    }

    logger.info(`Registered partition configuration: ${config.name}`, {
      component: 'PartitioningService',
      entityType: config.entityType,
      strategy: config.strategy,
      partitionKey: config.partitionKey,
    });
  }

  /**
   * Validate a partition configuration
   * @param config Partition configuration
   */
  private validatePartitionConfig(config: PartitionConfig): void {
    // Check required fields
    if (!config.name) {
      throw new Error('Partition configuration must have a name');
    }

    if (!config.entityType) {
      throw new Error('Partition configuration must specify an entity type');
    }

    if (!config.partitionKey) {
      throw new Error('Partition configuration must specify a partition key');
    }

    // Validate strategy-specific requirements
    switch (config.strategy) {
      case PartitionStrategy.RANGE:
        if (!config.ranges || config.ranges.length === 0) {
          throw new Error('Range partitioning requires at least one range');
        }
        break;

      case PartitionStrategy.HASH:
        if (!config.partitionCount || config.partitionCount < 1) {
          throw new Error('Hash partitioning requires a positive partition count');
        }
        break;

      case PartitionStrategy.LIST:
        if (!config.values || config.values.length === 0) {
          throw new Error('List partitioning requires at least one value list');
        }
        break;

      case PartitionStrategy.COMPOSITE:
        if (!config.secondaryKeys || config.secondaryKeys.length === 0) {
          throw new Error('Composite partitioning requires at least one secondary key');
        }
        break;

      case PartitionStrategy.TEMPORAL:
        if (!config.temporalUnit) {
          throw new Error('Temporal partitioning requires a temporal unit');
        }
        break;
    }
  }

  /**
   * Get a partition configuration
   * @param name Partition configuration name
   * @returns Partition configuration or undefined if not found
   */
  getPartitionConfig(name: string): PartitionConfig | undefined {
    return this.partitionConfigs.get(name);
  }

  /**
   * Get all partition configurations
   * @returns Array of partition configurations
   */
  getAllPartitionConfigs(): PartitionConfig[] {
    return Array.from(this.partitionConfigs.values());
  }

  /**
   * Create partitions based on a configuration
   * @param configName Partition configuration name
   * @returns Array of created partition metadata
   */
  async createPartitions(configName: string): Promise<PartitionMetadata[]> {
    const config = this.partitionConfigs.get(configName);

    if (!config) {
      throw new Error(`Partition configuration not found: ${configName}`);
    }

    logger.info(`Creating partitions for configuration: ${configName}`, {
      component: 'PartitioningService',
      strategy: config.strategy,
    });

    // Check if we have a database pool for direct queries
    if (!this.pool) {
      throw new Error('Database pool not available for partition creation');
    }

    // Create partitions based on strategy
    const partitions: PartitionMetadata[] = [];

    try {
      switch (config.strategy) {
        case PartitionStrategy.RANGE:
          partitions.push(...(await this.createRangePartitions(config)));
          break;

        case PartitionStrategy.HASH:
          partitions.push(...(await this.createHashPartitions(config)));
          break;

        case PartitionStrategy.LIST:
          partitions.push(...(await this.createListPartitions(config)));
          break;

        case PartitionStrategy.COMPOSITE:
          partitions.push(...(await this.createCompositePartitions(config)));
          break;

        case PartitionStrategy.TEMPORAL:
          partitions.push(...(await this.createTemporalPartitions(config)));
          break;
      }

      // Store partition metadata
      this.partitionMetadata.set(configName, partitions);

      logger.info(`Created ${partitions.length} partitions for configuration: ${configName}`, {
        component: 'PartitioningService',
      });

      return partitions;
    } catch (error) {
      logger.error(`Error creating partitions for configuration: ${configName}`, {
        component: 'PartitioningService',
        error,
      });

      throw error;
    }
  }

  /**
   * Create range partitions
   * @param config Partition configuration
   * @returns Array of partition metadata
   */
  private async createRangePartitions(config: PartitionConfig): Promise<PartitionMetadata[]> {
    if (!config.ranges || config.ranges.length === 0) {
      throw new Error('Range partitioning requires at least one range');
    }

    const partitions: PartitionMetadata[] = [];
    const now = new Date();

    // Create a partition for each range
    for (const range of config.ranges) {
      // In a real implementation, this would create a database partition
      // For example, with PostgreSQL:
      // CREATE TABLE ${config.entityType}_${range.partitionName} PARTITION OF ${config.entityType}
      // FOR VALUES FROM (${range.min}) TO (${range.max});

      // For now, just create metadata
      partitions.push({
        name: `${config.entityType}_${range.partitionName}`,
        entityType: config.entityType,
        partitionKey: config.partitionKey,
        strategy: PartitionStrategy.RANGE,
        created: now,
        lastModified: now,
        rowCount: 0,
        sizeBytes: 0,
        boundaries: {
          min: range.min,
          max: range.max,
        },
        active: true,
      });
    }

    return partitions;
  }

  /**
   * Create hash partitions
   * @param config Partition configuration
   * @returns Array of partition metadata
   */
  private async createHashPartitions(config: PartitionConfig): Promise<PartitionMetadata[]> {
    if (!config.partitionCount || config.partitionCount < 1) {
      throw new Error('Hash partitioning requires a positive partition count');
    }

    const partitions: PartitionMetadata[] = [];
    const now = new Date();

    // Create partitions
    for (let i = 0; i < config.partitionCount; i++) {
      // In a real implementation, this would create a database partition
      // For example, with PostgreSQL:
      // CREATE TABLE ${config.entityType}_p${i} PARTITION OF ${config.entityType}
      // FOR VALUES WITH (modulus ${config.partitionCount}, remainder ${i});

      // For now, just create metadata
      partitions.push({
        name: `${config.entityType}_p${i}`,
        entityType: config.entityType,
        partitionKey: config.partitionKey,
        strategy: PartitionStrategy.HASH,
        created: now,
        lastModified: now,
        rowCount: 0,
        sizeBytes: 0,
        boundaries: {
          modulus: config.partitionCount,
          remainder: i,
        },
        active: true,
      });
    }

    return partitions;
  }

  /**
   * Create list partitions
   * @param config Partition configuration
   * @returns Array of partition metadata
   */
  private async createListPartitions(config: PartitionConfig): Promise<PartitionMetadata[]> {
    if (!config.values || config.values.length === 0) {
      throw new Error('List partitioning requires at least one value list');
    }

    const partitions: PartitionMetadata[] = [];
    const now = new Date();

    // Create a partition for each value list
    for (const valueList of config.values) {
      // In a real implementation, this would create a database partition
      // For example, with PostgreSQL:
      // CREATE TABLE ${config.entityType}_${valueList.partitionName} PARTITION OF ${config.entityType}
      // FOR VALUES IN (${valueList.values.join(', ')});

      // For now, just create metadata
      partitions.push({
        name: `${config.entityType}_${valueList.partitionName}`,
        entityType: config.entityType,
        partitionKey: config.partitionKey,
        strategy: PartitionStrategy.LIST,
        created: now,
        lastModified: now,
        rowCount: 0,
        sizeBytes: 0,
        boundaries: {
          values: valueList.values,
        },
        active: true,
      });
    }

    return partitions;
  }

  /**
   * Create composite partitions
   * @param config Partition configuration
   * @returns Array of partition metadata
   */
  private async createCompositePartitions(config: PartitionConfig): Promise<PartitionMetadata[]> {
    // Composite partitioning is a combination of multiple strategies
    // For simplicity, we'll implement a basic version here

    if (!config.secondaryKeys || config.secondaryKeys.length === 0) {
      throw new Error('Composite partitioning requires at least one secondary key');
    }

    // For now, just create a dummy partition for the composite strategy
    const now = new Date();

    return [
      {
        name: `${config.entityType}_composite`,
        entityType: config.entityType,
        partitionKey: config.partitionKey,
        strategy: PartitionStrategy.COMPOSITE,
        created: now,
        lastModified: now,
        rowCount: 0,
        sizeBytes: 0,
        boundaries: {
          primaryKey: config.partitionKey,
          secondaryKeys: config.secondaryKeys,
        },
        active: true,
      },
    ];
  }

  /**
   * Create temporal partitions
   * @param config Partition configuration
   * @returns Array of partition metadata
   */
  private async createTemporalPartitions(config: PartitionConfig): Promise<PartitionMetadata[]> {
    if (!config.temporalUnit) {
      throw new Error('Temporal partitioning requires a temporal unit');
    }

    const partitions: PartitionMetadata[] = [];
    const now = new Date();

    // Create partitions based on temporal unit
    // For simplicity, we'll create partitions for the last 3 periods and the current period

    const periods = [];
    const currentDate = new Date();

    switch (config.temporalUnit) {
      case 'day':
        // Create day partitions for the last 3 days and today
        for (let i = 3; i >= 0; i--) {
          const date = new Date(currentDate);
          date.setDate(date.getDate() - i);
          periods.push({
            name: `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`,
            start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
            end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999),
          });
        }
        break;

      case 'month':
        // Create month partitions for the last 3 months and the current month
        for (let i = 3; i >= 0; i--) {
          const date = new Date(currentDate);
          date.setMonth(date.getMonth() - i);
          periods.push({
            name: `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`,
            start: new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0),
            end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
          });
        }
        break;

      case 'quarter':
        // Create quarter partitions for the last 3 quarters and the current quarter
        const currentQuarter = Math.floor(currentDate.getMonth() / 3);
        for (let i = 3; i >= 0; i--) {
          const quarterOffset = i;
          const quarter = (currentQuarter - quarterOffset + 4) % 4;
          const yearOffset = Math.floor((currentQuarter - quarterOffset) / 4);
          const year = currentDate.getFullYear() + yearOffset;

          periods.push({
            name: `${year}Q${quarter + 1}`,
            start: new Date(year, quarter * 3, 1, 0, 0, 0),
            end: new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999),
          });
        }
        break;

      case 'year':
        // Create year partitions for the last 3 years and the current year
        for (let i = 3; i >= 0; i--) {
          const year = currentDate.getFullYear() - i;
          periods.push({
            name: `${year}`,
            start: new Date(year, 0, 1, 0, 0, 0),
            end: new Date(year, 11, 31, 23, 59, 59, 999),
          });
        }
        break;

      default:
        throw new Error(`Unsupported temporal unit: ${config.temporalUnit}`);
    }

    // Create partitions for each period
    for (const period of periods) {
      // In a real implementation, this would create a database partition
      // For example, with PostgreSQL:
      // CREATE TABLE ${config.entityType}_${period.name} PARTITION OF ${config.entityType}
      // FOR VALUES FROM ('${period.start.toISOString()}') TO ('${period.end.toISOString()}');

      // For now, just create metadata
      partitions.push({
        name: `${config.entityType}_${period.name}`,
        entityType: config.entityType,
        partitionKey: config.partitionKey,
        strategy: PartitionStrategy.TEMPORAL,
        created: now,
        lastModified: now,
        rowCount: 0,
        sizeBytes: 0,
        boundaries: {
          start: period.start,
          end: period.end,
        },
        active: true,
      });
    }

    return partitions;
  }

  /**
   * Get metadata for partitions of a configuration
   * @param configName Partition configuration name
   * @returns Array of partition metadata
   */
  getPartitionMetadata(configName: string): PartitionMetadata[] {
    return this.partitionMetadata.get(configName) || [];
  }

  /**
   * Determine which partitions need to be queried for a given set of criteria
   * @param configName Partition configuration name
   * @param criteria Query criteria
   * @returns Array of partition names to query
   */
  determinePartitionsToQuery(configName: string, criteria: Record<string, any>): string[] {
    const config = this.partitionConfigs.get(configName);

    if (!config) {
      throw new Error(`Partition configuration not found: ${configName}`);
    }

    const partitions = this.partitionMetadata.get(configName) || [];

    if (partitions.length === 0) {
      return [];
    }

    // Extract the value for the partition key from the criteria
    const partitionKeyValue = criteria[config.partitionKey];

    // If the partition key is not in the criteria, we need to query all partitions
    if (partitionKeyValue === undefined) {
      return partitions.filter(p => p.active).map(p => p.name);
    }

    // Determine which partitions to query based on the strategy
    switch (config.strategy) {
      case PartitionStrategy.RANGE:
        return this.getPartitionsForRangeQuery(partitions, partitionKeyValue);

      case PartitionStrategy.HASH:
        return this.getPartitionsForHashQuery(partitions, partitionKeyValue);

      case PartitionStrategy.LIST:
        return this.getPartitionsForListQuery(partitions, partitionKeyValue);

      case PartitionStrategy.COMPOSITE:
        // For composite, we need to look at all keys
        const secondaryValues: Record<string, any> = {};
        if (config.secondaryKeys) {
          for (const key of config.secondaryKeys) {
            secondaryValues[key] = criteria[key];
          }
        }
        return this.getPartitionsForCompositeQuery(partitions, partitionKeyValue, secondaryValues);

      case PartitionStrategy.TEMPORAL:
        // For temporal, the partition key should be a date
        return this.getPartitionsForTemporalQuery(partitions, partitionKeyValue);

      default:
        // Unknown strategy, query all partitions
        return partitions.filter(p => p.active).map(p => p.name);
    }
  }

  /**
   * Get partitions for a range query
   * @param partitions Array of partition metadata
   * @param value Value to query
   * @returns Array of partition names to query
   */
  private getPartitionsForRangeQuery(partitions: PartitionMetadata[], value: any): string[] {
    // If value is not comparable, query all partitions
    if (value === null || value === undefined) {
      return partitions.filter(p => p.active).map(p => p.name);
    }

    // Find partitions where the value falls within the range
    return partitions
      .filter(
        p =>
          p.active &&
          p.boundaries &&
          (p.boundaries.min === null || value >= p.boundaries.min) &&
          (p.boundaries.max === null || value < p.boundaries.max)
      )
      .map(p => p.name);
  }

  /**
   * Get partitions for a hash query
   * @param partitions Array of partition metadata
   * @param value Value to query
   * @returns Array of partition names to query
   */
  private getPartitionsForHashQuery(partitions: PartitionMetadata[], value: any): string[] {
    // If value is not hashable, query all partitions
    if (value === null || value === undefined) {
      return partitions.filter(p => p.active).map(p => p.name);
    }

    // Calculate hash value
    const hashValue = this.calculateHash(value);

    // Find the partition for the hash value
    const partition = partitions.find(
      p =>
        p.active &&
        p.boundaries &&
        p.boundaries.modulus &&
        hashValue % p.boundaries.modulus === p.boundaries.remainder
    );

    return partition ? [partition.name] : [];
  }

  /**
   * Calculate a hash value for partitioning
   * @param value Value to hash
   * @returns Hash value
   */
  private calculateHash(value: any): number {
    // Simple hash function for demonstration
    // In a real implementation, use a more robust hash function

    if (typeof value === 'number') {
      return Math.abs(value);
    }

    if (typeof value === 'string') {
      let hash = 0;
      for (let i = 0; i < value.length; i++) {
        const char = value.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    }

    // For other types, convert to string and hash
    return this.calculateHash(String(value));
  }

  /**
   * Get partitions for a list query
   * @param partitions Array of partition metadata
   * @param value Value to query
   * @returns Array of partition names to query
   */
  private getPartitionsForListQuery(partitions: PartitionMetadata[], value: any): string[] {
    // If value is not comparable, query all partitions
    if (value === null || value === undefined) {
      return partitions.filter(p => p.active).map(p => p.name);
    }

    // Find partitions where the value is in the list
    return partitions
      .filter(
        p => p.active && p.boundaries && p.boundaries.values && p.boundaries.values.includes(value)
      )
      .map(p => p.name);
  }

  /**
   * Get partitions for a composite query
   * @param partitions Array of partition metadata
   * @param primaryValue Primary key value
   * @param secondaryValues Secondary key values
   * @returns Array of partition names to query
   */
  private getPartitionsForCompositeQuery(
    partitions: PartitionMetadata[],
    primaryValue: any,
    secondaryValues: Record<string, any>
  ): string[] {
    // For simplicity, if any key is missing, query all partitions
    if (primaryValue === undefined) {
      return partitions.filter(p => p.active).map(p => p.name);
    }

    // For a real implementation, this would use the composite keys to determine partitions
    // For now, just return all active partitions
    return partitions.filter(p => p.active).map(p => p.name);
  }

  /**
   * Get partitions for a temporal query
   * @param partitions Array of partition metadata
   * @param value Date value to query
   * @returns Array of partition names to query
   */
  private getPartitionsForTemporalQuery(partitions: PartitionMetadata[], value: any): string[] {
    // If value is not a date, query all partitions
    if (!(value instanceof Date)) {
      try {
        // Try to convert to a date
        value = new Date(value);
      } catch (e) {
        return partitions.filter(p => p.active).map(p => p.name);
      }
    }

    // Find partitions where the date falls within the range
    return partitions
      .filter(
        p =>
          p.active &&
          p.boundaries &&
          (p.boundaries.start === null || value >= p.boundaries.start) &&
          (p.boundaries.end === null || value <= p.boundaries.end)
      )
      .map(p => p.name);
  }

  /**
   * Execute a query across relevant partitions
   * @param configName Partition configuration name
   * @param criteria Query criteria
   * @param queryFn Function to execute query against a partition
   * @returns Query result with metadata
   */
  async queryPartitioned<T>(
    configName: string,
    criteria: Record<string, any>,
    queryFn: (partitionName: string, criteria: Record<string, any>) => Promise<T[]>
  ): Promise<PartitionQueryResult<T>> {
    const startTime = Date.now();

    // Determine which partitions to query
    const partitionsToQuery = this.determinePartitionsToQuery(configName, criteria);

    const allPartitions = this.partitionMetadata.get(configName) || [];
    const partitionsSkipped = allPartitions
      .filter(p => p.active && !partitionsToQuery.includes(p.name))
      .map(p => p.name);

    // If no partitions to query, return empty result
    if (partitionsToQuery.length === 0) {
      return {
        results: [],
        partitionsQueried: [],
        partitionsSkipped,
        totalPartitions: allPartitions.length,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Query each partition
    const results: T[] = [];

    // For simplicity, query partitions sequentially
    // In a real implementation, this could be parallelized
    for (const partitionName of partitionsToQuery) {
      try {
        const partitionResults = await queryFn(partitionName, criteria);
        results.push(...partitionResults);
      } catch (error) {
        logger.error(`Error querying partition: ${partitionName}`, {
          component: 'PartitioningService',
          error,
        });
        // Continue with other partitions
      }
    }

    const endTime = Date.now();

    return {
      results,
      partitionsQueried: partitionsToQuery,
      partitionsSkipped,
      totalPartitions: allPartitions.length,
      executionTimeMs: endTime - startTime,
    };
  }

  /**
   * Update partition metadata
   * @param configName Partition configuration name
   * @param partitionName Partition name
   * @param updates Metadata updates
   */
  async updatePartitionMetadata(
    configName: string,
    partitionName: string,
    updates: Partial<
      Omit<PartitionMetadata, 'name' | 'entityType' | 'partitionKey' | 'strategy' | 'created'>
    >
  ): Promise<void> {
    const partitions = this.partitionMetadata.get(configName) || [];
    const partitionIndex = partitions.findIndex(p => p.name === partitionName);

    if (partitionIndex === -1) {
      throw new Error(`Partition not found: ${partitionName}`);
    }

    // Update metadata
    partitions[partitionIndex] = {
      ...partitions[partitionIndex],
      ...updates,
      lastModified: new Date(),
    };

    this.partitionMetadata.set(configName, partitions);

    logger.info(`Updated partition metadata: ${partitionName}`, {
      component: 'PartitioningService',
      updates: Object.keys(updates).join(', '),
    });
  }

  /**
   * Get partitions that match a criteria
   * @param configName Partition configuration name
   * @param criteria Criteria to match
   * @returns Array of matching partition metadata
   */
  getPartitionsByCriteria(
    configName: string,
    criteria: Partial<PartitionMetadata>
  ): PartitionMetadata[] {
    const partitions = this.partitionMetadata.get(configName) || [];

    return partitions.filter(partition => {
      // Check each criteria field
      for (const [key, value] of Object.entries(criteria)) {
        if (partition[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Apply retention policy to a partition configuration
   * @param configName Partition configuration name
   * @returns Number of partitions affected
   */
  async applyRetentionPolicy(configName: string): Promise<number> {
    const config = this.partitionConfigs.get(configName);

    if (!config) {
      throw new Error(`Partition configuration not found: ${configName}`);
    }

    // If no retention policy, do nothing
    if (!config.retentionPolicy) {
      return 0;
    }

    const partitions = this.partitionMetadata.get(configName) || [];

    // Filter active partitions
    const activePartitions = partitions.filter(p => p.active);

    // Apply maximum partitions policy
    let partitionsToDeactivate: PartitionMetadata[] = [];

    if (
      config.retentionPolicy.maxPartitions &&
      activePartitions.length > config.retentionPolicy.maxPartitions
    ) {
      // Sort by creation date (oldest first)
      const sortedPartitions = [...activePartitions].sort(
        (a, b) => a.created.getTime() - b.created.getTime()
      );

      // Get the oldest partitions to deactivate
      const excessCount = activePartitions.length - config.retentionPolicy.maxPartitions;
      partitionsToDeactivate = sortedPartitions.slice(0, excessCount);
    }

    // Apply maximum age policy
    if (config.retentionPolicy.maxAge) {
      const now = new Date();
      const maxAgeMs = config.retentionPolicy.maxAge * 24 * 60 * 60 * 1000;
      const ageThreshold = new Date(now.getTime() - maxAgeMs);

      // Find partitions older than the threshold
      const agedPartitions = activePartitions.filter(p => p.created < ageThreshold);

      // Add to deactivation list (avoid duplicates)
      for (const partition of agedPartitions) {
        if (!partitionsToDeactivate.find(p => p.name === partition.name)) {
          partitionsToDeactivate.push(partition);
        }
      }
    }

    // Deactivate partitions
    for (const partition of partitionsToDeactivate) {
      await this.updatePartitionMetadata(configName, partition.name, { active: false });
    }

    logger.info(`Applied retention policy to configuration: ${configName}`, {
      component: 'PartitioningService',
      deactivatedCount: partitionsToDeactivate.length,
    });

    return partitionsToDeactivate.length;
  }
}
