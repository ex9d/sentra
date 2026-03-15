/**
 * Proxy Tester Service.
 * Tests proxies for connectivity and latency.
 */

import { Logger } from "../../shared/logging/Logger";
import { AppError, ErrorCode, ErrorSeverity } from "../../shared/error/AppError";
import { Proxy, ProxyTestResult } from "../types/ProxyTypes";
import { IProxyTester } from "../interfaces/ProxyInterfaces";

export class ProxyTester implements IProxyTester {
  private logger: Logger;
  private defaultTestUrl: string = "https://api.ipify.org";
  private testTimeout: number = 10000;

  constructor(testUrl?: string, testTimeout?: number) {
    this.logger = new Logger("ProxyTester");
    if (testUrl) {
      this.defaultTestUrl = testUrl;
    }
    if (testTimeout) {
      this.testTimeout = testTimeout;
    }
  }

  /**
   * Test a single proxy.
   */
  public async testProxy(
    proxy: Proxy,
    testUrl?: string
  ): Promise<ProxyTestResult> {
    const url = testUrl ?? this.defaultTestUrl;
    const startTime = Date.now();

    try {
      this.logger.debug("Testing proxy", { proxyId: proxy.id, url });

      // In a real implementation, would use axios or fetch with proxy
      // Example:
      // const response = await axios.get(url, {
      //   httpAgent: new HttpProxyAgent(`http://${proxy.host}:${proxy.port}`),
      //   httpsAgent: new HttpsProxyAgent(`http://${proxy.host}:${proxy.port}`),
      //   timeout: this.testTimeout
      // });

      // Mock implementation - simulating successful test
      const latency = Math.random() * 300 + 50; // 50-350ms
      await this.sleep(latency);

      const result: ProxyTestResult = {
        proxyId: proxy.id,
        success: true,
        latency: Math.round(latency),
        statusCode: 200,
        timestamp: Date.now(),
      };

      this.logger.debug("Proxy test passed", {
        proxyId: proxy.id,
        latency: result.latency,
      });

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      const result: ProxyTestResult = {
        proxyId: proxy.id,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
        timestamp: Date.now(),
      };

      this.logger.warn("Proxy test failed", {
        proxyId: proxy.id,
        error: result.error,
      });

      return result;
    }
  }

  /**
   * Test multiple proxies in parallel.
   */
  public async testMultiple(proxies: Proxy[]): Promise<ProxyTestResult[]> {
    try {
      this.logger.info("Testing multiple proxies", {
        count: proxies.length,
      });

      const results = await Promise.all(
        proxies.map((proxy) => this.testProxy(proxy))
      );

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      this.logger.info("Proxy testing completed", {
        success: successCount,
        failed: failCount,
        total: proxies.length,
      });

      return results;
    } catch (error) {
      const appError = new AppError(
        "Failed to test proxies",
        ErrorCode.PROXY_VALIDATION_ERROR,
        "ProxyTester",
        ErrorSeverity.MEDIUM
      );
      this.logger.error("Proxy testing error", error as Error);
      throw appError;
    }
  }

  /**
   * Set test URL.
   */
  public setTestUrl(url: string): void {
    this.defaultTestUrl = url;
    this.logger.info("Test URL updated", { url });
  }

  /**
   * Set test timeout.
   */
  public setTestTimeout(ms: number): void {
    this.testTimeout = ms;
    this.logger.info("Test timeout updated", { ms });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
