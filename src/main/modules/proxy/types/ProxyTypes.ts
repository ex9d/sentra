/**
 * Proxy system types.
 * Defines proxy data structures and contracts.
 */

/**
 * Proxy definition.
 */
export interface Proxy {
  id: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol?: "http" | "https" | "socks5";
  status: "active" | "inactive" | "failed";
  latency?: number;
  lastChecked?: number;
  failureCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Proxy test result.
 */
export interface ProxyTestResult {
  proxyId: string;
  success: boolean;
  latency?: number;
  statusCode?: number;
  error?: string;
  timestamp: number;
}

/**
 * Proxy rotation strategy.
 */
export type RotationStrategy = "round-robin" | "random" | "fastest" | "weighted";

/**
 * Proxy pool configuration.
 */
export interface ProxyPoolConfig {
  rotationStrategy: RotationStrategy;
  healthCheckInterval?: number;
  maxFailures?: number;
  testUrl?: string;
  testTimeout?: number;
  autoRemoveInactive?: boolean;
}

/**
 * Proxy pool state.
 */
export interface ProxyPoolState {
  totalProxies: number;
  activeProxies: number;
  inactiveProxies: number;
  failedProxies: number;
  lastUpdated: number;
}

/**
 * Proxy session assignment.
 */
export interface ProxySession {
  sessionId: string;
  assignedProxy: Proxy;
  startTime: number;
  requestCount: number;
  lastUsed: number;
}
