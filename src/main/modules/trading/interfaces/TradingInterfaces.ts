/**
 * Trading system interfaces.
 */

import {
  Item,
  TradingConfig,
  ProfitAnalysis,
  TradingDecision,
  TradeOpportunity,
} from "../types/TradingTypes";

export type TradingDecisionCallback = (decision: TradingDecision) => void;

export interface ITradingAnalyzer {
  analyzeItem(item: Item): ProfitAnalysis;
  makeTradingDecision(item: Item): TradingDecision;
  findOpportunities(items: Item[]): TradeOpportunity[];
  setConfig(config: Partial<TradingConfig>): void;
  getConfig(): TradingConfig;
  registerDecisionCallback(callback: TradingDecisionCallback): void;
}
