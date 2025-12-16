const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'financial_analyst',
  user: 'postgres',
  password: '9022'
});

async function checkDB() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking for high-scoring unpublished articles...');

    // Check articles with score >= 7
    const res = await client.query(`
      SELECT id, title, source, relevance_score, processing_status, published_to_discord, category
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 7
        AND NOT (category LIKE 'X-%' OR source LIKE 'X -%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%')
      ORDER BY published_at DESC
      LIMIT 10
    `);

    console.log(`📊 Found ${res.rows.length} articles with score >= 7:`);
    res.rows.forEach(r => {
      console.log(`  ${r.id}: Score=${r.relevance_score} | Published=${r.published_to_discord} | ${r.source}: ${r.title.substring(0, 60)}...`);
    });

    // Also check recent processed items
    const recentRes = await client.query(`
      SELECT id, title, source, relevance_score, processing_status, published_to_discord
      FROM news_items
      WHERE processing_status = 'processed'
      ORDER BY published_at DESC
      LIMIT 5
    `);

    console.log(`\n📈 Recent processed items:`);
    recentRes.rows.forEach(r => {
      console.log(`  ${r.id}: Score=${r.relevance_score} | Published=${r.published_to_discord} | ${r.source}: ${r.title.substring(0, 60)}...`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

checkDB().catch(console.error);