/**
 * Trading Analyzer - Decision engine for trading logic.
 * Generic, configurable, fully unit-testable.
 */

import { EventEmitter } from "events";
import { Logger } from "../../shared/logging/Logger";
import { ConfigManager } from "../../shared/config/ConfigManager";
import { AppError, ErrorCode, ErrorSeverity } from "../../shared/error/AppError";
import {
  Item,
  TradingConfig,
  ProfitAnalysis,
  TradingDecision,
  TradeOpportunity,
} from "../types/TradingTypes";
import { ITradingAnalyzer, TradingDecisionCallback } from "../interfaces/TradingInterfaces";
import { ProfitCalculator } from "../utils/ProfitCalculator";

/**
 * Default trading configuration.
 */
const DEFAULT_TRADING_CONFIG: TradingConfig = {
  minProfitThreshold: 100,
  maxProfitThreshold: undefined,
  profitCalculationMethod: "simple",
  includeFees: false,
  feePercentage: 5,
  minMarginPercentage: 5,
};

export class TradingAnalyzer extends EventEmitter implements ITradingAnalyzer {
  private logger: Logger;
  private config: TradingConfig;
  private calculator: ProfitCalculator;
  private decisionCallbacks: TradingDecisionCallback[] = [];
  private analysisCache: Map<string, ProfitAnalysis> = new Map();

  constructor(config: Partial<TradingConfig> = {}) {
    super();
    this.logger = new Logger("TradingAnalyzer");
    this.config = { ...DEFAULT_TRADING_CONFIG, ...config };
    this.calculator = new ProfitCalculator();

    this.validateConfig();
    this.logger.info("TradingAnalyzer initialized", { config: this.config });
  }

  /**
   * Analyze a single item for profitability.
   */
  public analyzeItem(item: Item): ProfitAnalysis {
    try {
      // Check cache
      if (this.analysisCache.has(item.id)) {
        const cached = this.analysisCache.get(item.id);
        if (
          cached &&
          Date.now() - cached.timestamp < 5000
        ) {
          return cached;
        }
      }

      const analysis = this.calculator.analyze(item, this.config);
      this.analysisCache.set(item.id, analysis);

      this.logger.debug("Item analyzed", {
        itemId: item.id,
        profit: analysis.netProfit,
        passesThreshold: analysis.passesThreshold,
      });

      return analysis;
    } catch (error) {
      const appError = new AppError(
        "Failed to analyze item",
        ErrorCode.TRADING_CALCULATION_ERROR,
        "TradingAnalyzer",
        ErrorSeverity.MEDIUM,
        { itemId: item.id, error }
      );
      this.logger.error("Item analysis failed", error as Error, {
        itemId: item.id,
      });
      throw appError;
    }
  }

  /**
   * Make a trading decision for an item based on analysis.
   */
  public makeTradingDecision(item: Item): TradingDecision {
    try {
      const analysis = this.analyzeItem(item);

      let decision: "BUY" | "SELL" | "HOLD" | "SKIP";
      let confidence: number;
      let reason: string;

      if (!analysis.passesThreshold) {
        decision = "SKIP";
        confidence = 0.95;
        reason = `Item does not meet profit threshold. Net profit: ${analysis.netProfit}`;
      } else if (analysis.analysis.marginal) {
        decision = "HOLD";
        confidence = 0.6;
        reason = `Marginal profit (${analysis.netProfitPercentage.toFixed(2)}%). Wait for better conditions.`;
      } else if (analysis.analysis.highVolume && analysis.netProfitPercentage > 20) {
        decision = "BUY";
        confidence = 0.85;
        reason = `High volume with good margin (${analysis.netProfitPercentage.toFixed(2)}%).`;
      } else if (analysis.netProfitPercentage > 15) {
        decision = "BUY";
        confidence = 0.75;
        reason = `Good profit margin (${analysis.netProfitPercentage.toFixed(2)}%).`;
      } else {
        decision = "HOLD";
        confidence = 0.7;
        reason = `Acceptable profit, but not optimal conditions.`;
      }

      const tradingDecision: TradingDecision = {
        itemId: item.id,
        decision,
        confidence,
        reason,
        analysis,
      };

      // Trigger callbacks
      this.decisionCallbacks.forEach((callback) => {
        try {
          callback(tradingDecision);
        } catch (error) {
          this.logger.error(
            "Error in decision callback",
            error as Error
          );
        }
      });

      this.emit("decisionMade", tradingDecision);
      return tradingDecision;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find trading opportunities from a list of items.
   */
  public findOpportunities(items: Item[]): TradeOpportunity[] {
    try {
      const opportunities: TradeOpportunity[] = [];

      items.forEach((item) => {
        const analysis = this.analyzeItem(item);

        if (!analysis.passesThreshold) {
          return;
        }

        let priority: "HIGH" | "MEDIUM" | "LOW";

        if (analysis.netProfitPercentage > 30) {
          priority = "HIGH";
        } else if (analysis.netProfitPercentage > 15) {
          priority = "MEDIUM";
        } else {
          priority = "LOW";
        }

        const opportunity: TradeOpportunity = {
          sourceItem: item,
          targetPrice: item.resalePrice,
          expectedProfit: analysis.netProfit,
          expectedProfitPercentage: analysis.netProfitPercentage,
          quantity: item.quantity,
          estimatedTotalProfit: analysis.netProfit * item.quantity,
          priority,
          timestamps: {
            detected: Date.now(),
            expiresAt: Date.now() + 3600000, // 1 hour
          },
        };

        opportunities.push(opportunity);
      });

      opportunities.sort((a, b) => {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return (
          priorityOrder[a.priority] - priorityOrder[b.priority] ||
          b.expectedProfitPercentage - a.expectedProfitPercentage
        );
      });

      this.logger.info("Trading opportunities identified", {
        count: opportunities.length,
      });

      return opportunities;
    } catch (error) {
      const appError = new AppError(
        "Failed to find trading opportunities",
        ErrorCode.TRADING_CALCULATION_ERROR,
        "TradingAnalyzer",
        ErrorSeverity.MEDIUM
      );
      this.logger.error("Opportunity detection failed", error as Error);
      throw appError;
    }
  }

  /**
   * Update trading configuration.
   */
  public setConfig(config: Partial<TradingConfig>): void {
    this.config = { ...this.config, ...config };
    this.validateConfig();
    this.analysisCache.clear(); // Invalidate cache
    this.logger.info("Trading configuration updated", {
      config: this.config,
    });
    this.emit("configUpdated", this.config);
  }

  /**
   * Get current trading configuration.
   */
  public getConfig(): TradingConfig {
    return { ...this.config };
  }

  /**
   * Register a callback for trading decisions.
   */
  public registerDecisionCallback(callback: TradingDecisionCallback): void {
    this.decisionCallbacks.push(callback);
  }

  private validateConfig(): void {
    if (this.config.minProfitThreshold < 0) {
      throw new AppError(
        "minProfitThreshold must be non-negative",
        ErrorCode.TRADING_CONFIG_ERROR,
        "TradingAnalyzer",
        ErrorSeverity.HIGH
      );
    }

    if (
      this.config.maxProfitThreshold !== undefined &&
      this.config.maxProfitThreshold < this.config.minProfitThreshold
    ) {
      throw new AppError(
        "maxProfitThreshold must be >= minProfitThreshold",
        ErrorCode.TRADING_CONFIG_ERROR,
        "TradingAnalyzer",
        ErrorSeverity.HIGH
      );
    }

    if (this.config.feePercentage !== undefined) {
      if (
        this.config.feePercentage < 0 ||
        this.config.feePercentage > 100
      ) {
        throw new AppError(
          "feePercentage must be between 0 and 100",
          ErrorCode.TRADING_CONFIG_ERROR,
          "TradingAnalyzer",
          ErrorSeverity.HIGH
        );
      }
    }
  }
}

/**
 * Factory for creating TradingAnalyzer instances with dependency injection.
 */
export class TradingAnalyzerFactory {
  public static create(
    config?: Partial<TradingConfig>
  ): TradingAnalyzer {
    return new TradingAnalyzer(config);
  }

  public static createFromConfigManager(
    configManager: ConfigManager
  ): TradingAnalyzer {
    const config = configManager.get<Partial<TradingConfig>>(
      "trading.config",
      {}
    );
    return new TradingAnalyzer(config);
  }
}
