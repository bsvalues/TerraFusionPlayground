// push-schema.js
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './shared/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function pushSchema() {
  try {
    console.log('Connecting to database...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    console.log('Successfully created tables!');
    await pool.end();
  } catch (error) {
    console.error('Error pushing schema:', error);
  }
}

pushSchema();