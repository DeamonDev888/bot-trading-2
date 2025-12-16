import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function analyzeCategories() {
  const client = await pool.connect();
  try {
    console.log('=== CATÉGORIES PRÉSENTES EN DB ===');
    const categories = await client.query(`
      SELECT category, COUNT(*) as count
      FROM news_items
      GROUP BY category
      ORDER BY count DESC
    `);

    categories.rows.forEach(row => {
      console.log(`${row.category.padEnd(20)} | ${row.count} posts`);
    });

    console.log('\n=== POSTS RÉCENTS TOUSES SOURCES CONFONDUES ===');
    const recentPosts = await client.query(`
      SELECT source, title, category, processing_status, relevance_score, published_at, created_at
      FROM news_items
      WHERE published_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 20
    `);

    recentPosts.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.source.padEnd(20)} | ${row.category.padEnd(15)} | ${row.processing_status.padEnd(10)} | [${row.relevance_score}/10]`);
      console.log(`   ${row.title.substring(0, 80)}...`);
      console.log(`   Publié: ${row.published_at} | Créé: ${row.created_at}`);
      console.log('');
    });

    console.log('\n=== POSTS X/TWITTER RÉCENTS (recherche par URL) ===');
    const twitterPosts = await client.query(`
      SELECT source, title, category, processing_status, relevance_score, url
      FROM news_items
      WHERE (url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%' OR url LIKE '%nitter%')
        AND published_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log(`Trouvés: ${twitterPosts.rows.length} posts X/Twitter récents\n`);

    twitterPosts.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.source.padEnd(20)} | ${row.category.padEnd(15)} | ${row.processing_status.padEnd(10)} | [${row.relevance_score}/10]`);
      console.log(`   ${row.title.substring(0, 80)}...`);
      console.log(`   URL: ${row.url}`);
      console.log('');
    });

  } finally {
    client.release();
    await pool.end();
  }
}

analyzeCategories().catch(console.error);