/**
 * Module Initializer - Setup and initialization for all modules
 * 
 * This file provides a simple way to initialize all modules in one place
 * and make them available throughout the application.
 */

import { Logger, ConsoleLogHandler, LogLevel } from './shared/index';
// import { MacroServiceFactory } from './macro'; // Disabled
// import { ConfigManager } from './shared/index'; // Unused
import { TradingAnalyzerFactory } from './trading';
import { BrowserAutomationServiceFactory } from './browser';
import { ProxyManagerFactory } from './proxy';

/**
 * Initialize all modules with default configuration
 */
export function initializeModules(config?: {
  enableLogging?: boolean;
  logLevel?: LogLevel | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  tradingConfig?: any;
  proxyConfig?: any;
}) {
  // Setup logging
  if (config?.enableLogging !== false) {
    Logger.addHandler(ConsoleLogHandler);
    const level = (config?.logLevel as LogLevel) || LogLevel.INFO;
    Logger.setMinLevel(level);
  }

  const logger = new Logger('ModuleInitializer');
  logger.info('Initializing application modules');

  // Initialize services with singletons
  const modules = {
    // macro: MacroServiceFactory.getInstance(), // Disabled
    trading: TradingAnalyzerFactory.create(config?.tradingConfig || {}),
    browser: BrowserAutomationServiceFactory.create(),
    proxy: ProxyManagerFactory.create(config?.proxyConfig || {}),
  };

  logger.info('All modules initialized successfully');

  return modules;
}

/**
 * Get singleton instances of all modules
 */
export function getModules() {
  return {
    // macro: MacroServiceFactory.getInstance(), // Disabled
    trading: TradingAnalyzerFactory.create(),
    browser: BrowserAutomationServiceFactory.create(),
    proxy: ProxyManagerFactory.create(),
  };
}

/**
 * Export all module types for convenient importing
 */
// export * from './macro'; // Disabled
export * from './trading';
export * from './browser';
export * from './proxy';
export * from './shared';
