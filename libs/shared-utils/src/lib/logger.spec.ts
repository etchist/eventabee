import { Logger, LogLevel, logger } from './logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let testLogger: Logger;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    testLogger = new Logger();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-01T10:00:00.000Z'));
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create logger with default INFO level', () => {
      const logger = new Logger();

      logger.info('Info message');
      logger.debug('Debug message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Info message')
      );
    });

    it('should create logger with custom log level', () => {
      const logger = new Logger(LogLevel.DEBUG);

      logger.debug('Debug message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
    });
  });

  describe('log level filtering', () => {
    it('should log ERROR messages at all levels', () => {
      const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];

      levels.forEach((level) => {
        consoleLogSpy.mockClear();
        const logger = new Logger(level);
        logger.error('Error message');

        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('should filter WARN messages based on level', () => {
      const errorLogger = new Logger(LogLevel.ERROR);
      errorLogger.warn('Warn message');
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockClear();

      const warnLogger = new Logger(LogLevel.WARN);
      warnLogger.warn('Warn message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should filter INFO messages based on level', () => {
      const warnLogger = new Logger(LogLevel.WARN);
      warnLogger.info('Info message');
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockClear();

      const infoLogger = new Logger(LogLevel.INFO);
      infoLogger.info('Info message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should filter DEBUG messages based on level', () => {
      const infoLogger = new Logger(LogLevel.INFO);
      infoLogger.debug('Debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockClear();

      const debugLogger = new Logger(LogLevel.DEBUG);
      debugLogger.debug('Debug message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('error method', () => {
    it('should log error message', () => {
      testLogger.error('Error occurred');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.ERROR,
          message: 'Error occurred',
          timestamp: '2023-12-01T10:00:00.000Z',
        })
      );
    });

    it('should log error with metadata', () => {
      const metadata = { errorCode: 'E001', userId: 'user123' };
      testLogger.error('Error with metadata', metadata);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.ERROR,
          message: 'Error with metadata',
          timestamp: '2023-12-01T10:00:00.000Z',
          metadata,
        })
      );
    });
  });

  describe('warn method', () => {
    it('should log warning message', () => {
      testLogger.warn('Warning message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.WARN,
          message: 'Warning message',
          timestamp: '2023-12-01T10:00:00.000Z',
        })
      );
    });

    it('should log warning with metadata', () => {
      const metadata = { threshold: 80, current: 85 };
      testLogger.warn('Threshold exceeded', metadata);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.WARN,
          message: 'Threshold exceeded',
          timestamp: '2023-12-01T10:00:00.000Z',
          metadata,
        })
      );
    });
  });

  describe('info method', () => {
    it('should log info message', () => {
      testLogger.info('Information message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.INFO,
          message: 'Information message',
          timestamp: '2023-12-01T10:00:00.000Z',
        })
      );
    });

    it('should log info with metadata', () => {
      const metadata = { action: 'user_login', userId: 'user456' };
      testLogger.info('User logged in', metadata);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.INFO,
          message: 'User logged in',
          timestamp: '2023-12-01T10:00:00.000Z',
          metadata,
        })
      );
    });
  });

  describe('debug method', () => {
    beforeEach(() => {
      testLogger = new Logger(LogLevel.DEBUG);
    });

    it('should log debug message', () => {
      testLogger.debug('Debug information');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.DEBUG,
          message: 'Debug information',
          timestamp: '2023-12-01T10:00:00.000Z',
        })
      );
    });

    it('should log debug with metadata', () => {
      const metadata = { 
        function: 'processOrder',
        orderId: 'order789',
        step: 'validation',
      };
      testLogger.debug('Processing step', metadata);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.DEBUG,
          message: 'Processing step',
          timestamp: '2023-12-01T10:00:00.000Z',
          metadata,
        })
      );
    });
  });

  describe('setCorrelationId', () => {
    it('should set correlation ID for all subsequent logs', () => {
      testLogger.setCorrelationId('corr-123');
      testLogger.info('First message');
      testLogger.info('Second message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(1,
        JSON.stringify({
          level: LogLevel.INFO,
          message: 'First message',
          timestamp: '2023-12-01T10:00:00.000Z',
          correlationId: 'corr-123',
        })
      );
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2,
        JSON.stringify({
          level: LogLevel.INFO,
          message: 'Second message',
          timestamp: '2023-12-01T10:00:00.000Z',
          correlationId: 'corr-123',
        })
      );
    });

    it('should update correlation ID', () => {
      testLogger.setCorrelationId('corr-123');
      testLogger.info('Message with first ID');

      testLogger.setCorrelationId('corr-456');
      testLogger.info('Message with second ID');

      expect(consoleLogSpy).toHaveBeenNthCalledWith(1,
        expect.stringContaining('"correlationId":"corr-123"')
      );
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2,
        expect.stringContaining('"correlationId":"corr-456"')
      );
    });

    it('should include correlation ID with metadata', () => {
      testLogger.setCorrelationId('corr-789');
      testLogger.info('Message with both', { extra: 'data' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.INFO,
          message: 'Message with both',
          timestamp: '2023-12-01T10:00:00.000Z',
          correlationId: 'corr-789',
          metadata: { extra: 'data' },
        })
      );
    });
  });

  describe('log output format', () => {
    it('should output valid JSON', () => {
      testLogger.info('Test message', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      
      expect(() => JSON.parse(output)).not.toThrow();
      
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('level');
      expect(parsed).toHaveProperty('message');
      expect(parsed).toHaveProperty('timestamp');
    });

    it('should handle complex metadata', () => {
      const complexMetadata = {
        user: {
          id: 'user123',
          name: 'John Doe',
          roles: ['admin', 'user'],
        },
        request: {
          method: 'POST',
          url: '/api/orders',
          headers: {
            'content-type': 'application/json',
          },
        },
        numbers: [1, 2, 3],
        boolean: true,
        nullValue: null,
      };

      testLogger.info('Complex log', complexMetadata);

      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.metadata).toEqual(complexMetadata);
    });

    it('should use ISO timestamp format', () => {
      jest.useRealTimers();
      const before = new Date().toISOString();
      
      testLogger.info('Timestamp test');
      
      const after = new Date().toISOString();

      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
      expect(parsed.timestamp >= before).toBe(true);
      expect(parsed.timestamp <= after).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', () => {
      testLogger.info('');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.INFO,
          message: '',
          timestamp: '2023-12-01T10:00:00.000Z',
        })
      );
    });

    it('should handle undefined metadata', () => {
      testLogger.info('Message', undefined);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.INFO,
          message: 'Message',
          timestamp: '2023-12-01T10:00:00.000Z',
        })
      );
    });

    it('should handle empty metadata object', () => {
      testLogger.info('Message', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          level: LogLevel.INFO,
          message: 'Message',
          timestamp: '2023-12-01T10:00:00.000Z',
          metadata: {},
        })
      );
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Message with "quotes" and \n newlines \t tabs';
      testLogger.info(specialMessage);

      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed.message).toBe(specialMessage);
    });

    it('should handle circular references in metadata', () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;

      // JSON.stringify will throw on circular references
      expect(() => {
        testLogger.info('Circular reference', circular);
      }).toThrow();
    });
  });

  describe('exported logger instance', () => {
    it('should be a Logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should have default INFO level', () => {
      logger.info('Info from default logger');
      logger.debug('Debug from default logger');

      // Only info should be logged
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Info from default logger')
      );
    });

    it('should work with correlation ID', () => {
      logger.setCorrelationId('default-corr-123');
      logger.info('Message from default logger');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"correlationId":"default-corr-123"')
      );
    });
  });

  describe('LogLevel enum', () => {
    it('should have correct numeric values', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(3);
    });

    it('should maintain hierarchical order', () => {
      expect(LogLevel.ERROR).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.DEBUG);
    });
  });
});