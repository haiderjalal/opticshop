type Level = "info" | "warn" | "error";

function log(level: Level, message: string, context?: Record<string, unknown>): void {
  // One JSON line per event so Vercel log search can filter on fields.
  console[level](JSON.stringify({ level, message, ...context, at: new Date().toISOString() }));
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};
