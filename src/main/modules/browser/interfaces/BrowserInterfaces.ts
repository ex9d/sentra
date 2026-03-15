/**
 * Browser service interfaces.
 */

import {
  BrowserLaunchOptions,
  NavigationConfig,
  FormConfig,
  AutomationResult,
  BrowserState,
} from "../types/BrowserTypes";

export interface IBrowserService {
  launch(options: BrowserLaunchOptions): Promise<void>;
  close(): Promise<void>;
  navigate(config: NavigationConfig): Promise<void>;
  isLaunched(): boolean;
  getState(): BrowserState;
}

export interface IFormAutomationService {
  fillForm(config: FormConfig): Promise<void>;
  submitForm(selector: string): Promise<void>;
  extractFormData(selector: string): Promise<Record<string, any>>;
  waitForFormSubmission(timeout: number): Promise<void>;
}

export interface IBrowserAutomationService {
  launch(options: BrowserLaunchOptions): Promise<void>;
  navigate(config: NavigationConfig): Promise<void>;
  fillForm(config: FormConfig): Promise<void>;
  executeAutomation(
    navigation: NavigationConfig,
    form: FormConfig
  ): Promise<AutomationResult>;
  waitForUserInteraction(timeout: number): Promise<void>;
  screenshot(path?: string): Promise<Buffer>;
  close(): Promise<void>;
  isAutomating(): boolean;
}
