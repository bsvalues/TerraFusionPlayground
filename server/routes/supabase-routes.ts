/**
 * Supabase Routes
 * 
 * This file contains the API routes for Supabase integration, migration, and management.
 */

import { Router, Request, Response } from 'express';
import { SupabaseMigrationService } from '../services/supabase-migration-service';
import { IStorage } from '../storage';
import { logger } from '../utils/logger';
import { storage } from '../storage';

// Create an Express router
const router = Router();
const migrationService = new SupabaseMigrationService(storage);

/**
 * Test Supabase connection
 * GET /test-connection
 */
router.get('/test-connection', async (req: Request, res: Response) => {
  try {
    const result = await migrationService.validateConnection();
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error testing Supabase connection:', error);
    return res.status(500).json({ 
      success: false, 
      error, 
      message: 'Failed to connect to Supabase' 
    });
  }
});

/**
 * Migrate all data to Supabase
 * POST /migrate-all
 */
router.post('/migrate-all', async (req: Request, res: Response) => {
  try {
    logger.info('Starting full data migration to Supabase');
    const result = await migrationService.migrateAllData();
    logger.info('Completed full data migration to Supabase', result);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error during full data migration to Supabase:', error);
    return res.status(500).json({ 
      success: false, 
      error, 
      message: 'Failed to migrate data to Supabase' 
    });
  }
});

/**
 * Migrate properties to Supabase
 * POST /migrate/properties
 */
router.post('/migrate/properties', async (req: Request, res: Response) => {
  try {
    logger.info('Starting property migration to Supabase');
    const result = await migrationService.migrateProperties();
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error migrating properties to Supabase:', error);
    return res.status(500).json({ 
      success: false, 
      error, 
      message: 'Failed to migrate properties to Supabase' 
    });
  }
});

/**
 * Migrate property analyses to Supabase
 * POST /migrate/property-analyses
 */
router.post('/migrate/property-analyses', async (req: Request, res: Response) => {
  try {
    logger.info('Starting property analyses migration to Supabase');
    const result = await migrationService.migratePropertyAnalyses();
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error migrating property analyses to Supabase:', error);
    return res.status(500).json({ 
      success: false, 
      error, 
      message: 'Failed to migrate property analyses to Supabase' 
    });
  }
});

/**
 * Migrate property appeals to Supabase
 * POST /migrate/property-appeals
 */
router.post('/migrate/property-appeals', async (req: Request, res: Response) => {
  try {
    logger.info('Starting property appeals migration to Supabase');
    const result = await migrationService.migratePropertyAppeals();
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error migrating property appeals to Supabase:', error);
    return res.status(500).json({ 
      success: false, 
      error, 
      message: 'Failed to migrate property appeals to Supabase' 
    });
  }
});

/**
 * Migrate data lineage records to Supabase
 * POST /migrate/data-lineage
 */
router.post('/migrate/data-lineage', async (req: Request, res: Response) => {
  try {
    logger.info('Starting data lineage migration to Supabase');
    const result = await migrationService.migrateDataLineage();
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error migrating data lineage to Supabase:', error);
    return res.status(500).json({ 
      success: false, 
      error, 
      message: 'Failed to migrate data lineage to Supabase' 
    });
  }
});

/**
 * Migrate agent experiences to Supabase
 * POST /migrate/agent-experiences
 */
router.post('/migrate/agent-experiences', async (req: Request, res: Response) => {
  try {
    logger.info('Starting agent experiences migration to Supabase');
    const result = await migrationService.migrateAgentExperiences();
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error migrating agent experiences to Supabase:', error);
    return res.status(500).json({ 
      success: false, 
      error, 
      message: 'Failed to migrate agent experiences to Supabase' 
    });
  }
});

/**
 * Migrate property market trends to Supabase
 * POST /migrate/property-market-trends
 */
router.post('/migrate/property-market-trends', async (req: Request, res: Response) => {
  try {
    logger.info('Starting property market trends migration to Supabase');
    const result = await migrationService.migratePropertyMarketTrends();
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error migrating property market trends to Supabase:', error);
    return res.status(500).json({ 
      success: false, 
      error, 
      message: 'Failed to migrate property market trends to Supabase' 
    });
  }
});

logger.info('Registered Supabase routes');

/**
 * Function to run a migration directly in the background
 * This can be called from other parts of the application to trigger migrations
 * without going through the API
 */
export async function runMigration(storage: IStorage, type: 'all' | 'properties' | 'analyses' | 'appeals' | 'lineage' | 'experiences' | 'trends') {
  const migrationService = new SupabaseMigrationService(storage);
  
  try {
    logger.info(`Starting background migration of type: ${type}`);

    let result;
    switch (type) {
      case 'all':
        result = await migrationService.migrateAllData();
        break;
      case 'properties':
        result = await migrationService.migrateProperties();
        break;
      case 'analyses':
        result = await migrationService.migratePropertyAnalyses();
        break;
      case 'appeals':
        result = await migrationService.migratePropertyAppeals();
        break;
      case 'lineage':
        result = await migrationService.migrateDataLineage();
        break;
      case 'experiences':
        result = await migrationService.migrateAgentExperiences();
        break;
      case 'trends':
        result = await migrationService.migratePropertyMarketTrends();
        break;
    }

    logger.info(`Completed background migration of type: ${type}`, result);
    return result;
  } catch (error) {
    logger.error(`Error during background migration of type: ${type}:`, error);
    return { success: false, error };
  }
}

// Export the router as default
export default router;