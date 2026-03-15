/**
 * Form Automation Service - Handles form filling and submission.
 */

import { EventEmitter } from "events";
import { Logger } from "../../shared/logging/Logger";
import { AppError, ErrorCode, ErrorSeverity } from "../../shared/error/AppError";
import { FormConfig, FormField, IBrowserInstance } from "../types/BrowserTypes";
import { IFormAutomationService } from "../interfaces/BrowserInterfaces";

export class FormAutomationService
  extends EventEmitter
  implements IFormAutomationService
{
  private logger: Logger;
  private browser: IBrowserInstance | null = null;

  constructor(browser: IBrowserInstance) {
    super();
    this.logger = new Logger("FormAutomationService");
    this.browser = browser;
  }

  /**
   * Fill form with provided configuration.
   */
  public async fillForm(config: FormConfig): Promise<void> {
    if (!this.browser) {
      throw new AppError(
        "Browser instance not available",
        ErrorCode.BROWSER_FORM_ERROR,
        "FormAutomationService"
      );
    }

    try {
      this.logger.info("Starting form fill", {
        fieldCount: config.fields.length,
      });

      for (const field of config.fields) {
        await this.fillField(field);
      }

      // Execute custom actions
      if (config.customActions) {
        for (const customAction of config.customActions) {
          try {
            this.logger.info("Executing custom action", {
              action: customAction.name,
            });
            await customAction.action(this.browser);
          } catch (error) {
            this.logger.error(
              "Custom action failed",
              error as Error,
              { action: customAction.name }
            );
            throw new AppError(
              `Custom action failed: ${customAction.name}`,
              ErrorCode.BROWSER_FORM_ERROR,
              "FormAutomationService",
              ErrorSeverity.MEDIUM,
              { action: customAction.name }
            );
          }
        }
      }

      this.logger.info("Form fill completed");
      this.emit("formFilled", { fields: config.fields.length });
    } catch (error) {
      const appError = new AppError(
        "Form fill failed",
        ErrorCode.BROWSER_FORM_ERROR,
        "FormAutomationService",
        ErrorSeverity.MEDIUM,
        { error }
      );
      this.logger.error("Form fill error", error as Error);
      throw appError;
    }
  }

  /**
   * Submit form.
   */
  public async submitForm(selector: string): Promise<void> {
    if (!this.browser) {
      throw new AppError(
        "Browser instance not available",
        ErrorCode.BROWSER_FORM_ERROR,
        "FormAutomationService"
      );
    }

    try {
      this.logger.info("Submitting form", { selector });
      await this.browser.click(selector);
      this.logger.info("Form submitted");
      this.emit("formSubmitted");
    } catch (error) {
      const appError = new AppError(
        "Form submission failed",
        ErrorCode.BROWSER_FORM_ERROR,
        "FormAutomationService",
        ErrorSeverity.MEDIUM,
        { selector }
      );
      this.logger.error("Form submission error", error as Error);
      throw appError;
    }
  }

  /**
   * Extract form data.
   */
  public async extractFormData(
    selector: string
  ): Promise<Record<string, any>> {
    if (!this.browser) {
      throw new AppError(
        "Browser instance not available",
        ErrorCode.BROWSER_FORM_ERROR,
        "FormAutomationService"
      );
    }

    try {
      const data = await this.browser.evaluate((formSelector: string) => {
        const form = document.querySelector(formSelector);
        if (!form) {
          return {};
        }

        const result: Record<string, any> = {};
        const inputs = form.querySelectorAll(
          "input, textarea, select"
        );

        inputs.forEach((input: any) => {
          const name = input.name || input.id;
          if (name) {
            if (
              input.type === "checkbox" ||
              input.type === "radio"
            ) {
              result[name] = input.checked;
            } else {
              result[name] = input.value;
            }
          }
        });

        return result;
      }, selector);

      this.logger.info("Form data extracted", { selector });
      return data;
    } catch (error) {
      const appError = new AppError(
        "Failed to extract form data",
        ErrorCode.BROWSER_FORM_ERROR,
        "FormAutomationService",
        ErrorSeverity.MEDIUM,
        { selector }
      );
      this.logger.error("Form data extraction error", error as Error);
      throw appError;
    }
  }

  /**
   * Wait for form submission (page navigation or success indicator).
   */
  public async waitForFormSubmission(timeout: number = 30000): Promise<void> {
    if (!this.browser) {
      throw new AppError(
        "Browser instance not available",
        ErrorCode.BROWSER_FORM_ERROR,
        "FormAutomationService"
      );
    }

    try {
      this.logger.info("Waiting for form submission");

      await this.withTimeout(
        this.browser.waitForSelector(".success, [data-success], .loading"),
        timeout
      );

      this.logger.info("Form submission detected");
      this.emit("formSubmissionDetected");
    } catch (error) {
      const appError = new AppError(
        "Timeout waiting for form submission",
        ErrorCode.BROWSER_TIMEOUT_ERROR,
        "FormAutomationService"
      );
      this.logger.error("Form submission wait timeout");
      throw appError;
    }
  }

  /**
   * Fill individual field.
   */
  private async fillField(field: FormField): Promise<void> {
    if (!this.browser) {
      return;
    }

    try {
      this.logger.debug("Filling field", {
        selector: field.selector,
        type: field.type,
      });

      // Wait for field visibility if configured
      if (field.waitForVisible) {
        await this.browser.waitForSelector(field.selector, {
          timeout: 10000,
        });
      }

      if (field.clearFirst) {
        await this.browser.evaluate((selector: string) => {
          const el = document.querySelector(selector) as HTMLInputElement;
          if (el) {
            el.value = "";
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }, field.selector);
      }

      switch (field.type) {
        case "text":
        case "email":
        case "password":
        case "number":
          if (field.value !== undefined) {
            await this.browser.fill(field.selector, String(field.value));
          }
          break;

        case "select":
          if (field.value !== undefined) {
            await this.browser.select(field.selector, String(field.value));
          }
          break;

        case "checkbox":
        case "radio":
          if (field.value === "true" || field.value === true) {
            await this.browser.click(field.selector);
          }
          break;

        case "custom":
          // Custom handling defined in form config
          break;

        default:
          this.logger.warn("Unknown field type", { type: field.type });
      }

      this.emit("fieldFilled", { selector: field.selector });
    } catch (error) {
      this.logger.error("Failed to fill field", error as Error, {
        selector: field.selector,
      });

      throw new AppError(
        `Failed to fill field: ${field.selector}`,
        ErrorCode.BROWSER_FORM_ERROR,
        "FormAutomationService",
        ErrorSeverity.MEDIUM,
        { selector: field.selector }
      );
    }
  }

  /**
   * Execute with timeout.
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race<T>([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => {
          reject(
            new AppError(
              "Operation timeout",
              ErrorCode.BROWSER_TIMEOUT_ERROR,
              "FormAutomationService"
            )
          );
        }, timeout)
      ),
    ]);
  }
}
