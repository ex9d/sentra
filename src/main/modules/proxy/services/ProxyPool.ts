/**
 * Proxy Pool Service.
 * Manages proxy collection with rotation strategies.
 */

import { EventEmitter } from "events";
import { Logger } from "../../shared/logging/Logger";
import {
  Proxy,
  RotationStrategy,
  ProxyPoolState,
  ProxySession,
  ProxyPoolConfig,
} from "../types/ProxyTypes";
import { IProxyPool, ProxyStatusChangeCallback } from "../interfaces/ProxyInterfaces";

const DEFAULT_CONFIG: ProxyPoolConfig = {
  rotationStrategy: "round-robin",
  healthCheckInterval: 300000, // 5 minutes
  maxFailures: 3,
  testUrl: "https://api.ipify.org",
  testTimeout: 10000,
  autoRemoveInactive: false,
};

export class ProxyPool extends EventEmitter implements IProxyPool {
  private logger: Logger;
  private proxies: Map<string, Proxy> = new Map();
  private currentIndex: number = 0;
  private sessions: Map<string, ProxySession> = new Map();
  private config: ProxyPoolConfig;
  private statusCallbacks: ProxyStatusChangeCallback[] = [];

  constructor(config: Partial<ProxyPoolConfig> = {}) {
    super();
    this.logger = new Logger("ProxyPool");
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger.info("ProxyPool initialized", { config: this.config });
  }

  /**
   * Add proxy to pool.
   */
  public addProxy(proxy: Proxy): void {
    if (this.proxies.has(proxy.id)) {
      this.logger.warn("Proxy already exists in pool", {
        proxyId: proxy.id,
      });
      return;
    }

    this.proxies.set(proxy.id, { ...proxy });
    this.logger.info("Proxy added to pool", {
      proxyId: proxy.id,
      host: proxy.host,
      port: proxy.port,
    });

    this.emit("proxyAdded", proxy);
  }

  /**
   * Remove proxy from pool.
   */
  public removeProxy(proxyId: string): void {
    if (!this.proxies.has(proxyId)) {
      this.logger.warn("Proxy not found in pool", { proxyId });
      return;
    }

    this.proxies.delete(proxyId);
    this.logger.info("Proxy removed from pool", { proxyId });
    this.emit("proxyRemoved", { proxyId });
  }

  /**
   * Get a proxy from the pool, assigned to session if provided.
   */
  public getProxy(sessionId?: string): Proxy | null {
    if (this.proxies.size === 0) {
      this.logger.warn("No proxies available in pool");
      return null;
    }

    let proxy: Proxy | null = null;

    // Return assigned proxy if session exists
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      proxy = session.assignedProxy;

      session.requestCount++;
      session.lastUsed = Date.now();

      return proxy;
    }

    // Get next proxy based on rotation strategy
    proxy = this.getNextProxy();

    // Create new session if sessionId provided
    if (sessionId && proxy) {
      const session: ProxySession = {
        sessionId,
        assignedProxy: proxy,
        startTime: Date.now(),
        requestCount: 1,
        lastUsed: Date.now(),
      };

      this.sessions.set(sessionId, session);
      this.logger.debug("Session assigned proxy", {
        sessionId,
        proxyId: proxy.id,
      });
    }

    return proxy;
  }

  /**
   * Get next proxy based on rotation strategy.
   */
  public getNextProxy(): Proxy | null {
    if (this.proxies.size === 0) {
      return null;
    }

    const activeProxies = this.getActiveProxies();

    if (activeProxies.length === 0) {
      this.logger.warn("No active proxies available");
      return null;
    }

    let proxy: Proxy | null = null;

    switch (this.config.rotationStrategy) {
      case "round-robin":
        proxy = this.selectRoundRobin(activeProxies);
        break;

      case "random":
        proxy = this.selectRandom(activeProxies);
        break;

      case "fastest":
        proxy = this.selectFastest(activeProxies);
        break;

      case "weighted":
        proxy = this.selectWeighted(activeProxies);
        break;

      default:
        proxy = activeProxies[0];
    }

    return proxy;
  }

  /**
   * Update proxy status.
   */
  public updateProxyStatus(proxyId: string, status: Proxy["status"]): void {
    const proxy = this.proxies.get(proxyId);

    if (!proxy) {
      this.logger.warn("Proxy not found", { proxyId });
      return;
    }

    const oldStatus = proxy.status;
    proxy.status = status;
    proxy.lastChecked = Date.now();

    if (status === "failed") {
      proxy.failureCount = (proxy.failureCount ?? 0) + 1;

      if (
        this.config.maxFailures &&
        proxy.failureCount > this.config.maxFailures &&
        this.config.autoRemoveInactive
      ) {
        this.removeProxy(proxyId);
        this.logger.info("Proxy removed after max failures", {
          proxyId,
          failureCount: proxy.failureCount,
        });
      }
    }

    if (oldStatus !== status) {
      this.logger.info("Proxy status updated", {
        proxyId,
        oldStatus,
        newStatus: status,
      });

      this.statusCallbacks.forEach((callback) => {
        try {
          callback(proxyId, status);
        } catch (error) {
          this.logger.error(
            "Error in status change callback",
            error as Error
          );
        }
      });

      this.emit("statusChanged", { proxyId, status });
    }
  }

  /**
   * Get all proxies.
   */
  public getAllProxies(): Proxy[] {
    return Array.from(this.proxies.values());
  }

  /**
   * Get active proxies only.
   */
  public getActiveProxies(): Proxy[] {
    return Array.from(this.proxies.values()).filter(
      (p) => p.status === "active"
    );
  }

  /**
   * Get proxies by status.
   */
  public getProxiesByStatus(status: Proxy["status"]): Proxy[] {
    return Array.from(this.proxies.values()).filter(
      (p) => p.status === status
    );
  }

  /**
   * Get pool state.
   */
  public getState(): ProxyPoolState {
    const all = this.getAllProxies();
    const active = this.getActiveProxies();
    const inactive = this.getProxiesByStatus("inactive");
    const failed = this.getProxiesByStatus("failed");

    return {
      totalProxies: all.length,
      activeProxies: active.length,
      inactiveProxies: inactive.length,
      failedProxies: failed.length,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Set rotation strategy.
   */
  public setRotationStrategy(strategy: RotationStrategy): void {
    this.config.rotationStrategy = strategy;
    this.currentIndex = 0;
    this.logger.info("Rotation strategy updated", { strategy });
  }

  /**
   * Register status change callback.
   */
  public onStatusChange(callback: ProxyStatusChangeCallback): void {
    this.statusCallbacks.push(callback);
  }

  private selectRoundRobin(proxies: Proxy[]): Proxy {
    const proxy = proxies[this.currentIndex % proxies.length];
    this.currentIndex++;
    return proxy;
  }

  private selectRandom(proxies: Proxy[]): Proxy {
    return proxies[Math.floor(Math.random() * proxies.length)];
  }

  private selectFastest(proxies: Proxy[]): Proxy {
    return proxies.reduce((fastest, current) => {
      const currentLatency = current.latency ?? Infinity;
      const fastestLatency = fastest.latency ?? Infinity;
      return currentLatency < fastestLatency ? current : fastest;
    });
  }

  private selectWeighted(proxies: Proxy[]): Proxy {
    // Weight by latency (lower latency = higher weight)
    const weights = proxies.map(
      (p) => 1 / ((p.latency ?? 100) + 1)
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < proxies.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return proxies[i];
      }
    }

    return proxies[proxies.length - 1];
  }
}
