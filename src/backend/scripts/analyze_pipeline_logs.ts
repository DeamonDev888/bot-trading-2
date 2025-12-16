import fs from 'fs/promises';
import pathModule from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface LogEntry {
  timestamp: string;
  run_id: string;
  stage: string;
  action: string;
  status: string;
  duration?: number;
  details?: any;
  metrics?: any;
  correlation?: any;
  performance?: any;
  optimization?: any;
}

interface RunSummary {
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

class PipelineLogAnalyzer {
  private logPath: string;
  private summaryPath: string;
  private correlationPath: string;

  constructor() {
    this.logPath = pathModule.join(process.cwd(), 'logs', 'x_pipeline_detailed.jsonl');
    this.summaryPath = pathModule.join(process.cwd(), 'logs', 'x_pipeline_summaries.json');
    this.correlationPath = pathModule.join(process.cwd(), 'logs', 'x_pipeline_correlations.json');
  }

  async analyzeRecentRuns(hours: number = 24): Promise<void> {
    console.log(`🔍 Analyzing pipeline logs from last ${hours} hours...`);

    try {
      // Load recent summaries
      const summaries = await this.loadRecentSummaries(hours);

      if (summaries.length === 0) {
        console.log('❌ No recent pipeline runs found');
        return;
      }

      console.log(`📊 Found ${summaries.length} recent runs`);

      // Generate comprehensive analysis
      await this.generatePerformanceAnalysis(summaries);
      await this.generateErrorAnalysis(summaries);
      await this.generateOptimizationReport(summaries);
      await this.generateTrendAnalysis(summaries);

    } catch (error) {
      console.error('❌ Failed to analyze pipeline logs:', error);
    }
  }

  private async loadRecentSummaries(hours: number): Promise<RunSummary[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const data = await fs.readFile(this.summaryPath, 'utf-8');
      const summaries: RunSummary[] = JSON.parse(data);

      return summaries.filter(summary =>
        new Date(summary.start_time) >= cutoffTime
      );
    } catch {
      return [];
    }
  }

  private async generatePerformanceAnalysis(summaries: RunSummary[]): Promise<void> {
    console.log('\n📈 PERFORMANCE ANALYSIS');
    console.log('='.repeat(50));

    const avgDuration = summaries.reduce((sum, s) => sum + (s.total_duration || 0), 0) / summaries.length;
    const avgEfficiency = summaries.reduce((sum, s) => sum + s.efficiency_score, 0) / summaries.length;
    const totalItems = summaries.reduce((sum, s) => sum + s.total_items_processed, 0);

    console.log(`⏱️  Average Duration: ${Math.round(avgDuration)}ms`);
    console.log(`📊 Average Efficiency: ${Math.round(avgEfficiency)}%`);
    console.log(`📝 Total Items Processed: ${totalItems}`);
    console.log(`🧠 Total KiloCode Requests: ${summaries.reduce((sum, s) => sum + s.total_kilocode_requests, 0)}`);

    // Find best and worst performers
    const bestRun = summaries.reduce((best, current) =>
      current.efficiency_score > best.efficiency_score ? current : best
    );
    const worstRun = summaries.reduce((worst, current) =>
      current.efficiency_score < worst.efficiency_score ? current : worst
    );

    console.log(`\n🏆 Best Run: ${bestRun.run_id} (${bestRun.efficiency_score}% efficiency)`);
    console.log(`⚠️  Worst Run: ${worstRun.run_id} (${worstRun.efficiency_score}% efficiency)`);
  }

  private async generateErrorAnalysis(summaries: RunSummary[]): Promise<void> {
    console.log('\n❌ ERROR ANALYSIS');
    console.log('='.repeat(50));

    const allErrorPatterns = new Map<string, number>();

    summaries.forEach(summary => {
      summary.error_patterns.forEach(pattern => {
        const match = pattern.match(/^([^:]+):\s*(\d+)/);
        if (match) {
          const [, errorType, count] = match;
          allErrorPatterns.set(errorType, (allErrorPatterns.get(errorType) || 0) + parseInt(count));
        }
      });
    });

    console.log('Top Error Patterns:');
    Array.from(allErrorPatterns.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([errorType, count]) => {
        console.log(`   ${errorType}: ${count} occurrences`);
      });

    // Most common bottlenecks
    const bottleneckCounts = new Map<string, number>();
    summaries.forEach(summary => {
      summary.bottleneck_stages.forEach(bottleneck => {
        bottleneckCounts.set(bottleneck, (bottleneckCounts.get(bottleneck) || 0) + 1);
      });
    });

    console.log('\n🐌 Common Bottlenecks:');
    Array.from(bottleneckCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .forEach(([bottleneck, count]) => {
        console.log(`   ${bottleneck}: ${count} occurrences`);
      });
  }

  private async generateOptimizationReport(summaries: RunSummary[]): Promise<void> {
    console.log('\n🔧 OPTIMIZATION OPPORTUNITIES');
    console.log('='.repeat(50));

    const allSuggestions = new Map<string, number>();

    summaries.forEach(summary => {
      summary.optimization_suggestions.forEach(suggestion => {
        allSuggestions.set(suggestion, (allSuggestions.get(suggestion) || 0) + 1);
      });
    });

    console.log('Most Frequent Optimization Suggestions:');
    Array.from(allSuggestions.entries())
      .sort(([,a], [,b]) => b - a)
      .forEach(([suggestion, count]) => {
        console.log(`   ${suggestion}: ${count} runs`);
      });

    // Success rate analysis
    const successRates = summaries.map(s => ({
      run_id: s.run_id,
      success_rate: (s.success_stages / s.total_stages) * 100,
      efficiency_score: s.efficiency_score
    }));

    const avgSuccessRate = successRates.reduce((sum, s) => sum + s.success_rate, 0) / successRates.length;

    console.log(`\n📊 Average Success Rate: ${Math.round(avgSuccessRate)}%`);

    // Correlation between success rate and efficiency
    const highPerformers = successRates.filter(s => s.efficiency_score > 80);
    const lowPerformers = successRates.filter(s => s.efficiency_score < 50);

    if (highPerformers.length > 0) {
      const highPerformerSuccessRate = highPerformers.reduce((sum, s) => sum + s.success_rate, 0) / highPerformers.length;
      console.log(`🎯 High Performers (>80% efficiency): ${Math.round(highPerformerSuccessRate)}% success rate`);
    }

    if (lowPerformers.length > 0) {
      const lowPerformerSuccessRate = lowPerformers.reduce((sum, s) => sum + s.success_rate, 0) / lowPerformers.length;
      console.log(`⚠️  Low Performers (<50% efficiency): ${Math.round(lowPerformerSuccessRate)}% success rate`);
    }
  }

  private async generateTrendAnalysis(summaries: RunSummary[]): Promise<void> {
    console.log('\n📈 TREND ANALYSIS');
    console.log('='.repeat(50));

    // Sort by start time
    const sortedSummaries = summaries.sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    if (sortedSummaries.length < 2) {
      console.log('📊 Insufficient data for trend analysis (need at least 2 runs)');
      return;
    }

    // Calculate trends
    const firstHalf = sortedSummaries.slice(0, Math.floor(sortedSummaries.length / 2));
    const secondHalf = sortedSummaries.slice(Math.floor(sortedSummaries.length / 2));

    const firstHalfAvgEfficiency = firstHalf.reduce((sum, s) => sum + s.efficiency_score, 0) / firstHalf.length;
    const secondHalfAvgEfficiency = secondHalf.reduce((sum, s) => sum + s.efficiency_score, 0) / secondHalf.length;

    const firstHalfAvgDuration = firstHalf.reduce((sum, s) => sum + (s.total_duration || 0), 0) / firstHalf.length;
    const secondHalfAvgDuration = secondHalf.reduce((sum, s) => sum + (s.total_duration || 0), 0) / secondHalf.length;

    console.log(`📊 Efficiency Trend: ${firstHalfAvgEfficiency.toFixed(1)}% → ${secondHalfAvgEfficiency.toFixed(1)}%`);
    console.log(`⏱️  Duration Trend: ${Math.round(firstHalfAvgDuration)}ms → ${Math.round(secondHalfAvgDuration)}ms`);

    const efficiencyTrend = secondHalfAvgEfficiency - firstHalfAvgEfficiency;
    const durationTrend = secondHalfAvgDuration - firstHalfAvgDuration;

    if (efficiencyTrend > 5) {
      console.log(`📈 ✅ Improving efficiency (+${efficiencyTrend.toFixed(1)}%)`);
    } else if (efficiencyTrend < -5) {
      console.log(`📉 ⚠️  Declining efficiency (${efficiencyTrend.toFixed(1)}%)`);
    } else {
      console.log(`➡️  ↔️  Stable efficiency`);
    }

    if (durationTrend > 1000) {
      console.log(`📉 ⚠️  Getting slower (+${Math.round(durationTrend)}ms)`);
    } else if (durationTrend < -1000) {
      console.log(`📈 ✅ Getting faster (${Math.round(durationTrend)}ms faster)`);
    } else {
      console.log(`➡️  ↔️  Stable duration`);
    }
  }

  async analyzeCorrelations(): Promise<void> {
    console.log('\n🔗 CORRELATION ANALYSIS');
    console.log('='.repeat(50));

    try {
      const data = await fs.readFile(this.correlationPath, 'utf-8');
      const correlations: any[] = JSON.parse(data);

      if (correlations.length === 0) {
        console.log('📊 No correlation data available');
        return;
      }

      // Analyze feed performance
      console.log('\n📡 Feed Performance:');
      const feedStats = new Map<string, { success: number; failures: number; totalDuration: number }>();

      correlations.forEach(report => {
        if (report.feed_performance) {
          Object.entries(report.feed_performance).forEach(([feedName, stats]: [string, any]) => {
            if (!feedStats.has(feedName)) {
              feedStats.set(feedName, { success: 0, failures: 0, totalDuration: 0 });
            }

            const feedStat = feedStats.get(feedName)!;
            feedStat.totalDuration += stats.avg_duration || 0;

            if (stats.success_rate > 80) {
              feedStat.success++;
            } else {
              feedStat.failures++;
            }
          });
        }
      });

      feedStats.forEach((stats, feedName) => {
        const total = stats.success + stats.failures;
        const successRate = (stats.success / total) * 100;
        const avgDuration = stats.totalDuration / total;

        console.log(`   ${feedName}: ${successRate.toFixed(1)}% success rate, ${Math.round(avgDuration)}ms avg`);
      });

    } catch (error) {
      console.log('📊 No correlation data available');
    }
  }

  async generateDailyReport(): Promise<void> {
    console.log('\n📅 DAILY PIPELINE REPORT');
    console.log('='.repeat(60));

    await this.analyzeRecentRuns(24);
    await this.analyzeCorrelations();

    console.log('\n💡 RECOMMENDATIONS');
    console.log('='.repeat(50));

    // Generate actionable recommendations based on analysis
    console.log('🎯 Based on recent analysis:');
    console.log('   • Monitor KiloCode response times for optimization');
    console.log('   • Consider caching frequently accessed feeds');
    console.log('   • Implement retry logic for failed scraping attempts');
    console.log('   • Review error patterns for systematic improvements');
  }
}

// Auto-run if executed directly
(async () => {
  const analyzer = new PipelineLogAnalyzer();

  const hours = process.argv.includes('--24h') ? 24 :
                process.argv.includes('--12h') ? 12 : 6;

  console.log(`🔍 Pipeline Log Analyzer - Analyzing last ${hours} hours`);

  if (process.argv.includes('--daily-report')) {
    await analyzer.generateDailyReport();
  } else {
    await analyzer.analyzeRecentRuns(hours);
  }

  console.log('\n✅ Analysis completed');
})();