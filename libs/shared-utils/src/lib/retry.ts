export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors?: string[];
  enableJitter?: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  enableJitter: false, // Jitter is opt-in to maintain backward compatibility
};

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error,
    public readonly operationName?: string
  ) {
    const detailedMessage = operationName
      ? `${message} (operation: ${operationName})`
      : message;
    
    super(detailedMessage);
    this.name = 'RetryError';
    
    // Preserve the stack trace of the last error for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RetryError);
    }
  }
  
  toString(): string {
    return `${this.name}: ${this.message}\nCaused by: ${this.lastError.toString()}`;
  }
}

export async function retry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  
  // Validate configuration
  if (config.maxAttempts <= 0) {
    throw new Error('maxAttempts must be greater than 0');
  }
  
  if (config.baseDelay < 0) {
    throw new Error('baseDelay must be non-negative');
  }
  
  if (config.maxDelay < 0) {
    throw new Error('maxDelay must be non-negative');
  }
  
  if (config.backoffFactor < 0) {
    throw new Error('backoffFactor must be non-negative');
  }
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (config.retryableErrors && config.retryableErrors.length > 0) {
        const errorName = lastError instanceof Error ? lastError.name : '';
        const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
        
        const isRetryable = config.retryableErrors.some(errorType => 
          errorName === errorType || errorMessage.toLowerCase().includes(errorType.toLowerCase())
        );
        
        if (!isRetryable) {
          throw lastError;
        }
      }

      if (attempt === config.maxAttempts) {
        const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
        throw new RetryError(
          `Operation failed after ${config.maxAttempts} attempts: ${errorMessage}`,
          attempt,
          lastError
        );
      }

      let delay: number;
      
      if (config.backoffFactor === 0 || config.backoffFactor === 1) {
        // No exponential backoff
        delay = config.baseDelay;
      } else {
        // Exponential backoff
        const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
        delay = Math.min(exponentialDelay, config.maxDelay);
        
        // Add jitter (±10% of delay) to prevent thundering herd
        // Only add jitter if explicitly enabled via options
        if (config.enableJitter) {
          const jitter = delay * 0.1;
          delay = delay + (Math.random() * 2 - 1) * jitter;
          delay = Math.max(0, delay); // Ensure non-negative
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry failed');
}

export const withRetry = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options?: Partial<RetryOptions>
) => {
  return (...args: T): Promise<R> => retry(() => fn(...args), options);
};