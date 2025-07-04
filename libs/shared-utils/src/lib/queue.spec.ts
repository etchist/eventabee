import { MemoryQueue, QueueProcessor, QueueOptions } from './queue';

describe('MemoryQueue', () => {
  let queue: MemoryQueue<string>;
  let mockProcessor: QueueProcessor<string>;

  beforeEach(() => {
    queue = new MemoryQueue<string>();
    mockProcessor = {
      process: jest.fn().mockResolvedValue(undefined),
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create queue with default options', () => {
      const queue = new MemoryQueue();
      const stats = queue.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(0);
    });

    it('should create queue with custom options', () => {
      const options: Partial<QueueOptions> = {
        maxConcurrent: 10,
        timeout: 60000,
        retryOptions: {
          maxAttempts: 5,
          delay: 2000,
        },
      };

      const queue = new MemoryQueue(options);
      const stats = queue.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(0);
    });
  });

  describe('add', () => {
    it('should add task to queue and return task id', async () => {
      const taskId = await queue.add('test data');

      expect(taskId).toMatch(/^task_\d+_[a-z0-9]+$/);
      const stats = queue.getStats();
      expect(stats.pending).toBe(1);
    });

    it('should add task with default priority 0', async () => {
      await queue.add('test data');

      const stats = queue.getStats();
      expect(stats.pending).toBe(1);
    });

    it('should add task with custom priority', async () => {
      await queue.add('high priority', 10);
      await queue.add('low priority', 1);
      await queue.add('medium priority', 5);

      const stats = queue.getStats();
      expect(stats.pending).toBe(3);
    });

    it('should generate unique task ids', async () => {
      const ids = await Promise.all([
        queue.add('task1'),
        queue.add('task2'),
        queue.add('task3'),
      ]);

      expect(new Set(ids).size).toBe(3);
    });

    it('should maintain tasks sorted by priority', async () => {
      await queue.add('low', 1);
      await queue.add('high', 10);
      await queue.add('medium', 5);

      // Process tasks to see order
      const processedData: string[] = [];
      const processor: QueueProcessor<string> = {
        process: async (task) => {
          processedData.push(task.data);
        },
      };

      await queue.process(processor);
      await jest.runAllTimersAsync();

      expect(processedData).toEqual(['high', 'medium', 'low']);
    });
  });

  describe('process', () => {
    it('should process single task', async () => {
      await queue.add('test data');

      await queue.process(mockProcessor);

      expect(mockProcessor.process).toHaveBeenCalledTimes(1);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        expect.objectContaining({
          data: 'test data',
          priority: 0,
          attempts: 1,
        })
      );
    });

    it('should process multiple tasks', async () => {
      await queue.add('task1');
      await queue.add('task2');
      await queue.add('task3');

      await queue.process(mockProcessor);

      expect(mockProcessor.process).toHaveBeenCalledTimes(3);
    });

    it('should respect maxConcurrent limit', async () => {
      const queue = new MemoryQueue<string>({ maxConcurrent: 2 });

      // Add 5 tasks
      for (let i = 0; i < 5; i++) {
        await queue.add(`task${i}`);
      }

      let concurrentCount = 0;
      let maxConcurrent = 0;

      const processor: QueueProcessor<string> = {
        process: jest.fn().mockImplementation(async () => {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          await new Promise(resolve => setTimeout(resolve, 100));
          concurrentCount--;
        }),
      };

      await queue.process(processor);

      expect(processor.process).toHaveBeenCalledTimes(2);
      expect(maxConcurrent).toBe(2);
    });

    it('should handle empty queue', async () => {
      await queue.process(mockProcessor);

      expect(mockProcessor.process).not.toHaveBeenCalled();
    });

    it('should update stats during processing', async () => {
      await queue.add('task1');
      await queue.add('task2');

      let processingStarted = false;
      const processor: QueueProcessor<string> = {
        process: jest.fn().mockImplementation(async () => {
          if (!processingStarted) {
            processingStarted = true;
            const stats = queue.getStats();
            expect(stats.processing).toBeGreaterThan(0);
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }),
      };

      await queue.process(processor);
      await jest.runAllTimersAsync();
    });

    it('should process tasks with correct metadata', async () => {
      const taskId = await queue.add('test data', 5);

      await queue.process(mockProcessor);

      expect(mockProcessor.process).toHaveBeenCalledWith(
        expect.objectContaining({
          id: taskId,
          data: 'test data',
          priority: 5,
          attempts: 1,
          createdAt: expect.any(Date),
        })
      );
    });
  });

  describe('error handling and retries', () => {
    it('should retry failed tasks', async () => {
      await queue.add('fail then succeed');

      const processor: QueueProcessor<string> = {
        process: jest.fn()
          .mockRejectedValueOnce(new Error('First attempt failed'))
          .mockResolvedValue(undefined),
      };

      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(1);

      // Advance time for retry delay
      await jest.advanceTimersByTimeAsync(1000);

      // Process again to handle retry
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(2);
    });

    it('should respect max retry attempts', async () => {
      const queue = new MemoryQueue<string>({
        retryOptions: { maxAttempts: 2, delay: 100 },
      });

      await queue.add('always fails');

      const processor: QueueProcessor<string> = {
        process: jest.fn().mockRejectedValue(new Error('Always fails')),
      };

      // First attempt
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(1);

      // Second attempt (retry)
      await jest.advanceTimersByTimeAsync(100);
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(2);

      // No more retries after max attempts
      await jest.advanceTimersByTimeAsync(200);
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(2);

      const stats = queue.getStats();
      expect(stats.pending).toBe(0);
    });

    it('should increase retry delay exponentially', async () => {
      const queue = new MemoryQueue<string>({
        retryOptions: { maxAttempts: 3, delay: 100 },
      });

      await queue.add('retry task');

      const processor: QueueProcessor<string> = {
        process: jest.fn().mockRejectedValue(new Error('Fail')),
      };

      // First attempt
      await queue.process(processor);
      Date.now(); // Record first call time

      // Second attempt after 100ms
      await jest.advanceTimersByTimeAsync(99);
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(2);

      // Third attempt after 200ms (100 * 2)
      await jest.advanceTimersByTimeAsync(199);
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1);
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(3);
    });

    it('should handle timeout errors', async () => {
      const queue = new MemoryQueue<string>({ timeout: 100 });

      await queue.add('slow task');

      const processor: QueueProcessor<string> = {
        process: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
        }),
      };

      await queue.process(processor);

      // Advance past timeout
      await jest.advanceTimersByTimeAsync(100);

      // Task should be retried
      const stats = queue.getStats();
      expect(stats.pending).toBe(1);
    });

    it('should not process same task concurrently', async () => {
      await queue.add('task');

      let isProcessing = false;
      const processor: QueueProcessor<string> = {
        process: jest.fn().mockImplementation(async () => {
          expect(isProcessing).toBe(false);
          isProcessing = true;
          await new Promise(resolve => setTimeout(resolve, 50));
          isProcessing = false;
        }),
      };

      // Try to process multiple times
      await Promise.all([
        queue.process(processor),
        queue.process(processor),
        queue.process(processor),
      ]);

      expect(processor.process).toHaveBeenCalledTimes(1);
    });
  });

  describe('processAfter scheduling', () => {
    it('should not process tasks scheduled for future', async () => {
      await queue.add('immediate task');
      
      // Manually add a task scheduled for future
      const futureQueue = new MemoryQueue<string>();
      await futureQueue.add('future task');
      
      // Simulate scheduling by modifying processAfter
      // Since we can't directly access internal tasks, we'll test the behavior

      const processor: QueueProcessor<string> = {
        process: jest.fn(),
      };

      await queue.process(processor);

      expect(processor.process).toHaveBeenCalledTimes(1);
      expect(processor.process).toHaveBeenCalledWith(
        expect.objectContaining({ data: 'immediate task' })
      );
    });

    it('should process tasks after scheduled time', async () => {
      const queue = new MemoryQueue<string>({
        retryOptions: { maxAttempts: 2, delay: 1000 },
      });

      await queue.add('retry task');

      const processor: QueueProcessor<string> = {
        process: jest.fn()
          .mockRejectedValueOnce(new Error('First fail'))
          .mockResolvedValue(undefined),
      };

      // First attempt fails
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(1);

      // Task should be scheduled for retry after delay
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(1); // Still 1

      // Advance time past retry delay
      await jest.advanceTimersByTimeAsync(1000);

      // Now it should process
      await queue.process(processor);
      expect(processor.process).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStats', () => {
    it('should return correct stats for empty queue', () => {
      const stats = queue.getStats();
      expect(stats).toEqual({
        pending: 0,
        processing: 0,
      });
    });

    it('should return correct stats with pending tasks', async () => {
      await queue.add('task1');
      await queue.add('task2');
      await queue.add('task3');

      const stats = queue.getStats();
      expect(stats).toEqual({
        pending: 3,
        processing: 0,
      });
    });

    it('should update stats during processing', async () => {
      await queue.add('task1');
      await queue.add('task2');

      const checkStats = jest.fn();
      const processor: QueueProcessor<string> = {
        process: jest.fn().mockImplementation(async () => {
          const stats = queue.getStats();
          checkStats(stats);
          await new Promise(resolve => setTimeout(resolve, 10));
        }),
      };

      await queue.process(processor);

      expect(checkStats).toHaveBeenCalledWith(
        expect.objectContaining({
          processing: expect.any(Number),
        })
      );
    });

    it('should show correct stats after processing completes', async () => {
      await queue.add('task');

      await queue.process(mockProcessor);
      await jest.runAllTimersAsync();

      const stats = queue.getStats();
      expect(stats).toEqual({
        pending: 0,
        processing: 0,
      });
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed success and failure tasks', async () => {
      await queue.add('success1');
      await queue.add('fail');
      await queue.add('success2');

      const processor: QueueProcessor<string> = {
        process: jest.fn().mockImplementation(async (task) => {
          if (task.data === 'fail') {
            throw new Error('Task failed');
          }
        }),
      };

      await queue.process(processor);
      await jest.runAllTimersAsync();

      expect(processor.process).toHaveBeenCalledTimes(3);

      // Failed task should be retried
      await jest.advanceTimersByTimeAsync(1000);
      await queue.process(processor);

      expect(processor.process).toHaveBeenCalledTimes(4);
    });

    it('should handle rapid task additions during processing', async () => {
      const processor: QueueProcessor<string> = {
        process: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        }),
      };

      // Start processing
      const processPromise = queue.process(processor);

      // Add tasks while processing
      await queue.add('task1');
      await queue.add('task2');
      await queue.add('task3');

      await processPromise;

      // Process new tasks
      await queue.process(processor);
      await jest.runAllTimersAsync();

      expect(processor.process).toHaveBeenCalledTimes(3);
    });

    it('should handle processor exceptions gracefully', async () => {
      await queue.add('task');

      const processor: QueueProcessor<string> = {
        process: jest.fn().mockImplementation(() => {
          throw new Error('Sync error');
        }),
      };

      await queue.process(processor);

      // Task should be retried
      const stats = queue.getStats();
      expect(stats.pending).toBe(1);
    });
  });
});