import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../shared/schema';
import * as gisSchema from '../shared/gis-schema';

// Configure PostgreSQL connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Merge all schemas
const mergedSchema = { ...schema, ...gisSchema };

// Initialize Drizzle with the pool
export const db = drizzle(pool, { schema: mergedSchema });