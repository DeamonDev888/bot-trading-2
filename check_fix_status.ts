
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022',
});

async function check() {
  const client = await pool.connect();
  try {
    console.log('--- Checking Recent Activity (Accessing Fix Results) ---');
    
    // 1. Check for Archived Future Items
    const archivedFuture = await client.query(`
      SELECT count(*) as count, max(updated_at) as last_update
      FROM news_items
      WHERE processing_status = 'archived'
      AND content LIKE '%Future dated item%'
      AND updated_at > NOW() - INTERVAL '1 hour'
    `);
    console.log(`🗑️ Archived Future Items (Last 1h): ${archivedFuture.rows[0].count} (Last: ${archivedFuture.rows[0].last_update})`);

    // 2. Check for New X Items
    const newXItems = await client.query(`
      SELECT count(*) as count, max(created_at) as last_created, string_agg(DISTINCT source, ', ') as sources
      FROM news_items
      WHERE (category LIKE 'X-%' OR source LIKE '%Twitter%' OR source LIKE '%X%')
      AND created_at > NOW() - INTERVAL '1 hour'
    `);
    console.log(`🐦 New X Items (Last 1h): ${newXItems.rows[0].count} (Last: ${newXItems.rows[0].last_created})`);
    console.log(`   Sources: ${newXItems.rows[0].sources}`);

    // 3. Check for Ready to Publish items (Optimized Publisher)
    const readyToPublish = await client.query(`
        SELECT count(*) as count 
        FROM news_items
        WHERE processing_status = 'processed'
          AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
          AND relevance_score >= 7
          AND published_at >= NOW() - INTERVAL '24 hours'
    `);
    console.log(`📢 Ready to Publish (Score >= 7): ${readyToPublish.rows[0].count}`);

  } catch (err) {
    console.error('Error checking DB:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
