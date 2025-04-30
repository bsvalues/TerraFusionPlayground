/**
 * Enhanced logger utility
 * 
 * Provides structured logging capabilities with different log levels
 * and standardized formatting for better debugging and monitoring.
 */

// Define log levels
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Define global log level - can be adjusted based on environment
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

/**
 * Simple logger utility with support for different log levels and structured output
 */
class Logger {
  /**
   * Log a debug message
   */
  public debug(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
      this.log('debug', message, data);
    }
  }
  
  /**
   * Log an info message
   */
  public info(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      this.log('info', message, data);
    }
  }
  
  /**
   * Log a warning message
   */
  public warn(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
      this.log('warn', message, data);
    }
  }
  
  /**
   * Log an error message
   */
  public error(message: string, error?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
      this.log('error', message, error);
    }
  }
  
  /**
   * Internal method to log a message with consistent format
   */
  private log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const component = 'app';
    
    // Create structured log object
    const logObject = {
      timestamp,
      level,
      component,
      message: data ? { component: 'logger', message, ...data } : message
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