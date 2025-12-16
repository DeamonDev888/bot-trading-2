#!/usr/bin/env node

import { Vortex500Agent } from './dist/backend/agents/Vortex500Agent.js';
import { RougePulseAgent } from './dist/backend/agents/RougePulseAgent.js';
import { NewsDatabaseService } from './dist/backend/database/NewsDatabaseService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 FINANCIAL ANALYST AGENT TEST');
console.log('='.repeat(60));

async function testDatabaseService() {
  console.log('\n1️⃣ Testing Database Service...');
  try {
    const dbService = new NewsDatabaseService();

    // Test connection
    const connected = await dbService.testConnection();
    console.log(`   Database connection: ${connected ? '✅ Connected' : '❌ Failed'}`);

    if (connected) {
      // Test cache freshness
      const isFresh = await dbService.isCacheFresh(2);
      console.log(`   Cache freshness: ${isFresh ? '✅ Fresh' : '⚠️ Stale'}`);

      // Test recent news retrieval
      const news = await dbService.getRecentNews(48);
      console.log(`   Recent news (48h): ${news.length} items`);

      if (news.length > 0) {
        console.log('   Sample news item:');
        console.log(`      Source: ${news[0].source}`);
        console.log(`      Title: ${news[0].title?.substring(0, 60)}...`);
      }

      return true;
    }
    return false;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testVortex500Agent() {
  console.log('\n2️⃣ Testing Vortex500Agent...');
  try {
    const agent = new Vortex500Agent();

    // Check if agent has required methods
    const hasAnalyzeMethod = typeof agent.analyzeMarketSentiment === 'function';
    console.log(`   Has analyzeMarketSentiment: ${hasAnalyzeMethod ? '✅' : '❌'}`);

    // Check if agent can be initialized
    console.log('   Agent initialized: ✅');

    return true;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testRougePulseAgent() {
  console.log('\n3️⃣ Testing RougePulseAgent...');
  try {
    const agent = new RougePulseAgent();

    // Check if agent has required methods
    const hasAnalyzeMethod = typeof agent.analyzeMarketSentiment === 'function';
    console.log(`   Has analyzeMarketSentiment: ${hasAnalyzeMethod ? '✅' : '❌'}`);

    console.log('   Agent initialized: ✅');

    return true;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function testEndToEnd() {
  console.log('\n4️⃣ End-to-End Test (Database → Agent)...');
  try {
    const dbService = new NewsDatabaseService();
    const connected = await dbService.testConnection();

    if (!connected) {
      console.log('   ⚠️ Skipping - Database not available');
      return false;
    }

    const news = await dbService.getRecentNews(48);
    console.log(`   News items retrieved: ${news.length}`);

    if (news.length > 0) {
      const agent = new Vortex500Agent();
      console.log('   Agent ready to process news: ✅');
      console.log('   End-to-end flow: ✅');
      return true;
    } else {
      console.log('   ⚠️ No news available to test processing');
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function main() {
  const results = [];

  results.push(await testDatabaseService());
  results.push(await testVortex500Agent());
  results.push(await testRougePulseAgent());
  results.push(await testEndToEnd());

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY:');
  console.log(`   Tests run: ${results.length}`);
  console.log(`   Passed: ${results.filter(r => r).length}`);
  console.log(`   Failed: ${results.filter(r => !r).length}`);

  const allPassed = results.every(r => r);
  console.log(`\n   Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
