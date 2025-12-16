
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function checkStatus() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, title, content, url, relevance_score, published_to_discord 
      FROM news_items 
      WHERE source LIKE 'X -%' OR url LIKE '%fixupx%'
      ORDER BY id DESC 
      LIMIT 10
    `);

    console.log('\n🔍 DEEP INSPECTION (Last 10 X Items):');
    console.log('-------------------------------------');

    if (res.rows.length === 0) {
        console.log("No items found.");
    }

    for (const row of res.rows) {
      const title = row.title || '';
      const content = row.content || '';
      
      const hasImageTag = title.includes('![') || content.includes('![');
      // Image followed by digits or just Image: checks
      const hasImageWord = /Image\s*\d*:/.test(title) || /Image\s*\d*:/.test(content); 
      const hasPinned = title.startsWith('Pinned') || content.startsWith('Pinned');
      const isClean = !hasImageTag && !hasImageWord && !hasPinned;
      
      const isPublished = row.published_to_discord ? '✅ PUB' : '⏳ WAIT';

      console.log(`\n🆔 ID: ${row.id} | Score: ${row.relevance_score} | ${isPublished}`);
      console.log(`📌 Title: ${title.substring(0, 100).replace(/\n/g, ' ')}...`);
      console.log(`📄 Snippet: ${content.substring(0, 50).replace(/\n/g, ' ')}...`);
      console.log(`🔗 URL: ${row.url}`);
      console.log(`✨ Status: ${isClean ? '✅ CLEAN' : '⚠️ DIRTY'} ${hasImageTag ? '[ImgTag]' : ''} ${hasImageWord ? '[ImgWord]' : ''} ${hasPinned ? '[Pinned]' : ''}`);
    }

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkStatus();
