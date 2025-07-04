export interface QueueOptions {
  maxConcurrent: number;
  timeout: number;
  retryOptions?: {
    maxAttempts: number;
    delay: number;
  };
}

export interface QueueTask<T> {
  id: string;
  data: T;
  priority: number;
  attempts: number;
  createdAt: Date;
  processAfter?: Date;
}

export interface QueueProcessor<T> {
  process(task: QueueTask<T>): Promise<void>;
}

export class MemoryQueue<T> {
  private tasks: QueueTask<T>[] = [];
  private processing = new Set<string>();
  private options: QueueOptions;

  constructor(options: Partial<QueueOptions> = {}) {
    this.options = {
      maxConcurrent: 5,
      timeout: 30000,
      retryOptions: {
        maxAttempts: 3,
        delay: 1000,
      },
      ...options,
    };
  }

  async add(data: T, priority: number = 0): Promise<string> {
    const task: QueueTask<T> = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data,
      priority,
      attempts: 0,
      createdAt: new Date(),
    };

    this.tasks.push(task);
    this.tasks.sort((a, b) => b.priority - a.priority);
    
    return task.id;
  }

  async process(processor: QueueProcessor<T>): Promise<void> {
    while (this.tasks.length > 0 && this.processing.size < this.options.maxConcurrent) {
      const task = this.getNextTask();
      if (!task) break;

      this.processing.add(task.id);
      this.processTask(task, processor).finally(() => {
        this.processing.delete(task.id);
      });
    }
  }

  private getNextTask(): QueueTask<T> | null {
    const now = new Date();
    const index = this.tasks.findIndex(task => 
      !this.processing.has(task.id) && 
      (!task.processAfter || task.processAfter <= now)
    );
    
    if (index === -1) return null;
    
    return this.tasks.splice(index, 1)[0];
  }

  private async processTask(task: QueueTask<T>, processor: QueueProcessor<T>): Promise<void> {
    try {
      task.attempts++;
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), this.options.timeout);
      });

      await Promise.race([
        processor.process(task),
        timeoutPromise,
      ]);
      
    } catch (error) {
      const maxAttempts = this.options.retryOptions?.maxAttempts || 3;
      
      if (task.attempts < maxAttempts) {
        const delay = (this.options.retryOptions?.delay || 1000) * task.attempts;
        task.processAfter = new Date(Date.now() + delay);
        this.tasks.push(task);
        this.tasks.sort((a, b) => b.priority - a.priority);
      }
    }
  }

  getStats(): { pending: number; processing: number } {
    return {
      pending: this.tasks.length,
      processing: this.processing.size,
    };
  }
}