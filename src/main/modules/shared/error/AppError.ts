/**
 * Custom error classes for the application.
 * Provides structured error handling with proper typing and context.
 */

export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum ErrorCode {
  // Macro errors
  MACRO_RECORD_ERROR = "MACRO_RECORD_ERROR",
  MACRO_PLAYBACK_ERROR = "MACRO_PLAYBACK_ERROR",
  MACRO_INVALID_FORMAT = "MACRO_INVALID_FORMAT",
  MACRO_FILE_ERROR = "MACRO_FILE_ERROR",

  // Trading errors
  TRADING_CALCULATION_ERROR = "TRADING_CALCULATION_ERROR",
  TRADING_INVALID_DATA = "TRADING_INVALID_DATA",
  TRADING_CONFIG_ERROR = "TRADING_CONFIG_ERROR",

  // Browser errors
  BROWSER_LAUNCH_ERROR = "BROWSER_LAUNCH_ERROR",
  BROWSER_NAVIGATION_ERROR = "BROWSER_NAVIGATION_ERROR",
  BROWSER_FORM_ERROR = "BROWSER_FORM_ERROR",
  BROWSER_TIMEOUT_ERROR = "BROWSER_TIMEOUT_ERROR",
  BROWSER_SELECTOR_ERROR = "BROWSER_SELECTOR_ERROR",

  // Proxy errors
  PROXY_VALIDATION_ERROR = "PROXY_VALIDATION_ERROR",
  PROXY_CONNECTION_ERROR = "PROXY_CONNECTION_ERROR",
  PROXY_POOL_EMPTY = "PROXY_POOL_EMPTY",
  PROXY_CONFIG_ERROR = "PROXY_CONFIG_ERROR",

  // General errors
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Application error class with enhanced context and metadata.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly module: string;

  constructor(
    message: string,
    code: ErrorCode,
    module: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.module = module;
    this.timestamp = new Date();

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      module: this.module,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }

  public static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }
}

/**
 * Validation error for data validation failures.
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    context: ErrorContext = {},
    module: string = "VALIDATION"
  ) {
    super(
      message,
      ErrorCode.TRADING_INVALID_DATA,
      module,
      ErrorSeverity.LOW,
      context
    );
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Configuration error for invalid configuration.
 */
export class ConfigError extends AppError {
  constructor(
    message: string,
    context: ErrorContext = {},
    module: string = "CONFIG"
  ) {
    super(
      message,
      ErrorCode.CONFIGURATION_ERROR,
      module,
      ErrorSeverity.HIGH,
      context
    );
    this.name = "ConfigError";
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}
