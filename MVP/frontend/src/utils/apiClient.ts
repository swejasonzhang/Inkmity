import { logger } from "./logger";
import { performanceMonitor } from "./performance";
import { env } from "./env";

export interface ApiClientConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryableStatuses?: number[];
}

const DEFAULT_CONFIG: Required<ApiClientConfig> = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: any, retryableStatuses: number[]): boolean {
  if (!error) return false;
  if (error.name === "AbortError") return true;
  if (error.status && retryableStatuses.includes(error.status)) return true;
  if (error.message?.includes("network") || error.message?.includes("fetch")) return true;
  return false;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  config: Required<ApiClientConfig>
): Promise<Response> {
  const { retries, retryDelay, retryableStatuses, timeout } = config;
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeoutSignal = createTimeoutSignal(timeout);
      const combinedSignal = AbortSignal.any([timeoutSignal, init.signal || new AbortController().signal]);

      const response = await fetch(url, {
        ...init,
        signal: combinedSignal,
      });

      if (!response.ok && attempt < retries) {
        const error: any = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        if (isRetryableError(error, retryableStatuses)) {
          lastError = error;
          await sleep(retryDelay * (attempt + 1));
          continue;
        }
      }

      return response;
    } catch (error: any) {
      lastError = error;

      if (attempt < retries && isRetryableError(error, retryableStatuses)) {
        logger.warn(`API request failed, retrying... (attempt ${attempt + 1}/${retries})`, {
          url,
          error: error.message,
        });
        await sleep(retryDelay * (attempt + 1));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

export async function enhancedApiRequest<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string,
  config?: ApiClientConfig
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const url = buildUrl(path);
  const perfMark = performanceMonitor.mark(`api-${init.method || "GET"}-${path}`);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const response = await fetchWithRetry(
      url,
      {
        ...init,
        headers,
        credentials: "include",
      },
      finalConfig
    );

    const text = await response.text().catch(() => "");
    const contentType = response.headers.get("content-type") || "";
    const requestId = response.headers.get("x-request-id") || undefined;

    if (!response.ok) {
      const body = contentType.includes("application/json") ? safeParse(text) : undefined;
      const message =
        (body as any)?.message ||
        (body as any)?.error ||
        response.statusText ||
        "Request failed";

      const error: any = new Error(message);
      error.status = response.status;
      error.body = body;
      error.url = url;
      error.requestId = requestId;

      logger.error("API request failed", {
        url,
        status: response.status,
        message,
        requestId,
      });

      throw error;
    }

    perfMark?.end();

    if (contentType.includes("application/json")) {
      return (text ? safeParse(text) : {}) as T;
    }

    return text as unknown as T;
  } catch (error: any) {
    perfMark?.end();

    if (error.name === "AbortError") {
      logger.error("API request timeout", { url, timeout: finalConfig.timeout });
      throw new Error(`Request timeout after ${finalConfig.timeout}ms`);
    }

    logger.error("API request error", {
      url,
      error: error.message,
      status: error.status,
    });

    throw error;
  }
}

function buildUrl(path: string, params?: Record<string, any>): string {
  const base = env.apiUrl.replace(/\/+$/, "");
  const url = path.startsWith("http")
    ? path.replace(/\/+$/, "")
    : `${base}/${path.replace(/^\/+/, "")}`;

  if (!params || !Object.keys(params).length) return url;

  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
      )
    )
  ).toString();

  return qs ? `${url}?${qs}` : url;
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

export function isAbortError(
  e: unknown
): e is DOMException & { name: "AbortError" } {
  return !!e && typeof e === "object" && (e as any).name === "AbortError";
}





