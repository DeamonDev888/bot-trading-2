const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'financial_analyst',
  user: 'postgres',
  password: '9022'
});

async function testPublisherQuery() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testing exact publisher query...');

    const query = `
      SELECT
        id,
        title,
        content,
        source,
        url,
        published_at,
        relevance_score,
        category,
        published_to_discord,
        processing_status
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 7
        AND NOT (
            category LIKE 'X-%' OR
            source LIKE 'X -%' OR
            url LIKE '%twitter%' OR
            url LIKE '%x.com%' OR
            url LIKE '%fixupx%'
        )
      ORDER BY published_at DESC
      LIMIT 20
    `;

    const res = await client.query(query);
    console.log(`📊 Publisher query found ${res.rows.length} articles:`);
    res.rows.forEach(r => {
      console.log(`  ${r.id}: Score=${r.relevance_score} | Published=${r.published_to_discord} | Status=${r.processing_status} | ${r.source}: ${r.title.substring(0, 60)}...`);
    });

    // Also check raw conditions
    console.log('\n🔍 Raw check for TradingEconomics article...');
    const rawCheck = await client.query(`
      SELECT id, title, source, relevance_score, published_to_discord, processing_status, category
      FROM news_items
      WHERE source = 'TradingEconomics'
        AND published_to_discord = false
        AND relevance_score >= 7
    `);
    console.log(`Found ${rawCheck.rows.length} TradingEconomics articles with published_to_discord = false:`);
    rawCheck.rows.forEach(r => {
      console.log(`  ${r.id}: Score=${r.relevance_score} | Published=${r.published_to_discord} | Category=${r.category}`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

testPublisherQuery().catch(console.error);