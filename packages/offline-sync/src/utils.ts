/**
 * Utility functions for the offline sync module
 */

/**
 * Deep compare two values for equality
 * 
 * @param a First value
 * @param b Second value
 * @returns Whether the values are equal
 */
export function deepEqual(a: any, b: any): boolean {
  // Handle primitives
  if (a === b) return true;
  
  // Handle null/undefined
  if (a == null || b == null) return a === b;
  
  // Handle different types
  if (typeof a !== typeof b) return false;
  
  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    
    return true;
  }
  
  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Delay execution for a specified time
 * 
 * @param ms Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a debounced function
 * 
 * @param fn Function to debounce
 * @param ms Milliseconds to delay
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function(...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Create a throttled function
 * 
 * @param fn Function to throttle
 * @param ms Milliseconds to delay between calls
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    const now = Date.now();
    const remaining = ms - (now - lastCall);
    
    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };
}

/**
 * Generate a unique ID
 * 
 * @param prefix Optional prefix
 * @returns Unique ID
 */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if running in browser environment
 * 
 * @returns Whether running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Get browser info
 * 
 * @returns Browser info or null if not in browser
 */
export function getBrowserInfo(): { name: string; version: string } | null {
  if (!isBrowser()) return null;
  
  const userAgent = window.navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  
  if (userAgent.indexOf('Firefox') > -1) {
    name = 'Firefox';
    version = userAgent.match(/Firefox\/([0-9.]+)/)![1];
  } else if (userAgent.indexOf('Chrome') > -1) {
    name = 'Chrome';
    version = userAgent.match(/Chrome\/([0-9.]+)/)![1];
  } else if (userAgent.indexOf('Safari') > -1) {
    name = 'Safari';
    version = userAgent.match(/Version\/([0-9.]+)/)![1];
  } else if (userAgent.indexOf('Edge') > -1) {
    name = 'Edge';
    version = userAgent.match(/Edge\/([0-9.]+)/)![1];
  } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) {
    name = 'Internet Explorer';
    version = userAgent.match(/(?:MSIE |rv:)([0-9.]+)/)![1];
  }
  
  return { name, version };
}

/**
 * Get online status
 * 
 * @returns Whether device is online
 */
export function isOnline(): boolean {
  return isBrowser() ? navigator.onLine : true;
}

/**
 * Format bytes to human-readable string
 * 
 * @param bytes Number of bytes
 * @param decimals Number of decimal places
 * @returns Formatted string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Convert blob to base64
 * 
 * @param blob Blob to convert
 * @returns Promise resolving to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 to blob
 * 
 * @param base64 Base64 string
 * @param mimeType MIME type
 * @returns Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type: mimeType });
}

/**
 * Merge properties from source into target
 * 
 * @param target Target object
 * @param source Source object
 * @param overwrite Whether to overwrite existing properties
 * @returns Merged object
 */
export function mergeObjects<T extends Record<string, any>>(
  target: T,
  source: Record<string, any>,
  overwrite: boolean = true
): T {
  const result = { ...target };
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (overwrite || !(key in result)) {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}