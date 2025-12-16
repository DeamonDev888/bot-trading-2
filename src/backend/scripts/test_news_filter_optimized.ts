import { NewsFilterAgentOptimized } from '../agents/NewsFilterAgentOptimized.js';

async function testNewsFilterOptimized() {
  console.log('🧪 Testing NewsFilterAgentOptimized with improved KiloCode handling...');

  const agent = new NewsFilterAgentOptimized();

  try {
    // Test with a small batch
    console.log('📝 Starting optimized filter cycle...');
    const startTime = Date.now();

    await agent.runFilterCycle();

    const duration = Date.now() - startTime;
    console.log(`✅ Test completed successfully in ${duration}ms`);

    await agent.close();
    console.log('🔚 Agent closed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);

    try {
      await agent.close();
    } catch (closeError) {
      console.error('❌ Failed to close agent:', closeError);
    }

    process.exit(1);
  }
}

// Auto-run if executed directly
testNewsFilterOptimized();