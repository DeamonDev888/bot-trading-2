/**
 * Service de monitoring et observabilité pour ClaudeChatBotAgent
 * Métriques, logs structurés, alertes et dashboards
 */

import { ClaudeChatBotAgentEnhanced } from '../agents/ClaudeChatBotAgentEnhanced.js';

interface Metrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    retries: number;
  };
  performance: {
    averageLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
  };
  circuitBreaker: {
    state: string;
    failures: number;
    openTime: number | null;
  };
  errors: {
    byType: Map<string, number>;
    byMessage: Map<string, number>;
  };
  rateLimiting: {
    requestsBlocked: number;
    averageWaitTime: number;
  };
}

interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: Metrics) => boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  cooldown: number; // minutes
  lastTriggered: number;
}

export class ClaudeMonitoringService {
  private agent: ClaudeChatBotAgentEnhanced;
  private metrics: Metrics;
  private alerts: AlertRule[] = [];
  private eventLog: Array<{
    timestamp: number;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    data?: any;
  }> = [];

  private performanceSamples: number[] = [];
  private maxSamples = 1000;

  constructor(agent: ClaudeChatBotAgentEnhanced) {
    this.agent = agent;
    this.metrics = this.initializeMetrics();
    this.setupDefaultAlerts();
  }

  private initializeMetrics(): Metrics {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        retries: 0
      },
      performance: {
        averageLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0
      },
      circuitBreaker: {
        state: 'CLOSED',
        failures: 0,
        openTime: null
      },
      errors: {
        byType: new Map(),
        byMessage: new Map()
      },
      rateLimiting: {
        requestsBlocked: 0,
        averageWaitTime: 0
      }
    };
  }

  private setupDefaultAlerts(): void {
    this.alerts = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: (metrics) => {
          const errorRate = metrics.requests.failed / metrics.requests.total;
          return metrics.requests.total > 10 && errorRate > 0.2;
        },
        severity: 'HIGH',
        message: 'Error rate exceeds 20%',
        cooldown: 5,
        lastTriggered: 0
      },
      {
        id: 'circuit_breaker_open',
        name: 'Circuit Breaker Open',
        condition: (metrics) => metrics.circuitBreaker.state === 'OPEN',
        severity: 'CRITICAL',
        message: 'Circuit breaker is OPEN - service unavailable',
        cooldown: 1,
        lastTriggered: 0
      },
      {
        id: 'high_latency',
        name: 'High Latency',
        condition: (metrics) => metrics.performance.p95Latency > 30000, // 30s
        severity: 'MEDIUM',
        message: '95th percentile latency exceeds 30 seconds',
        cooldown: 3,
        lastTriggered: 0
      },
      {
        id: 'rejection_rate',
        name: 'High Rejection Rate',
        condition: (metrics) => {
          const rejectionRate = metrics.rateLimiting.requestsBlocked / metrics.requests.total;
          return rejectionRate > 0.1; // 10%
        },
        severity: 'LOW',
        message: 'Rate limiting blocking >10% of requests',
        cooldown: 10,
        lastTriggered: 0
      }
    ];
  }

  /**
   * Track request lifecycle
   */
  trackRequestStart(): { startTime: number; requestId: string } {
    const startTime = Date.now();
    const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    this.logEvent('INFO', `Request started: ${requestId}`, { requestId });

    return { startTime, requestId };
  }

  trackRequestEnd(
    requestId: string,
    startTime: number,
    success: boolean,
    error?: Error
  ): void {
    const latency = Date.now() - startTime;

    this.metrics.requests.total++;

    if (success) {
      this.metrics.requests.successful++;
      this.logEvent('INFO', `Request successful: ${requestId}`, {
        requestId,
        latency,
        success: true
      });
    } else {
      this.metrics.requests.failed++;
      this.metrics.errors.byMessage.set(
        error?.message || 'Unknown error',
        (this.metrics.errors.byMessage.get(error?.message || 'Unknown error') || 0) + 1
      );
      this.logEvent('ERROR', `Request failed: ${requestId}`, {
        requestId,
        latency,
        success: false,
        error: error?.message
      });
    }

    // Update performance metrics
    this.performanceSamples.push(latency);
    if (this.performanceSamples.length > this.maxSamples) {
      this.performanceSamples.shift();
    }

    this.updatePerformanceMetrics();
    this.checkAlerts();
  }

  trackRetry(retryCount: number): void {
    this.metrics.requests.retries += retryCount;
    this.logEvent('WARN', `Retry triggered`, { retryCount });
  }

  trackRateLimit(waitTime: number): void {
    this.metrics.rateLimiting.requestsBlocked++;
    const currentAvg = this.metrics.rateLimiting.averageWaitTime;
    const totalRequests = this.metrics.rateLimiting.requestsBlocked;
    this.metrics.rateLimiting.averageWaitTime =
      (currentAvg * (totalRequests - 1) + waitTime) / totalRequests;

    this.logEvent('INFO', `Rate limited`, { waitTime });
  }

  trackCircuitBreakerStateChange(
    oldState: string,
    newState: string,
    failures: number
  ): void {
    this.metrics.circuitBreaker.state = newState;
    this.metrics.circuitBreaker.failures = failures;

    if (newState === 'OPEN') {
      this.metrics.circuitBreaker.openTime = Date.now();
      this.logEvent('ERROR', `Circuit breaker OPENED`, {
        oldState,
        newState,
        failures
      });
    } else if (oldState === 'OPEN' && newState === 'CLOSED') {
      this.logEvent('INFO', `Circuit breaker CLOSED`, {
        oldState,
        newState,
        openDuration: Date.now() - (this.metrics.circuitBreaker.openTime || 0)
      });
      this.metrics.circuitBreaker.openTime = null;
    }
  }

  private updatePerformanceMetrics(): void {
    if (this.performanceSamples.length === 0) return;

    const sorted = [...this.performanceSamples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    this.metrics.performance.averageLatency = sum / sorted.length;
    this.metrics.performance.p50Latency = this.percentile(sorted, 0.5);
    this.metrics.performance.p95Latency = this.percentile(sorted, 0.95);
    this.metrics.performance.p99Latency = this.percentile(sorted, 0.99);
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private checkAlerts(): void {
    const now = Date.now();

    this.alerts.forEach(alert => {
      if (alert.condition(this.metrics)) {
        const timeSinceLastTrigger = now - alert.lastTriggered;

        if (timeSinceLastTrigger > alert.cooldown * 60 * 1000) {
          this.triggerAlert(alert);
          alert.lastTriggered = now;
        }
      }
    });
  }

  private triggerAlert(alert: AlertRule): void {
    const alertData = {
      id: alert.id,
      name: alert.name,
      severity: alert.severity,
      message: alert.message,
      timestamp: Date.now(),
      metrics: this.getMetricsSnapshot()
    };

    this.logEvent('WARN', `ALERT: ${alert.name}`, alertData);

    // Here you could integrate with external alerting systems
    // like PagerDuty, Slack, email, etc.
    this.sendAlert(alertData);
  }

  private sendAlert(alertData: any): void {
    // Implementation for sending alerts to external systems
    console.log(`🚨 ALERT [${alertData.severity}]: ${alertData.message}`);
    console.log(`📊 Metrics:`, alertData.metrics);
  }

  private logEvent(
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    data?: any
  ): void {
    this.eventLog.push({
      timestamp: Date.now(),
      level,
      message,
      data
    });

    // Keep only last 10000 events
    if (this.eventLog.length > 10000) {
      this.eventLog.shift();
    }

    // Structured logging
    console.log(`[ClaudeMonitor] [${level}] ${message}`, data || '');
  }

  /**
   * Get metrics snapshot for external monitoring
   */
  getMetricsSnapshot(): any {
    return {
      ...this.metrics,
      errors: {
        byType: Object.fromEntries(this.metrics.errors.byType),
        byMessage: Object.fromEntries(this.metrics.errors.byMessage)
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: Date.now()
    };
  }

  /**
   * Generate health report
   */
  generateHealthReport(): {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
    metrics: any;
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check error rate
    const errorRate = this.metrics.requests.total > 0
      ? this.metrics.requests.failed / this.metrics.requests.total
      : 0;

    if (errorRate > 0.2) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      score -= 30;
      recommendations.push('Investigate root cause of failures');
    } else if (errorRate > 0.1) {
      issues.push(`Elevated error rate: ${(errorRate * 100).toFixed(1)}%`);
      score -= 15;
    }

    // Check circuit breaker
    if (this.metrics.circuitBreaker.state === 'OPEN') {
      issues.push('Circuit breaker is OPEN');
      score -= 50;
      recommendations.push('Service is unavailable - check downstream dependencies');
    }

    // Check latency
    if (this.metrics.performance.p95Latency > 30000) {
      issues.push(`High latency: ${this.metrics.performance.p95Latency}ms (95th percentile)`);
      score -= 20;
      recommendations.push('Consider increasing timeout or optimizing requests');
    }

    // Check rate limiting
    const rejectionRate = this.metrics.requests.total > 0
      ? this.metrics.rateLimiting.requestsBlocked / this.metrics.requests.total
      : 0;

    if (rejectionRate > 0.1) {
      issues.push(`High rejection rate: ${(rejectionRate * 100).toFixed(1)}%`);
      score -= 10;
      recommendations.push('Consider adjusting rate limits or request patterns');
    }

    // Determine overall status
    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    if (score >= 80) {
      status = 'HEALTHY';
    } else if (score >= 50) {
      status = 'DEGRADED';
    } else {
      status = 'UNHEALTHY';
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations,
      metrics: this.getMetricsSnapshot()
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    // Claude agent metrics
    lines.push('# HELP claude_requests_total Total number of requests');
    lines.push('# TYPE claude_requests_total counter');
    lines.push(`claude_requests_total ${this.metrics.requests.total}`);

    lines.push('# HELP claude_requests_success_total Total number of successful requests');
    lines.push('# TYPE claude_requests_success_total counter');
    lines.push(`claude_requests_success_total ${this.metrics.requests.successful}`);

    lines.push('# HELP claude_requests_failed_total Total number of failed requests');
    lines.push('# TYPE claude_requests_failed_total counter');
    lines.push(`claude_requests_failed_total ${this.metrics.requests.failed}`);

    lines.push('# HELP claude_requests_retries_total Total number of retries');
    lines.push('# TYPE claude_requests_retries_total counter');
    lines.push(`claude_requests_retries_total ${this.metrics.requests.retries}`);

    lines.push('# HELP claude_request_duration_seconds Request duration in seconds');
    lines.push('# TYPE claude_request_duration_seconds histogram');
    lines.push(`claude_request_duration_seconds_bucket{le="1"} ${this.performanceSamples.filter(s => s < 1000).length}`);
    lines.push(`claude_request_duration_seconds_bucket{le="5"} ${this.performanceSamples.filter(s => s < 5000).length}`);
    lines.push(`claude_request_duration_seconds_bucket{le="15"} ${this.performanceSamples.filter(s => s < 15000).length}`);
    lines.push(`claude_request_duration_seconds_bucket{le="30"} ${this.performanceSamples.filter(s => s < 30000).length}`);
    lines.push(`claude_request_duration_seconds_bucket{le="+Inf"} ${this.performanceSamples.length}`);
    lines.push(`claude_request_duration_seconds_sum ${this.performanceSamples.reduce((a, b) => a + b, 0) / 1000}`);
    lines.push(`claude_request_duration_seconds_count ${this.performanceSamples.length}`);

    lines.push('# HELP claude_circuit_breaker_state Circuit breaker state (0=closed, 1=half-open, 2=open)');
    lines.push('# TYPE claude_circuit_breaker_state gauge');
    const stateValue = this.metrics.circuitBreaker.state === 'CLOSED' ? 0 :
                      this.metrics.circuitBreaker.state === 'HALF_OPEN' ? 1 : 2;
    lines.push(`claude_circuit_breaker_state ${stateValue}`);

    lines.push('# HELP claude_rate_limited_total Total number of rate-limited requests');
    lines.push('# TYPE claude_rate_limited_total counter');
    lines.push(`claude_rate_limited_total ${this.metrics.rateLimiting.requestsBlocked}`);

    return lines.join('\n');
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.performanceSamples = [];
    this.eventLog = [];
    this.alerts.forEach(alert => {
      alert.lastTriggered = 0;
    });
    this.logEvent('INFO', 'Metrics reset');
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): typeof this.eventLog {
    return this.eventLog.slice(-limit);
  }
}
