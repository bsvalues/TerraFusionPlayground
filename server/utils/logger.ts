/**
 * Server-side logging utility
 *
 * A centralized logging system with consistent formatting,
 * configurable log levels, and structured log output.
 */

// Define log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

// Map log level strings to numeric values
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  none: LogLevel.NONE,
};

// Default log level
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

/**
 * Logger class with support for different log levels and structured output
 */
class Logger {
  private level: LogLevel;

  /**
   * Create a new logger instance
   */
  constructor() {
    this.level = this.getLogLevelFromEnv();
  }

  /**
   * Set the current log level
   * @param level Log level to set
   */
  public setLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      const levelValue = LOG_LEVEL_MAP[level.toLowerCase()];
      if (levelValue !== undefined) {
        this.level = levelValue;
      }
    } else if (typeof level === 'number' && level >= LogLevel.DEBUG && level <= LogLevel.NONE) {
      this.level = level;
    }
  }

  /**
   * Get the current log level
   */
  public getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Log a debug message
   * @param message Message to log
   * @param data Additional data to include
   */
  public debug(message: string | object, data?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('debug', message, data);
    }
  }

  /**
   * Log an informational message
   * @param message Message to log
   * @param data Additional data to include
   */
  public info(message: string | object, data?: any): void {
    if (this.level <= LogLevel.INFO) {
      this.log('info', message, data);
    }
  }

  /**
   * Log a warning message
   * @param message Message to log
   * @param data Additional data to include
   */
  public warn(message: string | object, data?: any): void {
    if (this.level <= LogLevel.WARN) {
      this.log('warn', message, data);
    }
  }

  /**
   * Log an error message
   * @param message Message to log
   * @param error Error object or additional data
   */
  public error(message: string | object, error?: any): void {
    if (this.level <= LogLevel.ERROR) {
      // Format error object if provided
      let formattedError = error;

      if (error instanceof Error) {
        formattedError = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      }

      this.log('error', message, formattedError);
    }
  }

  /**
   * Internal method to log a message with consistent formatting
   * @param level Log level
   * @param message Message to log
   * @param data Additional data
   */
  private log(level: string, message: string | object, data?: any): void {
    const timestamp = new Date().toISOString();

    // Structure the log entry
    const logEntry: any = {
      timestamp,
      level,
      component: 'app',
    };

    // Handle message formatting
    if (typeof message === 'string') {
      logEntry.message = message;
      if (data !== undefined) {
        logEntry.data = data;
      }
    } else {
      logEntry.message = message;
    }

    // Format for console output
    const consoleOutput = JSON.stringify(logEntry);

    // Output to appropriate console method
    switch (level) {
      case 'debug':
        console.debug(consoleOutput);
        break;
      case 'info':
        console.info(consoleOutput);
        break;
      case 'warn':
        console.warn(consoleOutput);
        break;
      case 'error':
        console.error(consoleOutput);
        break;
      default:
        console.log(consoleOutput);
    }
  }

  /**
   * Get log level from environment variable
   */
  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL;

    if (envLevel && LOG_LEVEL_MAP[envLevel.toLowerCase()] !== undefined) {
      return LOG_LEVEL_MAP[envLevel.toLowerCase()];
    }

    return DEFAULT_LOG_LEVEL;
  }
}

// Export singleton instance
export const logger = new Logger();
