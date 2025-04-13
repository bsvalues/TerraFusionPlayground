/**
 * Supabase Client
 * 
 * This file initializes and exports the Supabase client for use throughout the application.
 * It uses environment variables for configuration.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase-types';
import { logger } from '../server/utils/logger';

// Retrieve Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Validate that credentials are present
if (!supabaseUrl || !supabaseKey) {
  logger.warn('Supabase credentials not found in environment variables. Supabase functionality will be limited.');
}

// Create the Supabase client
const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: true
    }
  }
);

/**
 * Function to check Supabase connectivity
 * @returns {Promise<boolean>} - True if connectivity is good, false otherwise
 */
export const checkSupabaseHealth = async (): Promise<boolean> => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      logger.error('Supabase credentials not found in environment variables');
      return false;
    }
    
    // Attempt to ping Supabase
    const { data, error } = await supabase.from('properties').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      // If we get any error other than table not found, connection is not valid
      logger.error('Supabase health check failed:', error);
      return false;
    }
    
    logger.info('Supabase health check passed');
    return true;
  } catch (error) {
    logger.error('Error during Supabase health check:', error);
    return false;
  }
};

export default supabase;
export const database = supabase;