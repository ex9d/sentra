/**
 * Browser automation types.
 * Defines browser-related structures and contracts.
 */

/**
 * Browser launch options.
 */
export interface BrowserLaunchOptions {
  headless?: boolean;
  timeout?: number;
  proxy?: string;
  userDataDir?: string;
  args?: string[];
}

/**
 * Form field configuration for automation.
 */
export interface FormField {
  selector: string;
  value?: string | boolean | number;
  type: "text" | "email" | "password" | "number" | "select" | "checkbox" | "radio" | "file" | "custom";
  waitForVisible?: boolean;
  clearFirst?: boolean;
  action?: "fill" | "select" | "click" | "custom";
}

/**
 * Form configuration for automation.
 */
export interface FormConfig {
  formSelector?: string;
  fields: FormField[];
  submitSelector?: string;
  submitTimeout?: number;
  waitForNavigation?: boolean;
  waitForSelector?: string;
  customActions?: Array<{
    name: string;
    action: (browser: any) => Promise<void>;
  }>;
}

/**
 * Navigation configuration.
 */
export interface NavigationConfig {
  url: string;
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
}

/**
 * Browser automation result.
 */
export interface AutomationResult {
  success: boolean;
  url: string;
  timestamp: number;
  formsFilled?: number;
  customActionsExecuted?: number;
  screenshot?: string;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * Browser state.
 */
export interface BrowserState {
  isLaunched: boolean;
  currentUrl?: string;
  isAutomating: boolean;
  lastAction?: string;
  lastActionTime?: number;
}

/**
 * Browser instance wrapper type.
 */
export interface IBrowserInstance {
  goto(url: string, options?: any): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  select(selector: string, value: string): Promise<void>;
  screenshot(options?: any): Promise<Buffer>;
  waitForSelector(selector: string, options?: any): Promise<void>;
  evaluate(pageFunction: Function, ...args: any[]): Promise<any>;
  close(): Promise<void>;
}

/**
 * Browser service options.
 */
export type BrowserType = "chromium" | "firefox" | "webkit";

export interface BrowserServiceOptions {
  browserType: BrowserType;
  headless: boolean;
  timeout: number;
  viewport?: { width: number; height: number };
}
