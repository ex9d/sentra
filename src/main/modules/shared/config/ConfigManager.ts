/**
 * Configuration management system.
 * Provides type-safe configuration loading and management.
 */

import { AppError, ErrorCode, ErrorSeverity } from "../error/AppError";

export interface IConfigManager {
  get<T = unknown>(key: string, defaultValue?: T): T;
  set(key: string, value: unknown): void;
  load(config: Record<string, unknown>): void;
  toJSON(): Record<string, unknown>;
}

/**
 * Configuration manager using a simple key-value store.
 */
export class ConfigManager implements IConfigManager {
  private config: Map<string, unknown> = new Map();

  constructor(initialConfig?: Record<string, unknown>) {
    if (initialConfig) {
      this.load(initialConfig);
    }
  }

  /**
   * Get configuration value by key.
   */
  public get<T = unknown>(key: string, defaultValue?: T): T {
    if (this.config.has(key)) {
      return this.config.get(key) as T;
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new AppError(
      `Configuration key not found: ${key}`,
      ErrorCode.CONFIGURATION_ERROR,
      "CONFIG",
      ErrorSeverity.MEDIUM,
      { key }
    );
  }

  /**
   * Set configuration value.
   */
  public set(key: string, value: unknown): void {
    this.config.set(key, value);
  }

  /**
   * Load configuration from object.
   */
  public load(config: Record<string, unknown>): void {
    Object.entries(config).forEach(([key, value]) => {
      this.config.set(key, value);
    });
  }

  /**
   * Export configuration as plain object.
   */
  public toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    this.config.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Check if key exists.
   */
  public has(key: string): boolean {
    return this.config.has(key);
  }

  /**
   * Clear all configuration.
   */
  public clear(): void {
    this.config.clear();
  }
}

/**
 * Configuration validator for strict type checking.
 */
export class ConfigValidator {
  public static validateRequired<T>(
    config: Record<string, unknown>,
    keys: string[]
  ): asserts config is Record<string, unknown> {
    const missing = keys.filter((key) => !(key in config));

    if (missing.length > 0) {
      throw new AppError(
        `Missing required configuration keys: ${missing.join(", ")}`,
        ErrorCode.CONFIGURATION_ERROR,
        "CONFIG",
        ErrorSeverity.HIGH,
        { missing }
      );
    }
  }

  public static validateType(
    config: Record<string, unknown>,
    key: string,
    expectedType: string
  ): void {
    const value = config[key];
    const actualType = typeof value;

    if (actualType !== expectedType) {
      throw new AppError(
        `Configuration key "${key}" must be of type ${expectedType}, got ${actualType}`,
        ErrorCode.CONFIGURATION_ERROR,
        "CONFIG",
        ErrorSeverity.MEDIUM,
        { key, expectedType, actualType }
      );
    }
  }

  public static validateRange(
    config: Record<string, unknown>,
    key: string,
    min: number,
    max: number
  ): void {
    const value = config[key];

    if (typeof value !== "number") {
      throw new AppError(
        `Configuration key "${key}" must be a number`,
        ErrorCode.CONFIGURATION_ERROR,
        "CONFIG",
        ErrorSeverity.MEDIUM,
        { key }
      );
    }

    if (value < min || value > max) {
      throw new AppError(
        `Configuration key "${key}" must be between ${min} and ${max}, got ${value}`,
        ErrorCode.CONFIGURATION_ERROR,
        "CONFIG",
        ErrorSeverity.MEDIUM,
        { key, value, min, max }
      );
    }
  }
}
