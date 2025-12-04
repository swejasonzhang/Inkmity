type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const formatted = this.formatMessage(level, message, context);
      switch (level) {
        case "error":
          console.error(formatted, context || "");
          break;
        case "warn":
          console.warn(formatted, context || "");
          break;
        case "debug":
          console.debug(formatted, context || "");
          break;
        default:
          console.log(formatted, context || "");
      }
    }

    if (this.isProduction && level === "error") {
      this.sendToErrorTracking(message, context);
    }
  }

  private sendToErrorTracking(message: string, context?: LogContext) {
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureMessage(message, {
        level: "error",
        extra: context,
      });
    }
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext) {
    this.log("error", message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }
}

export const logger = new Logger();
export default logger;











