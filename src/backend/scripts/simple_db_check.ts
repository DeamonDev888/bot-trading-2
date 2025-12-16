import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function simpleDBCheck() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financial_analyst',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '9022',
  });

  try {
    const client = await pool.connect();

    // Quick count of all pending posts
    const totalPending = await client.query(`
      SELECT COUNT(*) as count
      FROM news_items
      WHERE processing_status IN ('PENDING', 'raw', 'filtered')
    `);

    // Count X posts specifically
    const xPosts = await client.query(`
      SELECT COUNT(*) as count
      FROM news_items
      WHERE source LIKE 'X -%'
      AND processing_status IN ('PENDING', 'raw', 'filtered')
    `);

    // Count by status
    const byStatus = await client.query(`
      SELECT processing_status, COUNT(*) as count
      FROM news_items
      WHERE processing_status IN ('PENDING', 'raw', 'filtered')
      GROUP BY processing_status
    `);

    // Find old posts (> 4 hours)
    const oldPosts = await client.query(`
      SELECT COUNT(*) as count
      FROM news_items
      WHERE processing_status IN ('PENDING', 'raw', 'filtered')
      AND created_at < NOW() - INTERVAL '4 hours'
    `);

    console.log('📊 DATABASE STATUS:');
    console.log(`   Total pending posts: ${totalPending.rows[0].count}`);
    console.log(`   X posts pending: ${xPosts.rows[0].count}`);
    console.log(`   Old posts (>4h): ${oldPosts.rows[0].count}`);
    console.log('\n📋 By status:');
    byStatus.rows.forEach(row => {
      console.log(`   ${row.processing_status}: ${row.count}`);
    });

    // Suggest cleanup if needed
    if (oldPosts.rows[0].count > 0) {
      console.log('\n🧹 CLEANUP SUGGESTION:');
      console.log('   Consider deleting old stuck posts');

      // Actually perform cleanup for posts older than 6 hours
      const deleteResult = await client.query(`
        DELETE FROM news_items
        WHERE processing_status IN ('PENDING', 'raw', 'filtered')
        AND created_at < NOW() - INTERVAL '6 hours'
      `);
      console.log(`   ✅ Deleted ${deleteResult.rowCount} old posts`);
    }

    client.release();
    console.log('\n✅ Database check completed');

  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await pool.end();
  }
}

simpleDBCheck().catch(console.error);