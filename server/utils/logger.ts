/**
 * Enhanced logger utility
 * 
 * Provides structured logging capabilities with different log levels
 * and standardized formatting for better debugging and monitoring.
 * 
 * Features:
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR)
 * - Component-based logging
 * - Structured output in JSON format
 * - Configurable via environment variables
 * - Support for WebSocket specific logging
 * - Error object handling
 */

// Define log levels
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Define global log levels - can be adjusted based on environment
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

// Configure WebSocket specific logging
const WS_DEBUG_ENABLED = process.env.WS_DEBUG === 'true' || process.env.NODE_ENV !== 'production';

/**
 * Enhanced logger utility with support for different log levels, structured output,
 * and specialized WebSocket logging capabilities.
 */
class Logger {
  /**
   * Log a debug message
   * @param message The message to log
   * @param data Optional additional data to include
   */
  public debug(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
      this.log('debug', message, data);
    }
  }
  
  /**
   * Log an info message
   * @param message The message to log
   * @param data Optional additional data to include
   */
  public info(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      this.log('info', message, data);
    }
  }
  
  /**
   * Log a warning message
   * @param message The message to log
   * @param data Optional additional data to include
   */
  public warn(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
      this.log('warn', message, data);
    }
  }
  
  /**
   * Log an error message
   * @param message The message to log
   * @param error Optional error object or data to include
   */
  public error(message: string, error?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
      this.log('error', message, error);
    }
  }

  /**
   * Log a WebSocket specific debug message - only if WebSocket debugging is enabled
   * @param message The message to log
   * @param data Optional additional data to include
   */
  public wsDebug(message: string, data?: any): void {
    if (WS_DEBUG_ENABLED && CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
      this.log('debug', message, { ...data, component: 'WebSocket' });
    }
  }

  /**
   * Log a WebSocket specific info message
   * @param message The message to log
   * @param data Optional additional data to include
   */
  public wsInfo(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      this.log('info', message, { ...data, component: 'WebSocket' });
    }
  }

  /**
   * Log a WebSocket specific warning message
   * @param message The message to log
   * @param data Optional additional data to include
   */
  public wsWarn(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
      this.log('warn', message, { ...data, component: 'WebSocket' });
    }
  }

  /**
   * Log a WebSocket specific error message
   * @param message The message to log
   * @param error Optional error object or data to include
   */
  public wsError(message: string, error?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
      const errorData = this.formatError(error);
      this.log('error', message, { ...errorData, component: 'WebSocket' });
    }
  }
  
  /**
   * Format an error object for logging
   * @param error The error to format
   * @returns Formatted error object
   */
  private formatError(error: any): any {
    if (!error) return {};
    
    if (error instanceof Error) {
      return { 
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n') // Include first 5 lines of stack
      };
    }
    
    return { error };
  }
  
  /**
   * Internal method to log a message with consistent format
   * @param level The log level
   * @param message The message to log
   * @param data Optional additional data to include
   */
  private log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const component = data?.component || 'app';
    
    // Remove component from data if it exists to avoid duplication
    if (data?.component) {
      const { component, ...rest } = data;
      data = rest;
    }
    
    // Create structured log object
    const logObject = {
      timestamp,
      level,
      component,
      message: data ? { message, ...data } : message
    };
    
    // Log to console with appropriate level
    switch (level) {
      case 'debug':
        console.debug(JSON.stringify(logObject));
        break;
      case 'info':
        console.info(JSON.stringify(logObject));
        break;
      case 'warn':
        console.warn(JSON.stringify(logObject));
        break;
      case 'error':
        console.error(JSON.stringify(logObject));
        break;
      default:
        console.log(JSON.stringify(logObject));
    }
  }
}

// Export singleton instance
export const logger = new Logger();