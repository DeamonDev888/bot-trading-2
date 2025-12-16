import fs from 'fs/promises';
import pathModule from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { AgregatorFilterAgent } from '../agents/agregatorfilter';

dotenv.config();

export class PipelineDiagnostic {
  private pool: Pool;
  private logPath: string;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022',
    });
    this.logPath = pathModule.join(process.cwd(), 'logs', 'diagnostic.jsonl');
  }

  async log(message: string, data?: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data
    };

    console.log(`🔍 [DIAG] ${message}`, data || '');

    try {
      await fs.mkdir(pathModule.dirname(this.logPath), { recursive: true });
      await fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write diagnostic log:', error);
    }
  }

  async runDiagnostic(): Promise<void> {
    await this.log('=== PIPELINE DIAGNOSTIC START ===');

    try {
      // Test 1: Database connectivity
      await this.testDatabase();

      // Test 2: Check pending items
      await this.checkPendingItems();

      // Test 3: Test KiloCode directly
      await this.testKiloCode();

      // Test 4: Run minimal filter cycle
      await this.testMinimalFilter();

      // Test 5: Test full filter with timeout
      await this.testFullFilterWithTimeout();

    } catch (error) {
      await this.log('DIAGNOSTIC FAILED', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      await this.pool.end();
      await this.log('=== PIPELINE DIAGNOSTIC END ===');
    }
  }

  private async testDatabase(): Promise<void> {
    await this.log('Testing database connectivity...');

    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      await this.log('Database connectivity OK');
    } catch (error) {
      await this.log('Database connectivity FAILED', { error });
      throw error;
    }
  }

  private async checkPendingItems(): Promise<void> {
    await this.log('Checking pending items...');

    try {
      const client = await this.pool.connect();
      const result = await client.query(`
        SELECT COUNT(*) as count,
               COUNT(CASE WHEN source IN ('CNBC', 'ZeroHedge', 'FinancialJuice', 'Finnhub') THEN 1 END) as relevant_count
        FROM news_items
        WHERE processing_status IN ('PENDING', 'raw')
        AND source NOT IN ('X -%', 'TradingEconomics', 'BLS')
      `);

      await this.log('Pending items check', {
        total: result.rows[0].count,
        relevant: result.rows[0].relevant_count
      });

      client.release();
    } catch (error) {
      await this.log('Pending items check FAILED', { error });
      throw error;
    }
  }

  private async testKiloCode(): Promise<void> {
    await this.log('Testing KiloCode...');

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Test 1: Version check
      await this.log('Testing KiloCode version...');
      const { stdout: version } = await execAsync('kilocode --version', { timeout: 5000 });
      await this.log('KiloCode version OK', { version: version.trim() });

      // Test 2: Simple chat
      await this.log('Testing simple KiloCode chat...');
      const tempDir = pathModule.join(process.cwd(), 'cache');
      await fs.mkdir(tempDir, { recursive: true });

      const testPrompt = pathModule.join(tempDir, `test_prompt_${Date.now()}.txt`);
      const testCache = pathModule.join(tempDir, `test_cache_${Date.now()}.md`);

      await fs.writeFile(testPrompt, 'Just say "Hello World"', 'utf-8');

      const command = `kilocode -m ask --auto --json "${testPrompt}" > "${testCache}"`;
      await this.log('Executing KiloCode command', { command });

      const startTime = Date.now();
      await execAsync(command, { timeout: 30000 });
      const duration = Date.now() - startTime;

      const output = await fs.readFile(testCache, 'utf-8');
      await this.log('KiloCode simple chat OK', {
        duration,
        outputLength: output.length,
        outputPreview: output.substring(0, 200)
      });

      // Cleanup
      await fs.unlink(testPrompt);
      await fs.unlink(testCache);

    } catch (error) {
      await this.log('KiloCode test FAILED', {
        error: error instanceof Error ? error.message : String(error),
        signal: (error as any).signal,
        code: (error as any).code
      });
      throw error;
    }
  }

  private async testMinimalFilter(): Promise<void> {
    await this.log('Testing minimal filter cycle...');

    try {
      const agent = new AgregatorFilterAgent();

      // Override the process method to avoid KiloCode
      const originalProcessBatch = agent.processBatch.bind(agent);
      agent.processBatch = async (batch: any) => {
        await this.log('Mock processBatch called', { batchSize: batch.length });
        // Just return without calling KiloCode
      };

      const startTime = Date.now();
      await agent.runFilterCycle();
      const duration = Date.now() - startTime;

      await this.log('Minimal filter cycle OK', { duration });

    } catch (error) {
      await this.log('Minimal filter cycle FAILED', { error });
      throw error;
    }
  }

  private async testFullFilterWithTimeout(): Promise<void> {
    await this.log('Testing full filter with timeout...');

    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(async () => {
        await this.log('Full filter test TIMEOUT');
        reject(new Error('Full filter test timeout after 60 seconds'));
      }, 60000);

      try {
        const agent = new AgregatorFilterAgent();

        const startTime = Date.now();
        await agent.runFilterCycle();
        const duration = Date.now() - startTime;

        clearTimeout(timeout);
        await this.log('Full filter cycle OK', { duration });
        resolve();

      } catch (error) {
        clearTimeout(timeout);
        await this.log('Full filter cycle FAILED', { error });
        reject(error);
      }
    });
  }
}

// Auto-run if executed directly
(async () => {
  const diagnostic = new PipelineDiagnostic();
  await diagnostic.runDiagnostic();
})();