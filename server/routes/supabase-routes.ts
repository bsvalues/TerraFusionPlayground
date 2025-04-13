/**
 * Supabase Routes
 * 
 * This file contains the API routes for Supabase integration, migration, and management.
 */

import { Router } from 'express';
import { storage } from '../storage';
import { SupabaseMigrationService } from '../services/supabase-migration-service';
import { logger } from '../utils/logger';

const router = Router();
const migrationService = new SupabaseMigrationService(storage);

// Migration status to track progress
let migrationStatus = {
  isRunning: false,
  startTime: null as Date | null,
  endTime: null as Date | null,
  success: false,
  steps: {} as Record<string, { status: 'pending' | 'running' | 'completed' | 'failed', message: string }>,
  error: null as string | null
};

// Route to check migration status
router.get('/migration/status', async (req, res) => {
  try {
    res.json({
      ...migrationStatus,
      duration: migrationStatus.startTime && migrationStatus.endTime 
        ? `${(migrationStatus.endTime.getTime() - migrationStatus.startTime.getTime()) / 1000} seconds`
        : migrationStatus.startTime 
          ? `${(new Date().getTime() - migrationStatus.startTime.getTime()) / 1000} seconds and counting...`
          : null
    });
  } catch (error: any) {
    logger.error(`Error getting migration status: ${error.message}`);
    res.status(500).json({ error: 'Failed to get migration status' });
  }
});

// Route to start the migration process
router.post('/migration/start', async (req, res) => {
  try {
    // Check if migration is already running
    if (migrationStatus.isRunning) {
      return res.status(409).json({ 
        error: 'Migration is already running',
        status: migrationStatus
      });
    }
    
    // Initialize migration status
    migrationStatus = {
      isRunning: true,
      startTime: new Date(),
      endTime: null,
      success: false,
      steps: {
        createTables: { status: 'pending', message: 'Waiting to create tables' },
        migrateProperties: { status: 'pending', message: 'Waiting to migrate properties' },
        migratePropertyAnalyses: { status: 'pending', message: 'Waiting to migrate property analyses' },
        migratePropertyAppeals: { status: 'pending', message: 'Waiting to migrate property appeals' },
        migratePropertyDataChanges: { status: 'pending', message: 'Waiting to migrate property data changes' },
        migratePropertyInsightShares: { status: 'pending', message: 'Waiting to migrate property insight shares' },
        migrateAgentExperiences: { status: 'pending', message: 'Waiting to migrate agent experiences' }
      },
      error: null
    };
    
    // Start migration in background
    runMigration();
    
    // Return immediately with status
    res.json({
      message: 'Migration started',
      status: migrationStatus
    });
  } catch (error: any) {
    logger.error(`Error starting migration: ${error.message}`);
    migrationStatus.isRunning = false;
    migrationStatus.error = error.message;
    res.status(500).json({ error: 'Failed to start migration' });
  }
});

// Route to verify migration
router.get('/migration/verify', async (req, res) => {
  try {
    const verificationResults = await migrationService.verifyMigration();
    res.json({
      verification: verificationResults,
      allMatch: Object.values(verificationResults).every(result => result.match)
    });
  } catch (error: any) {
    logger.error(`Error verifying migration: ${error.message}`);
    res.status(500).json({ error: 'Failed to verify migration' });
  }
});

// Function to run migration process in the background
async function runMigration() {
  try {
    // Step 1: Create tables
    migrationStatus.steps.createTables = { status: 'running', message: 'Creating tables...' };
    const tablesCreated = await migrationService.createTables();
    migrationStatus.steps.createTables = tablesCreated
      ? { status: 'completed', message: 'Tables created successfully' }
      : { status: 'failed', message: 'Failed to create tables' };
    
    if (!tablesCreated) {
      throw new Error('Failed to create tables');
    }
    
    // Step 2: Migrate properties
    migrationStatus.steps.migrateProperties = { status: 'running', message: 'Migrating properties...' };
    const propertiesMigrated = await migrationService.migrateProperties();
    migrationStatus.steps.migrateProperties = propertiesMigrated
      ? { status: 'completed', message: 'Properties migrated successfully' }
      : { status: 'failed', message: 'Failed to migrate properties' };
    
    // Step 3: Migrate property analyses
    migrationStatus.steps.migratePropertyAnalyses = { status: 'running', message: 'Migrating property analyses...' };
    const analysesMigrated = await migrationService.migratePropertyAnalyses();
    migrationStatus.steps.migratePropertyAnalyses = analysesMigrated
      ? { status: 'completed', message: 'Property analyses migrated successfully' }
      : { status: 'failed', message: 'Failed to migrate property analyses' };
    
    // Step 4: Migrate property appeals
    migrationStatus.steps.migratePropertyAppeals = { status: 'running', message: 'Migrating property appeals...' };
    const appealsMigrated = await migrationService.migratePropertyAppeals();
    migrationStatus.steps.migratePropertyAppeals = appealsMigrated
      ? { status: 'completed', message: 'Property appeals migrated successfully' }
      : { status: 'failed', message: 'Failed to migrate property appeals' };
    
    // Step 5: Migrate property data changes
    migrationStatus.steps.migratePropertyDataChanges = { status: 'running', message: 'Migrating property data changes...' };
    const changesMigrated = await migrationService.migratePropertyDataChanges();
    migrationStatus.steps.migratePropertyDataChanges = changesMigrated
      ? { status: 'completed', message: 'Property data changes migrated successfully' }
      : { status: 'failed', message: 'Failed to migrate property data changes' };
    
    // Step 6: Migrate property insight shares
    migrationStatus.steps.migratePropertyInsightShares = { status: 'running', message: 'Migrating property insight shares...' };
    const sharesMigrated = await migrationService.migratePropertyInsightShares();
    migrationStatus.steps.migratePropertyInsightShares = sharesMigrated
      ? { status: 'completed', message: 'Property insight shares migrated successfully' }
      : { status: 'failed', message: 'Failed to migrate property insight shares' };
    
    // Step 7: Migrate agent experiences
    migrationStatus.steps.migrateAgentExperiences = { status: 'running', message: 'Migrating agent experiences...' };
    const experiencesMigrated = await migrationService.migrateAgentExperiences();
    migrationStatus.steps.migrateAgentExperiences = experiencesMigrated
      ? { status: 'completed', message: 'Agent experiences migrated successfully' }
      : { status: 'failed', message: 'Failed to migrate agent experiences' };
    
    // Update migration status
    migrationStatus.isRunning = false;
    migrationStatus.endTime = new Date();
    migrationStatus.success = true;
    
  } catch (error: any) {
    logger.error(`Migration failed: ${error.message}`);
    
    // Update migration status
    migrationStatus.isRunning = false;
    migrationStatus.endTime = new Date();
    migrationStatus.success = false;
    migrationStatus.error = error.message;
  }
}

export default router;