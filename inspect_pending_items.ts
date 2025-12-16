
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
    console.log('--- Inspecting Pending Items ---');
    
    const res = await client.query(`
        SELECT
          id,
          title,
          source,
          url,
          category,
          published_at,
          relevance_score,
          EXTRACT(EPOCH FROM (NOW() - published_at))/3600 as hours_ago
        FROM news_items
        WHERE processing_status = 'processed'
          AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
          AND relevance_score >= 7
          AND published_at >= NOW() - INTERVAL '24 hours'
        ORDER BY published_at DESC
        LIMIT 5
    `);

    console.log(`Complex Query found ${res.rows.length} items.`);
    if (res.rows.length > 0) {
        for (const item of res.rows) {
            console.log(`ID: ${item.id}`);
            console.log(`[${item.source}] ${item.title} (Cat: ${item.category}) URL: ${item.url}`);
            console.log('---');
        }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
