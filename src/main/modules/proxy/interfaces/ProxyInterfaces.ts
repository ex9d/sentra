/**
 * Proxy service interfaces.
 */

import {
  Proxy,
  ProxyTestResult,
  ProxyPoolConfig,
  ProxySession,
  RotationStrategy,
  ProxyPoolState,
} from "../types/ProxyTypes";

export type ProxyStatusChangeCallback = (
  proxyId: string,
  status: "active" | "inactive" | "failed"
) => void;

export interface IProxyTester {
  testProxy(proxy: Proxy, testUrl?: string): Promise<ProxyTestResult>;
  testMultiple(proxies: Proxy[]): Promise<ProxyTestResult[]>;
}

export interface IProxyPool {
  addProxy(proxy: Proxy): void;
  removeProxy(proxyId: string): void;
  getProxy(sessionId?: string): Proxy | null;
  getNextProxy(): Proxy | null;
  updateProxyStatus(proxyId: string, status: Proxy["status"]): void;
  getAllProxies(): Proxy[];
  getActiveProxies(): Proxy[];
  getProxiesByStatus(status: Proxy["status"]): Proxy[];
  getState(): ProxyPoolState;
  setRotationStrategy(strategy: RotationStrategy): void;
  onStatusChange(callback: ProxyStatusChangeCallback): void;
}

export interface IProxyManager {
  addProxies(proxies: Proxy[]): void;
  importProxies(filePath: string): Promise<void>;
  exportProxies(filePath: string): Promise<void>;
  validateProxy(proxy: Proxy): boolean;
  testProxies(): Promise<void>;
  getHealthyProxy(sessionId?: string): Proxy | null;
  assignProxyToSession(sessionId: string): ProxySession | null;
  releaseSession(sessionId: string): void;
  getPoolState(): ProxyPoolState;
  clearProxies(): void;
  setConfiguration(config: ProxyPoolConfig): void;
}
