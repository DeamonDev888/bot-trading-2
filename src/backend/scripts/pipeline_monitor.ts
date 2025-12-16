import fs from 'fs/promises';
import pathModule from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

interface PipelineStep {
  name: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'error' | 'timeout';
  details?: any;
  error?: Error;
}

interface PipelineMetrics {
  totalDuration: number;
  steps: PipelineStep[];
  success: boolean;
  timestamp: string;
}

export class PipelineMonitor {
  private logPath: string;
  private metricsPath: string;
  private pool: Pool;
  private steps: PipelineStep[] = [];
  private pipelineStartTime: number = 0;

  constructor() {
    this.logPath = pathModule.join(process.cwd(), 'logs', 'pipeline_monitor.jsonl');
    this.metricsPath = pathModule.join(process.cwd(), 'logs', 'pipeline_metrics.json');
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022',
    });
  }

  /**
   * Start monitoring pipeline
   */
  async startPipeline(): Promise<void> {
    this.pipelineStartTime = Date.now();
    this.steps = [];
    console.log('🚀 [MONITOR] Pipeline monitoring started');

    // Create logs directory if needed
    await this.ensureLogDirectory();
  }

  /**
   * Start a specific step
   */
  startStep(name: string, details?: any): void {
    const step: PipelineStep = {
      name,
      startTime: Date.now(),
      status: 'running',
      details
    };

    this.steps.push(step);
    console.log(`⏱️  [MONITOR] Step started: ${name}`, details || '');

    // Log to file
    this.logStep(step);
  }

  /**
   * Complete a step
   */
  completeStep(name: string, details?: any): void {
    const step = this.steps.find(s => s.name === name && s.status === 'running');
    if (step) {
      step.endTime = Date.now();
      step.status = 'completed';
      step.details = { ...step.details, ...details };

      const duration = step.endTime - step.startTime;
      console.log(`✅ [MONITOR] Step completed: ${name} (${duration}ms)`, details || '');

      // Log to file
      this.logStep(step);
    }
  }

  /**
   * Mark step as error
   */
  errorStep(name: string, error: Error, details?: any): void {
    const step = this.steps.find(s => s.name === name && s.status === 'running');
    if (step) {
      step.endTime = Date.now();
      step.status = 'error';
      step.error = error;
      step.details = { ...step.details, ...details };

      const duration = step.endTime - step.startTime;
      console.error(`❌ [MONITOR] Step failed: ${name} (${duration}ms) - ${error.message}`, details || '');

      // Log to file
      this.logStep(step);
    }
  }

  /**
   * Complete pipeline and save metrics
   */
  async endPipeline(success: boolean = true): Promise<void> {
    const totalDuration = Date.now() - this.pipelineStartTime;

    const metrics: PipelineMetrics = {
      totalDuration,
      steps: this.steps,
      success,
      timestamp: new Date().toISOString()
    };

    console.log(`🏁 [MONITOR] Pipeline ${success ? 'completed' : 'failed'} (${totalDuration}ms)`);

    // Save metrics
    await this.saveMetrics(metrics);

    // Close database connection
    await this.pool.end();
  }

  /**
   * Monitor database connectivity
   */
  async monitorDatabase(): Promise<{ connected: boolean; pendingCount: number; error?: string }> {
    try {
      const client = await this.pool.connect();

      // Test connection
      await client.query('SELECT 1');

      // Count pending items
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM news_items
        WHERE processing_status IN ('PENDING', 'raw')
      `);

      const pendingCount = parseInt(result.rows[0].count);
      client.release();

      return { connected: true, pendingCount };
    } catch (error) {
      return {
        connected: false,
        pendingCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Monitor KiloCode process
   */
  async monitorKiloCode(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Check KiloCode version
      const { stdout } = await execAsync('kilocode --version', { timeout: 5000 });

      return {
        available: true,
        version: stdout.trim().split('\n')[0]
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get system health check
   */
  async getHealthCheck(): Promise<any> {
    const dbStatus = await this.monitorDatabase();
    const kilocodeStatus = await this.monitorKiloCode();

    // Check cache directory
    const cacheDir = pathModule.join(process.cwd(), 'cache');
    let cacheSize = 0;
    let cacheFiles = 0;

    try {
      const files = await fs.readdir(cacheDir);
      cacheFiles = files.length;

      for (const file of files) {
        const filePath = pathModule.join(cacheDir, file);
        const stat = await fs.stat(filePath);
        cacheSize += stat.size;
      }
    } catch (error) {
      // Cache directory might not exist
    }

    return {
      timestamp: new Date().toISOString(),
      database: dbStatus,
      kilocode: kilocodeStatus,
      cache: {
        files: cacheFiles,
        sizeBytes: cacheSize,
        sizeMB: Math.round(cacheSize / 1024 / 1024 * 100) / 100
      },
      steps: this.steps.map(s => ({
        name: s.name,
        status: s.status,
        duration: s.endTime ? s.endTime - s.startTime : Date.now() - s.startTime
      }))
    };
  }

  /**
   * Log step to file
   */
  private async logStep(step: PipelineStep): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        ...step
      };

      await fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  }

  /**
   * Save metrics
   */
  private async saveMetrics(metrics: PipelineMetrics): Promise<void> {
    try {
      // Read existing metrics
      let existingMetrics: PipelineMetrics[] = [];
      try {
        const data = await fs.readFile(this.metricsPath, 'utf-8');
        existingMetrics = JSON.parse(data);
      } catch {
        // File might not exist or be empty
      }

      // Add new metrics
      existingMetrics.push(metrics);

      // Keep only last 100 runs
      if (existingMetrics.length > 100) {
        existingMetrics = existingMetrics.slice(-100);
      }

      // Save back
      await fs.writeFile(this.metricsPath, JSON.stringify(existingMetrics, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    const logDir = pathModule.dirname(this.logPath);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(): Promise<any> {
    try {
      const data = await fs.readFile(this.metricsPath, 'utf-8');
      const metrics: PipelineMetrics[] = JSON.parse(data);

      if (metrics.length === 0) {
        return { totalRuns: 0 };
      }

      const successRate = metrics.filter(m => m.success).length / metrics.length;
      const avgDuration = metrics.reduce((sum, m) => sum + m.totalDuration, 0) / metrics.length;

      // Step statistics
      const stepStats: Record<string, { count: number; avgDuration: number; errorRate: number }> = {};

      for (const metric of metrics) {
        for (const step of metric.steps) {
          if (!stepStats[step.name]) {
            stepStats[step.name] = { count: 0, avgDuration: 0, errorRate: 0 };
          }

          const stats = stepStats[step.name];
          stats.count++;

          if (step.endTime) {
            const duration = step.endTime - step.startTime;
            stats.avgDuration = (stats.avgDuration * (stats.count - 1) + duration) / stats.count;
          }

          if (step.status === 'error') {
            stats.errorRate++;
          }
        }
      }

      // Calculate error rates
      for (const stats of Object.values(stepStats)) {
        stats.errorRate = stats.errorRate / stats.count;
      }

      return {
        totalRuns: metrics.length,
        successRate: Math.round(successRate * 10000) / 100,
        avgDuration: Math.round(avgDuration),
        lastRun: metrics[metrics.length - 1]?.timestamp,
        stepStats
      };
    } catch (error) {
      return { totalRuns: 0, error: String(error) };
    }
  }
}

// Export for use in other scripts
export const pipelineMonitor = new PipelineMonitor();