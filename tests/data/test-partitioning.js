/**
 * Data Partitioning Testing Script
 *
 * This script tests the data partitioning functionality:
 * 1. Different partition strategies (range, hash, list, temporal)
 * 2. Partition pruning for query optimization
 * 3. Partition metadata management
 * 4. Retention policy application
 */

import {
  PartitioningService,
  PartitionStrategy,
} from './server/services/data/partitioning-service.js';
import { MemStorage } from './server/storage.js';

// Sample query function that simulates querying a partition
async function queryPartition(partitionName, criteria) {
  console.log(`Querying partition: ${partitionName} with criteria:`, criteria);

  // Simulate some data based on the partition and criteria
  const results = [];
  const count = Math.floor(Math.random() * 5) + 1; // 1-5 results

  for (let i = 0; i < count; i++) {
    results.push({
      id: `${partitionName}-${i}`,
      partitionName,
      ...criteria,
      value: Math.random() * 1000,
    });
  }

  // Simulate query delay
  await new Promise(resolve => setTimeout(resolve, 50));

  return results;
}

/**
 * Test range partitioning
 */
async function testRangePartitioning() {
  console.log('\n=== Testing Range Partitioning ===');

  const storage = new MemStorage();
  const service = new PartitioningService(storage);

  // Register range partition configuration
  const rangeConfig = {
    name: 'property-value-ranges',
    entityType: 'property',
    strategy: PartitionStrategy.RANGE,
    partitionKey: 'value',
    ranges: [
      { min: 0, max: 100000, partitionName: 'low' },
      { min: 100000, max: 300000, partitionName: 'medium' },
      { min: 300000, max: 600000, partitionName: 'high' },
      { min: 600000, max: null, partitionName: 'premium' },
    ],
  };

  service.registerPartitionConfig(rangeConfig);
  console.log('Registered range partition configuration:', rangeConfig.name);

  // Create partitions
  try {
    // Mock the pool property since we're not actually creating database partitions
    service.pool = { query: async () => ({ rows: [] }) };

    const partitions = await service.createPartitions(rangeConfig.name);
    console.log(
      `Created ${partitions.length} partitions:`,
      partitions.map(p => p.name)
    );

    // Test partition pruning with different criteria
    const testQueries = [
      { value: 50000 }, // Should query 'low' partition
      { value: 200000 }, // Should query 'medium' partition
      { value: 500000 }, // Should query 'high' partition
      { value: 800000 }, // Should query 'premium' partition
      { otherField: 'test' }, // Should query all partitions
    ];

    for (const criteria of testQueries) {
      console.log(`\nTesting query with criteria:`, criteria);

      const partitionsToQuery = service.determinePartitionsToQuery(rangeConfig.name, criteria);
      console.log('Partitions to query:', partitionsToQuery);

      // Execute the query
      const result = await service.queryPartitioned(rangeConfig.name, criteria, queryPartition);

      console.log(
        `Query returned ${result.results.length} results from ${result.partitionsQueried.length} partitions`
      );
      console.log('Partitions queried:', result.partitionsQueried);
      console.log('Partitions skipped:', result.partitionsSkipped);
      console.log('Execution time:', result.executionTimeMs, 'ms');
    }
  } catch (error) {
    console.error('Error testing range partitioning:', error);
  }
}

/**
 * Test hash partitioning
 */
async function testHashPartitioning() {
  console.log('\n=== Testing Hash Partitioning ===');

  const storage = new MemStorage();
  const service = new PartitioningService(storage);

  // Register hash partition configuration
  const hashConfig = {
    name: 'property-id-hash',
    entityType: 'property',
    strategy: PartitionStrategy.HASH,
    partitionKey: 'propertyId',
    partitionCount: 4,
  };

  service.registerPartitionConfig(hashConfig);
  console.log('Registered hash partition configuration:', hashConfig.name);

  // Create partitions
  try {
    // Mock the pool property
    service.pool = { query: async () => ({ rows: [] }) };

    const partitions = await service.createPartitions(hashConfig.name);
    console.log(
      `Created ${partitions.length} partitions:`,
      partitions.map(p => p.name)
    );

    // Test partition pruning with different property IDs
    const testQueries = [
      { propertyId: 'PROP123' },
      { propertyId: 'PROP456' },
      { propertyId: 'PROP789' },
      { propertyId: 'PROP012' },
      { otherField: 'test' }, // Should query all partitions
    ];

    for (const criteria of testQueries) {
      console.log(`\nTesting query with criteria:`, criteria);

      const partitionsToQuery = service.determinePartitionsToQuery(hashConfig.name, criteria);
      console.log('Partitions to query:', partitionsToQuery);

      // Execute the query
      const result = await service.queryPartitioned(hashConfig.name, criteria, queryPartition);

      console.log(
        `Query returned ${result.results.length} results from ${result.partitionsQueried.length} partitions`
      );
      console.log('Partitions queried:', result.partitionsQueried);
      console.log('Partitions skipped:', result.partitionsSkipped);
      console.log('Execution time:', result.executionTimeMs, 'ms');
    }
  } catch (error) {
    console.error('Error testing hash partitioning:', error);
  }
}

/**
 * Test list partitioning
 */
async function testListPartitioning() {
  console.log('\n=== Testing List Partitioning ===');

  const storage = new MemStorage();
  const service = new PartitioningService(storage);

  // Register list partition configuration
  const listConfig = {
    name: 'property-type-list',
    entityType: 'property',
    strategy: PartitionStrategy.LIST,
    partitionKey: 'propertyType',
    values: [
      { values: ['RES'], partitionName: 'residential' },
      { values: ['COM', 'IND'], partitionName: 'commercial' },
      { values: ['AGR', 'VAC'], partitionName: 'land' },
      { values: ['EXE', 'GOV', 'REL'], partitionName: 'exempt' },
    ],
  };

  service.registerPartitionConfig(listConfig);
  console.log('Registered list partition configuration:', listConfig.name);

  // Create partitions
  try {
    // Mock the pool property
    service.pool = { query: async () => ({ rows: [] }) };

    const partitions = await service.createPartitions(listConfig.name);
    console.log(
      `Created ${partitions.length} partitions:`,
      partitions.map(p => p.name)
    );

    // Test partition pruning with different property types
    const testQueries = [
      { propertyType: 'RES' },
      { propertyType: 'COM' },
      { propertyType: 'AGR' },
      { propertyType: 'EXE' },
      { propertyType: 'UNK' }, // Unknown type
      { otherField: 'test' }, // Should query all partitions
    ];

    for (const criteria of testQueries) {
      console.log(`\nTesting query with criteria:`, criteria);

      const partitionsToQuery = service.determinePartitionsToQuery(listConfig.name, criteria);
      console.log('Partitions to query:', partitionsToQuery);

      // Execute the query
      const result = await service.queryPartitioned(listConfig.name, criteria, queryPartition);

      console.log(
        `Query returned ${result.results.length} results from ${result.partitionsQueried.length} partitions`
      );
      console.log('Partitions queried:', result.partitionsQueried);
      console.log('Partitions skipped:', result.partitionsSkipped);
      console.log('Execution time:', result.executionTimeMs, 'ms');
    }
  } catch (error) {
    console.error('Error testing list partitioning:', error);
  }
}

/**
 * Test temporal partitioning
 */
async function testTemporalPartitioning() {
  console.log('\n=== Testing Temporal Partitioning ===');

  const storage = new MemStorage();
  const service = new PartitioningService(storage);

  // Register temporal partition configuration
  const temporalConfig = {
    name: 'property-change-history',
    entityType: 'property_history',
    strategy: PartitionStrategy.TEMPORAL,
    partitionKey: 'changeDate',
    temporalUnit: 'month',
    retentionPolicy: {
      maxPartitions: 12, // Keep 12 months
      maxAge: 365, // Keep up to 1 year
    },
  };

  service.registerPartitionConfig(temporalConfig);
  console.log('Registered temporal partition configuration:', temporalConfig.name);

  // Create partitions
  try {
    // Mock the pool property
    service.pool = { query: async () => ({ rows: [] }) };

    const partitions = await service.createPartitions(temporalConfig.name);
    console.log(
      `Created ${partitions.length} partitions:`,
      partitions.map(p => p.name)
    );

    // Test partition pruning with different dates
    const currentDate = new Date();
    const lastMonth = new Date(currentDate);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const twoMonthsAgo = new Date(currentDate);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const sixMonthsAgo = new Date(currentDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const testQueries = [
      { changeDate: currentDate },
      { changeDate: lastMonth },
      { changeDate: twoMonthsAgo },
      { changeDate: sixMonthsAgo },
      { changeDate: '2023-01-15' }, // String date
      { otherField: 'test' }, // Should query all partitions
    ];

    for (const criteria of testQueries) {
      console.log(
        `\nTesting query with criteria:`,
        typeof criteria.changeDate === 'object'
          ? { changeDate: criteria.changeDate.toISOString() }
          : criteria
      );

      const partitionsToQuery = service.determinePartitionsToQuery(temporalConfig.name, criteria);
      console.log('Partitions to query:', partitionsToQuery);

      // Execute the query
      const result = await service.queryPartitioned(temporalConfig.name, criteria, queryPartition);

      console.log(
        `Query returned ${result.results.length} results from ${result.partitionsQueried.length} partitions`
      );
      console.log('Partitions queried:', result.partitionsQueried);
      console.log('Partitions skipped:', result.partitionsSkipped);
      console.log('Execution time:', result.executionTimeMs, 'ms');
    }

    // Test retention policy
    console.log('\nTesting retention policy:');
    const deactivatedCount = await service.applyRetentionPolicy(temporalConfig.name);
    console.log(`Deactivated ${deactivatedCount} partitions`);

    // Get updated metadata
    const updatedMetadata = service.getPartitionMetadata(temporalConfig.name);
    console.log(
      'Active partitions after retention policy:',
      updatedMetadata.filter(p => p.active).map(p => p.name)
    );
    console.log(
      'Inactive partitions after retention policy:',
      updatedMetadata.filter(p => !p.active).map(p => p.name)
    );
  } catch (error) {
    console.error('Error testing temporal partitioning:', error);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('=== Data Partitioning Test ===');

  try {
    // Test range partitioning
    await testRangePartitioning();

    // Test hash partitioning
    await testHashPartitioning();

    // Test list partitioning
    await testListPartitioning();

    // Test temporal partitioning
    await testTemporalPartitioning();

    console.log('\nAll tests completed successfully');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();
