/**
 * Sync Manager
 * 
 * Manages connectivity monitoring and background synchronization
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sync queue item interface
 */
interface SyncQueueItem {
  /**
   * ID of the item to sync
   */
  id: string;
  
  /**
   * Endpoint to sync with
   */
  endpoint: string;
  
  /**
   * Data to sync
   */
  data: any;
  
  /**
   * Timestamp of the queued sync
   */
  timestamp: number;
}

/**
 * Key for storing sync queue in AsyncStorage
 */
const SYNC_QUEUE_KEY = '@terrafield:sync_queue';

/**
 * Add an item to the sync queue
 * 
 * @param item Item to add to the sync queue
 */
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'timestamp'>): Promise<void> {
  try {
    // Get existing queue
    const queue = await getSyncQueue();
    
    // Add item to queue with timestamp
    queue.push({
      ...item,
      timestamp: Date.now()
    });
    
    // Save updated queue
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    
    console.log(`Added item ${item.id} to sync queue`);
  } catch (error) {
    console.error('Failed to add item to sync queue:', error);
  }
}

/**
 * Get the sync queue
 * 
 * @returns Sync queue items
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    console.error('Failed to get sync queue:', error);
    return [];
  }
}

/**
 * Remove an item from the sync queue
 * 
 * @param id ID of the item to remove
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  try {
    // Get existing queue
    const queue = await getSyncQueue();
    
    // Remove item from queue
    const updatedQueue = queue.filter(item => item.id !== id);
    
    // Save updated queue
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
    
    console.log(`Removed item ${id} from sync queue`);
  } catch (error) {
    console.error('Failed to remove item from sync queue:', error);
  }
}

/**
 * Process the sync queue
 * 
 * @returns Promise that resolves when processing is complete
 */
export async function processSyncQueue(): Promise<void> {
  try {
    // Get sync queue
    const queue = await getSyncQueue();
    
    if (queue.length === 0) {
      console.log('Sync queue is empty');
      return;
    }
    
    console.log(`Processing sync queue with ${queue.length} items`);
    
    // Process each item in the queue
    for (const item of queue) {
      try {
        // Perform sync
        const response = await fetch(item.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item.data)
        });
        
        if (response.ok) {
          // Remove successfully synced item from queue
          await removeFromSyncQueue(item.id);
          console.log(`Successfully synced item ${item.id}`);
        } else {
          console.error(`Failed to sync item ${item.id}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error syncing item ${item.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to process sync queue:', error);
  }
}

/**
 * Initialize the connectivity monitor
 * 
 * @returns Function to unsubscribe from connectivity changes
 */
export function initConnectivityMonitor(): () => void {
  console.log('Initializing connectivity monitor');
  
  // Subscribe to network connectivity changes
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    // Check if the device is connected to the internet
    if (state.isConnected && state.isInternetReachable) {
      console.log('Device is connected to the internet, processing sync queue');
      processSyncQueue().catch(error => {
        console.error('Error processing sync queue:', error);
      });
    } else {
      console.log('Device is not connected to the internet');
    }
  });
  
  return unsubscribe;
}