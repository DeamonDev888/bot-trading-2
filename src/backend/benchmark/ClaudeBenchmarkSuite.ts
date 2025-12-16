/**
 * Suite de benchmarks pour ClaudeChatBotAgent
 * Tests de performance avec différentes configurations et charges
 */

import { ClaudeChatBotAgentEnhanced } from '../agents/ClaudeChatBotAgentEnhanced.js';
import { ClaudeAgentConfigManager, ConfigProfiles } from '../config/ClaudeAgentConfig.js';

interface BenchmarkConfig {
  name: string;
  agentConfig: any;
  testParams: {
    concurrentRequests: number;
    totalRequests: number;
    requestInterval: number; // ms between requests
    messageLength: 'short' | 'medium' | 'long';
    expectedLatency?: number;
    timeoutMs?: number;
  };
}

interface BenchmarkResult {
  configName: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  throughput: number; // requests per second
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: Map<string, number>;
  retries: number;
  circuitBreakerTrips: number;
  resourceUsage: {
    cpu: number[];
    memory: number[];
  };
  score: number; // composite score
}

interface PerformanceMetrics {
  latency: number[];
  throughput: number[];
  errorRate: number;
  cpuUsage: number[];
  memoryUsage: number[];
}

export class ClaudeBenchmarkSuite {
  private results: BenchmarkResult[] = [];

  /**
   * Run benchmark suite with different configurations
   */
  async runBenchmarkSuite(): Promise<{
    results: BenchmarkResult[];
    bestConfig: BenchmarkResult;
    comparison: string;
  }> {
    console.log('🚀 Starting ClaudeChatBotAgent Benchmark Suite...\n');

    const benchmarkConfigs = this.getBenchmarkConfigs();

    for (const config of benchmarkConfigs) {
      console.log(`📊 Running benchmark: ${config.name}`);
      const result = await this.runSingleBenchmark(config);
      this.results.push(result);

      const throughput = result.throughput.toFixed(2);
      const latency = result.latency.avg.toFixed(2);
      console.log(`✅ ${config.name} - Throughput: ${throughput} req/s, Latency: ${latency}ms\n`);
    }

    // Find best configuration
    const bestConfig = this.results.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    const comparison = this.generateComparisonReport();

    console.log('📈 Benchmark Results:');
    console.log(comparison);

    return {
      results: this.results,
      bestConfig,
      comparison
    };
  }

  /**
   * Define benchmark configurations
   */
  private getBenchmarkConfigs(): BenchmarkConfig[] {
    return [
      {
        name: 'Development Profile',
        agentConfig: ConfigProfiles.development,
        testParams: {
          concurrentRequests: 5,
          totalRequests: 100,
          requestInterval: 100,
          messageLength: 'medium'
        }
      },
      {
        name: 'Production Profile',
        agentConfig: ConfigProfiles.production,
        testParams: {
          concurrentRequests: 10,
          totalRequests: 500,
          requestInterval: 50,
          messageLength: 'medium'
        }
      },
      {
        name: 'High Throughput',
        agentConfig: {
          ...ConfigProfiles.production,
          rateLimitMs: 10,
          maxConcurrentRequests: 20,
          timeoutMs: 10000
        },
        testParams: {
          concurrentRequests: 20,
          totalRequests: 1000,
          requestInterval: 10,
          messageLength: 'short'
        }
      },
      {
        name: 'Low Latency',
        agentConfig: {
          ...ConfigProfiles.development,
          timeoutMs: 5000,
          maxRetries: 1,
          rateLimitMs: 0
        },
        testParams: {
          concurrentRequests: 3,
          totalRequests: 50,
          requestInterval: 200,
          messageLength: 'short',
          expectedLatency: 1000
        }
      },
      {
        name: 'High Reliability',
        agentConfig: {
          ...ConfigProfiles.production,
          maxRetries: 5,
          circuitBreaker: {
            failureThreshold: 2,
            resetTimeoutMs: 10000,
            halfOpenMaxTrials: 3
          }
        },
        testParams: {
          concurrentRequests: 5,
          totalRequests: 200,
          requestInterval: 100,
          messageLength: 'long'
        }
      }
    ];
  }

  /**
   * Run a single benchmark configuration
   */
  private async runSingleBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const agent = new ClaudeChatBotAgentEnhanced(config.agentConfig);
    const startTime = Date.now();
    const metrics: PerformanceMetrics = {
      latency: [],
      throughput: [],
      errorRate: 0,
      cpuUsage: [],
      memoryUsage: []
    };

    let successfulRequests = 0;
    let failedRequests = 0;
    let retries = 0;
    let circuitBreakerTrips = 0;

    const errors = new Map<string, number>();

    // Mock the executeClaudeCommand to simulate realistic responses
    (agent as any).executeClaudeCommand = async (message: string) => {
      const messageLength = message.length;
      let baseLatency = 100;

      // Simulate latency based on message length
      if (config.testParams.messageLength === 'short') {
        baseLatency = Math.random() * 200 + 50;
      } else if (config.testParams.messageLength === 'medium') {
        baseLatency = Math.random() * 500 + 200;
      } else {
        baseLatency = Math.random() * 1000 + 500;
      }

      // Add some random variation
      await new Promise(resolve => setTimeout(resolve, baseLatency));

      // Simulate occasional failures (2% error rate)
      if (Math.random() < 0.02) {
        const errorTypes = ['network timeout', 'temporary failure', 'connection refused'];
        const error = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        throw new Error(error);
      }

      return `Response to: ${message.substring(0, 50)}... (${messageLength} chars)`;
    };

    // Monitor resource usage
    const resourceMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      metrics.cpuUsage.push(process.cpuUsage().user / 1000); // Convert to percentage
      metrics.memoryUsage.push(memUsage.heapUsed / (1024 * 1024)); // MB
    }, 100);

    // Execute test requests
    const batches = Math.ceil(config.testParams.totalRequests / config.testParams.concurrentRequests);

    for (let batch = 0; batch < batches; batch++) {
      const batchPromises: Promise<void>[] = [];

      for (let i = 0; i < config.testParams.concurrentRequests; i++) {
        const requestIndex = batch * config.testParams.concurrentRequests + i;
        if (requestIndex >= config.testParams.totalRequests) break;

        const requestStart = Date.now();
        const promise = agent.chat(`Benchmark message ${requestIndex}`)
          .then(() => {
            const latency = Date.now() - requestStart;
            metrics.latency.push(latency);
            successfulRequests++;

            // Calculate instantaneous throughput
            const elapsed = (Date.now() - startTime) / 1000;
            const currentThroughput = successfulRequests / elapsed;
            metrics.throughput.push(currentThroughput);
          })
          .catch((error) => {
            const latency = Date.now() - requestStart;
            if (latency > 0) {
              metrics.latency.push(latency);
            }
            failedRequests++;

            const errorType = error.message || 'Unknown error';
            errors.set(errorType, (errors.get(errorType) || 0) + 1);

            if (error.message.includes('Circuit breaker')) {
              circuitBreakerTrips++;
            }
          });

        batchPromises.push(promise);

        // Rate limiting between requests
        if (config.testParams.requestInterval > 0) {
          await new Promise(resolve => setTimeout(resolve, config.testParams.requestInterval));
        }
      }

      // Wait for batch to complete
      await Promise.all(batchPromises);

      // Progress reporting
      const progress = ((batch + 1) / batches * 100).toFixed(1);
      process.stdout.write(`\rProgress: ${progress}%`);
    }

    clearInterval(resourceMonitor);

    const totalDuration = Date.now() - startTime;
    const throughput = successfulRequests / (totalDuration / 1000);

    // Calculate latency percentiles
    const sortedLatency = [...metrics.latency].sort((a, b) => a - b);
    const latency = {
      min: sortedLatency[0] || 0,
      max: sortedLatency[sortedLatency.length - 1] || 0,
      avg: metrics.latency.reduce((a, b) => a + b, 0) / metrics.latency.length || 0,
      p50: sortedLatency[Math.floor(sortedLatency.length * 0.5)] || 0,
      p95: sortedLatency[Math.floor(sortedLatency.length * 0.95)] || 0,
      p99: sortedLatency[Math.floor(sortedLatency.length * 0.99)] || 0
    };

    // Calculate score (composite metric)
    const latencyScore = Math.max(0, 100 - (latency.avg / 10)); // Penalize high latency
    const throughputScore = Math.min(100, throughput); // Reward high throughput
    const reliabilityScore = Math.max(0, 100 - (failedRequests / successfulRequests * 100));

    const score = (latencyScore + throughputScore + reliabilityScore) / 3;

    const result: BenchmarkResult = {
      configName: config.name,
      duration: totalDuration,
      totalRequests: config.testParams.totalRequests,
      successfulRequests,
      failedRequests,
      throughput,
      latency,
      errors,
      retries,
      circuitBreakerTrips,
      resourceUsage: {
        cpu: metrics.cpuUsage,
        memory: metrics.memoryUsage
      },
      score
    };

    return result;
  }

  /**
   * Generate comparison report
   */
  private generateComparisonReport(): string {
    if (this.results.length === 0) return 'No benchmark results available';

    let report = '\n';
    report += '='.repeat(80) + '\n';
    report += 'BENCHMARK COMPARISON REPORT\n';
    report += '='.repeat(80) + '\n\n';

    // Summary table
    report += 'Configuration'.padEnd(25) + 'Throughput'.padEnd(12) + 'Avg Latency'.padEnd(12) + 'Success Rate'.padEnd(12) + 'Score'.padEnd(8) + '\n';
    report += '-'.repeat(80) + '\n';

    this.results.forEach(result => {
      const throughput = `${result.throughput.toFixed(1)} req/s`;
      const latency = `${result.latency.avg.toFixed(0)} ms`;
      const successRate = `${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%`;
      const score = result.score.toFixed(1);

      report += result.configName.substring(0, 24).padEnd(25);
      report += throughput.padEnd(12);
      report += latency.padEnd(12);
      report += successRate.padEnd(12);
      report += score.padEnd(8);
      report += '\n';
    });

    report += '\n' + '='.repeat(80) + '\n\n';

    // Best performers
    const bestThroughput = this.results.reduce((best, current) =>
      current.throughput > best.throughput ? current : best
    );

    const bestLatency = this.results.reduce((best, current) =>
      current.latency.avg < best.latency.avg ? current : best
    );

    const bestScore = this.results.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    report += '🏆 BEST PERFORMERS:\n';
    report += '-'.repeat(40) + '\n';
    report += `Highest Throughput: ${bestThroughput.configName} (${bestThroughput.throughput.toFixed(1)} req/s)\n`;
    report += `Lowest Latency: ${bestLatency.configName} (${bestLatency.latency.avg.toFixed(0)} ms)\n`;
    report += `Highest Score: ${bestScore.configName} (${bestScore.score.toFixed(1)})\n\n`;

    // Detailed analysis
    report += '📊 DETAILED ANALYSIS:\n';
    report += '-'.repeat(40) + '\n';

    this.results.forEach(result => {
      report += `\n${result.configName}:\n`;
      report += `  • Total Requests: ${result.totalRequests}\n`;
      report += `  • Successful: ${result.successfulRequests}\n`;
      report += `  • Failed: ${result.failedRequests}\n`;
      report += `  • Throughput: ${result.throughput.toFixed(2)} req/s\n`;
      report += `  • Latency (P50/P95/P99): ${result.latency.p50.toFixed(0)}/${result.latency.p95.toFixed(0)}/${result.latency.p99.toFixed(0)} ms\n`;
      report += `  • Circuit Breaker Trips: ${result.circuitBreakerTrips}\n`;

      if (result.errors.size > 0) {
        report += `  • Errors:\n`;
        result.errors.forEach((count: number, error: string) => {
          report += `    - ${error}: ${count}\n`;
        });
      }
    });

    report += '\n' + '='.repeat(80) + '\n';

    return report;
  }

  /**
   * Run stress test
   */
  async runStressTest(config: any, duration: number = 60000): Promise<{
    result: BenchmarkResult;
    recommendation: string;
  }> {
    console.log(`💪 Starting stress test for ${duration / 1000} seconds...\n`);

    const agent = new ClaudeChatBotAgentEnhanced(config);
    const startTime = Date.now();
    let requestCount = 0;
    const metrics: PerformanceMetrics = {
      latency: [],
      throughput: [],
      errorRate: 0,
      cpuUsage: [],
      memoryUsage: []
    };

    // Mock execution with load
    (agent as any).executeClaudeCommand = async (message: string) => {
      const requestStart = Date.now();

      // Simulate variable load
      const load = Math.random();
      let delay = 100;

      if (load > 0.8) {
        delay = Math.random() * 1000 + 500; // High load
      } else if (load > 0.5) {
        delay = Math.random() * 500 + 200; // Medium load
      } // else: low load

      await new Promise(resolve => setTimeout(resolve, delay));

      // Simulate errors under stress (5% rate)
      if (Math.random() < 0.05) {
        throw new Error('Stress-induced failure');
      }

      const latency = Date.now() - requestStart;
      metrics.latency.push(latency);

      return `Stress test response ${requestCount}`;
    };

    // Run stress test
    const interval = setInterval(async () => {
      if (Date.now() - startTime >= duration) {
        clearInterval(interval);
        return;
      }

      try {
        await agent.chat(`Stress test message ${requestCount}`);
        requestCount++;
      } catch (error) {
        requestCount++;
      }
    }, 10); // 100 requests per second

    // Wait for test to complete
    await new Promise(resolve => setTimeout(resolve, duration + 1000));
    clearInterval(interval);

    const result: BenchmarkResult = {
      configName: 'Stress Test',
      duration,
      totalRequests: requestCount,
      successfulRequests: metrics.latency.length,
      failedRequests: requestCount - metrics.latency.length,
      throughput: metrics.latency.length / (duration / 1000),
      latency: {
        min: Math.min(...metrics.latency),
        max: Math.max(...metrics.latency),
        avg: metrics.latency.reduce((a, b) => a + b, 0) / metrics.latency.length,
        p50: this.percentile(metrics.latency, 0.5),
        p95: this.percentile(metrics.latency, 0.95),
        p99: this.percentile(metrics.latency, 0.99)
      },
      errors: new Map<string, number>(),
      retries: 0,
      circuitBreakerTrips: 0,
      resourceUsage: {
        cpu: metrics.cpuUsage,
        memory: metrics.memoryUsage
      },
      score: 0 // Calculate based on stability under stress
    };

    // Generate recommendation
    const recommendation = this.generateStressTestRecommendation(result);

    console.log(`\n💪 Stress test completed: ${requestCount} requests in ${duration / 1000}s`);
    console.log(`📊 Recommendation: ${recommendation}`);

    return { result, recommendation };
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private generateStressTestRecommendation(result: BenchmarkResult): string {
    const errorRate = result.failedRequests / result.totalRequests;
    const avgLatency = result.latency.avg;

    if (errorRate > 0.1) {
      return 'High error rate detected. Consider reducing concurrency or increasing timeout.';
    } else if (avgLatency > 2000) {
      return 'High latency under load. Consider optimizing request handling or increasing resources.';
    } else if (result.throughput < 50) {
      return 'Low throughput. Consider increasing max concurrent requests or reducing rate limiting.';
    } else {
      return 'System performing well under stress. Current configuration is suitable for production.';
    }
  }

  /**
   * Export results
   */
  exportResults(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.results, null, 2);
    } else {
      const headers = 'Config,Duration,Total,Successful,Failed,Throughput,Avg Latency,P95,P99,Score\n';
      const rows = this.results.map(r =>
        [r.configName, r.duration, r.totalRequests, r.successfulRequests, r.failedRequests,
         r.throughput.toFixed(2), r.latency.avg.toFixed(0), r.latency.p95.toFixed(0),
         r.latency.p99.toFixed(0), r.score.toFixed(1)].join(',')
      ).join('\n');

      return headers + rows;
    }
  }
}
