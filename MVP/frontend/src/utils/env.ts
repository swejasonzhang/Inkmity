const REQUIRED_ENV_VARS = [
  "VITE_CLERK_PUBLISHABLE_KEY",
] as const;

const OPTIONAL_ENV_VARS = [
  "VITE_API_URL",
  "VITE_SOCKET_URL",
  "VITE_SOCKET_PATH",
] as const;

type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number];
type OptionalEnvVar = typeof OPTIONAL_ENV_VARS[number];

interface EnvConfig {
  clerkPublishableKey: string;
  apiUrl: string;
  socketUrl: string;
  socketPath: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || (import.meta as any)?.env?.[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue || "";
}

function validateEnv(): EnvConfig {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = import.meta.env[key] || (import.meta as any)?.env?.[key];
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      `Please check your .env file or environment configuration.`
    );
    console.error(error.message);
    throw error;
  }

  return {
    clerkPublishableKey: getEnvVar("VITE_CLERK_PUBLISHABLE_KEY"),
    apiUrl: getEnvVar("VITE_API_URL", "http://localhost:5005"),
    socketUrl: getEnvVar("VITE_SOCKET_URL", "http://localhost:5005"),
    socketPath: getEnvVar("VITE_SOCKET_PATH", "/socket.io"),
  };
}

export const env = validateEnv();
export { REQUIRED_ENV_VARS, OPTIONAL_ENV_VARS };
export type { EnvConfig, RequiredEnvVar, OptionalEnvVar };
