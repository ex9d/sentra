/**
 * Logging layer for structured logging across modules.
 * Supports multiple output levels and formatting.
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

export type LogHandler = (entry: LogEntry) => void;

/**
 * Structured logger with support for multiple handlers.
 */
export class Logger {
  private static handlers: LogHandler[] = [];
  private static minLevel: LogLevel = LogLevel.DEBUG;

  private readonly module: string;

  constructor(module: string) {
    this.module = module;
  }

  /**
   * Register a log handler (e.g., file, console, remote service).
   */
  public static addHandler(handler: LogHandler): void {
    Logger.handlers.push(handler);
  }

  /**
   * Set minimum log level for all loggers.
   */
  public static setMinLevel(level: LogLevel): void {
    Logger.minLevel = level;
  }

  /**
   * Clear all handlers.
   */
  public static clearHandlers(): void {
    Logger.handlers = [];
  }

  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      ...(data !== undefined && { data }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        },
      }),
    };

    Logger.handlers.forEach((handler) => {
      try {
        handler(entry);
      } catch (err) {
        console.error("Log handler error:", err);
      }
    });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.FATAL,
    ];
    const minIndex = levels.indexOf(Logger.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  public debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, error?: Error, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  public fatal(message: string, error?: Error, data?: unknown): void {
    this.log(LogLevel.FATAL, message, data, error);
  }
}

/**
 * Default console log handler for development.
 */
export const ConsoleLogHandler: LogHandler = (entry: LogEntry) => {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  const prefix = `[${timestamp}] [${entry.level}] [${entry.module}]`;

  let message = `${prefix} ${entry.message}`;

  if (entry.data !== undefined) {
    message += ` ${JSON.stringify(entry.data)}`;
  }

  if (entry.error) {
    message += ` ERROR: ${entry.error.name}: ${entry.error.message}`;
    if (entry.error.stack) {
      message += `\n${entry.error.stack}`;
    }
  }

  const consoleMethod = getConsoleMethod(entry.level);
  consoleMethod(message);
};

function getConsoleMethod(
  level: LogLevel
): (message: string) => void {
  switch (level) {
    case LogLevel.DEBUG:
      return console.debug;
    case LogLevel.INFO:
      return console.info;
    case LogLevel.WARN:
      return console.warn;
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      return console.error;
  }
}
