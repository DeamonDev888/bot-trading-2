
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

async function cleanBadItems() {
  try {
    const res = await pool.query(`
      DELETE FROM news_items 
      WHERE content LIKE '%rate limit exceeded%' 
         OR content LIKE '%"data":null%'
         OR content LIKE '%Per IP rate limit%'
    `);
    console.log(`🗑️ Deleted ${res.rowCount} bad items (Rate Limit errors) from database.`);
  } catch (err) {
    console.error('Error cleaning database:', err);
  } finally {
    await pool.end();
  }
}

cleanBadItems();
