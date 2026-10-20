type LogLevel = "debug" | "info" | "warn" | "error";

const colors: Record<LogLevel, (text: string) => string> = {
  debug: (text) => `\x1b[36m[DEBUG]\x1b[0m ${text}`,
  info: (text) => `\x1b[32m[INFO]\x1b[0m ${text}`,
  warn: (text) => `\x1b[33m[WARN]\x1b[0m ${text}`,
  error: (text) => `\x1b[31m[ERROR]\x1b[0m ${text}`,
};

class Logger {
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} ${colors[level](level.toUpperCase())} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage("debug", message), ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage("info", message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage("warn", message), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage("error", message), ...args);
  }
}

export const logger = new Logger();
