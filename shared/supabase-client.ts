/**
 * Supabase Client
 * 
 * This file initializes and exports the Supabase client for use throughout the application.
 * It uses environment variables for configuration.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase-types';

// Check if environment variables are present
if (!process.env.SUPABASE_URL) {
  console.warn('SUPABASE_URL environment variable is not set. Supabase functionality may not work correctly.');
}

if (!process.env.SUPABASE_KEY) {
  console.warn('SUPABASE_KEY environment variable is not set. Supabase functionality may not work correctly.');
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
  },
});

/**
 * Function to check Supabase connectivity
 * @returns {Promise<boolean>} - True if connectivity is good, false otherwise
 */
export const checkSupabaseHealth = async (): Promise<boolean> => {
  try {
    // Basic query to test connectivity
    const { error } = await supabase.from('system_health').select('count(*)', { count: 'exact', head: true });
    
    // Table doesn't exist error (PGRST116) is still okay for checking connectivity
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase health check failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase health check error:', error);
    return false;
  }
};

// Export the Supabase client instance
export const database = supabase;

// Export typed client for convenience
export default supabase as SupabaseClient<Database>;