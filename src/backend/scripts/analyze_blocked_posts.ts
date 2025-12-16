import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function analyzeBlockedPosts() {
  console.log('🔍 ANALYZING BLOCKED POSTS IN DATABASE...');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financial_analyst',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '9022',
  });

  try {
    const client = await pool.connect();

    // Count total pending posts
    const totalPending = await client.query(`
      SELECT COUNT(*) as count
      FROM news_items
      WHERE processing_status IN ('PENDING', 'raw', 'filtered')
    `);
    console.log(`📊 Total pending posts: ${totalPending.rows[0].count}`);

    // Count by source
    const bySource = await client.query(`
      SELECT source, processing_status, COUNT(*) as count
      FROM news_items
      WHERE processing_status IN ('PENDING', 'raw', 'filtered')
      GROUP BY source, processing_status
      ORDER BY count DESC
    `);
    console.log('\n📋 Posts by source:');
    bySource.rows.forEach(row => {
      console.log(`   ${row.source}: ${row.count} (${row.processing_status})`);
    });

    // Find posts stuck for more than 2 hours
    const oldPosts = await client.query(`
      SELECT
        source,
        COUNT(*) as count,
        MIN(created_at) as oldest_post,
        MAX(created_at) as newest_post
      FROM news_items
      WHERE processing_status IN ('PENDING', 'raw', 'filtered')
      AND created_at < NOW() - INTERVAL '2 hours'
      GROUP BY source
      ORDER BY count DESC
    `);
    console.log('\n⏰ Posts older than 2 hours:');
    oldPosts.rows.forEach(row => {
      console.log(`   ${row.source}: ${row.count} posts`);
      console.log(`     Oldest: ${row.oldest_post}`);
      console.log(`     Newest: ${row.newest_post}`);
    });

    // Find X-specific posts
    const xPosts = await client.query(`
      SELECT
        processing_status,
        COUNT(*) as count,
        MIN(created_at) as oldest_post,
        MAX(created_at) as newest_post
      FROM news_items
      WHERE source LIKE 'X -%'
      AND processing_status IN ('PENDING', 'raw', 'filtered')
      GROUP BY processing_status
      ORDER BY count DESC
    `);
    console.log('\n🐦 X posts by status:');
    xPosts.rows.forEach(row => {
      console.log(`   ${row.processing_status}: ${row.count} posts`);
      if (row.oldest_post) console.log(`     Oldest: ${row.oldest_post}`);
    });

    // Find potential issues
    const issues = await client.query(`
      SELECT
        id,
        source,
        processing_status,
        created_at,
        title
      FROM news_items
      WHERE processing_status IN ('PENDING', 'raw', 'filtered')
      AND created_at < NOW() - INTERVAL '6 hours'
      AND source LIKE 'X -%'
      LIMIT 10
    `);
    if (issues.rows.length > 0) {
      console.log('\n❌ Potentially stuck X posts (>6 hours):');
      issues.rows.forEach(row => {
        console.log(`   ${row.id}: ${row.source}`);
        console.log(`     Status: ${row.processing_status}`);
        console.log(`     Created: ${row.created_at}`);
        console.log(`     Title: ${row.title.substring(0, 80)}...`);
        console.log('');
      });
    }

    // Suggest cleanup actions
    console.log('\n🛠️ SUGGESTED ACTIONS:');

    if (oldPosts.rows.length > 0) {
      console.log('1. Delete posts older than 12 hours:');
      const deleteSql = `
        DELETE FROM news_items
        WHERE processing_status IN ('PENDING', 'raw', 'filtered')
        AND created_at < NOW() - INTERVAL '12 hours'
        AND source LIKE 'X -%'
      `;
      console.log(`   ${deleteSql}`);
    }

    console.log('2. Reset old pending posts to raw:');
    const resetSql = `
      UPDATE news_items
      SET processing_status = 'raw'
      WHERE processing_status = 'PENDING'
      AND created_at < NOW() - INTERVAL '1 hour'
    `;
    console.log(`   ${resetSql}`);

    console.log('3. Check recent processing activity:');
    const recentActivity = await client.query(`
      SELECT
        created_at,
        processing_status,
        COUNT(*) as count
      FROM news_items
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY created_at::date, processing_status
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log('   Recent 24h activity:');
    recentActivity.rows.forEach(row => {
      console.log(`     ${row.created_at}: ${row.count} (${row.processing_status})`);
    });

    client.release();
    console.log('\n✅ Analysis completed');

  } catch (error) {
    console.error('❌ Database analysis failed:', error);
  } finally {
    await pool.end();
  }
}

// Auto-run if executed directly
analyzeBlockedPosts().catch(error => {
  console.error('🔥 Fatal error:', error);
  process.exit(1);
});