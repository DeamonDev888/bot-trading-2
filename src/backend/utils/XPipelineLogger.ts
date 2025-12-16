import fs from 'fs/promises';
import pathModule from 'path';
import { Pool } from 'pg';

export interface XPipelineLogEntry {
  timestamp: string;
  run_id: string;
  stage: string;
  action: string;
  status: 'START' | 'SUCCESS' | 'ERROR' | 'SKIP' | 'RETRY' | 'TIMEOUT';
  duration?: number;
  details?: any;
  metrics?: {
    items_processed?: number;
    items_filtered?: number;
    kilocode_requests?: number;
    kilocode_duration?: number;
    database_queries?: number;
    database_duration?: number;
    memory_usage?: number;
    cache_hits?: number;
    cache_misses?: number;
    errors_count?: number;
  };
  correlation?: {
    feed_name?: string;
    feed_status?: string;
    feed_strategy?: string;
    batch_id?: string;
    item_id?: string;
    error_type?: string;
    retry_count?: number;
    parent_stage?: string;
  };
  performance?: {
    cpu_usage?: number;
    memory_peak?: number;
    network_latency?: number;
    processing_rate?: number;
    efficiency_score?: number;
  };
  optimization?: {
    duplicate_detected?: boolean;
    old_post_filtered?: boolean;
    cache_utilized?: boolean;
    fallback_used?: boolean;
    batch_optimized?: boolean;
  };
}

export interface XPipelineRunSummary {
  run_id: string;
  start_time: string;
  end_time?: string;
  total_duration?: number;
  total_stages: number;
  success_stages: number;
  error_stages: number;
  total_items_processed: number;
  total_items_filtered: number;
  total_kilocode_requests: number;
  total_database_queries: number;
  efficiency_score: number;
  bottleneck_stages: string[];
  error_patterns: string[];
  optimization_suggestions: string[];
}

export class XPipelineLogger {
  private logPath: string;
  private summaryPath: string;
  private correlationPath: string;
  private pool: Pool;
  private currentRunId: string;
  private startTime: number;
  private entries: XPipelineLogEntry[] = [];
  private stages: Map<string, number> = new Map();
  private errors: Map<string, number> = new Map();
  private metrics = {
    items_processed: 0,
    items_filtered: 0,
    kilocode_requests: 0,
    kilocode_duration: 0,
    database_queries: 0,
    database_duration: 0,
    cache_hits: 0,
    cache_misses: 0,
    errors_count: 0
  };

  constructor(pool: Pool) {
    this.pool = pool;
    this.logPath = pathModule.join(process.cwd(), 'logs', 'x_pipeline_detailed.jsonl');
    this.summaryPath = pathModule.join(process.cwd(), 'logs', 'x_pipeline_summaries.json');
    this.correlationPath = pathModule.join(process.cwd(), 'logs', 'x_pipeline_correlations.json');
    this.currentRunId = this.generateRunId();
    this.startTime = Date.now();
  }

  private generateRunId(): string {
    return `x-pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a pipeline stage start
   */
  logStageStart(stage: string, details?: any): void {
    const entry: XPipelineLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.currentRunId,
      stage,
      action: 'STAGE_START',
      status: 'START',
      details,
      metrics: this.getCurrentMetrics()
    };

    this.logEntry(entry);
    this.stages.set(stage, Date.now());
    console.log(`🚀 [${stage}] Starting - ${details ? JSON.stringify(details) : ''}`);
  }

  /**
   * Log a pipeline stage completion
   */
  logStageComplete(stage: string, details?: any, metrics?: Partial<XPipelineLogEntry['metrics']>): void {
    const stageStartTime = this.stages.get(stage);
    const duration = stageStartTime ? Date.now() - stageStartTime : undefined;

    const entry: XPipelineLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.currentRunId,
      stage,
      action: 'STAGE_COMPLETE',
      status: 'SUCCESS',
      duration,
      details,
      metrics: { ...this.getCurrentMetrics(), ...metrics }
    };

    this.logEntry(entry);
    console.log(`✅ [${stage}] Completed in ${duration}ms`);
  }

  /**
   * Log KiloCode execution with detailed metrics
   */
  logKiloCodeExecution(
    stage: string,
    promptLength: number,
    responseLength: number,
    duration: number,
    approach: string,
    success: boolean,
    error?: string
  ): void {
    this.metrics.kilocode_requests++;
    this.metrics.kilocode_duration += duration;

    const entry: XPipelineLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.currentRunId,
      stage,
      action: 'KILOCODE_EXECUTION',
      status: success ? 'SUCCESS' : 'ERROR',
      duration,
      details: {
        prompt_length: promptLength,
        response_length: responseLength,
        approach,
        error
      },
      metrics: {
        kilocode_requests: this.metrics.kilocode_requests,
        kilocode_duration: this.metrics.kilocode_duration
      },
      performance: {
        processing_rate: responseLength / (duration / 1000), // chars per second
        efficiency_score: this.calculateEfficiencyScore(promptLength, responseLength, duration)
      }
    };

    this.logEntry(entry);
    console.log(`🧠 [${stage}] KiloCode ${approach} - ${success ? '✅' : '❌'} ${duration}ms (${promptLength}→${responseLength} chars)`);
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(
    stage: string,
    operation: string,
    query: string,
    duration: number,
    rowCount: number,
    success: boolean,
    error?: string
  ): void {
    this.metrics.database_queries++;
    this.metrics.database_duration += duration;

    const entry: XPipelineLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.currentRunId,
      stage,
      action: 'DATABASE_OPERATION',
      status: success ? 'SUCCESS' : 'ERROR',
      duration,
      details: {
        operation,
        query_type: this.extractQueryType(query),
        row_count: rowCount,
        error
      },
      metrics: {
        database_queries: this.metrics.database_queries,
        database_duration: this.metrics.database_duration
      },
      performance: {
        processing_rate: rowCount / (duration / 1000), // rows per second
        efficiency_score: this.calculateDatabaseEfficiency(rowCount, duration)
      }
    };

    this.logEntry(entry);
    console.log(`🗄️ [${stage}] DB ${operation} - ${success ? '✅' : '❌'} ${duration}ms (${rowCount} rows)`);
  }

  /**
   * Log feed scraping with correlation
   */
  logFeedScraping(
    feedName: string,
    strategy: string,
    itemCount: number,
    duration: number,
    success: boolean,
    error?: string,
    correlation?: any
  ): void {
    const entry: XPipelineLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.currentRunId,
      stage: 'FEED_SCRAPING',
      action: 'SCRAPE_FEED',
      status: success ? 'SUCCESS' : 'ERROR',
      duration,
      details: {
        feed_name: feedName,
        item_count: itemCount,
        error
      },
      correlation: {
        feed_name: feedName,
        feed_status: success ? 'SUCCESS' : 'ERROR',
        feed_strategy: strategy,
        error_type: error ? this.categorizeError(error) : undefined,
        ...correlation
      },
      metrics: {
        items_processed: itemCount
      },
      performance: {
        processing_rate: itemCount / (duration / 1000)
      },
      optimization: {
        cache_utilized: correlation?.cache_used || false,
        fallback_used: correlation?.fallback_used || false
      }
    };

    this.logEntry(entry);

    if (success) {
      this.metrics.items_processed += itemCount;
    } else {
      this.metrics.errors_count++;
    }

    console.log(`📡 [FEED] ${feedName} - ${strategy} - ${success ? '✅' : '❌'} ${itemCount} items (${duration}ms)`);
  }

  /**
   * Log item filtering with optimization metrics
   */
  logItemFiltering(
    stage: string,
    inputCount: number,
    outputCount: number,
    filters: string[],
    duration: number,
    optimization?: any
  ): void {
    this.metrics.items_filtered += outputCount;

    const entry: XPipelineLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.currentRunId,
      stage,
      action: 'ITEM_FILTERING',
      status: 'SUCCESS',
      duration,
      details: {
        input_count: inputCount,
        output_count: outputCount,
        filters_applied: filters,
        filter_efficiency: ((outputCount / inputCount) * 100).toFixed(2) + '%'
      },
      metrics: {
        items_processed: inputCount,
        items_filtered: outputCount
      },
      performance: {
        processing_rate: inputCount / (duration / 1000)
      },
      optimization: {
        duplicate_detected: optimization?.duplicate_detected || false,
        old_post_filtered: optimization?.old_post_filtered || false,
        cache_utilized: optimization?.cache_utilized || false,
        batch_optimized: optimization?.batch_optimized || false
      }
    };

    this.logEntry(entry);
    console.log(`🔍 [${stage}] Filtering ${inputCount}→${outputCount} items (${duration}ms)`);
  }

  /**
   * Log error with correlation tracking
   */
  logError(
    stage: string,
    error: Error,
    correlation?: any,
    retryCount: number = 0
  ): void {
    this.metrics.errors_count++;

    const errorType = this.categorizeError(error.message);
    this.errors.set(errorType, (this.errors.get(errorType) || 0) + 1);

    const entry: XPipelineLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.currentRunId,
      stage,
      action: 'ERROR_OCCURRED',
      status: 'ERROR',
      details: {
        error_message: error.message,
        error_stack: error.stack,
        retry_count: retryCount
      },
      correlation: {
        error_type: errorType,
        retry_count: retryCount,
        ...correlation
      }
    };

    this.logEntry(entry);
    console.error(`❌ [${stage}] ${errorType}: ${error.message}`);
  }

  /**
   * Generate and save comprehensive run summary
   */
  async generateRunSummary(): Promise<XPipelineRunSummary> {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    const summary: XPipelineRunSummary = {
      run_id: this.currentRunId,
      start_time: new Date(this.startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      total_duration: totalDuration,
      total_stages: this.stages.size,
      success_stages: Array.from(this.stages.values()).length,
      error_stages: this.errors.size,
      total_items_processed: this.metrics.items_processed,
      total_items_filtered: this.metrics.items_filtered,
      total_kilocode_requests: this.metrics.kilocode_requests,
      total_database_queries: this.metrics.database_queries,
      efficiency_score: this.calculateOverallEfficiency(),
      bottleneck_stages: this.identifyBottlenecks(),
      error_patterns: this.identifyErrorPatterns(),
      optimization_suggestions: this.generateOptimizationSuggestions()
    };

    // Save summary
    await this.saveSummary(summary);

    // Generate correlations report
    await this.generateCorrelationsReport();

    return summary;
  }

  /**
   * Save log entry to file
   */
  private async logEntry(entry: XPipelineLogEntry): Promise<void> {
    this.entries.push(entry);

    try {
      await fs.mkdir(pathModule.dirname(this.logPath), { recursive: true });
      await fs.appendFile(this.logPath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  }

  /**
   * Get current metrics snapshot
   */
  private getCurrentMetrics(): XPipelineLogEntry['metrics'] {
    return { ...this.metrics };
  }

  /**
   * Calculate efficiency score for KiloCode execution
   */
  private calculateEfficiencyScore(promptLength: number, responseLength: number, duration: number): number {
    const throughput = (promptLength + responseLength) / (duration / 1000); // chars per second
    return Math.min(100, Math.max(0, (throughput / 1000) * 100)); // Normalize to 0-100
  }

  /**
   * Calculate database efficiency
   */
  private calculateDatabaseEfficiency(rowCount: number, duration: number): number {
    const rowsPerSecond = rowCount / (duration / 1000);
    return Math.min(100, Math.max(0, (rowsPerSecond / 1000) * 100));
  }

  /**
   * Extract query type from SQL
   */
  private extractQueryType(query: string): string {
    const upperQuery = query.trim().toUpperCase();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  /**
   * Categorize error type
   */
  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();

    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('network') || message.includes('connection')) return 'NETWORK';
    if (message.includes('database') || message.includes('sql')) return 'DATABASE';
    if (message.includes('kilocode') || message.includes('llm')) return 'LLM';
    if (message.includes('scraper') || message.includes('cloudflare')) return 'SCRAPING';
    if (message.includes('memory') || message.includes('heap')) return 'MEMORY';
    if (message.includes('file') || message.includes('disk')) return 'FILE_SYSTEM';

    return 'UNKNOWN';
  }

  /**
   * Calculate overall pipeline efficiency
   */
  private calculateOverallEfficiency(): number {
    const currentDuration = Date.now() - this.startTime;
    const processingRate = this.metrics.items_processed / Math.max(1, currentDuration / 1000);
    const successRate = ((this.stages.size - this.errors.size) / Math.max(1, this.stages.size)) * 100;

    // Weighted efficiency score
    return Math.round((processingRate * 0.4) + (successRate * 0.3) + (this.metrics.cache_hits / Math.max(1, this.metrics.cache_hits + this.metrics.cache_misses)) * 100 * 0.3);
  }

  /**
   * Identify pipeline bottlenecks
   */
  private identifyBottlenecks(): string[] {
    const bottlenecks: string[] = [];

    // Analyze log entries for slow stages
    const stageDurations = new Map<string, number[]>();

    this.entries.forEach(entry => {
      if (entry.duration && entry.stage) {
        if (!stageDurations.has(entry.stage)) {
          stageDurations.set(entry.stage, []);
        }
        stageDurations.get(entry.stage)!.push(entry.duration);
      }
    });

    // Find stages with high average duration
    stageDurations.forEach((durations, stage) => {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      if (avgDuration > 30000) { // > 30 seconds
        bottlenecks.push(`${stage} (avg: ${Math.round(avgDuration)}ms)`);
      }
    });

    // Check error patterns
    if (this.metrics.errors_count > 10) {
      bottlenecks.push('High error rate');
    }

    if (this.metrics.kilocode_duration > 60000) { // > 1 minute
      bottlenecks.push('KiloCode processing');
    }

    return bottlenecks;
  }

  /**
   * Identify error patterns
   */
  private identifyErrorPatterns(): string[] {
    const patterns: string[] = [];

    this.errors.forEach((count, errorType) => {
      if (count > 3) {
        patterns.push(`${errorType}: ${count} occurrences`);
      }
    });

    return patterns;
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];

    // Based on metrics and patterns
    if (this.metrics.cache_hits < this.metrics.cache_misses) {
      suggestions.push('Increase cache utilization');
    }

    if (this.metrics.kilocode_requests > 10) {
      suggestions.push('Implement KiloCode request batching');
    }

    if (this.metrics.database_queries > 50) {
      suggestions.push('Add database query optimization');
    }

    const successRate = ((this.stages.size - this.errors.size) / Math.max(1, this.stages.size)) * 100;
    if (successRate < 90) {
      suggestions.push('Improve error handling and retry logic');
    }

    return suggestions;
  }

  /**
   * Save run summary to file
   */
  private async saveSummary(summary: XPipelineRunSummary): Promise<void> {
    try {
      await fs.mkdir(pathModule.dirname(this.summaryPath), { recursive: true });

      let summaries: XPipelineRunSummary[] = [];
      try {
        const data = await fs.readFile(this.summaryPath, 'utf-8');
        summaries = JSON.parse(data);
      } catch {
        // File doesn't exist or is empty
      }

      summaries.push(summary);

      // Keep only last 100 runs
      if (summaries.length > 100) {
        summaries = summaries.slice(-100);
      }

      await fs.writeFile(this.summaryPath, JSON.stringify(summaries, null, 2));

    } catch (error) {
      console.error('Failed to save summary:', error);
    }
  }

  /**
   * Generate correlations report
   */
  private async generateCorrelationsReport(): Promise<void> {
    try {
      await fs.mkdir(pathModule.dirname(this.correlationPath), { recursive: true });

      const correlations = {
        run_id: this.currentRunId,
        timestamp: new Date().toISOString(),
        feed_performance: this.analyzeFeedPerformance(),
        error_correlations: this.analyzeErrorCorrelations(),
        optimization_impact: this.analyzeOptimizationImpact(),
        performance_trends: this.analyzePerformanceTrends()
      };

      let allCorrelations: any[] = [];
      try {
        const data = await fs.readFile(this.correlationPath, 'utf-8');
        allCorrelations = JSON.parse(data);
      } catch {
        // File doesn't exist or is empty
      }

      allCorrelations.push(correlations);

      // Keep only last 50 correlation reports
      if (allCorrelations.length > 50) {
        allCorrelations = allCorrelations.slice(-50);
      }

      await fs.writeFile(this.correlationPath, JSON.stringify(allCorrelations, null, 2));

    } catch (error) {
      console.error('Failed to generate correlations report:', error);
    }
  }

  /**
   * Analyze feed performance correlations
   */
  private analyzeFeedPerformance(): any {
    const feedStats = new Map<string, { success: number; failures: number; totalDuration: number; itemCount: number }>();

    this.entries.forEach(entry => {
      if (entry.action === 'SCRAPE_FEED' && entry.correlation?.feed_name) {
        const feedName = entry.correlation.feed_name;

        if (!feedStats.has(feedName)) {
          feedStats.set(feedName, { success: 0, failures: 0, totalDuration: 0, itemCount: 0 });
        }

        const stats = feedStats.get(feedName)!;

        if (entry.status === 'SUCCESS') {
          stats.success++;
          stats.itemCount += entry.details?.item_count || 0;
        } else {
          stats.failures++;
        }

        stats.totalDuration += entry.duration || 0;
      }
    });

    const result: any = {};
    feedStats.forEach((stats, feedName) => {
      result[feedName] = {
        success_rate: (stats.success / (stats.success + stats.failures)) * 100,
        avg_duration: stats.totalDuration / (stats.success + stats.failures),
        avg_items_per_request: stats.itemCount / Math.max(1, stats.success),
        efficiency_score: this.calculateFeedEfficiency(stats)
      };
    });

    return result;
  }

  /**
   * Analyze error correlations
   */
  private analyzeErrorCorrelations(): any {
    const errorPatterns: any = {};

    this.errors.forEach((count, errorType) => {
      errorPatterns[errorType] = {
        occurrences: count,
        percentage: (count / this.metrics.errors_count) * 100
      };
    });

    return {
      total_errors: this.metrics.errors_count,
      error_types: errorPatterns,
      most_common: Array.from(this.errors.entries())
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
    };
  }

  /**
   * Analyze optimization impact
   */
  private analyzeOptimizationImpact(): any {
    let optimizationUsed = 0;
    let optimizationSuccess = 0;

    this.entries.forEach(entry => {
      if (entry.optimization) {
        const anyOptimization = Object.values(entry.optimization).some(Boolean);
        if (anyOptimization) {
          optimizationUsed++;
          if (entry.status === 'SUCCESS') {
            optimizationSuccess++;
          }
        }
      }
    });

    return {
      optimization_usage_rate: (optimizationUsed / this.entries.length) * 100,
      optimization_success_rate: optimizationUsed > 0 ? (optimizationSuccess / optimizationUsed) * 100 : 0,
      total_optimizations: optimizationUsed
    };
  }

  /**
   * Analyze performance trends
   */
  private analyzePerformanceTrends(): any {
    const stageMetrics = new Map<string, { durations: number[]; successCount: number; totalCount: number }>();

    this.entries.forEach(entry => {
      if (entry.duration && entry.stage) {
        if (!stageMetrics.has(entry.stage)) {
          stageMetrics.set(entry.stage, { durations: [], successCount: 0, totalCount: 0 });
        }

        const metrics = stageMetrics.get(entry.stage)!;
        metrics.durations.push(entry.duration);
        metrics.totalCount++;

        if (entry.status === 'SUCCESS') {
          metrics.successCount++;
        }
      }
    });

    const trends: any = {};
    stageMetrics.forEach((metrics, stage) => {
      const avgDuration = metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length;
      const successRate = (metrics.successCount / metrics.totalCount) * 100;

      trends[stage] = {
        avg_duration: Math.round(avgDuration),
        success_rate: Math.round(successRate),
        stability_score: this.calculateStabilityScore(metrics.durations)
      };
    });

    return trends;
  }

  /**
   * Calculate feed efficiency score
   */
  private calculateFeedEfficiency(stats: { success: number; failures: number; totalDuration: number; itemCount: number }): number {
    const successRate = stats.success / Math.max(1, stats.success + stats.failures);
    const itemsPerSecond = stats.itemCount / Math.max(1, stats.totalDuration / 1000);

    return Math.round((successRate * 50) + Math.min(50, itemsPerSecond * 10));
  }

  /**
   * Calculate stability score based on duration variance
   */
  private calculateStabilityScore(durations: number[]): number {
    if (durations.length < 2) return 100;

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum, duration) => sum + Math.pow(duration - avg, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher stability
    return Math.max(0, Math.min(100, 100 - (stdDev / avg) * 100));
  }
}