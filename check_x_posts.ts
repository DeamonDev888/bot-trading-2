
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
    console.log('--- Checking Recent X Posts ---');
    
    // Check for items created in the last hour
    const res = await client.query(`
      SELECT count(*) as count
      FROM news_items
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    `);
    console.log(`Total items created in last hour: ${res.rows[0].count}`);

    // Detail X items
    const resX = await client.query(`
      SELECT id, title, source, relevance_score, processing_status
      FROM news_items
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      AND (source LIKE '%Tw%' OR source LIKE '%X%')
      ORDER BY relevance_score DESC
      LIMIT 10
    `);
    
    console.log(`Recent X items: ${resX.rows.length}`);
    for(const item of resX.rows) {
        console.log(`[${item.source}] ${item.relevance_score}/10 (${item.processing_status})`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
