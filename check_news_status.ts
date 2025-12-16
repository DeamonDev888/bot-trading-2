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

async function checkNews() {
  const client = await pool.connect();
  try {
    // Total news
    const total = await client.query('SELECT COUNT(*) FROM news_items');
    console.log('📰 Total news dans DB:', total.rows[0].count);

    // Par status
    const byStatus = await client.query('SELECT processing_status, COUNT(*) FROM news_items GROUP BY processing_status');
    console.log('📊 Par status:');
    byStatus.rows.forEach(row => {
      console.log(`  - ${row.processing_status}: ${row.count}`);
    });

    // Par source
    const bySource = await client.query('SELECT source, COUNT(*) FROM news_items GROUP BY source ORDER BY COUNT(*) DESC LIMIT 10');
    console.log('📡 Par source:');
    bySource.rows.forEach(row => {
      console.log(`  - ${row.source}: ${row.count}`);
    });

    // Les plus récentes
    const recent = await client.query('SELECT title, source, created_at FROM news_items ORDER BY created_at DESC LIMIT 5');
    console.log('🕐 Plus récentes:');
    recent.rows.forEach((row, i) => {
      console.log(`  ${i+1}. [${row.source}] ${row.title.substring(0, 80)}...`);
    });

    // Status PENDING specifically
    const pending = await client.query('SELECT COUNT(*) FROM news_items WHERE processing_status = \'PENDING\' OR processing_status = \'raw\'');
    console.log('⏳ News en attente (PENDING/raw):', pending.rows[0].count);

  } finally {
    client.release();
    await pool.end();
  }
}

checkNews().catch(console.error);