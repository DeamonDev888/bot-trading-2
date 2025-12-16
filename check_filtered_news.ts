import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022',
});

async function checkFilteredNews() {
  const client = await pool.connect();
  try {
    // Requête exacte de l'AgregatorFilterAgent avec BLS inclus
    const res = await client.query(`
      SELECT id, title, content, source
      FROM news_items
      WHERE processing_status IN ('PENDING', 'raw')
      AND source NOT LIKE 'X -%'
      AND source NOT IN ('TradingEconomics')
      AND url NOT LIKE '%x.com%'
      AND url NOT LIKE '%twitter.com%'
      AND url NOT LIKE '%fixupx%'
      AND source IN ('MarketWatch', 'CNBC', 'ZeroHedge', 'Bloomberg', 'FinancialJuice', 'Financial Times', 'Reuters', 'Wall Street Journal', 'Finnhub', 'Kitco News', 'CoinDesk', 'Nikkei Asia', 'BLS')
      ORDER BY created_at DESC
      LIMIT 50
    `);

    console.log(`🎯 News correspondant aux critères de l'AgregatorFilterAgent: ${res.rows.length}`);

    // Distribution par source
    const bySource = {};
    res.rows.forEach(row => {
      bySource[row.source] = (bySource[row.source] || 0) + 1;
    });

    console.log('📡 Distribution:');
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`  - ${source}: ${count}`);
    });

    // Les 5 plus récentes
    console.log('\n🕐 5 plus récentes:');
    res.rows.slice(0, 5).forEach((row, i) => {
      console.log(`  ${i+1}. [${row.source}] ${row.title.substring(0, 80)}...`);
    });

    // Stats globales
    const totalPending = await client.query('SELECT COUNT(*) FROM news_items WHERE processing_status IN (\'PENDING\', \'raw\')');
    const excludedSources = await client.query(`
      SELECT source, COUNT(*)
      FROM news_items
      WHERE processing_status IN ('PENDING', 'raw')
      AND (source LIKE 'X -%' OR source IN ('BLS', 'TradingEconomics') OR url LIKE '%x.com%' OR url LIKE '%twitter.com%' OR url LIKE '%fixupx%')
      GROUP BY source
      ORDER BY COUNT(*) DESC
    `);

    console.log(`\n⚠️  Total en attente: ${totalPending.rows[0].count}`);
    console.log('❌ Sources exclues:');
    excludedSources.rows.forEach(row => {
      console.log(`  - ${row.source}: ${row.count}`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

checkFilteredNews().catch(console.error);