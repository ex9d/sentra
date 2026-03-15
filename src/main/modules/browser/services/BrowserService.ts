/**
 * Browser Service - Manages browser lifecycle.
 * Abstraction layer for Playwright/Puppeteer integration.
 */

import { EventEmitter } from "events";
import { Logger } from "../../shared/logging/Logger";
import { AppError, ErrorCode, ErrorSeverity } from "../../shared/error/AppError";
import {
  BrowserLaunchOptions,
  NavigationConfig,
  BrowserState,
  IBrowserInstance,
} from "../types/BrowserTypes";
import { IBrowserService } from "../interfaces/BrowserInterfaces";

/**
 * Default browser options.
 */
const DEFAULT_BROWSER_OPTIONS: Required<BrowserLaunchOptions> = {
  headless: true,
  timeout: 30000,
  proxy: "",
  userDataDir: "",
  args: [],
};

export class BrowserService extends EventEmitter implements IBrowserService {
  private logger: Logger;
  private browser: IBrowserInstance | null = null;
  private state: BrowserState = {
    isLaunched: false,
    isAutomating: false,
  };
  private options: Required<BrowserLaunchOptions>;

  constructor() {
    super();
    this.logger = new Logger("BrowserService");
    this.options = DEFAULT_BROWSER_OPTIONS;
  }

  /**
   * Launch browser.
   */
  public async launch(options: BrowserLaunchOptions = {}): Promise<void> {
    if (this.state.isLaunched) {
      this.logger.warn("Browser already launched");
      return;
    }

    try {
      this.options = { ...DEFAULT_BROWSER_OPTIONS, ...options };
      this.logger.info("Launching browser", { options: this.options });

      // In a real implementation, this would use Playwright:
      // const browser = await chromium.launch({ headless: this.options.headless });
      // const page = await browser.newPage();
      // this.browser = page;

      // Mock implementation for type safety
      this.browser = {
        goto: async () => {},
        fill: async () => {},
        click: async () => {},
        select: async () => {},
        screenshot: async () => Buffer.alloc(0),
        waitForSelector: async () => {},
        evaluate: async () => null,
        close: async () => {},
      };

      this.state.isLaunched = true;
      this.logger.info("Browser launched successfully");
      this.emit("browserLaunched");
    } catch (error) {
      const appError = new AppError(
        "Failed to launch browser",
        ErrorCode.BROWSER_LAUNCH_ERROR,
        "BrowserService",
        ErrorSeverity.HIGH,
        { error }
      );
      this.logger.error("Browser launch failed", error as Error);
      throw appError;
    }
  }

  /**
   * Navigate to URL.
   */
  public async navigate(config: NavigationConfig): Promise<void> {
    if (!this.state.isLaunched || !this.browser) {
      throw new AppError(
        "Browser not launched",
        ErrorCode.BROWSER_LAUNCH_ERROR,
        "BrowserService",
        ErrorSeverity.MEDIUM
      );
    }

    try {
      const timeout = config.timeout ?? this.options.timeout;

      this.logger.info("Navigating to URL", { url: config.url });

      await this.withTimeout(
        this.browser.goto(config.url, {
          waitUntil: config.waitUntil ?? "load",
        }),
        timeout
      );

      this.state.currentUrl = config.url;
      this.state.lastAction = "navigate";
      this.state.lastActionTime = Date.now();

      this.logger.info("Navigation completed", { url: config.url });
      this.emit("navigationCompleted", config.url);
    } catch (error) {
      const appError = new AppError(
        "Navigation failed",
        ErrorCode.BROWSER_NAVIGATION_ERROR,
        "BrowserService",
        ErrorSeverity.MEDIUM,
        { url: config.url, error }
      );
      this.logger.error("Navigation error", error as Error, {
        url: config.url,
      });
      throw appError;
    }
  }

  /**
   * Close browser.
   */
  public async close(): Promise<void> {
    if (!this.state.isLaunched || !this.browser) {
      return;
    }

    try {
      await this.browser.close();
      this.browser = null;
      this.state.isLaunched = false;
      this.state.currentUrl = undefined;

      this.logger.info("Browser closed");
      this.emit("browserClosed");
    } catch (error) {
      this.logger.error("Error closing browser", error as Error);
      throw error;
    }
  }

  /**
   * Check if browser is launched.
   */
  public isLaunched(): boolean {
    return this.state.isLaunched;
  }

  /**
   * Get browser state.
   */
  public getState(): BrowserState {
    return { ...this.state };
  }

  /**
   * Execute function with timeout.
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race<T>([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new AppError(
                "Operation timeout",
                ErrorCode.BROWSER_TIMEOUT_ERROR,
                "BrowserService"
              )
            ),
          timeout
        )
      ),
    ]);
  }

  /**
   * Get underlying browser instance.
   */
  public getBrowser(): IBrowserInstance | null {
    return this.browser;
  }
}
