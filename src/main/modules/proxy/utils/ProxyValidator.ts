/**
 * Proxy validation utilities.
 */

import { Proxy } from "../types/ProxyTypes";
import { AppError, ErrorCode, ErrorSeverity } from "../../shared/error/AppError";
import { Logger } from "../../shared/logging/Logger";

export class ProxyValidator {
  private static logger = new Logger("ProxyValidator");

  /**
   * Validate proxy structure.
   */
  public static validate(proxy: any): proxy is Proxy {
    if (!proxy || typeof proxy !== "object") {
      return false;
    }

    if (typeof proxy.id !== "string" || typeof proxy.host !== "string") {
      return false;
    }

    if (typeof proxy.port !== "number" || proxy.port < 1 || proxy.port > 65535) {
      return false;
    }

    if (!["active", "inactive", "failed"].includes(proxy.status)) {
      return false;
    }

    return true;
  }

  /**
   * Validate proxy connection string (host:port).
   */
  public static validateConnectionString(
    connectionString: string
  ): { host: string; port: number } | null {
    try {
      const [host, portStr] = connectionString.split(":");
      const port = parseInt(portStr, 10);

      if (!host || isNaN(port) || port < 1 || port > 65535) {
        return null;
      }

      return { host, port };
    } catch {
      return null;
    }
  }

  /**
   * Validate proxy list from raw data.
   */
  public static validateProxyList(
    data: any[]
  ): Proxy[] {
    return data
      .map((item, index) => {
        try {
          // Support various formats
          let proxy: Partial<Proxy>;

          if (typeof item === "string") {
            const parsed = this.validateConnectionString(item);
            if (!parsed) {
              return null;
            }
            proxy = {
              id: `proxy-${Date.now()}-${index}`,
              host: parsed.host,
              port: parsed.port,
              status: "inactive",
            };
          } else if (typeof item === "object") {
            proxy = item as Partial<Proxy>;
            if (!proxy.id) {
              proxy.id = `proxy-${Date.now()}-${index}`;
            }
          } else {
            return null;
          }

          if (this.validate(proxy as Proxy)) {
            return proxy as Proxy;
          }

          return null;
        } catch (error) {
          ProxyValidator.logger.debug(
            "Failed to validate proxy entry",
            { index, error }
          );
          return null;
        }
      })
      .filter((proxy) => proxy !== null) as Proxy[];
  }

  /**
   * Validate proxy format.
   */
  public static validateFormat(proxy: Proxy): void {
    const errors: string[] = [];

    if (!proxy.id || proxy.id.length === 0) {
      errors.push("Proxy ID is required");
    }

    if (!proxy.host || proxy.host.length === 0) {
      errors.push("Proxy host is required");
    }

    if (proxy.port < 1 || proxy.port > 65535) {
      errors.push("Proxy port must be between 1 and 65535");
    }

    if (proxy.username && proxy.username.length > 255) {
      errors.push("Username too long");
    }

    if (proxy.password && proxy.password.length > 255) {
      errors.push("Password too long");
    }

    if (errors.length > 0) {
      throw new AppError(
        `Invalid proxy format: ${errors.join("; ")}`,
        ErrorCode.PROXY_CONFIG_ERROR,
        "ProxyValidator",
        ErrorSeverity.LOW,
        { proxy, errors }
      );
    }
  }
}
