/**
 * Utility functions for offline sync
 */

/**
 * Deep equal function
 * 
 * @param a First value
 * @param b Second value
 * @returns Whether values are deeply equal
 */
export function deepEqual(a: any, b: any): boolean {
  // Check if both are undefined or null
  if (a === b) return true;
  
  // Check if either is undefined or null
  if (a == null || b == null) return false;
  
  // Check types
  if (typeof a !== typeof b) return false;
  
  // Handle primitive types
  if (typeof a !== 'object') return a === b;
  
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    
    return true;
  }
  
  // Handle objects
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Generate UUID
 * 
 * @returns UUID
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Sleep
 * 
 * @param ms Milliseconds
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function
 * 
 * @param fn Function to retry
 * @param maxAttempts Maximum number of attempts
 * @param delay Delay between attempts in milliseconds
 * @param backoff Backoff factor
 * @returns Promise
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
  backoff: number = 2
): Promise<T> {
  let attempts = 0;
  let currentDelay = delay;
  
  while (attempts < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw err;
      }
      
      await sleep(currentDelay);
      currentDelay *= backoff;
    }
  }
  
  throw new Error(`Failed after ${maxAttempts} attempts`);
}

/**
 * Omit keys from object
 * 
 * @param obj Object
 * @param keys Keys to omit
 * @returns New object without omitted keys
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  
  for (const key of keys) {
    delete result[key];
  }
  
  return result as Omit<T, K>;
}

/**
 * Pick keys from object
 * 
 * @param obj Object
 * @param keys Keys to pick
 * @returns New object with picked keys
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Get offline friendly timestamp
 * 
 * @returns Timestamp
 */
export function getTimestamp(): number {
  return Date.now();
}

/**
 * Debounce function
 * 
 * @param fn Function to debounce
 * @param ms Milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Throttle function
 * 
 * @param fn Function to throttle
 * @param ms Milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  return function(...args: Parameters<T>): void {
    const now = Date.now();
    
    if (now - lastCall < ms) {
      // Too soon, save for later
      lastArgs = args;
      
      if (!timeout) {
        timeout = setTimeout(() => {
          timeout = null;
          lastCall = Date.now();
          
          if (lastArgs) {
            fn(...lastArgs);
            lastArgs = null;
          }
        }, ms - (now - lastCall));
      }
      
      return;
    }
    
    lastCall = now;
    fn(...args);
  };
}

/**
 * Deep clone function
 * 
 * @param obj Object to clone
 * @returns Deep clone of object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as unknown as T;
  }
  
  const result = {} as T;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deepClone(obj[key]);
    }
  }
  
  return result;
}

/**
 * Merge objects
 * 
 * @param target Target object
 * @param source Source object
 * @returns Merged object
 */
export function mergeObjects<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = target[key];
      const sourceValue = source[key];
      
      if (
        targetValue &&
        sourceValue &&
        typeof targetValue === 'object' &&
        typeof sourceValue === 'object' &&
        !Array.isArray(targetValue) &&
        !Array.isArray(sourceValue)
      ) {
        result[key] = mergeObjects(targetValue, sourceValue) as any;
      } else {
        result[key] = sourceValue as any;
      }
    }
  }
  
  return result;
}