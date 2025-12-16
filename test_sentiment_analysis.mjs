#!/usr/bin/env node

import { Vortex500Agent } from './dist/backend/agents/Vortex500Agent.js';
import { NewsDatabaseService } from './dist/backend/database/NewsDatabaseService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🎯 SENTIMENT ANALYSIS TEST');
console.log('='.repeat(60));

async function testSentimentAnalysis() {
  console.log('\n🔍 Running Vortex500Agent Sentiment Analysis...');
  console.log('This will use KiloCode AI to analyze market sentiment\n');

  try {
    const agent = new Vortex500Agent();
    const result = await agent.analyzeMarketSentiment(false);

    console.log('\n✅ ANALYSIS COMPLETED!');
    console.log('='.repeat(60));
    console.log('\n📊 RESULT:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n🎯 KEY METRICS:');
    if (result.sentiment) {
      console.log(`   Sentiment: ${result.sentiment}`);
    }
    if (result.score !== undefined) {
      console.log(`   Score: ${result.score}/100`);
    }
    if (result.risk_level) {
      console.log(`   Risk Level: ${result.risk_level}`);
    }
    if (result.confidence) {
      console.log(`   Confidence: ${result.confidence}%`);
    }
    if (result.news_count) {
      console.log(`   News Items Analyzed: ${result.news_count}`);
    }
    if (result.catalysts && result.catalysts.length > 0) {
      console.log(`\n📈 TOP CATALYSTS:`);
      result.catalysts.slice(0, 5).forEach((catalyst, i) => {
        console.log(`   ${i + 1}. ${catalyst}`);
      });
    }
    if (result.summary) {
      console.log(`\n📝 SUMMARY:`);
      console.log(`   ${result.summary}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Sentiment analysis test PASSED');

    return true;
  } catch (error) {
    console.error('\n❌ ANALYSIS FAILED:');
    console.error(`Error: ${error.message}`);
    console.error('\nStack trace:');
    console.error(error.stack);

    return false;
  }
}

async function main() {
  const success = await testSentimentAnalysis();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
