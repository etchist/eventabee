export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors?: string[];
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};

export class RetryError extends Error {
  constructor(message: string, public readonly attempts: number, public readonly lastError: Error) {
    super(message);
    this.name = 'RetryError';
  }
}

export async function retry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxAttempts) {
        throw new RetryError(
          `Operation failed after ${config.maxAttempts} attempts`,
          attempt,
          lastError
        );
      }

      if (config.retryableErrors && config.retryableErrors.length > 0) {
        const isRetryable = config.retryableErrors.some(errorType => 
          lastError.name === errorType || lastError.message.includes(errorType)
        );
        
        if (!isRetryable) {
          throw lastError;
        }
      }

      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export const withRetry = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options?: Partial<RetryOptions>
) => {
  return (...args: T): Promise<R> => retry(() => fn(...args), options);
};