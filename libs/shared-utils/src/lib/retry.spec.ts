import { retry, withRetry, RetryError, DEFAULT_RETRY_OPTIONS } from './retry';

describe('retry', () => {
  let originalSetTimeout: typeof setTimeout;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    originalSetTimeout = global.setTimeout;
  });

  afterEach(() => {
    // Ensure setTimeout is restored after each test only if we're not in fake timer mode
    if (!jest.isMockFunction(global.setTimeout)) {
      global.setTimeout = originalSetTimeout;
    }
    jest.restoreAllMocks();
  });

  describe('successful operations', () => {
    it('should return result on first successful attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry if operation succeeds immediately', async () => {
      const operation = jest.fn().mockResolvedValue('immediate success');

      const result = await retry(operation, { maxAttempts: 5 });

      expect(result).toBe('immediate success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry and succeed on second attempt', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success on retry');

      const result = await retry(operation, { baseDelay: 0 }); // No delay for testing

      expect(result).toBe('success on retry');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry and succeed on last attempt', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success on third try');

      const result = await retry(operation, { maxAttempts: 3, baseDelay: 0 });

      expect(result).toBe('success on third try');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('failed operations', () => {
    it('should throw RetryError after max attempts', async () => {
      const error = new Error('Persistent failure');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(retry(operation, { maxAttempts: 3, baseDelay: 0 }))
        .rejects.toThrow(RetryError);

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should include attempt count and last error in RetryError', async () => {
      const lastError = new Error('Final failure');
      const operation = jest.fn().mockRejectedValue(lastError);

      try {
        await retry(operation, { maxAttempts: 2, baseDelay: 0 });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RetryError);
        expect((error as RetryError).message).toBe('Operation failed after 2 attempts: Final failure');
        expect((error as RetryError).attempts).toBe(2);
        expect((error as RetryError).lastError).toBe(lastError);
      }
    });

    it('should throw immediately for non-retryable errors', async () => {
      const nonRetryableError = new Error('DatabaseError');
      nonRetryableError.name = 'DatabaseError';
      const operation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(
        retry(operation, {
          maxAttempts: 3,
          retryableErrors: ['NetworkError'],
          baseDelay: 0,
        })
      ).rejects.toThrow(nonRetryableError);

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry only for specified retryable errors', async () => {
      const retryableError = new Error('Network connection failed');
      const operation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await retry(operation, {
        maxAttempts: 3,
        retryableErrors: ['network'],
        baseDelay: 0,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should check error name for retryable errors', async () => {
      const error = new Error('Some message');
      error.name = 'NetworkError';
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await retry(operation, {
        retryableErrors: ['NetworkError'],
        baseDelay: 0,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should check error message for retryable errors', async () => {
      const error = new Error('Connection timeout occurred');
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await retry(operation, {
        retryableErrors: ['timeout'],
        baseDelay: 0,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('timing and delays', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should wait with exponential backoff between attempts', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const promise = retry(operation, {
        baseDelay: 100,
        backoffFactor: 2,
      });

      // First attempt - immediate
      expect(operation).toHaveBeenCalledTimes(1);

      // Wait for first delay (100ms)
      await jest.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);

      // Wait for second delay (200ms)
      await jest.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');
    });

    it.skip('should respect maxDelay limit', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new Error('Always fails'));

      // Start the retry operation
      const promise = retry(operation, {
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 2000,
        backoffFactor: 10, // Would result in 10000ms delay without limit
      });

      // First attempt - immediate
      expect(operation).toHaveBeenCalledTimes(1);

      // Advance time and check call counts
      await jest.advanceTimersByTimeAsync(1000); // Second attempt after 1000ms
      expect(operation).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(2000); // Third attempt after 2000ms (capped)
      expect(operation).toHaveBeenCalledTimes(3);

      await jest.advanceTimersByTimeAsync(2000); // Fourth attempt after 2000ms (still capped)
      expect(operation).toHaveBeenCalledTimes(4);

      await jest.advanceTimersByTimeAsync(2000); // Fifth attempt after 2000ms
      expect(operation).toHaveBeenCalledTimes(5);

      // Now the promise should reject
      try {
        await promise;
        throw new Error('Promise should have rejected');
      } catch (error) {
        expect(error).toBeInstanceOf(RetryError);
        expect((error as RetryError).attempts).toBe(5);
      }
    });

    it('should calculate delays correctly', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));
      const delays: number[] = [];

      // Mock setTimeout to capture delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any, delay: number) => {
        delays.push(delay);
        // Execute callback immediately
        if (typeof callback === 'function') {
          callback();
        }
        return {} as any;
      });

      try {
        await retry(operation, {
          maxAttempts: 4,
          baseDelay: 100,
          backoffFactor: 3,
          maxDelay: 1000,
        });
      } catch {
        // Expected to fail
      }

      // Restore original setTimeout
      jest.restoreAllMocks();

      expect(delays).toEqual([100, 300, 900]); // 100, 100*3, 100*3*3 (but capped at 1000)
    });
  });

  describe('configuration validation', () => {
    it('should throw error for negative maxAttempts', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(retry(operation, { maxAttempts: -1 }))
        .rejects.toThrow('maxAttempts must be greater than 0');

      expect(operation).toHaveBeenCalledTimes(0);
    });

    it('should throw error for negative baseDelay', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(retry(operation, { baseDelay: -100 }))
        .rejects.toThrow('baseDelay must be non-negative');

      expect(operation).toHaveBeenCalledTimes(0);
    });

    it('should throw error for negative maxDelay', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(retry(operation, { maxDelay: -1000 }))
        .rejects.toThrow('maxDelay must be non-negative');

      expect(operation).toHaveBeenCalledTimes(0);
    });

    it('should throw error for negative backoffFactor', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(retry(operation, { backoffFactor: -2 }))
        .rejects.toThrow('backoffFactor must be non-negative');

      expect(operation).toHaveBeenCalledTimes(0);
    });
  });

  describe('backoff factor edge cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should use constant delay when backoffFactor is 0', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const promise = retry(operation, {
        baseDelay: 100,
        backoffFactor: 0,
      });

      // First attempt - immediate
      expect(operation).toHaveBeenCalledTimes(1);

      // All retries should use the same delay
      await jest.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should use constant delay when backoffFactor is 1', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const promise = retry(operation, {
        baseDelay: 200,
        backoffFactor: 1,
      });

      // First attempt - immediate
      expect(operation).toHaveBeenCalledTimes(1);

      // All retries should use the same delay
      await jest.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should apply jitter to prevent thundering herd', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      const delays: number[] = [];

      // Mock setTimeout to capture delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any, delay: number) => {
        delays.push(delay);
        // Execute callback immediately
        if (typeof callback === 'function') {
          callback();
        }
        return {} as any;
      });

      // Run two retry operations sequentially 
      try {
        await retry(operation, {
          maxAttempts: 2,
          baseDelay: 1000,
          backoffFactor: 2,
          enableJitter: true,
        });
      } catch {
        // Expected to fail
      }

      operation.mockClear();

      try {
        await retry(operation, {
          maxAttempts: 2,
          baseDelay: 1000,
          backoffFactor: 2,
          enableJitter: true,
        });
      } catch {
        // Expected to fail
      }

      // Restore original setTimeout
      jest.restoreAllMocks();

      // Check that delays have jitter
      expect(delays.length).toBe(2); // 1 retry for each operation
      
      // Both delays should be around 1000ms but different due to jitter
      const [delay1, delay2] = delays;
      
      // Check that delays are within expected range (900-1100ms)
      expect(delay1).toBeGreaterThanOrEqual(900);
      expect(delay1).toBeLessThanOrEqual(1100);
      expect(delay2).toBeGreaterThanOrEqual(900);
      expect(delay2).toBeLessThanOrEqual(1100);
      
      // Check that delays are different (jitter applied)
      expect(delay1).not.toBe(delay2);
    });

    it('should not apply jitter when not enabled', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const delays: number[] = [];

      // Mock setTimeout to capture delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any, delay: number) => {
        delays.push(delay);
        // Execute callback immediately
        if (typeof callback === 'function') {
          callback();
        }
        return {} as any;
      });

      await retry(operation, {
        baseDelay: 100,
        backoffFactor: 2,
        enableJitter: false, // Explicitly disabled
      });

      // Restore original setTimeout
      jest.restoreAllMocks();

      // Without jitter, delays should be exact
      expect(delays).toEqual([100, 200]); // 100, 100*2
    });
  });

  describe('RetryError enhancements', () => {
    it('should include detailed error message', async () => {
      const lastError = new Error('Connection timeout');
      const operation = jest.fn().mockRejectedValue(lastError);

      try {
        await retry(operation, { maxAttempts: 2, baseDelay: 0 });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RetryError);
        expect((error as RetryError).message).toContain('Operation failed after 2 attempts');
        expect((error as RetryError).message).toContain('Connection timeout');
      }
    });

    it('should implement toString method', async () => {
      const lastError = new Error('Network error');
      const operation = jest.fn().mockRejectedValue(lastError);

      try {
        await retry(operation, { maxAttempts: 1 });
        fail('Should have thrown');
      } catch (error) {
        const retryError = error as RetryError;
        const errorString = retryError.toString();
        expect(errorString).toContain('RetryError');
        expect(errorString).toContain('Caused by:');
        expect(errorString).toContain('Network error');
      }
    });
  });

  describe('configuration options', () => {
    it('should use default options when none provided', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await retry(operation);

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should merge provided options with defaults', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');

      const result = await retry(operation, {
        maxAttempts: 5, // Override default
        // Other options should use defaults
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect maxAttempts = 1', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));

      await expect(retry(operation, { maxAttempts: 1 }))
        .rejects.toThrow(RetryError);

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle maxAttempts = 0', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(retry(operation, { maxAttempts: 0 }))
        .rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(0);
    });
  });

  describe('edge cases', () => {
    it('should handle operations that throw non-Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      await expect(retry(operation, { maxAttempts: 2 }))
        .rejects.toThrow(RetryError);

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle operations that throw null', async () => {
      const operation = jest.fn().mockRejectedValue(null);

      await expect(retry(operation, { maxAttempts: 2 }))
        .rejects.toThrow(RetryError);

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle operations that throw undefined', async () => {
      const operation = jest.fn().mockRejectedValue(undefined);

      await expect(retry(operation, { maxAttempts: 2 }))
        .rejects.toThrow(RetryError);

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should preserve stack trace of original error', async () => {
      const originalError = new Error('Original error');
      const operation = jest.fn().mockRejectedValue(originalError);

      try {
        await retry(operation, { maxAttempts: 1 });
      } catch (error) {
        expect((error as RetryError).lastError).toBe(originalError);
        expect((error as RetryError).lastError.stack).toBe(originalError.stack);
      }
    });
  });
});

describe('withRetry', () => {
  // Set real timers for these tests
  beforeEach(() => {
    jest.useRealTimers();
  });
  it('should create a retryable version of a function', async () => {
    const originalFn = jest.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue('success');

    const retryableFn = withRetry(originalFn, { baseDelay: 0 });

    const result = await retryableFn();

    expect(result).toBe('success');
    expect(originalFn).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments correctly', async () => {
    const originalFn = jest.fn((a: number, b: string) => Promise.resolve(`${a}-${b}`));

    const retryableFn = withRetry(originalFn, { baseDelay: 0 });

    const result = await retryableFn(42, 'test');

    expect(result).toBe('42-test');
    expect(originalFn).toHaveBeenCalledWith(42, 'test');
  });

  it('should use provided retry options', async () => {
    const originalFn = jest.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockRejectedValueOnce(new Error('Fail 3'))
      .mockResolvedValue('success');

    const retryableFn = withRetry(originalFn, { maxAttempts: 2, baseDelay: 0 });

    await expect(retryableFn()).rejects.toThrow(RetryError);

    expect(originalFn).toHaveBeenCalledTimes(2);
  });

  it('should create independent retry functions', async () => {
    const fn1 = jest.fn().mockResolvedValue('result1');
    const fn2 = jest.fn().mockResolvedValue('result2');

    const retryFn1 = withRetry(fn1, { baseDelay: 0 });
    const retryFn2 = withRetry(fn2, { baseDelay: 0 });

    const [result1, result2] = await Promise.all([
      retryFn1(),
      retryFn2(),
    ]);

    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('should work with async functions', async () => {
    const asyncFn = async (value: string): Promise<string> => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return `async-${value}`;
    };

    const retryableFn = withRetry(asyncFn, { baseDelay: 0 });

    const result = await retryableFn('test');

    expect(result).toBe('async-test');
  });

  it('should preserve function context', async () => {
    class TestClass {
      value = 'test';

      async getValue(): Promise<string> {
        return this.value;
      }
    }

    const instance = new TestClass();
    const retryableGetValue = withRetry(instance.getValue.bind(instance), { baseDelay: 0 });

    const result = await retryableGetValue();

    expect(result).toBe('test');
  });
});

describe('DEFAULT_RETRY_OPTIONS', () => {
  it('should have expected default values', () => {
    expect(DEFAULT_RETRY_OPTIONS).toEqual({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      enableJitter: false,
    });
  });

  it('should be used when no options provided', async () => {
    jest.useFakeTimers();

    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue('success');

    const promise = retry(operation);

    // Should use baseDelay of 1000ms
    await jest.advanceTimersByTimeAsync(999);
    expect(operation).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(operation).toHaveBeenCalledTimes(2);

    await promise;

    jest.useRealTimers();
  });
});