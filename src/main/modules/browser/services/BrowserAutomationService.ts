/**
 * Browser Automation Service - Orchestrates browser automation workflows.
 * High-level API for end-to-end automation tasks.
 */

import { EventEmitter } from "events";
import { Logger } from "../../shared/logging/Logger";
import { AppError, ErrorCode, ErrorSeverity } from "../../shared/error/AppError";
import {
  BrowserLaunchOptions,
  NavigationConfig,
  FormConfig,
  AutomationResult,
} from "../types/BrowserTypes";
import {
  IBrowserAutomationService,
} from "../interfaces/BrowserInterfaces";
import { BrowserService } from "./BrowserService";
import { FormAutomationService } from "./FormAutomationService";

export class BrowserAutomationService
  extends EventEmitter
  implements IBrowserAutomationService
{
  private logger: Logger;
  private browserService: BrowserService;
  private formService: FormAutomationService | null = null;
  private _isAutomating: boolean = false;
  private waitingForUserInteraction: boolean = false;

  constructor() {
    super();
    this.logger = new Logger("BrowserAutomationService");
    this.browserService = new BrowserService();
  }

  /**
   * Launch browser.
   */
  public async launch(options: BrowserLaunchOptions = {}): Promise<void> {
    try {
      await this.browserService.launch(options);
      this.logger.info("Browser automation service launched");
      this.emit("launched");
    } catch (error) {
      const appError = new AppError(
        "Failed to launch browser automation",
        ErrorCode.BROWSER_LAUNCH_ERROR,
        "BrowserAutomationService",
        ErrorSeverity.HIGH
      );
      this.logger.error("Launch failed", error as Error);
      throw appError;
    }
  }

  /**
   * Navigate to URL.
   */
  public async navigate(config: NavigationConfig): Promise<void> {
    try {
      await this.browserService.navigate(config);
      this.emit("navigated", { url: config.url });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fill form.
   */
  public async fillForm(config: FormConfig): Promise<void> {
    try {
      const browser = this.browserService.getBrowser();
      if (!browser) {
        throw new AppError(
          "Browser not available",
          ErrorCode.BROWSER_LAUNCH_ERROR,
          "BrowserAutomationService"
        );
      }

      if (!this.formService) {
        this.formService = new FormAutomationService(browser);
      }

      await this.formService.fillForm(config);
      this.emit("formFilled");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute end-to-end automation workflow.
   */
  public async executeAutomation(
    navigation: NavigationConfig,
    form: FormConfig
  ): Promise<AutomationResult> {
    const startTime = Date.now();

    if (this._isAutomating) {
      throw new AppError(
        "Automation already in progress",
        ErrorCode.BROWSER_FORM_ERROR,
        "BrowserAutomationService",
        ErrorSeverity.MEDIUM
      );
    }

    this._isAutomating = true;

    try {
      this.logger.info("Starting automation workflow");

      // Navigate
      await this.navigate(navigation);

      // Fill form
      await this.fillForm(form);

      // Submit if configured
      if (form.submitSelector) {
        const browser = this.browserService.getBrowser();
        if (browser) {
          await browser.click(form.submitSelector);

          if (form.submitTimeout) {
            await this.waitWithTimeout(form.submitTimeout);
          }
        }
      }

      const duration = Date.now() - startTime;

      const result: AutomationResult = {
        success: true,
        url: navigation.url,
        timestamp: Date.now(),
        formsFilled: 1,
        customActionsExecuted: form.customActions?.length ?? 0,
      };

      this.logger.info("Automation completed successfully", {
        duration,
        url: navigation.url,
      });

      this.emit("automationCompleted", result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      const result: AutomationResult = {
        success: false,
        url: navigation.url,
        timestamp: Date.now(),
        error:
          error instanceof Error
            ? error
            : new Error(String(error)),
      };

      this.logger.error("Automation failed", error as Error, {
        duration,
        url: navigation.url,
      });

      this.emit("automationError", result);
      return result;
    } finally {
      this._isAutomating = false;
    }
  }

  /**
   * Wait for manual user interaction.
   */
  public async waitForUserInteraction(timeout: number = 300000): Promise<void> {
    if (this.waitingForUserInteraction) {
      return;
    }

    this.waitingForUserInteraction = true;

    try {
      this.logger.info("Waiting for user interaction", {
        timeoutSeconds: timeout / 1000,
      });

      this.emit("waitingForUserInteraction");

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.waitingForUserInteraction = false;
          reject(
            new AppError(
              "User interaction timeout",
              ErrorCode.BROWSER_TIMEOUT_ERROR,
              "BrowserAutomationService"
            )
          );
        }, timeout);

        // Allow external completion
        this.once("userInteractionComplete", () => {
          clearTimeout(timer);
          this.waitingForUserInteraction = false;
          resolve();
        });
      });

      this.logger.info("User interaction completed");
    } catch (error) {
      this.waitingForUserInteraction = false;
      throw error;
    }
  }

  /**
   * Signal user interaction completion.
   */
  public completeUserInteraction(): void {
    this.emit("userInteractionComplete");
  }

  /**
   * Take screenshot.
   */
  public async screenshot(path?: string): Promise<Buffer> {
    try {
      const browser = this.browserService.getBrowser();
      if (!browser) {
        throw new AppError(
          "Browser not available",
          ErrorCode.BROWSER_LAUNCH_ERROR,
          "BrowserAutomationService"
        );
      }

      const screenshot = await browser.screenshot({ path });
      this.logger.info("Screenshot captured", { path });
      return screenshot;
    } catch (error) {
      this.logger.error("Screenshot failed", error as Error);
      throw error;
    }
  }

  /**
   * Close browser.
   */
  public async close(): Promise<void> {
    try {
      await this.browserService.close();
      this.logger.info("Browser automation service closed");
      this.emit("closed");
    } catch (error) {
      this.logger.error("Close failed", error as Error);
      throw error;
    }
  }

  /**
   * Check if currently automating.
   */
  public isAutomating(): boolean {
    return this._isAutomating;
  }

  private async waitWithTimeout(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory for BrowserAutomationService.
 */
export class BrowserAutomationServiceFactory {
  public static create(): BrowserAutomationService {
    return new BrowserAutomationService();
  }
}
