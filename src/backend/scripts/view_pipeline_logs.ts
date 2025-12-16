import fs from 'fs/promises';
import pathModule from 'path';

async function viewLatestLogs() {
  console.log('📋 LATEST PIPELINE LOGS');
  console.log('='.repeat(60));

  const logPath = pathModule.join(process.cwd(), 'logs', 'x_pipeline_detailed.jsonl');
  const summaryPath = pathModule.join(process.cwd(), 'logs', 'x_pipeline_summaries.json');

  try {
    // Check if logs exist
    try {
      await fs.access(logPath);
    } catch {
      console.log('📝 No pipeline logs found yet. Run the pipeline first!');
      return;
    }

    // Read last 50 log entries
    const data = await fs.readFile(logPath, 'utf-8');
    const lines = data.trim().split('\n');
    const lastLines = lines.slice(-50);

    console.log(`\n📊 Showing last ${lastLines.length} log entries:`);

    lastLines.forEach((line, index) => {
      try {
        const entry = JSON.parse(line);
        const status = entry.status === 'SUCCESS' ? '✅' :
                       entry.status === 'ERROR' ? '❌' :
                       entry.status === 'START' ? '🚀' : '⏸️';

        console.log(`${status} [${entry.stage}] ${entry.action} ${entry.duration ? `(${entry.duration}ms)` : ''}`);

        if (entry.details && Object.keys(entry.details).length > 0) {
          const key = Object.keys(entry.details)[0];
          const value = entry.details[key];
          console.log(`    ${key}: ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
        }

        if (entry.action === 'KILOCODE_EXECUTION') {
          console.log(`    Approach: ${entry.details?.approach}`);
          console.log(`    Prompt→Response: ${entry.details?.prompt_length}→${entry.details?.response_length} chars`);
        }

      } catch (error) {
        console.log(`❌ Invalid log entry at line ${index + 1}`);
      }
    });

    // Show latest summary if available
    try {
      const summaryData = await fs.readFile(summaryPath, 'utf-8');
      const summaries = JSON.parse(summaryData);

      if (summaries.length > 0) {
        const latestSummary = summaries[summaries.length - 1];
        console.log('\n📈 LATEST RUN SUMMARY:');
        console.log(`   Run ID: ${latestSummary.run_id}`);
        console.log(`   Duration: ${latestSummary.total_duration}ms`);
        console.log(`   Efficiency: ${latestSummary.efficiency_score}%`);
        console.log(`   Items Processed: ${latestSummary.total_items_processed}`);
        console.log(`   Success Rate: ${Math.round((latestSummary.success_stages / latestSummary.total_stages) * 100)}%`);

        if (latestSummary.bottleneck_stages.length > 0) {
          console.log(`   Bottlenecks: ${latestSummary.bottleneck_stages.join(', ')}`);
        }

        if (latestSummary.optimization_suggestions.length > 0) {
          console.log(`   Suggestions: ${latestSummary.optimization_suggestions.slice(0, 3).join(', ')}`);
        }
      }
    } catch {
      console.log('\n📝 No summaries available yet');
    }

  } catch (error) {
    console.error('❌ Error reading logs:', error);
  }
}

// Run if executed directly
viewLatestLogs().catch(console.error);