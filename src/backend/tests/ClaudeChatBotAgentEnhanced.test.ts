/**
 * Tests unitaires et d'intégration pour ClaudeChatBotAgentEnhanced
 * Couverture complète des cas d'usage et edge cases
 */

import { ClaudeChatBotAgentEnhanced } from '../agents/ClaudeChatBotAgentEnhanced.js';
import { jest } from '@jest/globals';

// Mock child_process
jest.mock('child_process');
jest.mock('fs/promises');

describe('ClaudeChatBotAgentEnhanced', () => {
  let agent: ClaudeChatBotAgentEnhanced;
  let mockSpawn: jest.MockedFunction<typeof import('child_process').spawn>;
  let mockExec: jest.MockedFunction<typeof import('child_process').exec>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mocks
    mockSpawn = jest.mocked(import('child_process').spawn);
    mockExec = jest.mocked(import('child_process').exec);

    // Create agent instance
    agent = new ClaudeChatBotAgentEnhanced({
      maxRetries: 2,
      baseDelay: 100,
      timeoutMs: 5000
    });
  });

  describe('Circuit Breaker Pattern', () => {
    test('should allow requests when circuit is CLOSED', () => {
      const health = agent.getHealthStatus();
      expect(health.circuitBreaker.state).toBe('CLOSED');
      expect(health.circuitBreaker.failures).toBe(0);
    });

    test('should open circuit after max failures', async () => {
      // Mock spawn to always fail
      mockSpawn.mockImplementation(() => {
        const child = {
          on: jest.fn(),
          stdout: {
            on: jest.fn()
          },
          stderr: {
            on: jest.fn()
          },
          kill: jest.fn()
        } as any;

        // Simulate immediate failure
        setTimeout(() => {
          child.stderr.on.mock.calls[0]?.[1](Buffer.from('error'));
          child.on.mock.calls[0]?.[1](1);
        }, 10);

        return child;
      });

      // Trigger multiple failures
      for (let i = 0; i < 4; i++) {
        try {
          await agent.chat('test message');
        } catch (error) {
          // Expected to fail
        }
        // Wait a bit for failure to be recorded
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const health = agent.getHealthStatus();
      expect(health.circuitBreaker.state).toBe('OPEN');
      expect(health.circuitBreaker.failures).toBeGreaterThanOrEqual(3);
    });

    test('should reset circuit breaker', () => {
      // Manually break the circuit
      (agent as any).circuitBreaker = {
        failures: 5,
        lastFailure: Date.now(),
        state: 'OPEN'
      };

      agent.resetCircuitBreaker();

      const health = agent.getHealthStatus();
      expect(health.circuitBreaker.state).toBe('CLOSED');
      expect(health.circuitBreaker.failures).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting between requests', async () => {
      const startTime = Date.now();

      // Mock spawn to return quickly
      mockSpawn.mockImplementation(() => {
        const child = {
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
          }),
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                setTimeout(() => {
                  callback(Buffer.from('{"result":"test response"}'));
                }, 50);
              }
            })
          },
          stderr: {
            on: jest.fn()
          },
          kill: jest.fn()
        } as any;

        return child;
      });

      // Make two rapid requests
      await agent.chat('first message');
      await agent.chat('second message');

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should take at least rate limit time (100ms default)
      expect(totalTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Retry Logic', () => {
    test('should retry on transient failures', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;

      mockSpawn.mockImplementation(() => {
        const child = {
          on: jest.fn(),
          stdout: {
            on: jest.fn((event, callback) => {
              attemptCount++;
              if (event === 'data') {
                if (attemptCount < maxAttempts) {
                  // Fail first 2 attempts
                  setTimeout(() => callback(Buffer.from('partial')), 50);
                } else {
                  // Success on third attempt
                  setTimeout(() => callback(Buffer.from('{"result":"success"}')), 50);
                }
              }
            })
          },
          stderr: {
            on: jest.fn()
          },
          kill: jest.fn()
        } as any;

        return child;
      });

      const response = await agent.chat('test message');
      expect(response).toBe('success');
      expect(attemptCount).toBe(maxAttempts);
    });

    test('should not retry on non-retryable errors', async () => {
      mockSpawn.mockImplementation(() => {
        const child = {
          on: jest.fn(),
          stdout: {
            on: jest.fn()
          },
          stderr: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback(Buffer.from('unauthorized'));
              }
            })
          },
          kill: jest.fn()
        } as any;

        setTimeout(() => child.on.mock.calls[0]?.[1](1), 10);
        return child;
      });

      await expect(agent.chat('test message')).rejects.toThrow('unauthorized');
    });
  });

  describe('Echo Detection', () => {
    test('should detect echo patterns', () => {
      const testCases = [
        { output: 'peu tu recrie la news', expected: true },
        { output: 'echo "test message"', expected: true },
        { output: '{"result":"actual response"}', expected: false },
        { output: 'This is a normal response', expected: false }
      ];

      testCases.forEach(({ output, expected }) => {
        const isEcho = (agent as any).detectEcho(output, 'test message');
        expect(isEcho).toBe(expected);
      });
    });

    test('should reject echo responses', async () => {
      mockSpawn.mockImplementation(() => {
        const child = {
          on: jest.fn(),
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                // Send echo-like response
                callback(Buffer.from('peu tu recrie la news'));
              }
            })
          },
          stderr: {
            on: jest.fn()
          },
          kill: jest.fn()
        } as any;

        setTimeout(() => child.on.mock.calls[0]?.[1](0), 10);
        return child;
      });

      await expect(agent.chat('test message')).rejects.toThrow();
    });
  });

  describe('Response Parsing', () => {
    test('should parse JSON response correctly', async () => {
      mockSpawn.mockImplementation(() => {
        const child = {
          on: jest.fn(),
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback(Buffer.from('{"result":"parsed content"}'));
              }
            })
          },
          stderr: {
            on: jest.fn()
          },
          kill: jest.fn()
        } as any;

        setTimeout(() => child.on.mock.calls[0]?.[1](0), 10);
        return child;
      });

      const response = await agent.chat('test message');
      expect(response).toBe('parsed content');
    });

    test('should handle malformed JSON gracefully', async () => {
      mockSpawn.mockImplementation(() => {
        const child = {
          on: jest.fn(),
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback(Buffer.from('{"incomplete":json'));
              }
            })
          },
          stderr: {
            on: jest.fn()
          },
          kill: jest.fn()
        } as any;

        setTimeout(() => child.on.mock.calls[0]?.[1](0), 10);
        return child;
      });

      const response = await agent.chat('test message');
      expect(response).toContain('incomplete');
    });

    test('should extract JSON from mixed content', async () => {
      const mixedContent = `Some text before
{"result":"extracted content"}
Some text after`;

      mockSpawn.mockImplementation(() => {
        const child = {
          on: jest.fn(),
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback(Buffer.from(mixedContent));
              }
            })
          },
          stderr: {
            on: jest.fn()
          },
          kill: jest.fn()
        } as any;

        setTimeout(() => child.on.mock.calls[0]?.[1](0), 10);
        return child;
      });

      const response = await agent.chat('test message');
      expect(response).toBe('extracted content');
    });
  });

  describe('Timeout Handling', () => {
    test('should handle timeout correctly', async () => {
      const originalTimeout = 100;
      agent = new ClaudeChatBotAgentEnhanced({ timeoutMs: originalTimeout });

      mockSpawn.mockImplementation(() => {
        const child = {
          on: jest.fn(),
          stdout: {
            on: jest.fn()
          },
          stderr: {
            on: jest.fn()
          },
          kill: jest.fn()
        } as any;

        return child;
      });

      await expect(agent.chat('slow message')).rejects.toThrow('timeout');
    });

    test('should kill process on timeout', async () => {
      const child = {
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn()
      } as any;

      mockSpawn.mockImplementation(() => child);

      try {
        await agent.chat('test message');
      } catch (error) {
        // Expected to timeout
      }

      // Verify kill was called
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('Buffer Overflow Protection', () => {
    test('should reject oversized responses', async () => {
      const maxBuffer = 1024 * 1024 * 10; // 10MB from config
      const oversizedData = 'x'.repeat(maxBuffer + 1);

      mockSpawn.mockImplementation(() => {
        const child = {
          on: jest.fn(),
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback(Buffer.from(oversizedData));
              }
            })
          },
          stderr: { on: jest.fn() },
          kill: jest.fn()
        } as any;

        return child;
      });

      await expect(agent.chat('test message')).rejects.toThrow('Buffer overflow');
    });
  });

  describe('Health Monitoring', () => {
    test('should provide accurate health status', () => {
      const health = agent.getHealthStatus();

      expect(health).toHaveProperty('circuitBreaker');
      expect(health).toHaveProperty('queueLength');
      expect(health).toHaveProperty('config');
      expect(health).toHaveProperty('uptime');

      expect(health.circuitBreaker.state).toBe('CLOSED');
      expect(health.queueLength).toBe(0);
      expect(health.config.timeoutMs).toBe(5000); // From test config
    });
  });

  describe('Configuration Validation', () => {
    test('should use default configuration when none provided', () => {
      const defaultAgent = new ClaudeChatBotAgentEnhanced();
      const health = defaultAgent.getHealthStatus();

      expect(health.config.maxRetries).toBe(3);
      expect(health.config.baseDelay).toBe(1000);
      expect(health.config.timeoutMs).toBe(300000);
    });

    test('should accept custom configuration', () => {
      const customAgent = new ClaudeChatBotAgentEnhanced({
        maxRetries: 5,
        timeoutMs: 60000
      });

      const health = customAgent.getHealthStatus();
      expect(health.config.maxRetries).toBe(5);
      expect(health.config.timeoutMs).toBe(60000);
    });
  });

  describe('Error Classification', () => {
    test('should correctly classify retryable errors', () => {
      const retryableErrors = [
        new Error('network timeout'),
        new Error('connection refused'),
        new Error('temporary failure')
      ];

      retryableErrors.forEach(error => {
        const isNonRetryable = (agent as any).isNonRetryableError(error);
        expect(isNonRetryable).toBe(false);
      });
    });

    test('should correctly classify non-retryable errors', () => {
      const nonRetryableErrors = [
        new Error('rate limit exceeded'),
        new Error('unauthorized access'),
        new Error('forbidden operation')
      ];

      nonRetryableErrors.forEach(error => {
        const isNonRetryable = (agent as any).isNonRetryableError(error);
        expect(isNonRetryable).toBe(true);
      });
    });
  });
});

/**
 * Integration Tests
 */
describe('ClaudeChatBotAgentEnhanced Integration', () => {
  test('should handle end-to-end conversation flow', async () => {
    const agent = new ClaudeChatBotAgentEnhanced({ timeoutMs: 10000 });

    // Mock successful responses
    mockSpawn.mockImplementation(() => {
      const child = {
        on: jest.fn(),
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('{"result":"Hello! How can I help you today?"}'));
            }
          })
        },
        stderr: { on: jest.fn() },
        kill: jest.fn()
      } as any;

      setTimeout(() => child.on.mock.calls[0]?.[1](0), 10);
      return child;
    });

    const response = await agent.chat('Hello');
    expect(response).toBe('Hello! How can I help you today?');
  });

  test('should handle concurrent requests safely', async () => {
    const agent = new ClaudeChatBotAgentEnhanced();
    const promises: Promise<string>[] = [];

    mockSpawn.mockImplementation(() => {
      const child = {
        on: jest.fn(),
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('{"result":"response"}'));
            }
          })
        },
        stderr: { on: jest.fn() },
        kill: jest.fn()
      } as any;

      setTimeout(() => child.on.mock.calls[0]?.[1](0), 10);
      return child;
    });

    // Create 5 concurrent requests
    for (let i = 0; i < 5; i++) {
      promises.push(agent.chat(`message ${i}`));
    }

    const responses = await Promise.all(promises);
    expect(responses).toHaveLength(5);
    expect(responses.every(r => r === 'response')).toBe(true);
  });
});
