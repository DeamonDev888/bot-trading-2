const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'financial_analyst',
  user: 'postgres',
  password: '9022'
});

async function checkTradingEconomicsStatus() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking TradingEconomics articles status...');

    const res = await client.query(`
      SELECT id, title, source, relevance_score, published_to_discord, processing_status, category
      FROM news_items
      WHERE source = 'TradingEconomics'
        AND relevance_score >= 7
        AND published_to_discord = false
      ORDER BY published_at DESC
      LIMIT 10
    `);

    console.log(`Found ${res.rows.length} TradingEconomics articles:`);
    res.rows.forEach(r => {
      console.log(`  ${r.id}: Score=${r.relevance_score} | Published=${r.published_to_discord} | Status=${r.processing_status} | Category=${r.category}`);
    });

    // Test the exact publisher query for one specific TradingEconomics article
    console.log('\n🔍 Testing publisher query for TradingEconomics articles...');
    const testQuery = `
      SELECT
        id,
        title,
        source,
        relevance_score,
        published_to_discord,
        processing_status,
        category
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
        AND source = 'TradingEconomics'
      LIMIT 5
    `;

    const testRes = await client.query(testQuery);
    console.log(`Publisher query found ${testRes.rows.length} TradingEconomics articles:`);
    testRes.rows.forEach(r => {
      console.log(`  ${r.id}: Score=${r.relevance_score} | Status=${r.processing_status} | Published=${r.published_to_discord}`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

checkTradingEconomicsStatus().catch(console.error);