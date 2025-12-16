import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function checkDB() {
  const client = await pool.connect();
  try {
    // Posts des 24 dernières heures par source
    console.log('=== POSTS DES 24 DERNIÈRES HEURES PAR SOURCE ===');
    const recentPosts = await client.query(`
      SELECT
        source,
        COUNT(*) as total_posts,
        COUNT(CASE WHEN relevance_score >= 6 THEN 1 END) as relevant_posts,
        COUNT(CASE WHEN published_to_discord = true THEN 1 END) as published_posts,
        MAX(published_at) as latest_post
      FROM news_items
      WHERE published_at >= NOW() - INTERVAL '24 hours'
        AND category LIKE 'X-%'
      GROUP BY source
      ORDER BY total_posts DESC
      LIMIT 20
    `);

    recentPosts.rows.forEach(row => {
      console.log(`${row.source.padEnd(25)} | Total: ${row.total_posts} | Relevants: ${row.relevant_posts} | Publiés: ${row.published_posts} | Dernier: ${row.latest_post}`);
    });

    console.log('\n=== STATUT GLOBAL DES X POSTS ===');
    const globalStats = await client.query(`
      SELECT
        COUNT(*) as total_x_posts,
        COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) as raw_posts,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed_posts,
        COUNT(CASE WHEN relevance_score >= 6 THEN 1 END) as high_score_posts,
        COUNT(CASE WHEN published_to_discord = true THEN 1 END) as published_posts,
        COUNT(CASE WHEN published_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN published_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
      FROM news_items
      WHERE category LIKE 'X-%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%'
    `);

    const stats = globalStats.rows[0];
    console.log(`Total X posts:          ${stats.total_x_posts}`);
    console.log(`Posts bruts (raw):       ${stats.raw_posts}`);
    console.log(`Posts traités:           ${stats.processed_posts}`);
    console.log(`Posts score ≥ 6:         ${stats.high_score_posts}`);
    console.log(`Posts publiés:           ${stats.published_posts}`);
    console.log(`Posts 24 dernières heures: ${stats.last_24h}`);
    console.log(`Posts 7 derniers jours:   ${stats.last_7d}`);

    console.log('\n=== DERNIERS POSTS PUBLIÉS ===');
    const latestPublished = await client.query(`
      SELECT source, title, relevance_score, published_at
      FROM news_items
      WHERE published_to_discord = true
        AND category LIKE 'X-%'
      ORDER BY published_at DESC
      LIMIT 10
    `);

    latestPublished.rows.forEach(row => {
      console.log(`[${row.relevance_score}/10] ${row.source.padEnd(20)} | ${row.title.substring(0, 80)}...`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

checkDB().catch(console.error);