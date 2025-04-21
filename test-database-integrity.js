/**
 * Database Integrity Testing
 * 
 * This script tests database connections and data integrity including:
 * - Database connectivity
 * - Table schema validation
 * - Agent data integrity
 * - Property data integrity
 */

const { Client } = require('pg');
const fetch = require('node-fetch');

// Config
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function for HTTP requests
async function makeRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`Error making request to ${url}:`, error);
    return { success: false, error: error.message };
  }
}

// Test database connection
async function testDatabaseConnection() {
  console.log('Testing Database Connection...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('Database query result:', result.rows[0]);
    
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  } finally {
    await client.end();
  }
}

// Check if required tables exist
async function checkRequiredTables() {
  console.log('Checking Required Tables...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    
    // Query to get all tables in the public schema
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    const tables = result.rows.map(row => row.table_name);
    console.log('Database tables:', tables);
    
    // Check for essential tables
    const requiredTables = [
      'properties',
      'users',
      'ai_agents',
      'agent_messages',
      'system_activities'
    ];
    
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.error('Missing required tables:', missingTables);
      return false;
    } else {
      console.log('All required tables exist');
      return true;
    }
  } catch (error) {
    console.error('Error checking required tables:', error);
    return false;
  } finally {
    await client.end();
  }
}

// Check data integrity between API and database
async function checkDataIntegrity() {
  console.log('Checking Data Integrity...');
  
  // Get properties from API
  const propertiesResult = await makeRequest(`${API_BASE_URL}/properties`);
  if (!propertiesResult.success) {
    console.error('Failed to get properties from API');
    return false;
  }
  
  // Get agents from API
  const agentsResult = await makeRequest(`${API_BASE_URL}/ai-agents`);
  if (!agentsResult.success) {
    console.error('Failed to get AI agents from API');
    return false;
  }
  
  console.log(`API returned ${propertiesResult.data.length} properties and ${agentsResult.data.length} agents`);
  
  // Now check database records
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    
    // Check properties count in database
    try {
      const propertiesCountResult = await client.query('SELECT COUNT(*) FROM properties');
      const propertiesCount = parseInt(propertiesCountResult.rows[0].count);
      console.log(`Database contains ${propertiesCount} properties`);
      
      if (propertiesCount !== propertiesResult.data.length) {
        console.error(`Property count mismatch: API has ${propertiesResult.data.length}, DB has ${propertiesCount}`);
      }
    } catch (error) {
      console.error('Error counting properties in database:', error);
    }
    
    // Check agents count in database
    try {
      const agentsCountResult = await client.query('SELECT COUNT(*) FROM ai_agents');
      const agentsCount = parseInt(agentsCountResult.rows[0].count);
      console.log(`Database contains ${agentsCount} AI agents`);
      
      if (agentsCount !== agentsResult.data.length) {
        console.error(`Agent count mismatch: API has ${agentsResult.data.length}, DB has ${agentsCount}`);
      }
    } catch (error) {
      console.error('Error counting agents in database:', error);
    }
    
    return true;
  } catch (error) {
    console.error('Error checking data integrity:', error);
    return false;
  } finally {
    await client.end();
  }
}

// Run all tests
async function runAllTests() {
  console.log('===== STARTING DATABASE INTEGRITY TESTS =====');
  
  try {
    // Test database connection
    const connectionSuccessful = await testDatabaseConnection();
    
    if (connectionSuccessful) {
      // Check required tables
      await checkRequiredTables();
      
      // Check data integrity
      await checkDataIntegrity();
    }
    
    console.log('===== DATABASE INTEGRITY TESTS COMPLETED =====');
  } catch (error) {
    console.error('Error running database tests:', error);
  }
}

// Execute the tests
runAllTests().catch(console.error);