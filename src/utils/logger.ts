export interface Logger {
  info: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
  error: (message: string, error?: any) => void;
  warn: (message: string, data?: any) => void;
}

export class ConsoleLogger implements Logger {
  private prefix: string;

  constructor(prefix = '[UPI-Payment]') {
    this.prefix = prefix;
  }

  info(message: string, data?: any): void {
    console.log(`${this.prefix} INFO:`, message, data || '');
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${this.prefix} DEBUG:`, message, data || '');
    }
  }

  error(message: string, error?: any): void {
    console.error(`${this.prefix} ERROR:`, message, error || '');
  }

  warn(message: string, data?: any): void {
    console.warn(`${this.prefix} WARN:`, message, data || '');
  }
}

export function createLogger(): Logger {
  return new ConsoleLogger();
}