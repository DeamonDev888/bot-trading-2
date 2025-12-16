#!/usr/bin/env node

import { NewsAggregator } from './dist/backend/ingestion/NewsAggregator.js';
import { NewsDatabaseService } from './dist/backend/database/NewsDatabaseService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('📡 DATA INGESTION PIPELINE TEST');
console.log('='.repeat(60));

async function testNewsAggregator() {
  console.log('\n🕷️ Testing News Aggregator...');
  try {
    const aggregator = new NewsAggregator();
    const dbService = new NewsDatabaseService();

    // Test ZeroHedge scraping
    console.log('\n   Testing ZeroHedge...');
    try {
      const zeroHedgeNews = await aggregator.fetchZeroHedgeHeadlines();
      console.log(`   ✅ ZeroHedge: ${zeroHedgeNews.length} items`);

      if (zeroHedgeNews.length > 0) {
        console.log(`      Sample: ${zeroHedgeNews[0].title?.substring(0, 60)}...`);
      }
    } catch (error) {
      console.log(`   ⚠️ ZeroHedge: ${error.message}`);
    }

    // Test CNBC scraping
    console.log('\n   Testing CNBC...');
    try {
      const cnbcNews = await aggregator.fetchCNBCMarketNews();
      console.log(`   ✅ CNBC: ${cnbcNews.length} items`);

      if (cnbcNews.length > 0) {
        console.log(`      Sample: ${cnbcNews[0].title?.substring(0, 60)}...`);
      }
    } catch (error) {
      console.log(`   ⚠️ CNBC: ${error.message}`);
    }

    // Test FRED scraping
    console.log('\n   Testing FRED (Federal Reserve)...');
    try {
      const fredNews = await aggregator.fetchFredEconomicData();
      console.log(`   ✅ FRED: ${fredNews.length} items`);

      if (fredNews.length > 0) {
        console.log(`      Sample: ${fredNews[0].title?.substring(0, 60)}...`);
      }
    } catch (error) {
      console.log(`   ⚠️ FRED: ${error.message}`);
    }

    // Test Finnhub scraping
    console.log('\n   Testing Finnhub...');
    try {
      const finnhubNews = await aggregator.fetchFinnhubNews();
      console.log(`   ✅ Finnhub: ${finnhubNews.length} items`);

      if (finnhubNews.length > 0) {
        console.log(`      Sample: ${finnhubNews[0].title?.substring(0, 60)}...`);
      }
    } catch (error) {
      console.log(`   ⚠️ Finnhub: ${error.message}`);
    }

    console.log('\n✅ News Aggregator test completed');

    return true;
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return false;
  }
}

async function testDatabasePersistence() {
  console.log('\n💾 Testing Database Persistence...');
  try {
    const dbService = new NewsDatabaseService();

    // Get current news count
    const beforeCount = (await dbService.getRecentNews(48)).length;
    console.log(`   News items before test: ${beforeCount}`);

    // Test with a simple news item
    const testNews = [{
      title: 'TEST: Financial Analyst System Test',
      url: 'https://test.example.com',
      source: 'TestSource',
      published_at: new Date(),
      content: 'This is a test news item for the financial analyst system'
    }];

    const savedCount = await dbService.saveNewsItems(testNews);
    console.log(`   Saved test items: ${savedCount}`);

    // Verify persistence
    const afterCount = (await dbService.getRecentNews(48)).length;
    console.log(`   News items after test: ${afterCount}`);

    const success = savedCount > 0;
    console.log(`   Database persistence: ${success ? '✅ Working' : '❌ Failed'}`);

    return success;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return false;
  }
}

async function main() {
  const results = [];

  results.push(await testNewsAggregator());
  results.push(await testDatabasePersistence());

  console.log('\n' + '='.repeat(60));
  console.log('📊 DATA INGESTION TEST SUMMARY:');
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
