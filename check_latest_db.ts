
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

async function checkLatestItems() {
  try {
    const res = await pool.query(`
      SELECT id, title, source, created_at, published_at, content 
      FROM news_items 
      WHERE source LIKE 'X - %'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('--- Latest 5 X/Twitter News Items in DB ---');
    if (res.rows.length === 0) {
        console.log('No X items found in database.');
    } else {
        res.rows.forEach(r => {
            console.log(`\n---------------------------------------------------`);
            console.log(`SOURCE: ${r.source}`);
            console.log(`DB CREATED: ${r.created_at.toISOString()}`);
            console.log(`PUBLISHED:  ${r.published_at ? new Date(r.published_at).toISOString() : 'N/A'}`);
            console.log(`TITLE:      ${r.title}`);
            console.log(`CONTENT:    ${r.content.substring(0, 150).replace(/\n/g, ' ')}...`);
        });
    }
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

checkLatestItems();
