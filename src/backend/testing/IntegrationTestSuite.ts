/**
 * Suite de tests d'intégration pour ClaudeChatBotAgent
 * Scénarios de test automatisés avec différents cas d'usage
 */

import { ClaudeChatBotAgentEnhanced } from '../agents/ClaudeChatBotAgentEnhanced.js';
import { ClaudeMonitoringService } from '../monitoring/ClaudeMonitoringService.js';

interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  test: (agent: ClaudeChatBotAgentEnhanced, monitor: ClaudeMonitoringService) => Promise<void>;
  teardown?: () => Promise<void>;
  expectedResults?: {
    success: boolean;
    maxLatency?: number;
    maxRetries?: number;
    errorPatterns?: string[];
  };
}

interface TestResult {
  scenario: string;
  success: boolean;
  duration: number;
  latency: number;
  retries: number;
  errors: string[];
  metrics: any;
  error?: Error;
}

export class IntegrationTestSuite {
  private agent: ClaudeChatBotAgentEnhanced;
  private monitor: ClaudeMonitoringService;
  private results: TestResult[] = [];

  constructor(agent?: ClaudeChatBotAgentEnhanced) {
    this.agent = agent || new ClaudeChatBotAgentEnhanced({
      timeoutMs: 10000,
      maxRetries: 3
    });
    this.monitor = new ClaudeMonitoringService(this.agent);
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<{
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
    summary: string;
  }> {
    console.log('🚀 Starting Integration Test Suite...\n');

    const scenarios = this.getTestScenarios();
    this.results = [];

    for (const scenario of scenarios) {
      console.log(`📋 Running: ${scenario.name}`);
      const result = await this.runScenario(scenario);
      this.results.push(result);

      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${scenario.name} - ${result.duration}ms\n`);
    }

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.length - passed;

    const summary = this.generateSummary();

    console.log('📊 Test Results Summary:');
    console.log(summary);

    return {
      total: this.results.length,
      passed,
      failed,
      results: this.results,
      summary
    };
  }

  /**
   * Run a single test scenario
   */
  private async runScenario(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let retries = 0;

    try {
      // Setup
      if (scenario.setup) {
        await scenario.setup();
      }

      // Monitor setup
      const monitorStart = this.monitor.trackRequestStart();

      // Run test with monitoring
      try {
        await scenario.test(this.agent, this.monitor);

        // Track success
        const latency = Date.now() - monitorStart.startTime;
        this.monitor.trackRequestEnd(
          monitorStart.requestId,
          monitorStart.startTime,
          true
        );

        return {
          scenario: scenario.name,
          success: true,
          duration: Date.now() - startTime,
          latency,
          retries,
          errors,
          metrics: this.monitor.getMetricsSnapshot()
        };
      } catch (error) {
        retries++;
        const latency = Date.now() - monitorStart.startTime;
        errors.push(error instanceof Error ? error.message : String(error));

        this.monitor.trackRequestEnd(
          monitorStart.requestId,
          monitorStart.startTime,
          false,
          error as Error
        );

        throw error;
      }
    } catch (error) {
      return {
        scenario: scenario.name,
        success: false,
        duration: Date.now() - startTime,
        latency: 0,
        retries,
        errors,
        metrics: this.monitor.getMetricsSnapshot(),
        error: error as Error
      };
    } finally {
      // Teardown
      if (scenario.teardown) {
        try {
          await scenario.teardown();
        } catch (error) {
          console.warn(`⚠️ Teardown failed for ${scenario.name}:`, error);
        }
      }
    }
  }

  /**
   * Define all test scenarios
   */
  private getTestScenarios(): TestScenario[] {
    return [
      {
        name: 'Basic Chat Flow',
        description: 'Simple conversation flow with successful responses',
        setup: async () => {
          // Mock successful responses
          (this.agent as any).executeClaudeCommand = async (message: string) => {
            return 'Hello! How can I help you?';
          };
        },
        test: async (agent) => {
          const response = await agent.chat('Hello');
          if (!response || response.length < 5) {
            throw new Error('Response too short or empty');
          }
        },
        expectedResults: {
          success: true,
          maxLatency: 5000
        }
      },

      {
        name: 'Retry on Transient Failure',
        description: 'Test retry logic with temporary failures',
        setup: async () => {
          let attempts = 0;
          (this.agent as any).executeClaudeCommand = async (message: string) => {
            attempts++;
            if (attempts < 3) {
              throw new Error('Temporary network error');
            }
            return 'Success after retries';
          };
        },
        test: async (agent) => {
          const response = await agent.chat('Test retry');
          if (response !== 'Success after retries') {
            throw new Error('Retry logic failed');
          }
        },
        expectedResults: {
          success: true,
          maxRetries: 3
        }
      },

      {
        name: 'Circuit Breaker Integration',
        description: 'Test circuit breaker behavior under load',
        setup: async () => {
          // Force circuit breaker to open
          (this.agent as any).circuitBreaker = {
            failures: 0,
            lastFailure: 0,
            state: 'CLOSED'
          };
        },
        test: async (agent) => {
          // Simulate failures to trigger circuit breaker
          for (let i = 0; i < 4; i++) {
            try {
              await agent.chat('Test message');
            } catch (error) {
              // Expected to fail
            }
          }

          // Verify circuit breaker state
          const health = agent.getHealthStatus();
          if (health.circuitBreaker.state !== 'OPEN') {
            throw new Error('Circuit breaker did not open as expected');
          }
        }
      },

      {
        name: 'Rate Limiting Enforcement',
        description: 'Test rate limiting between rapid requests',
        setup: async () => {
          let requestCount = 0;
          (this.agent as any).executeClaudeCommand = async (message: string) => {
            requestCount++;
            return `Response ${requestCount}`;
          };
        },
        test: async (agent) => {
          const promises: Promise<string>[] = [];

          // Send 5 rapid requests
          for (let i = 0; i < 5; i++) {
            promises.push(agent.chat(`Message ${i}`));
          }

          const responses = await Promise.all(promises);

          if (responses.length !== 5) {
            throw new Error('Not all requests completed');
          }
        }
      },

      {
        name: 'Echo Detection',
        description: 'Test echo detection and rejection',
        setup: async () => {
          (this.agent as any).executeClaudeCommand = async (message: string) => {
            // Simulate echo response
            return message; // Echo back
          };
        },
        test: async (agent) => {
          try {
            await agent.chat('peu tu recrie la news');
            throw new Error('Echo was not rejected');
          } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('echo')) {
              throw error;
            }
            // Expected to fail with echo detection
          }
        }
      },

      {
        name: 'Timeout Handling',
        description: 'Test timeout behavior',
        setup: async () => {
          (this.agent as any).executeClaudeCommand = async (message: string) => {
            // Simulate slow response
            await new Promise(resolve => setTimeout(resolve, 2000));
            return 'Late response';
          };
        },
        test: async (agent) => {
          // Set short timeout
          const shortTimeoutAgent = new ClaudeChatBotAgentEnhanced({
            timeoutMs: 500
          });

          try {
            await shortTimeoutAgent.chat('Test timeout');
            throw new Error('Request should have timed out');
          } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('timeout')) {
              throw error;
            }
            // Expected to timeout
          }
        }
      },

      {
        name: 'Concurrent Request Handling',
        description: 'Test handling of multiple concurrent requests',
        setup: async () => {
          let requestCount = 0;
          (this.agent as any).executeClaudeCommand = async (message: string) => {
            requestCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
            return `Response ${requestCount}`;
          };
        },
        test: async (agent) => {
          const promises: Promise<string>[] = [];

          // Send 10 concurrent requests
          for (let i = 0; i < 10; i++) {
            promises.push(agent.chat(`Concurrent message ${i}`));
          }

          const responses = await Promise.all(promises);

          if (responses.length !== 10) {
            throw new Error('Not all concurrent requests completed');
          }

          // Verify no request ID conflicts
          const uniqueResponses = new Set(responses);
          if (uniqueResponses.size !== 10) {
            throw new Error('Duplicate responses detected');
          }
        }
      },

      {
        name: 'Malformed Response Handling',
        description: 'Test handling of malformed JSON responses',
        setup: async () => {
          (this.agent as any).executeClaudeCommand = async (message: string) => {
            return '{ "incomplete": json';
          };
        },
        test: async (agent) => {
          const response = await agent.chat('Test malformed');
          if (!response || response.length === 0) {
            throw new Error('Malformed response not handled');
          }
        }
      },

      {
        name: 'Large Response Handling',
        description: 'Test handling of large responses',
        setup: async () => {
          (this.agent as any).executeClaudeCommand = async (message: string) => {
            return 'x'.repeat(100000); // 100KB response
          };
        },
        test: async (agent) => {
          const response = await agent.chat('Test large response');
          if (response.length !== 100000) {
            throw new Error('Large response not handled correctly');
          }
        }
      },

      {
        name: 'Monitoring and Metrics',
        description: 'Test monitoring service integration',
        setup: async () => {
          (this.agent as any).executeClaudeCommand = async (message: string) => {
            return 'Monitored response';
          };
        },
        test: async (agent, monitor) => {
          // Make some requests
          await agent.chat('Message 1');
          await agent.chat('Message 2');

          // Check metrics
          const metrics = monitor.getMetricsSnapshot();
          if (metrics.requests.total !== 2) {
            throw new Error('Metrics not tracking correctly');
          }

          // Check health report
          const health = monitor.generateHealthReport();
          if (health.status !== 'HEALTHY') {
            throw new Error('Health check failed');
          }
        }
      },

      {
        name: 'Error Classification',
        description: 'Test error classification and handling',
        setup: async () => {
          const errorTypes = [
            'network timeout',
            'connection refused',
            'unauthorized access',
            'forbidden operation'
          ];

          let errorIndex = 0;
          (this.agent as any).executeClaudeCommand = async (message: string) => {
            throw new Error(errorTypes[errorIndex++ % errorTypes.length]);
          };
        },
        test: async (agent) => {
          // Test retryable vs non-retryable errors
          try {
            await agent.chat('Test error 1');
          } catch (error) {
            // Expected to retry
          }

          try {
            await agent.chat('Test error 2');
          } catch (error) {
            // Expected to fail immediately
          }
        }
      }
    ];
  }

  /**
   * Generate test summary report
   */
  private generateSummary(): string {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
    const avgLatency = this.results
      .filter(r => r.latency > 0)
      .reduce((sum, r) => sum + r.latency, 0) / Math.max(1, this.results.filter(r => r.latency > 0).length);

    let summary = '\n';
    summary += '='.repeat(60) + '\n';
    summary += 'INTEGRATION TEST SUITE RESULTS\n';
    summary += '='.repeat(60) + '\n\n';
    summary += `Total Tests: ${total}\n`;
    summary += `Passed: ${passed} ✅\n`;
    summary += `Failed: ${failed} ❌\n`;
    summary += `Success Rate: ${((passed / total) * 100).toFixed(1)}%\n\n`;
    summary += `Average Duration: ${avgDuration.toFixed(2)}ms\n`;
    summary += `Average Latency: ${avgLatency.toFixed(2)}ms\n\n`;

    if (failed > 0) {
      summary += 'Failed Tests:\n';
      summary += '-'.repeat(40) + '\n';
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          summary += `❌ ${r.scenario}\n`;
          summary += `   Error: ${r.error?.message || 'Unknown'}\n`;
          summary += `   Duration: ${r.duration}ms\n\n`;
        });
    }

    summary += '='.repeat(60) + '\n';

    return summary;
  }

  /**
   * Run specific test scenario
   */
  async runSingleTest(scenarioName: string): Promise<TestResult> {
    const scenarios = this.getTestScenarios();
    const scenario = scenarios.find(s => s.name === scenarioName);

    if (!scenario) {
      throw new Error(`Test scenario not found: ${scenarioName}`);
    }

    console.log(`📋 Running single test: ${scenarioName}`);
    const result = await this.runScenario(scenario);

    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${scenarioName} - ${result.duration}ms`);

    return result;
  }

  /**
   * Get test results
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Export results as JSON
   */
  exportResults(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length
      },
      results: this.results
    }, null, 2);
  }
}
