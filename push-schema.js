// push-schema.js
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to convert our schema to SQL statements
function generateSQL(schema) {
  const statements = [];

  // Process regular schema tables
  Object.values(schema).forEach(table => {
    if (table && table.name) {
      console.log(`Generating SQL for table: ${table.name}`);

      let sql = `CREATE TABLE IF NOT EXISTS "${table.name}" (\n`;

      // Add columns
      if (table.columns) {
        const columnDefs = Object.entries(table.columns).map(([name, def]) => {
          let colDef = `  "${name}" ${def.dataType || 'TEXT'}`;

          if (def.primaryKey) colDef += ' PRIMARY KEY';
          if (def.notNull) colDef += ' NOT NULL';
          if (def.defaultValue !== undefined) {
            if (def.defaultValue === 'now()') {
              colDef += ' DEFAULT NOW()';
            } else if (typeof def.defaultValue === 'string') {
              colDef += ` DEFAULT '${def.defaultValue}'`;
            } else if (def.defaultValue === true || def.defaultValue === false) {
              colDef += ` DEFAULT ${def.defaultValue}`;
            } else if (def.defaultValue !== null) {
              colDef += ` DEFAULT ${def.defaultValue}`;
            }
          }

          return colDef;
        });

        sql += columnDefs.join(',\n');
      }

      sql += '\n);';
      statements.push(sql);

      // Add indexes
      if (table.indexes) {
        table.indexes.forEach(index => {
          let idxSql = `CREATE INDEX IF NOT EXISTS "${table.name}_${index.name}_idx" ON "${table.name}" (${index.columns.map(col => `"${col}"`).join(', ')});`;
          statements.push(idxSql);
        });
      }
    }
  });

  return statements.join('\n\n');
}

async function pushSchema() {
  try {
    console.log('Connecting to database...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Create tables from shared/schema.ts using JSON approach
    console.log('Generating schema...');

    // Manually define our schema tables
    const tables = {
      // Define table schemas here
      gis_agent_tasks: {
        name: 'gis_agent_tasks',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          task_type: { dataType: 'VARCHAR(50)', notNull: true },
          agent_type: { dataType: 'VARCHAR(50)', notNull: true },
          agent_id: { dataType: 'VARCHAR(255)' },
          status: { dataType: 'VARCHAR(20)', notNull: true, defaultValue: 'PENDING' },
          priority: { dataType: 'INTEGER', defaultValue: 1 },
          data: { dataType: 'JSONB' },
          result: { dataType: 'JSONB' },
          error: { dataType: 'TEXT' },
          start_time: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          end_time: { dataType: 'TIMESTAMP' },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          user_id: { dataType: 'INTEGER' },
          metadata: { dataType: 'JSONB' },
        },
      },
      agent_messages: {
        name: 'agent_messages',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          agent_id: { dataType: 'VARCHAR(255)', notNull: true },
          type: { dataType: 'VARCHAR(20)', notNull: true },
          content: { dataType: 'TEXT', notNull: true },
          parent_id: { dataType: 'INTEGER' },
          metadata: { dataType: 'JSONB' },
          timestamp: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
        },
      },
      spatial_layers: {
        name: 'spatial_layers',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          name: { dataType: 'VARCHAR(255)', notNull: true },
          description: { dataType: 'TEXT' },
          type: { dataType: 'VARCHAR(50)', notNull: true },
          source: { dataType: 'VARCHAR(255)' },
          format: { dataType: 'VARCHAR(50)' },
          spatial_reference: { dataType: 'VARCHAR(50)', defaultValue: 'EPSG:4326' },
          metadata: { dataType: 'JSONB' },
          is_visible: { dataType: 'BOOLEAN', defaultValue: true },
          is_active: { dataType: 'BOOLEAN', defaultValue: true },
          style: { dataType: 'JSONB' },
          min_zoom: { dataType: 'INTEGER' },
          max_zoom: { dataType: 'INTEGER' },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          user_id: { dataType: 'INTEGER' },
          properties: { dataType: 'JSONB' },
        },
      },
      spatial_features: {
        name: 'spatial_features',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          layer_id: { dataType: 'INTEGER', notNull: true },
          feature_id: { dataType: 'VARCHAR(255)', notNull: true },
          geometry: { dataType: 'JSONB', notNull: true },
          properties: { dataType: 'JSONB' },
          bounding_box: { dataType: 'JSONB' },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          created_by: { dataType: 'INTEGER' },
          updated_by: { dataType: 'INTEGER' },
        },
      },
      spatial_events: {
        name: 'spatial_events',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          type: { dataType: 'VARCHAR(50)', notNull: true },
          layer_id: { dataType: 'INTEGER' },
          feature_id: { dataType: 'VARCHAR(255)' },
          user_id: { dataType: 'INTEGER' },
          details: { dataType: 'JSONB' },
          timestamp: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          ip_address: { dataType: 'VARCHAR(45)' },
          session_id: { dataType: 'VARCHAR(255)' },
          metadata: { dataType: 'JSONB' },
        },
      },
      gis_conversion_jobs: {
        name: 'gis_conversion_jobs',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          name: { dataType: 'VARCHAR(255)', notNull: true },
          description: { dataType: 'TEXT' },
          source_format: { dataType: 'VARCHAR(50)', notNull: true },
          target_format: { dataType: 'VARCHAR(50)', notNull: true },
          status: { dataType: 'VARCHAR(20)', notNull: true, defaultValue: 'PENDING' },
          progress: { dataType: 'INTEGER', defaultValue: 0 },
          source_schema: { dataType: 'JSONB' },
          target_schema: { dataType: 'JSONB' },
          conversion_mappings: { dataType: 'JSONB' },
          warnings: { dataType: 'JSONB' },
          errors: { dataType: 'JSONB' },
          start_time: { dataType: 'TIMESTAMP' },
          end_time: { dataType: 'TIMESTAMP' },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          user_id: { dataType: 'INTEGER' },
          metadata: { dataType: 'JSONB' },
        },
      },
      gis_layers: {
        name: 'gis_layers',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          name: { dataType: 'VARCHAR(255)', notNull: true },
          description: { dataType: 'TEXT' },
          type: { dataType: 'VARCHAR(50)', notNull: true },
          source: { dataType: 'VARCHAR(255)' },
          format: { dataType: 'VARCHAR(50)' },
          url: { dataType: 'TEXT' },
          api_key: { dataType: 'VARCHAR(255)' },
          spatial_reference: { dataType: 'VARCHAR(50)', defaultValue: 'EPSG:4326' },
          attribution: { dataType: 'TEXT' },
          metadata: { dataType: 'JSONB' },
          style: { dataType: 'JSONB' },
          is_visible: { dataType: 'BOOLEAN', defaultValue: true },
          is_basemap: { dataType: 'BOOLEAN', defaultValue: false },
          min_zoom: { dataType: 'INTEGER' },
          max_zoom: { dataType: 'INTEGER' },
          opacity: { dataType: 'INTEGER', defaultValue: 100 },
          z_index: { dataType: 'INTEGER', defaultValue: 0 },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          user_id: { dataType: 'INTEGER' },
        },
      },
      gis_feature_collections: {
        name: 'gis_feature_collections',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          layer_id: { dataType: 'INTEGER', notNull: true },
          name: { dataType: 'VARCHAR(255)', notNull: true },
          description: { dataType: 'TEXT' },
          feature_type: { dataType: 'VARCHAR(50)', notNull: true },
          features: { dataType: 'JSONB', notNull: true },
          properties: { dataType: 'JSONB' },
          bbox: { dataType: 'JSONB' },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          user_id: { dataType: 'INTEGER' },
        },
      },
      gis_map_projects: {
        name: 'gis_map_projects',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          name: { dataType: 'VARCHAR(255)', notNull: true },
          description: { dataType: 'TEXT' },
          center: { dataType: 'JSONB', notNull: true },
          zoom: { dataType: 'INTEGER', notNull: true },
          layers: { dataType: 'JSONB', notNull: true },
          basemap: { dataType: 'VARCHAR(50)', notNull: true, defaultValue: 'streets' },
          settings: { dataType: 'JSONB' },
          is_public: { dataType: 'BOOLEAN', defaultValue: false },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          user_id: { dataType: 'INTEGER', notNull: true },
        },
      },
      etl_jobs: {
        name: 'etl_jobs',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          name: { dataType: 'VARCHAR(255)', notNull: true },
          description: { dataType: 'TEXT' },
          status: { dataType: 'VARCHAR(20)', notNull: true, defaultValue: 'PENDING' },
          type: { dataType: 'VARCHAR(50)', notNull: true },
          source_type: { dataType: 'VARCHAR(50)', notNull: true },
          source_config: { dataType: 'JSONB', notNull: true },
          target_type: { dataType: 'VARCHAR(50)', notNull: true },
          target_config: { dataType: 'JSONB', notNull: true },
          transform_config: { dataType: 'JSONB' },
          progress: { dataType: 'INTEGER', defaultValue: 0 },
          log_messages: { dataType: 'JSONB' },
          errors: { dataType: 'JSONB' },
          start_time: { dataType: 'TIMESTAMP' },
          end_time: { dataType: 'TIMESTAMP' },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          user_id: { dataType: 'INTEGER' },
          metadata: { dataType: 'JSONB' },
        },
      },
      developer_productivity_metrics: {
        name: 'developer_productivity_metrics',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          user_id: { dataType: 'INTEGER', notNull: true },
          date: { dataType: 'DATE', notNull: true, defaultValue: 'now()' },
          energy_level: { dataType: 'TEXT', notNull: true },
          focus_level: { dataType: 'TEXT', notNull: true },
          productive_hours: { dataType: 'NUMERIC', notNull: true },
          distraction_count: { dataType: 'INTEGER', defaultValue: 0 },
          completed_tasks: { dataType: 'INTEGER', defaultValue: 0 },
          tasks_in_progress: { dataType: 'INTEGER', defaultValue: 0 },
          blocked_tasks: { dataType: 'INTEGER', defaultValue: 0 },
          code_lines: { dataType: 'INTEGER', defaultValue: 0 },
          commit_count: { dataType: 'INTEGER', defaultValue: 0 },
          notes: { dataType: 'TEXT' },
          tags: { dataType: 'TEXT[]' },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
        },
        indexes: [
          { name: 'user_date', columns: ['user_id', 'date'] },
          { name: 'energy_level', columns: ['energy_level'] },
        ],
      },
      developer_activity_sessions: {
        name: 'developer_activity_sessions',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          user_id: { dataType: 'INTEGER', notNull: true },
          metric_id: { dataType: 'INTEGER' },
          start_time: { dataType: 'TIMESTAMP', notNull: true, defaultValue: 'now()' },
          end_time: { dataType: 'TIMESTAMP' },
          duration: { dataType: 'INTEGER' },
          activity_type: { dataType: 'TEXT', notNull: true },
          project_id: { dataType: 'INTEGER' },
          description: { dataType: 'TEXT' },
          code_lines: { dataType: 'INTEGER', defaultValue: 0 },
          is_completed: { dataType: 'BOOLEAN', defaultValue: false },
          details: { dataType: 'JSONB', defaultValue: '{}' },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
        },
        indexes: [
          { name: 'user_activity', columns: ['user_id', 'activity_type'] },
          { name: 'time_range', columns: ['start_time', 'end_time'] },
        ],
      },
      energy_level_recommendations: {
        name: 'energy_level_recommendations',
        columns: {
          id: { dataType: 'SERIAL', primaryKey: true },
          user_id: { dataType: 'INTEGER', notNull: true },
          energy_level: { dataType: 'TEXT', notNull: true },
          recommended_activities: { dataType: 'JSONB', defaultValue: '[]' },
          avoid_activities: { dataType: 'JSONB', defaultValue: '[]' },
          best_time_of_day: { dataType: 'TEXT' },
          tips: { dataType: 'TEXT[]' },
          created_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
          updated_at: { dataType: 'TIMESTAMP', defaultValue: 'now()' },
        },
        indexes: [{ name: 'user_energy', columns: ['user_id', 'energy_level'] }],
      },
    };

    // Generate SQL statements
    const sqlStatements = generateSQL(tables);

    // Execute the SQL statements
    console.log('Pushing schema to database...');
    await pool.query(sqlStatements);

    console.log('Successfully created tables!');
    await pool.end();
  } catch (error) {
    console.error('Error pushing schema:', error);
  }
}

pushSchema();
