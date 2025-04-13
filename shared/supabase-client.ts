/**
 * Supabase Client Module
 * 
 * This module provides a centralized client for interacting with Supabase.
 * It handles authentication, data access, and other Supabase-related operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://romjfbwktyxljvgcthmk.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbWpmYndrdHl4bGp2Z2N0aG1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0OTM3ODksImV4cCI6MjA2MDA2OTc4OX0.-WNRs4iaAF0cYeseSbXYbhPICZ--dZQuJZqCb7pF7EM';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Authentication functions
export const auth = {
  /**
   * Sign up a new user
   */
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign in an existing user
   */
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current user session
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get the current user
   */
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }
};

// Database operations
export const database = {
  /**
   * Generic function to fetch data from a table
   */
  fetchData: async (tableName: string, query?: any) => {
    let queryBuilder = supabase.from(tableName).select('*');
    
    // Apply additional query parameters if provided
    if (query) {
      if (query.filters) {
        query.filters.forEach((filter: any) => {
          queryBuilder = queryBuilder.filter(filter.column, filter.operator, filter.value);
        });
      }
      
      if (query.orderBy) {
        queryBuilder = queryBuilder.order(query.orderBy.column, { 
          ascending: query.orderBy.ascending 
        });
      }
      
      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }
    }
    
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data;
  },

  /**
   * Insert data into a table
   */
  insertData: async (tableName: string, data: any) => {
    const { data: insertedData, error } = await supabase
      .from(tableName)
      .insert(data)
      .select();
    
    if (error) throw error;
    return insertedData;
  },

  /**
   * Update data in a table
   */
  updateData: async (tableName: string, id: string | number, data: any) => {
    const { data: updatedData, error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return updatedData;
  },

  /**
   * Delete data from a table
   */
  deleteData: async (tableName: string, id: string | number) => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// Storage operations
export const storage = {
  /**
   * Upload a file to storage
   */
  uploadFile: async (bucketName: string, path: string, file: File) => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file);
    
    if (error) throw error;
    return data;
  },

  /**
   * Download a file from storage
   */
  downloadFile: async (bucketName: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(path);
    
    if (error) throw error;
    return data;
  },

  /**
   * Get a public URL for a file
   */
  getPublicUrl: (bucketName: string, path: string) => {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);
    
    return data.publicUrl;
  },

  /**
   * List files in a bucket
   */
  listFiles: async (bucketName: string, path?: string) => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path || '');
    
    if (error) throw error;
    return data;
  }
};

// Realtime subscription functions
export const realtime = {
  /**
   * Subscribe to changes in a table
   */
  subscribeToTable: (tableName: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`public:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
      .subscribe();
  }
};

// Export default client
export default supabase;