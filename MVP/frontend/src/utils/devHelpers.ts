export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const isTest = import.meta.env.MODE === "test";

export function devLog(message: string, ...args: unknown[]) {
  if (isDevelopment) {
    console.log(`[DEV] ${message}`, ...args);
  }
}

export function devWarn(message: string, ...args: unknown[]) {
  if (isDevelopment) {
    console.warn(`[DEV] ${message}`, ...args);
  }
}

export function devError(message: string, ...args: unknown[]) {
  if (isDevelopment) {
    console.error(`[DEV] ${message}`, ...args);
  }
}

export function measurePerformance<T>(
  label: string,
  fn: () => T
): T {
  if (!isDevelopment) return fn();

  const start = performance.now();
  const result = fn();
  const end = performance.now();
  devLog(`Performance [${label}]: ${(end - start).toFixed(2)}ms`);
  return result;
}

export async function measurePerformanceAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isDevelopment) return fn();

  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  devLog(`Performance [${label}]: ${(end - start).toFixed(2)}ms`);
  return result;
}

export function debugComponent(componentName: string) {
  if (!isDevelopment) return;

  return {
    log: (message: string, ...args: unknown[]) => {
      devLog(`[${componentName}] ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      devWarn(`[${componentName}] ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      devError(`[${componentName}] ${message}`, ...args);
    },
  };
}










