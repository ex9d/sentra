/**
 * Proxy Manager Service.
 * High-level API for proxy management and validation.
 */

import { promises as fs } from "fs";
import { EventEmitter } from "events";
import { Logger } from "../../shared/logging/Logger";
import { AppError, ErrorCode, ErrorSeverity } from "../../shared/error/AppError";
import {
  Proxy,
  ProxyPoolConfig,
  ProxySession,
  ProxyPoolState,
} from "../types/ProxyTypes";
import { IProxyManager } from "../interfaces/ProxyInterfaces";
import { ProxyValidator } from "../utils/ProxyValidator";
import { ProxyPool } from "./ProxyPool";
import { ProxyTester } from "./ProxyTester";

export class ProxyManager extends EventEmitter implements IProxyManager {
  private logger: Logger;
  private pool: ProxyPool;
  private tester: ProxyTester;

  constructor(config: Partial<ProxyPoolConfig> = {}) {
    super();
    this.logger = new Logger("ProxyManager");
    this.pool = new ProxyPool(config);
    this.tester = new ProxyTester(config.testUrl, config.testTimeout);

    // Forward pool events
    this.pool.on("proxyAdded", (proxy) => this.emit("proxyAdded", proxy));
    this.pool.on("proxyRemoved", (data) =>
      this.emit("proxyRemoved", data)
    );
    this.pool.on("statusChanged", (data) =>
      this.emit("statusChanged", data)
    );

    this.logger.info("ProxyManager initialized");
  }

  /**
   * Add proxies to the pool.
   */
  public addProxies(proxies: Proxy[]): void {
    try {
      let addedCount = 0;

      proxies.forEach((proxy) => {
        try {
          ProxyValidator.validateFormat(proxy);
          this.pool.addProxy(proxy);
          addedCount++;
        } catch (error) {
          this.logger.warn(
            "Failed to add proxy",
            { proxyId: proxy.id, error: (error as Error).message }
          );
        }
      });

      this.logger.info("Proxies added to pool", {
        requested: proxies.length,
        added: addedCount,
      });

      this.emit("proxiesAdded", { count: addedCount });
    } catch (error) {
      const appError = new AppError(
        "Failed to add proxies",
        ErrorCode.PROXY_CONFIG_ERROR,
        "ProxyManager",
        ErrorSeverity.MEDIUM
      );
      this.logger.error("Error adding proxies", error as Error);
      throw appError;
    }
  }

  /**
   * Import proxies from file.
   */
  public async importProxies(filePath: string): Promise<void> {
    try {
      this.logger.info("Importing proxies from file", { filePath });

      const data = await fs.readFile(filePath, "utf-8");
      let proxies: Proxy[] = [];

      // Try JSON format first
      try {
        proxies = ProxyValidator.validateProxyList(JSON.parse(data));
      } catch {
        // Try newline-separated format
        const lines = data
          .split("\n")
          .filter((line) => line.trim().length > 0);
        proxies = ProxyValidator.validateProxyList(lines);
      }

      if (proxies.length === 0) {
        throw new AppError(
          "No valid proxies found in file",
          ErrorCode.PROXY_CONFIG_ERROR,
          "ProxyManager",
          ErrorSeverity.MEDIUM
        );
      }

      this.addProxies(proxies);

      this.logger.info("Proxies imported successfully", {
        filePath,
        count: proxies.length,
      });

      this.emit("proxiesImported", { filePath, count: proxies.length });
    } catch (error) {
      const appError = new AppError(
        "Failed to import proxies",
        ErrorCode.PROXY_CONFIG_ERROR,
        "ProxyManager",
        ErrorSeverity.MEDIUM,
        { filePath }
      );
      this.logger.error("Import error", error as Error, { filePath });
      throw appError;
    }
  }

  /**
   * Export proxies to file.
   */
  public async exportProxies(filePath: string): Promise<void> {
    try {
      const proxies = this.pool.getAllProxies();

      if (proxies.length === 0) {
        throw new AppError(
          "No proxies to export",
          ErrorCode.PROXY_CONFIG_ERROR,
          "ProxyManager",
          ErrorSeverity.LOW
        );
      }

      const json = JSON.stringify(proxies, null, 2);
      await fs.writeFile(filePath, json, "utf-8");

      this.logger.info("Proxies exported successfully", {
        filePath,
        count: proxies.length,
      });

      this.emit("proxiesExported", { filePath, count: proxies.length });
    } catch (error) {
      const appError = new AppError(
        "Failed to export proxies",
        ErrorCode.PROXY_CONFIG_ERROR,
        "ProxyManager",
        ErrorSeverity.MEDIUM,
        { filePath }
      );
      this.logger.error("Export error", error as Error, { filePath });
      throw appError;
    }
  }

  /**
   * Validate proxy.
   */
  public validateProxy(proxy: Proxy): boolean {
    try {
      ProxyValidator.validateFormat(proxy);
      return ProxyValidator.validate(proxy);
    } catch {
      return false;
    }
  }

  /**
   * Test all proxies.
   */
  public async testProxies(): Promise<void> {
    try {
      const proxies = this.pool.getAllProxies();

      if (proxies.length === 0) {
        this.logger.warn("No proxies to test");
        return;
      }

      this.logger.info("Starting proxy health check", {
        count: proxies.length,
      });

      const results = await this.tester.testMultiple(proxies);

      results.forEach((result) => {
        const status = result.success ? "active" : "failed";
        this.pool.updateProxyStatus(result.proxyId, status);

        if (result.success && result.latency) {
          const proxy = this.pool.getAllProxies().find(
            (p) => p.id === result.proxyId
          );
          if (proxy) {
            proxy.latency = result.latency;
          }
        }
      });

      const successCount = results.filter((r) => r.success).length;

      this.logger.info("Proxy health check completed", {
        success: successCount,
        failed: results.length - successCount,
      });

      this.emit("testCompleted", {
        total: results.length,
        success: successCount,
      });
    } catch (error) {
      const appError = new AppError(
        "Proxy testing failed",
        ErrorCode.PROXY_VALIDATION_ERROR,
        "ProxyManager",
        ErrorSeverity.MEDIUM
      );
      this.logger.error("Proxy testing error", error as Error);
      throw appError;
    }
  }

  /**
   * Get healthy proxy.
   */
  public getHealthyProxy(sessionId?: string): Proxy | null {
    // Prefer getting from pool (which filters active proxies)
    return this.pool.getProxy(sessionId);
  }

  /**
   * Assign proxy to session.
   */
  public assignProxyToSession(sessionId: string): ProxySession | null {
    const proxy = this.pool.getProxy(sessionId);

    if (!proxy) {
      return null;
    }

    const session: ProxySession = {
      sessionId,
      assignedProxy: proxy,
      startTime: Date.now(),
      requestCount: 0,
      lastUsed: Date.now(),
    };

    this.logger.info("Proxy assigned to session", {
      sessionId,
      proxyId: proxy.id,
    });

    this.emit("sessionAssigned", session);
    return session;
  }

  /**
   * Release session.
   */
  public releaseSession(sessionId: string): void {
    this.logger.info("Session released", { sessionId });
    this.emit("sessionReleased", { sessionId });
  }

  /**
   * Get pool state.
   */
  public getPoolState(): ProxyPoolState {
    return this.pool.getState();
  }

  /**
   * Clear all proxies.
   */
  public clearProxies(): void {
    this.pool.getAllProxies().forEach((proxy) => {
      this.pool.removeProxy(proxy.id);
    });

    this.logger.info("All proxies cleared");
    this.emit("proxiesCleared");
  }

  /**
   * Update configuration.
   */
  public setConfiguration(config: ProxyPoolConfig): void {
    if (config.rotationStrategy) {
      this.pool.setRotationStrategy(config.rotationStrategy);
    }

    this.logger.info("ProxyManager configuration updated");
    this.emit("configurationUpdated", config);
  }
}

/**
 * Factory for ProxyManager.
 */
export class ProxyManagerFactory {
  public static create(config?: Partial<ProxyPoolConfig>): ProxyManager {
    return new ProxyManager(config);
  }
}
