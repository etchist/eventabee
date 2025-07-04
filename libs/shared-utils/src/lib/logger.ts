export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private level: LogLevel;
  private correlationId?: string;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (level <= this.level) {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        correlationId: this.correlationId,
        metadata,
      };

      console.log(JSON.stringify(entry));
    }
  }
}

export const logger = new Logger();