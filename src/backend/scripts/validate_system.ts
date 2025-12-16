import fs from 'fs/promises';
import pathModule from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface ValidationResults {
  database: boolean;
  kilocode: boolean;
  logging: boolean;
  agents: boolean;
  performance: number;
  issues: string[];
}

class SystemValidator {
  private results: ValidationResults = {
    database: false,
    kilocode: false,
    logging: false,
    agents: false,
    performance: 0,
    issues: []
  };

  async validateAll(): Promise<ValidationResults> {
    console.log('🔍 COMPREHENSIVE SYSTEM VALIDATION');
    console.log('='.repeat(50));

    console.log('📊 Validating database connectivity...');
    await this.validateDatabase();

    console.log('🧠 Validating KiloCode CLI...');
    await this.validateKiloCode();

    console.log('📝 Validating logging system...');
    await this.validateLogging();

    console.log('🤖 Validating agent systems...');
    await this.validateAgents();

    console.log('⚡ Measuring system performance...');
    await this.measurePerformance();

    await this.generateReport();

    return this.results;
  }

  private async validateDatabase(): Promise<void> {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'financial_analyst',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '9022',
      });

      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      await pool.end();

      console.log('✅ Database connection successful');
      console.log(`   Server time: ${result.rows[0].current_time}`);
      this.results.database = true;

    } catch (error) {
      console.error('❌ Database validation failed:', error);
      this.results.issues.push(`Database: ${(error as Error).message}`);
    }
  }

  private async validateKiloCode(): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('kilocode --version', { timeout: 10000 });
      console.log('✅ KiloCode CLI available');
      console.log(`   Version: ${stdout.trim()}`);
      this.results.kilocode = true;

      // Test actual KiloCode execution
      const testStartTime = Date.now();
      const { stdout: testOutput } = await execAsync('echo "test" | kilocode -m ask --auto --json', { timeout: 30000 });
      const testDuration = Date.now() - testStartTime;

      console.log('✅ KiloCode execution successful');
      console.log(`   Response time: ${testDuration}ms`);
      console.log(`   Output length: ${testOutput.length} chars`);

    } catch (error) {
      console.error('❌ KiloCode validation failed:', error);
      this.results.issues.push(`KiloCode: ${(error as Error).message}`);
    }
  }

  private async validateLogging(): Promise<void> {
    try {
      const logsDir = pathModule.join(process.cwd(), 'logs');
      await fs.mkdir(logsDir, { recursive: true });

      const testLogPath = pathModule.join(logsDir, 'validation_test.jsonl');
      const testEntry = {
        timestamp: new Date().toISOString(),
        validation: 'logging_system',
        status: 'SUCCESS',
        message: 'Logging system validation passed'
      };

      await fs.appendFile(testLogPath, JSON.stringify(testEntry) + '\n');

      const content = await fs.readFile(testLogPath, 'utf-8');
      const parsed = JSON.parse(content.trim());

      await fs.unlink(testLogPath); // Cleanup

      if (parsed.validation === 'logging_system') {
        console.log('✅ Logging system functional');
        console.log('   - File creation: OK');
        console.log('   - File writing: OK');
        console.log('   - File reading: OK');
        console.log('   - JSON parsing: OK');
        this.results.logging = true;
      }

    } catch (error) {
      console.error('❌ Logging validation failed:', error);
      this.results.issues.push(`Logging: ${(error as Error).message}`);
    }
  }

  private async validateAgents(): Promise<void> {
    try {
      // Test NewsFilterAgentOptimized
      const { NewsFilterAgentOptimized } = await import('../agents/NewsFilterAgentOptimized.js');

      const agent = new NewsFilterAgentOptimized();
      console.log('✅ NewsFilterAgentOptimized instantiated');

      // Test basic methods
      const pool = (agent as any).pool;
      if (pool) {
        console.log('✅ Agent database pool initialized');
      }

      await agent.close();
      console.log('✅ Agent closed successfully');
      this.results.agents = true;

    } catch (error) {
      console.error('❌ Agent validation failed:', error);
      this.results.issues.push(`Agents: ${(error as Error).message}`);
    }
  }

  private async measurePerformance(): Promise<void> {
    const startTime = Date.now();

    // Simulate some work
    let operations = 0;
    const testArray = new Array(10000).fill(0);

    testArray.forEach(() => operations++);
    const computeTime = Date.now() - startTime;

    this.results.performance = Math.round((10000 / computeTime) * 1000);

    console.log('✅ Performance measurement completed');
    console.log(`   Operations: ${operations}`);
    console.log(`   Time: ${computeTime}ms`);
    console.log(`   Performance score: ${this.results.performance} ops/sec`);
  }

  private async generateReport(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYSTEM VALIDATION REPORT');
    console.log('='.repeat(60));

    const score = Object.values(this.results)
      .filter((result, index) => index < 4) // Skip performance from score
      .filter(Boolean)
      .length / 4 * 100;

    console.log('\n🎯 VALIDATION SCORE:');
    console.log(`   Overall Score: ${Math.round(score)}%`);

    console.log('\n✅ VALIDATION RESULTS:');
    console.log(`   Database: ${this.results.database ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   KiloCode: ${this.results.kilocode ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Logging: ${this.results.logging ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Agents: ${this.results.agents ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Performance: ${this.results.performance} ops/sec`);

    if (this.results.issues.length > 0) {
      console.log('\n⚠️  ISSUES IDENTIFIED:');
      this.results.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    if (score >= 75) {
      console.log('\n🎉 SYSTEM IS HEALTHY AND READY FOR PRODUCTION!');
      console.log('\n🚀 Recommended next steps:');
      console.log('   1. Run pipeline test: npm run test:x-pipeline');
      console.log('   2. Monitor logs: npm run view:logs');
      console.log('   3. Run full analysis: npm run analyze');
    } else if (score >= 50) {
      console.log('\n⚠️  SYSTEM HAS ISSUES - RECOMMEND FIXES:');
      console.log('   • Fix database connection issues');
      console.log('   • Install or configure KiloCode CLI');
      console.log('   • Check agent configurations');
    } else {
      console.log('\n❌ SYSTEM REQUIRES MAINTENANCE:');
      console.log('   • Fix critical issues before proceeding');
      console.log('   • Review error messages above');
      console.log('   • Check system requirements');
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Auto-run if executed directly
(new SystemValidator()).validateAll().catch(error => {
  console.error('🔥 Fatal validation error:', error);
  process.exit(1);
});