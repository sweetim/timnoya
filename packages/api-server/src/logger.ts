const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const

type LogLevel = keyof typeof LOG_LEVELS

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info"

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatMessage(level: LogLevel, tag: string, message: string): string {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}`
}

function log(
  level: LogLevel,
  tag: string,
  message: string,
  ...args: unknown[]
) {
  if (!shouldLog(level)) return
  const formatted = formatMessage(level, tag, message)
  if (args.length > 0) {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      formatted,
      ...args,
    )
  } else {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      formatted,
    )
  }
}

export function createLogger(tag: string) {
  return {
    debug(message: string, ...args: unknown[]) {
      log("debug", tag, message, ...args)
    },
    info(message: string, ...args: unknown[]) {
      log("info", tag, message, ...args)
    },
    warn(message: string, ...args: unknown[]) {
      log("warn", tag, message, ...args)
    },
    error(message: string, ...args: unknown[]) {
      log("error", tag, message, ...args)
    },
  }
}
