/**
 * Trading system types.
 * Defines item data structures and trading calculations.
 */

/**
 * Represents an item in an inventory or marketplace.
 */
export interface Item {
  id: string;
  name: string;
  purchasePrice: number;
  resalePrice: number;
  quantity: number;
  lastUpdated: number;
  metadata?: Record<string, unknown>;
}

/**
 * Trading configuration for profit analysis.
 */
export interface TradingConfig {
  minProfitThreshold: number;
  maxProfitThreshold?: number;
  profitCalculationMethod: "simple" | "percentage" | "custom";
  includeFees: boolean;
  feePercentage?: number;
  feesFixed?: number;
  taxPercentage?: number;
  minMarginPercentage?: number;
}

/**
 * Result of profit analysis.
 */
export interface ProfitAnalysis {
  itemId: string;
  itemName: string;
  purchasePrice: number;
  resalePrice: number;
  profitAmount: number;
  profitPercentage: number;
  profitPerUnit: number;
  passesThreshold: boolean;
  fees: number;
  netProfit: number;
  netProfitPercentage: number;
  analysis: {
    marginal: boolean;
    highVolume: boolean;
    lowVolume: boolean;
  };
  timestamp: number;
}

/**
 * Trading decision with callback support.
 */
export interface TradingDecision {
  itemId: string;
  decision: "BUY" | "SELL" | "HOLD" | "SKIP";
  confidence: number;
  reason: string;
  analysis: ProfitAnalysis;
}

/**
 * Trade opportunity for bulk operations.
 */
export interface TradeOpportunity {
  sourceItem: Item;
  targetPrice: number;
  expectedProfit: number;
  expectedProfitPercentage: number;
  quantity: number;
  estimatedTotalProfit: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  timestamps: {
    detected: number;
    expiresAt: number;
  };
}
