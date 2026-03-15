/**
 * Central Module Index
 * 
 * Import your modules from here for clean, organized imports throughout your application.
 * 
 * Usage:
 *   import { MacroService, Logger, TradingAnalyzer } from '@modules';
 *   import { ProxyManager, BrowserAutomationService } from '@modules';
 */

// ============================================================================
// MACRO SYSTEM
// ============================================================================

export type { MacroEvent, Macro, MacroRecorderConfig, MacroPlaybackConfig, MacroPlaybackResult } from './macro/types/MacroTypes';
export type { IMacroRecorder, IMacroPlayer, IMacroService } from './macro/interfaces/MacroInterfaces';

export { MacroRecorder } from './macro/services/MacroRecorder';
export { MacroPlayer } from './macro/services/MacroPlayer';
export { MacroService, MacroServiceFactory } from './macro/services/MacroService';

// ============================================================================
// TRADING ENGINE
// ============================================================================

export type { Item, TradingConfig, ProfitAnalysis, TradingDecision, TradeOpportunity } from './trading/types/TradingTypes';
export type { ITradingAnalyzer, TradingDecisionCallback } from './trading/interfaces/TradingInterfaces';

export { ProfitCalculator } from './trading/utils/ProfitCalculator';
export { TradingAnalyzer, TradingAnalyzerFactory } from './trading/services/TradingAnalyzer';

// ============================================================================
// BROWSER AUTOMATION
// ============================================================================

export type {
  BrowserLaunchOptions,
  FormField,
  FormConfig,
  NavigationConfig,
  AutomationResult,
  BrowserState,
  IBrowserInstance,
} from './browser/types/BrowserTypes';
export type { IBrowserService, IFormAutomationService, IBrowserAutomationService } from './browser/interfaces/BrowserInterfaces';

export { BrowserService } from './browser/services/BrowserService';
export { FormAutomationService } from './browser/services/FormAutomationService';
export { BrowserAutomationService, BrowserAutomationServiceFactory } from './browser/services/BrowserAutomationService';

// ============================================================================
// PROXY MANAGEMENT
// ============================================================================

export type { Proxy, ProxyTestResult, ProxyPoolConfig, ProxySession, RotationStrategy, ProxyPoolState } from './proxy/types/ProxyTypes';
export type { IProxyTester, IProxyPool, IProxyManager } from './proxy/interfaces/ProxyInterfaces';

export { ProxyValidator } from './proxy/utils/ProxyValidator';
export { ProxyTester } from './proxy/services/ProxyTester';
export { ProxyPool } from './proxy/services/ProxyPool';
export { ProxyManager, ProxyManagerFactory } from './proxy/services/ProxyManager';

// ============================================================================
// SHARED INFRASTRUCTURE
// ============================================================================

// Error Handling
export { AppError, ValidationError, ConfigError } from './shared/error/AppError';
export { ErrorCode, ErrorSeverity, type ErrorContext } from './shared/error/AppError';

// Logging
export { Logger, ConsoleLogHandler } from './shared/logging/Logger';
export { LogLevel, type LogEntry, type LogHandler } from './shared/logging/Logger';

// Configuration
export { ConfigManager, ConfigValidator } from './shared/config/ConfigManager';
export type { IConfigManager } from './shared/config/ConfigManager';
