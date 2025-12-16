import { NewsFilterAgentOptimized } from '../agents/NewsFilterAgentOptimized.js';

async function testDatabaseStage() {
  console.log('🧪 STAGE 1: DATABASE CONNECTION TEST...');

  const agent = new NewsFilterAgentOptimized();

  try {
    const pool = (agent as any).pool;
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN source LIKE 'X -%' THEN 1 END) as x_items
      FROM news_items
      WHERE processing_status IN ('PENDING', 'raw')
      AND created_at > NOW() - INTERVAL '24 hours'
    `);

    console.log(`✅ Database connected. Pending items: ${result.rows[0].total} (${result.rows[0].x_items} X-sources)`);
    await agent.close();
    return { success: true, data: result.rows[0] };

  } catch (error) {
    console.error(`❌ Database test failed:`, error);
    try { await agent.close(); } catch {}
    return { success: false, error };
  }
}

async function testKiloCodeStage() {
  console.log('🧪 STAGE 2: KILOCODE CONNECTION TEST...');

  try {
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');

    const execAsync = promisify(exec);
    const cacheDir = pathModule.join(process.cwd(), 'cache');
    await fs.mkdir(cacheDir, { recursive: true });

    const testPrompt = pathModule.join(cacheDir, `test_x_prompt_${Date.now()}.txt`);
    const testCache = pathModule.join(cacheDir, `test_x_cache_${Date.now()}.md`);

    await fs.writeFile(testPrompt, 'Analyze this: "Bitcoin hits $50,000 - huge rally!"', 'utf-8');

    const env = {
      ...process.env,
      PATH: process.platform === 'win32'
        ? `${process.env.PATH};C:\\Program Files\\Git\\cmd`
        : `${process.env.PATH}:/mnt/c/Program Files/Git/cmd`
    };

    const command = `kilocode -m ask --auto --json "${testPrompt}" > "${testCache}"`;
    console.log(`🔧 Executing: ${command}`);

    const startTime = Date.now();
    await execAsync(command, { timeout: 30000, env });
    const duration = Date.now() - startTime;

    const output = await fs.readFile(testCache, 'utf-8');
    console.log(`✅ KiloCode succeeded (${duration}ms)`);
    console.log(`📝 Output length: ${output.length} chars`);

    // Cleanup
    try {
      await fs.unlink(testPrompt);
      await fs.unlink(testCache);
    } catch {}

    return { success: true, data: { duration, outputLength: output.length } };

  } catch (error) {
    console.error(`❌ KiloCode test failed:`, error);
    return { success: false, error };
  }
}

async function testSmallBatchStage() {
  console.log('🧪 STAGE 3: SMALL BATCH PROCESSING TEST...');

  const agent = new NewsFilterAgentOptimized();

  try {
    // Mock a small batch
    const originalFetch = agent.fetchPendingItems;
    (agent as any).fetchPendingItems = async () => {
      console.log('📝 Mock fetch: returning 1 X item...');
      return [{
        id: 'test-x-item-' + Date.now(),
        title: 'X Test - Bitcoin surges 10%',
        content: 'Bitcoin surges 10% as institutions rush to crypto',
        source: 'X - CryptoNews'
      }];
    };

    const startTime = Date.now();
    await agent.runFilterCycle();
    const duration = Date.now() - startTime;

    (agent as any).fetchPendingItems = originalFetch;
    await agent.close();

    console.log(`✅ Small batch test completed in ${duration}ms`);
    return { success: true, data: { duration } };

  } catch (error) {
    console.error(`❌ Small batch test failed:`, error);
    try { await agent.close(); } catch {}
    return { success: false, error };
  }
}

async function testCleanupStage() {
  console.log('🧪 STAGE 4: DATABASE CLEANUP TEST...');

  const agent = new NewsFilterAgentOptimized();

  try {
    const pool = (agent as any).pool;

    const beforeResult = await pool.query(`
      SELECT COUNT(*) as old_records
      FROM news_items
      WHERE created_at < NOW() - INTERVAL '72 hours'
    `);

    const deleteResult = await pool.query(`
      DELETE FROM news_items
      WHERE source LIKE 'X -%'
      AND created_at < NOW() - INTERVAL '48 hours'
      RETURNING COUNT(*) as deleted
    `);

    const afterResult = await pool.query(`
      SELECT COUNT(*) as remaining_records
      FROM news_items
      WHERE source LIKE 'X -%'
    `);

    console.log(`🗑️ Cleanup completed:`);
    console.log(`   - Old records: ${beforeResult.rows[0].old_records}`);
    console.log(`   - Deleted: ${deleteResult.rows[0].deleted}`);
    console.log(`   - Remaining: ${afterResult.rows[0].remaining_records}`);

    await agent.close();
    return { success: true, data: {
      oldRecordsBefore: beforeResult.rows[0].old_records,
      deleted: deleteResult.rows[0].deleted,
      remaining: afterResult.rows[0].remaining_records
    }};

  } catch (error) {
    console.error(`❌ Cleanup test failed:`, error);
    try { await agent.close(); } catch {}
    return { success: false, error };
  }
}

async function runAllTests() {
  console.log('🚀 X PIPELINE TESTING STARTED...');
  console.log('='.repeat(50));

  const results = [
    { name: 'Database Connection', test: testDatabaseStage },
    { name: 'KiloCode Connection', test: testKiloCodeStage },
    { name: 'Small Batch Processing', test: testSmallBatchStage },
    { name: 'Database Cleanup', test: testCleanupStage }
  ];

  const testResults: any[] = [];

  for (const { name, test } of results) {
    try {
      const result = await test();
      testResults.push({ name, ...result });

      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${name}`);

      if (result.error) {
        console.log(`   Error: ${(result.error as any).message || result.error}`);
      }
      if (result.data) {
        console.log(`   Data:`, result.data);
      }
    } catch (error) {
      testResults.push({ name, success: false, error });
      console.log(`❌ FAIL ${name}:`, error);
    }
    console.log('-'.repeat(30));
  }

  const passedTests = testResults.filter(r => r.success).length;
  console.log(`\n🏆 RESULT: ${passedTests}/${results.length} tests passed`);

  if (passedTests === results.length) {
    console.log('🎉 ALL TESTS PASSED - X pipeline ready!');
  } else {
    console.log('⚠️  Some tests failed - check errors above.');
  }

  process.exit(passedTests === results.length ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('🔥 FATAL ERROR:', error);
  process.exit(1);
});