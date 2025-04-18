/**
 * Development Tools Tables Setup Script
 * 
 * This script creates all the required database tables for the TaxI_AI Development Tools Platform.
 * It sets up tables for the UI/UX design tools, business intelligence tools, developer productivity tools,
 * collaboration tools, data integration tools, and experimental features.
 * 
 * Usage: node scripts/create-development-tools-tables.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createDevelopmentToolsTables() {
  console.log('Creating development tools tables...');
  
  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });
  
  try {
    // UI/UX Design Tools tables
    await db.execute(schema.developmentProjects.createIfNotExists);
    await db.execute(schema.developmentProjectFiles.createIfNotExists);
    await db.execute(schema.uiComponentTemplates.createIfNotExists);
    await db.execute(schema.designSystems.createIfNotExists);
    
    // Business Intelligence & Visualization tables
    await db.execute(schema.dataVisualizations.createIfNotExists);
    
    // Developer Productivity Tools tables
    await db.execute(schema.codeSnippets.createIfNotExists);
    await db.execute(schema.debuggingSessions.createIfNotExists);
    await db.execute(schema.apiDocumentation.createIfNotExists);
    
    // Collaboration & Knowledge Sharing tables
    await db.execute(schema.teamCollaborationSessions.createIfNotExists);
    await db.execute(schema.learningPaths.createIfNotExists);
    
    // Data Integration & Processing tables
    await db.execute(schema.dataPipelines.createIfNotExists);
    
    console.log('Development tools tables created successfully');
  } catch (error) {
    console.error('Error creating development tools tables:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDevelopmentToolsTables().catch(console.error);